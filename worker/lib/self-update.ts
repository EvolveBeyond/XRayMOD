/**
 * In-panel self-update: pull latest from GitHub and redeploy this Worker
 * via Cloudflare API (keeps D1). Progress is stored in kvstore.
 */
import type { Env } from '../types';
import { XRayMOD_VERSION } from './version';
import { CloudflareEdgeProvider } from './edge-provider';

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

async function downloadReleaseAsset(name: string, minBytes = 500): Promise<Uint8Array> {
  const urls = [
    `https://github.com/${REPO}/releases/download/rolling/${name}`,
    `https://cdn.jsdelivr.net/gh/${REPO}@rolling/${name}`,
  ];
  let last = '';
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) {
        last = `${url} → ${res.status}`;
        continue;
      }
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.byteLength < minBytes) {
        last = `${url} → too small (${buf.byteLength})`;
        continue;
      }
      return buf;
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(`Asset ${name} not found (${last})`);
}

async function sha256Hex16(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', data as BufferSource);
  const bytes = new Uint8Array(hash);
  let hex = '';
  for (let i = 0; i < 16; i++) hex += bytes[i]!.toString(16).padStart(2, '0');
  return hex;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Minimal ustar reader (files only). */
function untar(buf: Uint8Array): Map<string, Uint8Array> {
  const out = new Map<string, Uint8Array>();
  let offset = 0;
  const decoder = new TextDecoder();
  while (offset + 512 <= buf.length) {
    const header = buf.subarray(offset, offset + 512);
    offset += 512;
    if (header.every((b) => b === 0)) break;
    const name = decoder.decode(header.subarray(0, 100)).replace(/\0.*$/, '');
    const sizeOctal = decoder.decode(header.subarray(124, 136)).replace(/\0.*$/, '').trim();
    const typeFlag = header[156] || 0;
    const size = parseInt(sizeOctal || '0', 8) || 0;
    const content = buf.subarray(offset, offset + size);
    offset += Math.ceil(size / 512) * 512;
    if (!name || name.endsWith('/')) continue;
    // type '0' or '\0' = regular file
    if (typeFlag !== 0 && typeFlag !== 48) continue;
    const path = name.startsWith('./') ? name.slice(1) : name.startsWith('/') ? name : `/${name}`;
    const normalized = path.replace(/\/+/g, '/');
    out.set(normalized.startsWith('/') ? normalized : `/${normalized}`, content.slice());
  }
  return out;
}

async function gunzip(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('gzip');
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function getScriptSettings(token: string, accountId: string, script: string): Promise<any> {
  try {
    return await cf(token, 'GET', `/accounts/${accountId}/workers/scripts/${script}/settings`);
  } catch {
    return null;
  }
}

async function uploadAssets(
  token: string,
  accountId: string,
  script: string,
  files: Map<string, Uint8Array>,
  onProgress: (msg: string, ok?: boolean) => Promise<void>
): Promise<string> {
  const manifest: Record<string, { hash: string; size: number }> = {};
  const byHash = new Map<string, Uint8Array>();

  for (const [path, content] of files) {
    const hash = await sha256Hex16(content);
    manifest[path] = { hash, size: content.byteLength };
    byHash.set(hash, content);
  }

  await onProgress(`آپلود UI: ${files.size} فایل…`);

  const session = await cf(
    token,
    'POST',
    `/accounts/${accountId}/workers/scripts/${script}/assets-upload-session`,
    { manifest }
  );

  let jwt = session.result?.jwt as string;
  if (!jwt) throw new Error('Assets upload session: missing jwt');

  const buckets: string[][] = session.result?.buckets || [];
  if (!buckets.length) {
    // everything already cached — jwt is completion token
    await onProgress('فایل‌های UI از قبل روی Cloudflare بودند', true);
    return jwt;
  }

  let uploaded = 0;
  for (const bucket of buckets) {
    const form = new FormData();
    for (const hash of bucket) {
      const content = byHash.get(hash);
      if (!content) continue;
      form.append(hash, bytesToBase64(content));
    }
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/assets/upload?base64=true`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: form,
      }
    );
    const data = await res.json<any>().catch(() => ({}));
    if (!res.ok && res.status !== 201) {
      throw new Error(`Assets upload failed: ${JSON.stringify(data.errors || data).slice(0, 300)}`);
    }
    if (data?.result?.jwt) jwt = data.result.jwt;
    else if (data?.jwt) jwt = data.jwt;
    uploaded += bucket.length;
    await onProgress(`آپلود UI: ${uploaded} فایل…`);
  }

  await onProgress(`آپلود UI تمام شد (${files.size} فایل)`, true);
  return jwt;
}

async function deployWorkerModule(
  token: string,
  accountId: string,
  script: string,
  moduleBytes: Uint8Array,
  d1Id: string,
  assetsJwt: string | null
): Promise<void> {
  const bindings: any[] = [
    { type: 'd1', name: 'DB', id: d1Id },
    { type: 'assets', name: 'ASSETS' },
  ];

  const settings = await getScriptSettings(token, accountId, script);
  const existing = settings?.result?.bindings || settings?.result?.script?.bindings;
  if (Array.isArray(existing) && existing.length) {
    for (const b of existing) {
      if (!b?.name || b.name === 'DB' || b.name === 'ASSETS' || b.type === 'd1' || b.type === 'assets') {
        continue;
      }
      const copy = { ...b };
      delete copy.dataset_id;
      bindings.push(copy);
    }
  }

  const metadata: Record<string, unknown> = {
    main_module: 'worker.mjs',
    bindings,
    compatibility_date: '2024-11-01',
  };

  if (assetsJwt) {
    metadata.assets = { jwt: assetsJwt };
  } else {
    // Keep previous static UI if rolling assets missing
    metadata.keep_assets = true;
  }

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append(
    'worker.mjs',
    new Blob([moduleBytes as BlobPart], { type: 'application/javascript+module' }),
    'worker.mjs'
  );

  await cf(token, 'PUT', `/accounts/${accountId}/workers/scripts/${script}`, form);
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
    await step(env.DB, job, 'شروع به‌روزرسانی پنل…');

    if (!token || token.length < 20) {
      throw new Error(
        'توکن Cloudflare ذخیره نشده. در همین صفحه توکن را ذخیره کنید و دوباره تلاش کنید.'
      );
    }
    await step(env.DB, job, 'توکن Cloudflare آماده است', true);

    await step(env.DB, job, 'دریافت آخرین commit از GitHub (main)…');
    const latest = await latestMainSha();
    job.commit = latest.sha;
    await step(env.DB, job, `آخرین commit: ${latest.sha} — ${latest.message}`, true);

    await step(env.DB, job, 'شناسایی اکانت و Worker…');
    if (!accountId) {
      const accounts = await cf(token, 'GET', '/accounts?per_page=5');
      const list = accounts.result || [];
      if (!list.length) throw new Error('هیچ اکانت Cloudflare برای این توکن پیدا نشد');
      accountId = list[0].id;
      await kvSet(env.DB, 'panel.cf_account_id', accountId);
    }
    await step(env.DB, job, `اکانت: ${accountId.slice(0, 8)}… · Worker: ${workerName}`, true);

    if (!d1Id) {
      const settings = await getScriptSettings(token, accountId, workerName);
      const bindings = settings?.result?.bindings || [];
      const d1 = bindings.find((b: any) => b.type === 'd1' || b.name === 'DB');
      d1Id = d1?.id || d1?.database_id || '';
      if (d1Id) await kvSet(env.DB, 'panel.d1_id', d1Id);
    }
    if (!d1Id) {
      throw new Error(
        'شناسه D1 پیدا نشد. یک‌بار از نصب‌کننده/ربات پنل بسازید یا panel.d1_id را ذخیره کنید.'
      );
    }
    await step(env.DB, job, `D1 حفظ می‌شود: ${d1Id.slice(0, 8)}…`, true);

    await step(env.DB, job, 'دانلود باندل Worker از GitHub (rolling)…');
    const moduleBytes = await downloadReleaseAsset('worker.mjs', 1000);
    await step(
      env.DB,
      job,
      `باندل Worker دریافت شد (${Math.round(moduleBytes.byteLength / 1024)} KB)`,
      true
    );

    let assetsJwt: string | null = null;
    try {
      await step(env.DB, job, 'دانلود باندل UI (assets.tar.gz)…');
      const gz = await downloadReleaseAsset('assets.tar.gz', 1000);
      await step(env.DB, job, `UI فشرده: ${Math.round(gz.byteLength / 1024)} KB`, true);
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
        `UI bundle در دسترس نیست — فقط Worker آپدیت می‌شود (UI قبلی نگه داشته می‌شود): ${msg.slice(0, 120)}`
      );
      assetsJwt = null;
    }

    await step(env.DB, job, 'دیپلوی روی Cloudflare Workers (بدون پاک شدن کاربران/D1)…');
    await deployWorkerModule(token, accountId, workerName, moduleBytes, d1Id, assetsJwt);
    await step(env.DB, job, 'دیپلوی با موفقیت انجام شد', true);

    await kvSet(env.DB, 'panel.version', XRayMOD_VERSION);
    await kvSet(env.DB, 'panel.last_update_commit', latest.sha);
    await kvSet(env.DB, 'panel.worker_name', workerName);

    job.status = 'done';
    job.finishedAt = Date.now();
    await step(env.DB, job, 'تمام — صفحه را یک‌بار رفرش کنید', true);
    await writeJob(env.DB, job);
    return job;
  } catch (e) {
    job.status = 'error';
    job.error = e instanceof Error ? e.message : String(e);
    job.finishedAt = Date.now();
    await step(env.DB, job, `خطا: ${job.error}`, false);
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
