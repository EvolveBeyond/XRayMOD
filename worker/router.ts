/**
 * Router — Gen 5.1: compulsory SECURE PATH, silent 404 fallback, no public fingerprints.
 * Pipeline: schema → proxy guards → canary → secure-path gate → routes → SPA/404.
 */
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
import { handleTools } from './api/tools';
import { handleAdmin } from './api/admin';
import { handleLab } from './api/lab';
import { handleSubscription } from './subscription';
import { handleUserPortal } from './user-portal';
import { handleProxyTraffic } from './proxy';
import {
  getDisguiseConfig,
  getDecoyResponse,
  remapDisguisePath,
  getCanaryPaths,
  matchCanary,
  silent404,
} from './disguise';
import { isGrpcRequest } from './proxy/grpc';
import { isXHTTPRequest } from './proxy/xhttp';
import { serveStatic, serveRemotePages } from './static';
import { renderLoginPage } from './panel-login';
import { appendAudit, clientIp } from './lib/audit';

type Handler = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
) => Promise<Response>;

type Route = {
  pattern: RegExp;
  handler: Handler;
  params?: string[];
};

const routes: Route[] = [
  { pattern: /^\/install(?:\/|$)/, handler: handleInstall },
  { pattern: /^\/api\/login$/, handler: handleLogin },
  { pattern: /^\/api\/logout$/, handler: handleLogout },
  { pattern: /^\/api\/health$/, handler: handleHealth },
  { pattern: /^\/api\/nodes(?:\/([^/]+))?$/, handler: handleNodes, params: ['id'] },
  { pattern: /^\/api\/users(?:\/([^/]+))?$/, handler: handleUsers, params: ['id'] },
  { pattern: /^\/api\/protocols$/, handler: handleProtocols },
  { pattern: /^\/api\/configs(?:\/([^/]+))?$/, handler: handleConfigs, params: ['id'] },
  { pattern: /^\/api\/settings$/, handler: handleSettings },
  { pattern: /^\/api\/cleanip(?:\/([^/]+))?$/, handler: handleCleanIP, params: ['action'] },
  { pattern: /^\/api\/backends(?:\/([^/]+))?$/, handler: handleBackends, params: ['id'] },
  { pattern: /^\/api\/wizard(?:\/([^/]+))?$/, handler: handleWizard, params: ['action'] },
  { pattern: /^\/api\/tools(?:\/([^/]+))?$/, handler: handleTools, params: ['action'] },
  { pattern: /^\/api\/admin(?:\/([^/]+))?$/, handler: handleAdmin, params: ['action'] },
  { pattern: /^\/api\/lab(?:\/([^/]+))?$/, handler: handleLab, params: ['action'] },
  { pattern: /^\/sub\/([^/]+)$/, handler: handleSubscription, params: ['token'] },
  { pattern: /^\/me\/([^/]+)$/, handler: handleUserPortal, params: ['token'] },
  { pattern: /^\/status\/([^/]+)$/, handler: handleUserPortal, params: ['token'] },
];

function matchRoute(pathname: string): { handler: Handler; params: Record<string, string> } | null {
  for (const route of routes) {
    const m = pathname.match(route.pattern);
    if (!m) continue;
    const params: Record<string, string> = {};
    const names = route.params || [];
    for (let i = 0; i < names.length; i++) {
      const val = m[i + 1];
      if (val !== undefined && val !== '') {
        params[names[i]] = val.replace(/^\//, '');
      }
    }
    return { handler: route.handler, params };
  }
  return null;
}

async function checkProxyGuards(env: Env): Promise<Response | null> {
  const pausedRow = await env.DB.prepare(
    'SELECT v FROM kvstore WHERE k = ?'
  ).bind('panel.paused').first<{ v: string }>();
  if (pausedRow?.v === 'true') {
    return new Response('Service paused', { status: 503 });
  }

  const capRow = await env.DB.prepare(
    'SELECT v FROM kvstore WHERE k = ?'
  ).bind('panel.monthly_cap_gb').first<{ v: string }>();
  const capGB = Number(capRow?.v || 0);
  if (capGB > 0) {
    const trafficRow = await env.DB.prepare(
      'SELECT SUM(traffic_used) as total FROM users'
    ).first<{ total: number }>();
    const usedBytes = trafficRow?.total || 0;
    if (usedBytes >= capGB * 1073741824) {
      return new Response('Monthly data cap reached', { status: 503 });
    }
  }
  return null;
}

function isStaticAssetPath(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    /\.(js|css|map|woff2?|ttf|eot|png|jpg|jpeg|gif|svg|ico|webp|txt)$/i.test(pathname)
  );
}

/** Mini App / Telegram / store routes — deleted from product; hard 404. */
function isRemovedPath(pathname: string): boolean {
  const p = pathname.toLowerCase();
  return (
    p === '/twa' ||
    p.startsWith('/twa/') ||
    p === '/bot' ||
    p.startsWith('/bot/') ||
    p === '/api/commerce' ||
    p.startsWith('/api/commerce/')
  );
}

async function serveAsset(
  request: Request,
  env: Env,
  pathname: string
): Promise<Response | null> {
  if (!env.ASSETS || !isStaticAssetPath(pathname)) return null;
  try {
    // Fresh GET — do not clone browser conditional headers (If-None-Match → 304)
    // or the original /{uuid}/... URL into the Assets lookup.
    const assetRes = await env.ASSETS.fetch(
      new Request(new URL(pathname, 'https://assets.local'), { method: 'GET' })
    );
    if (assetRes.status === 200) {
      const headers = new Headers(assetRes.headers);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      return new Response(assetRes.body, { status: 200, headers });
    }
  } catch (e) {
    console.error('ASSETS fetch failed', e);
  }
  return silent404();
}

/** Unknown / unauthorized → plain 404 or configured decoy (never brand the product). */
async function denyPublic(env: Env, host: string): Promise<Response> {
  const disguise = await getDisguiseConfig(env, env.DB);
  if (disguise.on && disguise.fallbackPage && disguise.fallbackPage !== '404') {
    return getDecoyResponse(host, disguise.fallbackPage);
  }
  return silent404();
}

export async function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    if (request.method === 'OPTIONS') {
      const origin = request.headers.get('Origin') || '';
      const host = new URL(request.url).origin;
      // Same-origin only — no public CORS wildcard fingerprint
      const allow = !origin || origin === host ? origin || host : 'null';
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allow,
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Buyer-Key, X-Ref',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
          Vary: 'Origin',
        },
      });
    }

    await ensureSchema(env.DB);

    const url = new URL(request.url);
    let pathname = url.pathname;
    let panelPrefix = '';
    const isUpgrade = request.headers.get('Upgrade') === 'websocket';
    const isGrpc = request.method === 'POST' && isGrpcRequest(request);
    const isXhttp = request.method === 'POST' && isXHTTPRequest(request);

    // Removed product surfaces — never SPA-fallback or serve leftover assets
    if (isRemovedPath(pathname)) {
      return silent404();
    }

    // WebSocket / gRPC / XHTTP → proxy (same Worker edge; kill switch + monthly cap)
    if (isUpgrade || isGrpc || isXhttp) {
      const blocked = await checkProxyGuards(env);
      if (blocked) return blocked;
      return handleProxyTraffic(request, env, ctx);
    }

    // Canary traps (before secure-path — scanners probe public paths)
    try {
      const ip = clientIp(request);
      const blockedRaw = await env.DB.prepare(
        'SELECT v FROM kvstore WHERE k = ?'
      )
        .bind('canary.blocked_ips')
        .first<{ v: string }>();
      if (blockedRaw?.v) {
        try {
          const blocked = JSON.parse(blockedRaw.v) as string[];
          if (Array.isArray(blocked) && blocked.includes(ip)) {
            return silent404();
          }
        } catch {
          /* ignore */
        }
      }

      const canaries = await getCanaryPaths(env.DB);
      const hit = matchCanary(pathname, canaries);
      if (hit) {
        const asn = String((request as any).cf?.asn || '');
        const country = String((request as any).cf?.country || '');
        await appendAudit(
          env.DB,
          'canary_hit',
          `path=${pathname} bait=${hit} asn=${asn} country=${country}`,
          ip,
          'scanner'
        );
        // Professional canary report for Lab UI
        try {
          const row = await env.DB.prepare(
            'SELECT v FROM kvstore WHERE k = ?'
          )
            .bind('canary.report')
            .first<{ v: string }>();
          let report: { hits: any[]; blocked: string[] } = { hits: [], blocked: [] };
          if (row?.v) {
            try {
              report = JSON.parse(row.v);
            } catch {
              /* ignore */
            }
          }
          report.hits = [
            {
              at: Date.now(),
              ip,
              path: pathname,
              bait: hit,
              asn,
              country,
              ua: (request.headers.get('user-agent') || '').slice(0, 120),
            },
            ...(report.hits || []),
          ].slice(0, 100);
          await env.DB.prepare(
            'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
          )
            .bind('canary.report', JSON.stringify(report), Date.now())
            .run();
        } catch {
          /* ignore */
        }
        return denyPublic(env, url.host);
      }
    } catch {
      /* ignore */
    }

    const accessUuid = await env.DB.prepare(
      'SELECT v FROM kvstore WHERE k = ?'
    ).bind('panel.access_uuid').first<{ v: string }>();

    const pw = await env.DB.prepare(
      'SELECT v FROM kvstore WHERE k = ?'
    ).bind('panel.password_hash').first<{ v: string }>();

    const isConfigured = !!(accessUuid?.v && pw?.v);

    // First-boot only: /install stays public until panel is bootstrapped
    if (!isConfigured && (pathname === '/install' || pathname.startsWith('/install/'))) {
      return handleInstall(request, env, ctx, {});
    }

    // Static Next assets must be absolute (/_next/...) for nested SPA routes.
    // Serving them without SECURE PATH avoids broken chunk loads on /panel/*.
    if (pathname.startsWith('/_next/') || pathname.startsWith('/favicon')) {
      return (await serveAsset(request, env, pathname)) || silent404();
    }

    // Compulsory SECURE PATH (access UUID) for everything except first-boot install.
    if (isConfigured) {
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length === 0 || segments[0] !== accessUuid!.v) {
        // Bare /api, /login, etc. without SECURE PATH → silent 404/decoy
        return denyPublic(env, url.host);
      }
      panelPrefix = `/${accessUuid!.v}`;
      pathname = '/' + segments.slice(1).join('/');
      if (pathname === '/') pathname = '/';
      url.pathname = pathname;

      if (isRemovedPath(pathname)) {
        return silent404();
      }

      // Non-_next static under SECURE PATH (rare)
      if (isStaticAssetPath(pathname)) {
        return (await serveAsset(request, env, pathname)) || silent404();
      }
    } else {
      // Not configured: allow install wizard assets at root for setup UI
      if (isStaticAssetPath(pathname)) {
        const asset = await serveAsset(request, env, pathname);
        if (asset) return asset;
      }
      if (pathname === '/' || pathname === '') {
        return new Response(null, {
          status: 302,
          headers: { Location: '/install' },
        });
      }
      if (pathname.startsWith('/install')) {
        return handleInstall(request, env, ctx, {});
      }
      return silent404();
    }

    // Secret-path remapping + decoy for leaked /admin|/login
    {
      const disguise = await getDisguiseConfig(env, env.DB);
      const remapped = remapDisguisePath(pathname, disguise);
      if (remapped.isDecoy) {
        return denyPublic(env, url.host);
      }
      pathname = remapped.remapped;
      url.pathname = pathname;
    }

    const route = matchRoute(pathname);
    if (route) {
      return route.handler(request, env, ctx, route.params);
    }

    const isRoot = pathname === '/' || pathname === '';
    if (isRoot) {
      return new Response(null, {
        status: 302,
        headers: { Location: `${panelPrefix}/login` },
      });
    }

    if (pathname === '/login' || pathname === '/login/') {
      return renderLoginPage(url.origin, panelPrefix);
    }

    const fromAssets = await serveStatic(request, env, pathname, url.origin, panelPrefix);
    if (fromAssets) return fromAssets;

    if (env.PAGES_URL) {
      const remote = await serveRemotePages(pathname, env.PAGES_URL, url.origin, panelPrefix);
      if (remote) return remote;
    }

    return denyPublic(env, url.host);
  } catch (e) {
    console.error('Router error:', e);
    // Never leak stack / product name on errors
    return silent404();
  }
}
