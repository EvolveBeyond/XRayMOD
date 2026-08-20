/**
 * In-panel self-update: pull latest from GitHub and redeploy this Worker
 * via Cloudflare API (keeps D1). Progress is stored in kvstore.
 */
import type { Env } from '../types';
import { XRayMOD_VERSION } from './version';
import { CloudflareEdgeProvider } from './edge-provider';
import {
  deployWorkerModule,
  downloadRollingAsset,
  rollingTagSha,
  gunzip,
  untar,
  uploadAssets,
} from './cf-deploy';

const REPO = 'askarniroomand/XRayMOD';
const JOB_KEY = 'panel.update_job';
const cfProvider = new CloudflareEdgeProvider();

export type UpdateStep = {
  id: number;
  text: string;
  ok?: boolean;
  at: number;
};

export type UpdateJob = {
  id: string;
  status: 'running' | 'done' | 'error';
  steps: UpdateStep[];
  error?: string;
  startedAt: number;
  finishedAt?: number;
  commit?: string;
};

async function kvGet(db: D1Database, k: string): Promise<string> {
  const row = await db.prepare('SELECT v FROM kvstore WHERE k = ?').bind(k).first<{ v: string }>();
  return row?.v || '';
}

async function kvSet(db: D1Database, k: string, v: string): Promise<void> {
  await db
    .prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
    .bind(k, v, Date.now())
    .run();
}

export async function readUpdateJob(db: D1Database): Promise<UpdateJob | null> {
  const raw = await kvGet(db, JOB_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UpdateJob;
  } catch {
    return null;
  }
}

async function writeJob(db: D1Database, job: UpdateJob): Promise<void> {
  await kvSet(db, JOB_KEY, JSON.stringify(job));
}

async function step(db: D1Database, job: UpdateJob, text: string, ok?: boolean): Promise<void> {
  job.steps.push({ id: job.steps.length + 1, text, ok, at: Date.now() });
  await writeJob(db, job);
}

function workerNameFromHost(host: string): string {
  const m = host.match(/^([a-z0-9-]+)\./i);
  return (m?.[1] || 'xraymod').toLowerCase();
}

async function cf(
  token: string,
  method: string,
  path: string,
  body?: unknown,
  contentType = 'application/json'
): Promise<any> {
  // accountId unused for raw paths that already include /accounts/...
  return cfProvider.request(
    { apiToken: token, accountId: '' },
    method,
    path,
    body,
    contentType
  );
}

async function latestMainSha(): Promise<{ sha: string; message: string }> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/commits/main`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'XRayMOD-SelfUpdate',
    },
  });
  if (!res.ok) throw new Error(`GitHub commits/main HTTP ${res.status}`);
  const data = (await res.json()) as { sha?: string; commit?: { message?: string } };
  if (!data.sha) throw new Error('GitHub: missing commit sha');
  return { sha: data.sha.slice(0, 12), message: (data.commit?.message || '').split('\n')[0] };
}

async function getScriptSettings(token: string, accountId: string, script: string): Promise<any> {
  try {
    return await cf(token, 'GET', `/accounts/${accountId}/workers/scripts/${script}/settings`);
  } catch {
    return null;
  }
}

export async function startSelfUpdate(
  env: Env,
  request: Request,
  opts?: { token?: string; force?: boolean }
): Promise<UpdateJob> {
  const existing = await readUpdateJob(env.DB);
  if (existing?.status === 'running' && Date.now() - existing.startedAt < 10 * 60 * 1000) {
    return existing;
  }

  const host = new URL(request.url).hostname;
  const workerName =
    (await kvGet(env.DB, 'panel.worker_name')) || workerNameFromHost(host);
  let accountId = await kvGet(env.DB, 'panel.cf_account_id');
  let d1Id = await kvGet(env.DB, 'panel.d1_id');
  const token =
    String(opts?.token || '').trim() || (await kvGet(env.DB, 'panel.cf_api_token'));

  const job: UpdateJob = {
    id: crypto.randomUUID(),
    status: 'running',
    steps: [],
    startedAt: Date.now(),
  };
  await writeJob(env.DB, job);

  try {
    await step(env.DB, job, 'Starting panel update…');

    if (!token || token.length < 20) {
      throw new Error(
        'Cloudflare token not saved. Save the token on this page and try again.'
      );
    }
    await step(env.DB, job, 'Cloudflare token ready', true);

    await step(env.DB, job, 'Fetching latest commit from GitHub (main)…');
    const latest = await latestMainSha();
    await step(env.DB, job, `Latest main commit: ${latest.sha} — ${latest.message}`, true);

    await step(env.DB, job, 'Checking rolling release (actual update bundle)…');
    const rollingSha = await rollingTagSha();
    job.commit = rollingSha;
    if (rollingSha !== latest.sha) {
      await step(
        env.DB,
        job,
        `Warning: rolling=${rollingSha} is behind main=${latest.sha} — deploying this rolling bundle`,
        false
      );
    } else {
      await step(env.DB, job, `rolling aligned with main: ${rollingSha}`, true);
    }

    await step(env.DB, job, 'Identifying account and Worker…');
    if (!accountId) {
      const accounts = await cf(token, 'GET', '/accounts?per_page=5');
      const list = accounts.result || [];
      if (!list.length) throw new Error('No Cloudflare account found for this token');
      accountId = list[0].id;
      await kvSet(env.DB, 'panel.cf_account_id', accountId);
    }
    await step(env.DB, job, `Account: ${accountId.slice(0, 8)}… · Worker: ${workerName}`, true);

    if (!d1Id) {
      const settings = await getScriptSettings(token, accountId, workerName);
      const bindings = settings?.result?.bindings || [];
      const d1 = bindings.find((b: any) => b.type === 'd1' || b.name === 'DB');
      d1Id = d1?.id || d1?.database_id || '';
      if (d1Id) await kvSet(env.DB, 'panel.d1_id', d1Id);
    }
    if (!d1Id) {
      throw new Error(
        'D1 ID not found. Run the installer/panel bot once or save panel.d1_id.'
      );
    }
    await step(env.DB, job, `D1 preserved: ${d1Id.slice(0, 8)}…`, true);

    await step(env.DB, job, `Downloading Worker bundle from GitHub (rolling @ ${rollingSha})…`);
    const moduleBytes = await downloadRollingAsset('worker.mjs', 1000, rollingSha);
    await step(
      env.DB,
      job,
      `Worker bundle received (${Math.round(moduleBytes.byteLength / 1024)} KB)`,
      true
    );

    let assetsJwt: string | null = null;
    try {
      await step(env.DB, job, 'Downloading UI bundle (assets.tar.gz)…');
      const gz = await downloadRollingAsset('assets.tar.gz', 1000, rollingSha);
      await step(env.DB, job, `UI compressed: ${Math.round(gz.byteLength / 1024)} KB`, true);
      const tar = await gunzip(gz);
      const files = untar(tar);
      if (files.size < 1) throw new Error('assets.tar.gz empty');
      assetsJwt = await uploadAssets(token, accountId, workerName, files, async (text, ok) => {
        await step(env.DB, job, text, ok);
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await step(
        env.DB,
        job,
        `UI bundle unavailable — only Worker will update (previous UI kept): ${msg.slice(0, 120)}`
      );
      assetsJwt = null;
    }

    await step(env.DB, job, 'Deploying to Cloudflare Workers (users/D1 not deleted)…');
    await deployWorkerModule(token, accountId, workerName, moduleBytes, d1Id, assetsJwt);
    await step(env.DB, job, 'Deploy succeeded', true);

    await kvSet(env.DB, 'panel.version', XRayMOD_VERSION);
    // Record the rolling asset SHA that was actually deployed (not main tip).
    await kvSet(env.DB, 'panel.last_update_commit', rollingSha);
    await kvSet(env.DB, 'panel.worker_name', workerName);

    job.status = 'done';
    job.finishedAt = Date.now();
    await step(env.DB, job, 'Done — refresh the page once', true);
    await writeJob(env.DB, job);
    return job;
  } catch (e) {
    job.status = 'error';
    job.error = e instanceof Error ? e.message : String(e);
    job.finishedAt = Date.now();
    await step(env.DB, job, `Error: ${job.error}`, false);
    await writeJob(env.DB, job);
    return job;
  }
}

export async function saveCfToken(
  db: D1Database,
  token: string,
  accountId?: string,
  workerName?: string,
  d1Id?: string
): Promise<void> {
  const t = token.trim();
  if (t.length < 20) throw new Error('Invalid token');
  await kvSet(db, 'panel.cf_api_token', t);
  if (accountId) await kvSet(db, 'panel.cf_account_id', accountId.trim());
  if (workerName) await kvSet(db, 'panel.worker_name', workerName.trim());
  if (d1Id) await kvSet(db, 'panel.d1_id', d1Id.trim());
}

export async function listWorkerVersions(
  token: string,
  accountId: string,
  script: string
): Promise<{ id: string; number?: number; created?: string }[]> {
  const data = await cf(token, 'GET', `/accounts/${accountId}/workers/scripts/${script}/versions`);
  const items = Array.isArray(data.result)
    ? data.result
    : data.result?.items || [];
  return (items as any[]).slice(0, 12).map((v) => ({
    id: v.id || v.version_id,
    number: v.number,
    created: v.metadata?.created_on || v.created_on,
  }));
}

export async function rollbackWorkerVersion(
  token: string,
  accountId: string,
  script: string,
  versionId: string
): Promise<void> {
  await cf(token, 'POST', `/accounts/${accountId}/workers/scripts/${script}/deployments`, {
    versions: [{ version_id: versionId, percentage: 100 }],
  });
}
