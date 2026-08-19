import type { Env } from './types';

/**
 * Serve Next.js static export (frontend/out) via Workers Assets binding.
 * Injects __API_BASE and __PANEL_PREFIX so the SPA keeps the stealth UUID.
 */
export async function serveStatic(
  request: Request,
  env: Env,
  pathname: string,
  origin: string,
  panelPrefix = ''
): Promise<Response | null> {
  if (!env.ASSETS) return null;

  // Never SPA-fallback removed Mini App / Telegram / store paths
  const lower = pathname.toLowerCase();
  if (
    lower === '/twa' ||
    lower.startsWith('/twa/') ||
    lower === '/bot' ||
    lower.startsWith('/bot/') ||
    lower.startsWith('/api/commerce')
  ) {
    return null;
  }

  const candidates = buildAssetCandidates(pathname);

  for (const path of candidates) {
    try {
      const assetReq = new Request(new URL(path, request.url), request);
      const res = await env.ASSETS.fetch(assetReq);
      if (res.status === 200) {
        return injectHtmlGlobals(res, origin, panelPrefix, path);
      }
    } catch {
      /* try next */
    }
  }

  // SPA fallback only for real panel/login routes — not arbitrary paths
  if (
    pathname === '/' ||
    pathname.startsWith('/panel') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/install')
  ) {
    try {
      const spa = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
      if (spa.status === 200) {
        return injectHtmlGlobals(spa, origin, panelPrefix, pathname);
      }
    } catch {
      /* ignore */
    }
  }

  return null;
}

function buildAssetCandidates(pathname: string): string[] {
  const p = pathname === '' ? '/' : pathname;
  const clean = p.replace(/\/+$/, '') || '/';
  const out: string[] = [];

  if (clean === '/') {
    out.push('/login.html', '/panel.html', '/index.html');
    return out;
  }

  // Prefer explicit HTML before bare paths — Assets may serve HTML bytes as octet-stream on /panel
  if (!clean.includes('.')) {
    out.push(`${clean}.html`);
    out.push(`${clean}/index.html`);
  }
  out.push(clean);
  if (clean === '/login') out.push('/login.html');
  if (clean === '/panel') out.push('/panel.html');

  return [...new Set(out)];
}

function isHtmlPayload(text: string): boolean {
  const t = text.trimStart().slice(0, 64).toLowerCase();
  return t.startsWith('<!doctype') || t.startsWith('<html');
}

function isHtmlRoute(path: string): boolean {
  const p = path.replace(/\/+$/, '') || '/';
  return (
    p.endsWith('.html') ||
    p === '/panel' ||
    p === '/login' ||
    p === '/install' ||
    p.startsWith('/panel/') ||
    p.startsWith('/login/') ||
    p.startsWith('/install/')
  );
}

async function injectHtmlGlobals(
  res: Response,
  origin: string,
  panelPrefix: string,
  pathHint = ''
): Promise<Response> {
  const ct = res.headers.get('content-type') || '';
  const treatAsHtml =
    ct.includes('text/html') || isHtmlRoute(pathHint) || ct.includes('octet-stream');

  if (!treatAsHtml) {
    return new Response(res.body, { status: res.status, headers: res.headers });
  }

  const raw = await res.text();
  if (!isHtmlPayload(raw)) {
    return new Response(raw, { status: res.status, headers: res.headers });
  }

  let html = raw;
  const script =
    `<script>` +
    `window.__API_BASE=${JSON.stringify(origin)};` +
    `window.__PANEL_PREFIX=${JSON.stringify(panelPrefix || '')};` +
    `</script>`;

  if (html.includes('<head>')) {
    html = html.replace('<head>', `<head>${script}`);
  } else if (html.includes('<head ')) {
    html = html.replace(/<head([^>]*)>/, `<head$1>${script}`);
  } else {
    html = script + html;
  }

  // Keep Next absolute /_next as-is (Worker serves it publicly for nested routes).
  // Only rewrite app routes + favicon under SECURE PATH.
  if (panelPrefix) {
    html = html.replace(/(href|src)=(["'])\/favicon/g, `$1=$2${panelPrefix}/favicon`);
    html = html.replace(
      /(href|src)=(["'])\/(panel|login|install)(\/|"|'|\?|#)/g,
      `$1=$2${panelPrefix}/$3$4`
    );
  }

  const headers = new Headers(res.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  headers.delete('content-length');
  return new Response(html, { status: 200, headers });
}

export async function serveRemotePages(
  pathname: string,
  pagesUrl: string,
  origin: string,
  panelPrefix = ''
): Promise<Response | null> {
  const base = pagesUrl.replace(/\/$/, '');
  const tryPaths =
    pathname === '/' || pathname === ''
      ? ['/login.html', '/index.html']
      : [pathname, `${pathname}.html`, `${pathname}/index.html`, '/index.html'];

  for (const p of tryPaths) {
    try {
      const remote = await fetch(base + p);
      if (remote.status !== 200) continue;
      const ct = remote.headers.get('content-type') || '';
      const body = await remote.text();
      if (ct.includes('text/html') || p.endsWith('.html')) {
        return injectHtmlGlobals(
          new Response(body, { headers: { 'Content-Type': 'text/html' } }),
          origin,
          panelPrefix,
          p
        );
      }
      return new Response(body, {
        status: 200,
        headers: { 'Content-Type': ct || 'application/octet-stream' },
      });
    } catch {
      /* next */
    }
  }
  return null;
}
