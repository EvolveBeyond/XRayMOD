/**
 * Static processor — serves SPA from Pages, handles disguise fallback.
 */
import type { Env, Intent } from '../intent';
import { getDisguiseConfig, getDecoyResponse } from '../disguise';

const FALLBACK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XrayMOD</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,sans-serif;background:#09090b;color:#fafafa;display:grid;place-items:center;min-height:100vh}
    .box{text-align:center;padding:2rem;max-width:440px}
    .icon{width:48px;height:48px;background:#10b981;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1.5rem;color:#000;margin:0 auto 1.5rem}
    h1{font-size:1.5rem;margin-bottom:.5rem}
    p{color:#a1a1aa;font-size:.875rem;line-height:1.6}
    .links{margin-top:1.5rem;display:flex;flex-direction:column;gap:.5rem}
    .links a{color:#10b981;text-decoration:none;font-size:.875rem}
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">X</div>
    <h1>XrayMOD</h1>
    <p>Panel is deployed. The frontend will be served from GitHub.</p>
    <div class="links">
      <a href="/install">Setup (first time)</a>
      <a href="/api/health">API Health</a>
      <a href="https://github.com/EvolveBeyond/XRayMOD">GitHub</a>
    </div>
  </div>
</body>
</html>`;

export const staticProcessor = async (
  intent: Intent,
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response | null> => {
  if (intent.type !== 'static') return null;

  const url = new URL(request.url);

  // Disguise fallback — unrecognized paths get decoy page
  const disguise = await getDisguiseConfig(env, env.DB);
  if (disguise.on) {
    return getDecoyResponse(url.host, disguise.fallbackPage);
  }

  // Try fetching from PAGES_URL
  const pagesUrl = (env as any).PAGES_URL as string | undefined;
  if (pagesUrl) {
    const workerOrigin = url.origin;
    const apiScript = `<script>window.__API_BASE="${workerOrigin}";</script>`;

    const injectApiBase = (html: string): Response => {
      const modified = html.replace('<head>', `<head>${apiScript}`);
      return new Response(modified, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    };

    try {
      const assetPath = url.pathname === '/' ? '/index.html' : url.pathname;
      const remoteUrl = pagesUrl.replace(/\/$/, '') + assetPath;
      const remoteResponse = await fetch(remoteUrl);
      if (remoteResponse.status === 200) {
        const contentType = remoteResponse.headers.get('content-type') || '';
        const body = await remoteResponse.text();
        if (contentType.includes('text/html') || assetPath.endsWith('.html')) {
          return injectApiBase(body);
        }
        return new Response(body, {
          status: 200,
          headers: { 'Content-Type': contentType },
        });
      }
    } catch (_e) {}

    // SPA fallback
    try {
      const spaUrl = pagesUrl.replace(/\/$/, '') + '/index.html';
      const spaResponse = await fetch(spaUrl);
      if (spaResponse.status === 200) {
        const html = await spaResponse.text();
        return injectApiBase(html);
      }
    } catch (_e) {}
  }

  // Final fallback
  return new Response(FALLBACK_HTML, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};
