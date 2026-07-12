import type { Env } from './types';
import { ensureSchema } from './schema';
import { handleInstall } from './install';
import { handleLogin } from './api/login';
import { handleLogout } from './api/logout';
import { handleHealth } from './api/health';
import { handleNodes } from './api/nodes';
import { handleUsers } from './api/users';
import { handleProtocols } from './api/protocols';
import { handleConfigs } from './api/configs';
import { handleSettings } from './api/settings';
import { handleCleanIP } from './api/cleanip';
import { handleBackends } from './api/backends';
import { handleWizard } from './api/wizard';
import { handleSubscription } from './subscription';
import { handleProxyTraffic } from './proxy';
import { getDisguiseConfig, remapDisguisePath, getDecoyResponse } from './disguise';
import { isGrpcRequest } from './proxy/grpc';
import { isXHTTPRequest } from './proxy/xhttp';
import { handleTelegramWebhook, handleTelegramLogin } from './telegram';
import { getCryptoKey } from './crypto';

type Handler = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
) => Promise<Response>;

interface Route {
  pattern: URLPattern;
  handler: Handler;
}

const routes: Route[] = [
  { pattern: new URLPattern({ pathname: '/install' }), handler: handleInstall },
  { pattern: new URLPattern({ pathname: '/api/login' }), handler: handleLogin },
  { pattern: new URLPattern({ pathname: '/api/logout' }), handler: handleLogout },
  { pattern: new URLPattern({ pathname: '/api/health' }), handler: handleHealth },
  { pattern: new URLPattern({ pathname: '/api/nodes' }), handler: handleNodes },
  { pattern: new URLPattern({ pathname: '/api/nodes/:id' }), handler: handleNodes },
  { pattern: new URLPattern({ pathname: '/api/users' }), handler: handleUsers },
  { pattern: new URLPattern({ pathname: '/api/users/:id' }), handler: handleUsers },
  { pattern: new URLPattern({ pathname: '/api/protocols' }), handler: handleProtocols },
  { pattern: new URLPattern({ pathname: '/api/configs' }), handler: handleConfigs },
  { pattern: new URLPattern({ pathname: '/api/configs/:id' }), handler: handleConfigs },
  { pattern: new URLPattern({ pathname: '/api/settings' }), handler: handleSettings },
  { pattern: new URLPattern({ pathname: '/api/cleanip' }), handler: handleCleanIP },
  { pattern: new URLPattern({ pathname: '/api/cleanip/:action' }), handler: handleCleanIP },
  { pattern: new URLPattern({ pathname: '/api/backends' }), handler: handleBackends },
  { pattern: new URLPattern({ pathname: '/api/backends/:id' }), handler: handleBackends },
  { pattern: new URLPattern({ pathname: '/api/wizard' }), handler: handleWizard },
  { pattern: new URLPattern({ pathname: '/api/wizard/:action' }), handler: handleWizard },
  { pattern: new URLPattern({ pathname: '/api/wizard' }), handler: handleWizard },
  { pattern: new URLPattern({ pathname: '/api/wizard/:action' }), handler: handleWizard },
  { pattern: new URLPattern({ pathname: '/bot' }), handler: handleTelegramWebhook },
  { pattern: new URLPattern({ pathname: '/admin' }), handler: handleTelegramLogin },
  { pattern: new URLPattern({ pathname: '/sub/:token' }), handler: handleSubscription },
];

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

function errorPage(msg: string): Response {
  return new Response(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>XrayMOD Error</title>
<style>body{font-family:system-ui;background:#09090b;color:#fafafa;display:grid;place-items:center;min-height:100vh;margin:0}
.box{text-align:center;padding:2rem;max-width:400px}
h1{color:#ef4444;font-size:1.2rem;margin-bottom:.5rem}
p{color:#a1a1aa;font-size:.875rem}</style></head>
<body><div class="box"><h1>Error</h1><p>${msg}</p></div></body></html>`, {
    status: 500,
    headers: { 'Content-Type': 'text/html' },
  });
}

export async function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);

    // Ensure DB schema
    ctx.waitUntil(ensureSchema(env.DB));

    // WebSocket upgrade — proxy traffic bypasses disguise
    if (request.headers.get('Upgrade') === 'websocket') {
      return handleProxyTraffic(request, env, ctx);
    }

    // gRPC/XHTTP transport — POST-based proxy traffic
    if (request.method === 'POST' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/install')) {
      if (isGrpcRequest(request)) {
        // gRPC traffic — forward to proxy handler
        return handleProxyTraffic(request, env, ctx);
      }
      if (isXHTTPRequest(request)) {
        // XHTTP traffic — forward to proxy handler
        return handleProxyTraffic(request, env, ctx);
      }
    }

    // UUID-based panel access — only serve panel to those who know the UUID
    let pathname = url.pathname;
    const panelUUID = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('panel.access_uuid').first<{ v: string }>();
    const accessUuid = panelUUID?.v;

    // Routes that bypass UUID check (proxy, sub, install, telegram)
    const bypassUUID = pathname.startsWith('/sub/') || pathname.startsWith('/install') ||
                       pathname.startsWith('/bot') || pathname === '/admin' ||
                       request.headers.get('Upgrade') === 'websocket';

    if (accessUuid && !bypassUUID) {
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length === 0 || segments[0] !== accessUuid) {
        // UUID not matched — show decoy
        const disguise = await getDisguiseConfig(env, env.DB);
        return getDecoyResponse(url.host, disguise.fallbackPage);
      }
      // Strip UUID prefix
      pathname = '/' + segments.slice(1).join('/');
      url.pathname = pathname || '/';
    }

    // Disguise system: remap secret paths and serve decoy for leaked real paths
    const disguise = await getDisguiseConfig(env, env.DB);
    if (disguise.on) {
      const { remapped, isDecoy } = remapDisguisePath(pathname, disguise);
      if (isDecoy) {
        return getDecoyResponse(url.host, disguise.fallbackPage);
      }
      if (remapped !== pathname) {
        pathname = remapped;
        url.pathname = pathname;
      }
    }

    // Redirect to /install if not configured (skip API and install routes)
    const skipInstallCheck = pathname.startsWith('/install') ||
                             pathname.startsWith('/api/') ||
                             pathname.startsWith('/sub/');
    if (!skipInstallCheck) {
      try {
        const configured = await env.DB.prepare(
          'SELECT v FROM kvstore WHERE k = ?'
        ).bind('panel.password_hash').first<{ v: string }>();

        if (!configured || !configured.v) {
          return new Response(null, {
            status: 302,
            headers: { Location: '/install' },
          });
        }
      } catch (_e) {
        // DB might not be ready yet, continue
      }
    }

    // Match API routes
    for (const route of routes) {
      const match = route.pattern.exec(url);
      if (match) {
        const params: Record<string, string> = {};
        const routeParams = match.pathname.groups;
        for (const [key, value] of Object.entries(routeParams)) {
          if (value) params[key] = value;
        }
        return route.handler(request, env, ctx, params);
      }
    }

    // When disguise is ON, non-API/non-sub unrecognized paths get the decoy page
    if (disguise.on && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/sub/') && !url.pathname.startsWith('/install')) {
      return getDecoyResponse(url.host, disguise.fallbackPage);
    }

    // Try fetching from PAGES_URL
    const pagesUrl = (env as any).PAGES_URL as string | undefined;
    if (pagesUrl && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/sub/')) {
      const workerOrigin = new URL(request.url).origin;
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
    if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/sub/')) {
      return new Response(FALLBACK_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return notFound();
  } catch (e) {
    return errorPage(e instanceof Error ? e.message : 'Unknown error');
  }
}

function notFound(): Response {
  return jsonResponse({ success: false, message: 'Not found' }, 404);
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
