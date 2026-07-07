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
import { handleSubscription } from './subscription';
import { handleProxyTraffic } from './proxy';

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

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function notFound(): Response {
  return jsonResponse({ success: false, message: 'Not found' }, 404);
}

const routes: Route[] = [
  // Public routes
  {
    pattern: new URLPattern({ pathname: '/install' }),
    handler: handleInstall,
  },
  {
    pattern: new URLPattern({ pathname: '/api/login' }),
    handler: handleLogin,
  },
  {
    pattern: new URLPattern({ pathname: '/api/health' }),
    handler: handleHealth,
  },
  // Auth routes
  {
    pattern: new URLPattern({ pathname: '/api/logout' }),
    handler: handleLogout,
  },
  // Admin routes
  {
    pattern: new URLPattern({ pathname: '/api/nodes' }),
    handler: handleNodes,
  },
  {
    pattern: new URLPattern({ pathname: '/api/nodes/:id' }),
    handler: handleNodes,
  },
  {
    pattern: new URLPattern({ pathname: '/api/users' }),
    handler: handleUsers,
  },
  {
    pattern: new URLPattern({ pathname: '/api/users/:id' }),
    handler: handleUsers,
  },
  {
    pattern: new URLPattern({ pathname: '/api/protocols' }),
    handler: handleProtocols,
  },
  {
    pattern: new URLPattern({ pathname: '/api/configs' }),
    handler: handleConfigs,
  },
  {
    pattern: new URLPattern({ pathname: '/api/configs/:id' }),
    handler: handleConfigs,
  },
  {
    pattern: new URLPattern({ pathname: '/api/settings' }),
    handler: handleSettings,
  },
  // Subscription route
  {
    pattern: new URLPattern({ pathname: '/sub/:token' }),
    handler: handleSubscription,
  },
];

export async function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  // Handle CORS preflight
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

  // Ensure database schema is initialized
  ctx.waitUntil(ensureSchema(env.DB));

  // Check for WebSocket upgrade (proxy traffic)
  if (request.headers.get('Upgrade') === 'websocket') {
    return handleProxyTraffic(request, env, ctx);
  }

  // Check if panel is configured (redirect to /install if not)
  if (!url.pathname.startsWith('/install') && !url.pathname.startsWith('/api/health')) {
    const configured = await env.DB.prepare(
      'SELECT v FROM kvstore WHERE k = ?'
    )
      .bind('panel.password_hash')
      .first<{ v: string }>();

    if (!configured || !configured.v) {
      // Not configured, redirect to /install
      return new Response(null, {
        status: 302,
        headers: { Location: '/install' },
      });
    }
  }

  // Try matching API routes
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

  // Serve static assets — try ASSETS binding first, then PAGES_URL, then fallback
  const pagesUrl = (env as any).PAGES_URL as string | undefined;

  // 1. Try ASSETS binding (if deployed with assets)
  if (env.ASSETS) {
    try {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status === 200) {
        return assetResponse;
      }
    } catch (_e) {}

    if (!url.pathname.startsWith('/api/') && !url.pathname.includes('.')) {
      try {
        const indexRequest = new Request(new URL('/index.html', request.url).toString(), request);
        return await env.ASSETS.fetch(indexRequest);
      } catch (_e) {}
    }
  }

  // 2. Try PAGES_URL (fetch from GitHub Pages or static host)
  if (pagesUrl && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/sub/')) {
    const workerOrigin = new URL(request.url).origin;
    const apiScript = `<script>window.__API_BASE="${workerOrigin}";</script>`;

    const injectApiBase = async (html: string): Promise<Response> => {
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

    // SPA fallback via PAGES_URL
    try {
      const spaUrl = pagesUrl.replace(/\/$/, '') + '/index.html';
      const spaResponse = await fetch(spaUrl);
      if (spaResponse.status === 200) {
        const html = await spaResponse.text();
        return injectApiBase(html);
      }
    } catch (_e) {}
  }

  // 3. Fallback: status page
  if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/sub/')) {
    return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XrayMOD</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #09090b; color: #fafafa;
           display: grid; place-items: center; min-height: 100vh; }
    .box { text-align: center; padding: 2rem; max-width: 480px; }
    .icon { width: 48px; height: 48px; background: #10b981; border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            font-weight: 900; font-size: 1.5rem; color: #000; margin: 0 auto 1.5rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #a1a1aa; margin-bottom: 1rem; font-size: 0.875rem; line-height: 1.6; }
    a { color: #10b981; text-decoration: none; }
    .status { padding: 1rem; background: #18181b; border: 1px solid #27272a;
              border-radius: 0.75rem; margin-top: 1.5rem; text-align: left; }
    .row { display: flex; justify-content: space-between; padding: 0.25rem 0;
            font-size: 0.875rem; }
    .label { color: #71717a; }
    .ok { color: #10b981; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">X</div>
    <h1>XrayMOD</h1>
    <p>Panel is deployed and the API is running.<br>
       The frontend needs to be built and uploaded separately.</p>
    <div class="status">
      <div class="row"><span class="label">API Health</span><span class="ok"><a href="/api/health">/api/health</a></span></div>
      <div class="row"><span class="label">Login</span><span class="ok"><a href="/api/login">POST /api/login</a></span></div>
      <div class="row"><span class="label">Docs</span><span class="ok"><a href="https://github.com/EvolveBeyond/XRayMOD">GitHub</a></span></div>
    </div>
  </div>
</body>
</html>`, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return notFound();
}
