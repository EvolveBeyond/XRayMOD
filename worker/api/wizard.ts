import type { Env } from '../types';
import { CloudflareEdgeProvider, edgeProviderSummary } from '../lib/edge-provider';
import {
  deployWorkerModule,
  downloadRollingAsset,
  rollingTagSha,
  gunzip,
  untar,
  uploadAssets,
} from '../lib/cf-deploy';
import {
  buildAuthorizeUrl,
  exchangeOAuthCode,
  genCodeVerifier,
  genOAuthState,
  readOAuthClientId,
} from '../lib/cf-oauth';
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

async function oauthRedirectUri(request: Request, env: Env): Promise<string> {
  const custom = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?')
    .bind('wizard.oauth_redirect_uri')
    .first<{ v: string }>();
  if (custom?.v) return custom.v.trim();

  const url = new URL(request.url);
  const access = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?')
    .bind('panel.access_uuid')
    .first<{ v: string }>();
  const prefix = access?.v ? `/${access.v}` : '';
  return `${url.origin}${prefix}/api/wizard/oauth/callback`;
}

async function handleOAuth(
  request: Request,
  env: Env,
  subaction?: string
): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === 'GET' && (!subaction || subaction === 'url')) {
    const clientId = await readOAuthClientId(env.DB);
    const redirectUri = await oauthRedirectUri(request, env);
    const customClient = !!(await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?')
      .bind('wizard.oauth_client_id')
      .first());
    const state = genOAuthState();
    const verifier = genCodeVerifier();
    await env.DB.prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
      .bind('wizard.oauth_state', state, Date.now())
      .run();
    await env.DB.prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
      .bind('wizard.oauth_verifier', verifier, Date.now())
      .run();
    const authorizeUrl = await buildAuthorizeUrl({ clientId, redirectUri }, state, verifier);
    return json({
      success: true,
      data: {
        authorize_url: authorizeUrl,
        redirect_uri: redirectUri,
        custom_client: customClient,
        note: customClient
          ? 'OAuth app configured in kvstore wizard.oauth_client_id.'
          : 'Default wrangler OAuth client only works when redirect_uri is registered (usually localhost). Prefer API token or set wizard.oauth_client_id + wizard.oauth_redirect_uri.',
      },
    });
  }

  if (request.method === 'GET' && subaction === 'callback') {
    const code = url.searchParams.get('code') || '';
    const state = url.searchParams.get('state') || '';
    const savedState = (
      await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('wizard.oauth_state').first<{ v: string }>()
    )?.v;
    const verifier = (
      await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('wizard.oauth_verifier').first<{ v: string }>()
    )?.v;
    if (!code || !verifier || state !== savedState) {
      return json({ success: false, message: 'Invalid OAuth callback state' }, 400);
    }
    const clientId = await readOAuthClientId(env.DB);
    const redirectUri = await oauthRedirectUri(request, env);
    const tokens = await exchangeOAuthCode({ clientId, redirectUri }, code, verifier);
    const accounts = await cfCall(tokens.access_token, '/accounts?per_page=1');
    if (!accounts?.length) throw new Error('No Cloudflare accounts found');
    await env.DB.prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
      .bind('wizard.api_key', tokens.access_token, Date.now())
      .run();
    if (tokens.refresh_token) {
      await env.DB.prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
        .bind('wizard.oauth_refresh_token', tokens.refresh_token, Date.now())
        .run();
    }
    await writeWizardState(env.DB, {
      step: 'capabilities',
      auth: 'oauth_preferred',
      account_id: accounts[0].id,
    });
    return json({
      success: true,
      data: {
        accountId: accounts[0].id,
        accountName: accounts[0].name,
        message: 'OAuth token saved — continue in Wizard.',
      },
    });
  }

  return json({ success: false, message: 'OAuth action not found' }, 404);
}

export async function handleWizard(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  if (params.action === 'oauth') {
    try {
      return await handleOAuth(request, env, params.subaction);
    } catch (e: any) {
      return json({ success: false, message: e.message || 'OAuth failed' }, 400);
    }
  }

  // GET /api/wizard — check wizard status
  if (request.method === 'GET' && !params.action) {
    const wizardKey = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('wizard.api_key').first<{ v: string }>();
    const state = await readWizardState(env.DB);
    const oauthClient = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?')
      .bind('wizard.oauth_client_id')
      .first<{ v: string }>();
    return json({
      success: true,
      data: {
        configured: !!wizardKey?.v,
        hasApiKey: !!wizardKey?.v,
        primary: true,
        shell_installers_deprecated: true,
        oauth_preferred: true,
        oauth_configured: !!oauthClient?.v,
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
      const accounts = await cfCall(token, '/accounts?per_page=1');
      if (!accounts.length) throw new Error('No accounts found');

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

  // POST /api/wizard/deploy — deploy a panel (rolling worker.mjs + UI assets)
  if (request.method === 'POST' && params.action === 'deploy') {
    try {
      const body = await request.json<{
        cfToken?: string;
        accountId?: string;
        projectName?: string;
        adminPassword?: string;
        bootstrap?: boolean;
      }>();

      const savedKey = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('wizard.api_key').first<{ v: string }>();
      const cfToken = body.cfToken || savedKey?.v;

      if (!cfToken) {
        return json({ success: false, message: 'No Cloudflare API key configured. Send cfToken or set up wizard first.' }, 400);
      }

      const accounts = await cfCall(cfToken, '/accounts?per_page=1');
      if (!accounts.length) throw new Error('No Cloudflare accounts found');
      const accountId = body.accountId || accounts[0].id;
      const subdomain = accounts[0].subdomain || 'workers.dev';

      const projectName =
        body.projectName ||
        `cf-${Array.from(crypto.getRandomValues(new Uint8Array(6)))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')}`;
      const dbName = `${projectName}-db`;

      const logs: string[] = [];
      const log = (msg: string) => logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);

      log('Creating D1 database…');
      const d1 = await cfCall(cfToken, `/accounts/${accountId}/d1/database`, 'POST', { name: dbName });
      const d1Id = d1.uuid || d1.id;
      log(`Database created: ${dbName} (${d1Id})`);

      log(`Resolving rolling bundle (${XRayMOD_VERSION})…`);
      const rollingSha = await rollingTagSha();
      log(`Rolling @ ${rollingSha}`);

      log('Downloading worker.mjs…');
      const moduleBytes = await downloadRollingAsset('worker.mjs', 1000, rollingSha);
      log(`Worker bundle: ${Math.round(moduleBytes.byteLength / 1024)} KB`);

      let assetsJwt: string | null = null;
      try {
        log('Downloading assets.tar.gz…');
        const gz = await downloadRollingAsset('assets.tar.gz', 1000, rollingSha);
        const tar = await gunzip(gz);
        const files = untar(tar);
        log(`Uploading ${files.size} UI files…`);
        assetsJwt = await uploadAssets(cfToken, accountId, projectName, files, async (msg) => {
          log(msg);
        });
      } catch (e) {
        log(`UI bundle skipped: ${e instanceof Error ? e.message : String(e)}`);
      }

      log('Deploying worker.mjs + D1 + assets (run_worker_first)…');
      await deployWorkerModule(cfToken, accountId, projectName, moduleBytes, d1Id, assetsJwt);
      log('Worker deployed');

      log('Enabling workers.dev subdomain…');
      try {
        await cfCall(cfToken, `/accounts/${accountId}/workers/subdomain`, 'POST', { enabled: true });
      } catch {
        /* may already be enabled */
      }

      const workerUrl = `https://${projectName}.${subdomain}`;

      let panelUrl = workerUrl;
      let loginUrl = `${workerUrl}/install`;
      if (body.bootstrap !== false) {
        log('Bootstrapping panel via /install…');
        try {
          const boot = await fetch(`${workerUrl}/install`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              auto: true,
              ...(body.adminPassword ? { password: body.adminPassword } : {}),
            }),
          });
          const bootData = (await boot.json()) as {
            success?: boolean;
            panelUrl?: string;
            loginUrl?: string;
            password?: string;
            accessUUID?: string;
          };
          if (bootData.success) {
            panelUrl = bootData.panelUrl || panelUrl;
            loginUrl = bootData.loginUrl || loginUrl;
            log(`Bootstrap ok — SECURE PATH panel ready`);
          } else {
            log('Bootstrap deferred — open /install on the new Worker URL');
          }
        } catch (e) {
          log(`Bootstrap request failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

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
          panelUrl,
          loginUrl,
          rollingSha,
          logs,
        },
      });
    } catch (e: any) {
      return json({ success: false, message: e.message || 'Deployment failed' }, 500);
    }
  }

  return json({ success: false, message: 'Not found' }, 404);
}
