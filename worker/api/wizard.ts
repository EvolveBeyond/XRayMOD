import type { Env } from '../types';
import { CloudflareEdgeProvider, edgeProviderSummary } from '../lib/edge-provider';
import { XRayMOD_VERSION, XRayMOD_BUILD } from '../lib/version';

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const ROLLING_WORKER =
  'https://github.com/askarniroomand/XRayMOD/releases/download/rolling/worker.mjs';
const WIZARD_STEPS = ['auth', 'capabilities', 'artifacts', 'deploy', 'done'] as const;

type WizardState = {
  step: (typeof WIZARD_STEPS)[number] | 'idle';
  auth: 'api_token' | 'oauth_preferred';
  account_id?: string;
  last_error?: string;
  updated?: number;
};

function parseWizardState(raw?: string): WizardState {
  try {
    const o = raw ? (JSON.parse(raw) as WizardState) : null;
    return {
      step: o?.step || 'idle',
      auth: o?.auth === 'oauth_preferred' ? 'oauth_preferred' : 'api_token',
      account_id: o?.account_id,
      last_error: o?.last_error,
      updated: o?.updated,
    };
  } catch {
    return { step: 'idle', auth: 'api_token' };
  }
}

async function readWizardState(db: D1Database): Promise<WizardState> {
  const row = await db
    .prepare('SELECT v FROM kvstore WHERE k = ?')
    .bind('wizard.state_json')
    .first<{ v: string }>();
  return parseWizardState(row?.v);
}

async function writeWizardState(db: D1Database, state: WizardState): Promise<void> {
  state.updated = Date.now();
  await db
    .prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
    .bind('wizard.state_json', JSON.stringify(state), Date.now())
    .run();
}

async function cfCall(token: string, path: string, method = 'GET', body?: unknown): Promise<any> {
  const provider = new CloudflareEdgeProvider();
  const data = (await provider.request(
    { apiToken: token, accountId: '' },
    method,
    path,
    body
  )) as { result?: unknown };
  return data.result;
}

export async function handleWizard(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  // GET /api/wizard — check wizard status
  if (request.method === 'GET' && !params.action) {
    const wizardKey = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('wizard.api_key').first<{ v: string }>();
    const state = await readWizardState(env.DB);
    return json({
      success: true,
      data: {
        configured: !!wizardKey?.v,
        hasApiKey: !!wizardKey?.v,
        primary: true,
        shell_installers_deprecated: true,
        oauth_preferred: true,
        artifact: {
          channel: 'rolling',
          url: ROLLING_WORKER,
          product_version: XRayMOD_VERSION,
          build: XRayMOD_BUILD,
          note: 'Deploy verified rolling Worker+UI assets, not a mutable raw GitHub branch tip.',
        },
        steps: WIZARD_STEPS,
        state,
      },
    });
  }

  // GET /api/wizard/capabilities — plan-aware Edge Provider report
  if (request.method === 'GET' && params.action === 'capabilities') {
    const url = new URL(request.url);
    const token =
      url.searchParams.get('token') ||
      (await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('wizard.api_key').first<{ v: string }>())?.v ||
      '';
    const accountId =
      url.searchParams.get('accountId') ||
      (await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('panel.cf_account_id').first<{ v: string }>())?.v ||
      '';
    const summary = await edgeProviderSummary(token && accountId ? { apiToken: token, accountId } : null);
    const blocked = summary.capabilities.filter((c) => c.status === 'plan_gated' || c.status === 'unavailable');
    return json({
      success: true,
      data: {
        ...summary,
        plan_gated: blocked.map((c) => c.capability),
        honesty:
          'Spectrum / static IP / load balancing stay blocked in UI until the Cloudflare plan proves them. Workers are control plane only.',
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
      await writeWizardState(env.DB, {
        step: 'capabilities',
        auth: 'api_token',
        account_id: accounts[0].id,
      });

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

      // Step 2: Download versioned rolling Worker (not mutable branch tip)
      log(`Downloading rolling Worker bundle (${XRayMOD_VERSION})…`);
      const workerRes = await fetch(ROLLING_WORKER, { redirect: 'follow' });
      if (!workerRes.ok) {
        throw new Error(`Rolling worker.mjs HTTP ${workerRes.status} — run scripts/publish-rolling.sh`);
      }
      const workerCode = await workerRes.text();
      if (workerCode.length < 1000) throw new Error('Rolling worker.mjs too small');
      log(`Worker bundle downloaded (${Math.round(workerCode.length / 1024)} KB)`);

      // Step 3: Deploy worker
      log('Deploying worker...');
      const metadata = {
        main_module: 'worker.js',
        compatibility_date: '2025-01-01',
        compatibility_flags: ['nodejs_compat'],
        bindings: [
          { type: 'plain_text', name: 'ADMIN_PASSWORD', text: adminPassword },
          { type: 'plain_text', name: 'DISGUISE_PAGE', text: '404' },
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

      const uploadR = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${projectName}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${cfToken}` },
        body: formData,
      });
      const uploadData = (await uploadR.json()) as {
        success?: boolean;
        errors?: { message?: string }[];
      };
      if (!uploadData.success) {
        throw new Error(
          `Worker upload failed: ${(uploadData.errors || []).map((e) => e.message || '').join('; ')}`
        );
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
      await writeWizardState(env.DB, {
        step: 'done',
        auth: 'api_token',
        account_id: accountId,
      });
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
