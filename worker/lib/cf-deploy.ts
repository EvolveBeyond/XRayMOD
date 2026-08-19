/**
 * Cloudflare Workers module deploy + static assets upload (rolling bundle path).
 * Shared by in-panel self-update and wizard remote deploy.
 */
import { CloudflareEdgeProvider } from './edge-provider';

const REPO = 'askarniroomand/XRayMOD';
const cfProvider = new CloudflareEdgeProvider();

async function cf(
  token: string,
  method: string,
  path: string,
  body?: unknown,
  contentType = 'application/json'
): Promise<any> {
  return cfProvider.request({ apiToken: token, accountId: '' }, method, path, body, contentType);
}

export async function downloadRollingAsset(
  name: string,
  minBytes = 500,
  cacheBust = ''
): Promise<Uint8Array> {
  const q = cacheBust ? `?v=${encodeURIComponent(cacheBust)}` : '';
  const urls = [
    `https://github.com/${REPO}/releases/download/rolling/${name}${q}`,
    `https://cdn.jsdelivr.net/gh/${REPO}@rolling/${name}${q}`,
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

export async function rollingTagSha(): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/git/ref/tags/rolling`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'XRayMOD-Deploy',
    },
  });
  if (!res.ok) throw new Error(`GitHub rolling tag HTTP ${res.status}`);
  const data = (await res.json()) as { object?: { sha?: string } };
  const sha = (data.object?.sha || '').slice(0, 12);
  if (!sha) throw new Error('GitHub: rolling tag missing sha');
  return sha;
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
export function untar(buf: Uint8Array): Map<string, Uint8Array> {
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
    if (typeFlag !== 0 && typeFlag !== 48) continue;
    const path = name.startsWith('./') ? name.slice(1) : name.startsWith('/') ? name : `/${name}`;
    const normalized = path.replace(/\/+/g, '/');
    out.set(normalized.startsWith('/') ? normalized : `/${normalized}`, content.slice());
  }
  return out;
}

export async function gunzip(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('gzip');
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function unpackRollingAssets(cacheBust = ''): Promise<Map<string, Uint8Array>> {
  const gz = await downloadRollingAsset('assets.tar.gz', 1000, cacheBust);
  const tar = await gunzip(gz);
  const files = untar(tar);
  if (files.size < 1) throw new Error('assets.tar.gz empty');
  return files;
}

async function getScriptSettings(token: string, accountId: string, script: string): Promise<any> {
  try {
    return await cf(token, 'GET', `/accounts/${accountId}/workers/scripts/${script}/settings`);
  } catch {
    return null;
  }
}

export async function uploadAssets(
  token: string,
  accountId: string,
  script: string,
  files: Map<string, Uint8Array>,
  onProgress?: (msg: string, ok?: boolean) => void | Promise<void>
): Promise<string> {
  const manifest: Record<string, { hash: string; size: number }> = {};
  const byHash = new Map<string, Uint8Array>();

  for (const [path, content] of files) {
    const hash = await sha256Hex16(content);
    manifest[path] = { hash, size: content.byteLength };
    byHash.set(hash, content);
  }

  await onProgress?.(`Upload UI: ${files.size} files…`);

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
    await onProgress?.('UI files already on Cloudflare', true);
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
    await onProgress?.(`Upload UI: ${uploaded} files…`);
  }

  await onProgress?.(`UI upload done (${files.size} files)`, true);
  return jwt;
}

export async function deployWorkerModule(
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

  const have = new Set(bindings.map((b) => b.name));
  for (const [name, text] of [
    ['EXTERNAL_SERVER_URL', ''],
    ['DISGUISE_PAGE', '404'],
    ['PANEL_RECOVERY', 'false'],
    ['CRYPTO_KEY', ''],
  ] as const) {
    if (!have.has(name)) bindings.push({ type: 'plain_text', name, text });
  }

  const metadata: Record<string, unknown> = {
    main_module: 'worker.mjs',
    bindings,
    compatibility_date: '2024-11-01',
  };

  if (assetsJwt) {
    metadata.assets = {
      jwt: assetsJwt,
      config: {
        run_worker_first: true,
        not_found_handling: 'none',
      },
    };
  } else {
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
