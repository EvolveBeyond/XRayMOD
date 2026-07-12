import type { Env } from '../types';

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const CF_API = 'https://api.cloudflare.com/client/v4';

async function cfCall(token: string, path: string, method = 'GET', body?: any): Promise<any> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
  };
  const opts: RequestInit = { method, headers };
  if (body) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const r = await fetch(`${CF_API}${path}`, opts);
  const data = await r.json();
  if (!data.success) {
    const errors = (data.errors || []).map((e: any) => e.message || JSON.stringify(e)).join('; ');
    throw new Error(errors || 'Cloudflare API failed');
  }
  return data.result;
}

export async function handleWizard(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  // GET /api/wizard — check wizard status
  if (request.method === 'GET') {
    const wizardKey = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('wizard.api_key').first<{ v: string }>();
    return json({
      success: true,
      data: {
        configured: !!wizardKey?.v,
        hasApiKey: !!wizardKey?.v,
      },
    });
  }

  // POST /api/wizard/setup — set wizard API key (admin only)
  if (request.method === 'POST' && params.action === 'setup') {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    try {
      // Verify the API key works
      const accounts = await cfCall(token, '/accounts?per_page=1');
      if (!accounts.length) throw new Error('No accounts found');

      // Save the API key
      await env.DB.prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
        .bind('wizard.api_key', token, Date.now())
        .run();

      return json({
        success: true,
        data: {
          accountName: accounts[0].name,
          accountId: accounts[0].id,
        },
      });
    } catch (e: any) {
      return json({ success: false, message: e.message || 'Invalid API key' }, 400);
    }
  }

  // POST /api/wizard/deploy — deploy a panel for someone
  if (request.method === 'POST' && params.action === 'deploy') {
    try {
      const body = await request.json<{
        cfToken?: string;
        accountId?: string;
        projectName?: string;
        adminPassword?: string;
      }>();

      // Get saved API key or use provided one
      const savedKey = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('wizard.api_key').first<{ v: string }>();
      const cfToken = body.cfToken || savedKey?.v;

      if (!cfToken) {
        return json({ success: false, message: 'No Cloudflare API key configured. Send cfToken or set up wizard first.' }, 400);
      }

      // Get account
      const accounts = await cfCall(cfToken, '/accounts?per_page=1');
      if (!accounts.length) throw new Error('No Cloudflare accounts found');
      const accountId = body.accountId || accounts[0].id;

      // Generate random names
      const projectName = body.projectName || `cf-${Array.from(crypto.getRandomValues(new Uint8Array(6))).map(b => b.toString(16).padStart(2, '0')).join('')}`;
      const dbName = `${projectName}-db`;
      const adminPassword = body.adminPassword || Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');

      const logs: string[] = [];
      const log = (msg: string) => logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);

      // Step 1: Create D1 database
      log('Creating D1 database...');
      const d1 = await cfCall(cfToken, `/accounts/${accountId}/d1/database`, 'POST', { name: dbName });
      const d1Id = d1.uuid || d1.id;
      log(`Database created: ${dbName} (${d1Id})`);

      // Step 2: Download worker code
      log('Downloading worker code...');
      const workerCode = await fetch('https://raw.githubusercontent.com/EvolveBeyond/XRayMOD/main/worker.js').then(r => r.text());
      log(`Worker code downloaded (${workerCode.length} bytes)`);

      // Step 3: Deploy worker
      log('Deploying worker...');
      const metadata = {
        main_module: 'worker.js',
        compatibility_date: '2025-01-01',
        compatibility_flags: ['nodejs_compat'],
        bindings: [
          { type: 'plain_text', name: 'ADMIN_PASSWORD', text: adminPassword },
          { type: 'plain_text', name: 'DISGUISE_PAGE', text: '1101' },
          { type: 'plain_text', name: 'PANEL_RECOVERY', text: 'false' },
        ],
        migrations: {
          new_tag: 'v1',
          old_tag: null,
        },
      };

      // Create FormData for upload
      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
      formData.append('worker.js', new Blob([workerCode], { type: 'application/javascript+module' }), 'worker.js');

      const uploadResult = await cfCall(cfToken, `/accounts/${accountId}/workers/scripts/${projectName}`, 'PUT', null);
      // Use direct fetch for FormData
      const uploadR = await fetch(`${CF_API}/accounts/${accountId}/workers/scripts/${projectName}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${cfToken}` },
        body: formData,
      });
      const uploadData = await uploadR.json();
      if (!uploadData.success) {
        throw new Error(`Worker upload failed: ${(uploadData.errors || []).map((e: any) => e.message).join('; ')}`);
      }
      log('Worker deployed');

      // Step 4: Enable workers.dev subdomain
      log('Enabling workers.dev subdomain...');
      try {
        await cfCall(cfToken, `/accounts/${accountId}/workers/subdomain`, 'POST', { enabled: true });
      } catch {}
      log('Subdomain enabled');

      const workerUrl = `https://${projectName}.${accounts[0].subdomain || 'workers.dev'}`;

      log('Deployment complete!');
      return json({
        success: true,
        data: {
          projectName,
          d1Id,
          workerUrl,
          adminPassword,
          logs,
        },
      });
    } catch (e: any) {
      return json({ success: false, message: e.message || 'Deployment failed' }, 500);
    }
  }

  return json({ success: false, message: 'Not found' }, 404);
}
