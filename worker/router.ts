/**
 * IOP Router — routes requests by intent, with full security pipeline.
 *
 * Pipeline: UUID check → Intent detection → Disguise fallback → Process
 */
import type { Env } from './types';
import { ensureSchema } from './schema';
import { detectIntent, processIntent } from './intent';
import { getDisguiseConfig, getDecoyResponse } from './disguise';
import { isGrpcRequest } from './proxy/grpc';
import { isXHTTPRequest } from './proxy/xhttp';

// Register all processors (side effect — adds to registry)
import './processors';

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
    // CORS preflight — fast exit
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

    // Ensure DB schema
    await ensureSchema(env.DB);

    const url = new URL(request.url);
    let pathname = url.pathname;

    // ══════════════════════════════════════════════════════════
    // STEP 1: Bypass routes (no UUID check needed)
    // ══════════════════════════════════════════════════════════
    const bypassUUID = pathname.startsWith('/install') ||
                       pathname.startsWith('/api/') ||
                       pathname.startsWith('/sub/') ||
                       pathname.startsWith('/bot') ||
                       request.headers.get('Upgrade') === 'websocket';

    // ══════════════════════════════════════════════════════════
    // STEP 2: Proxy traffic (WebSocket/gRPC/XHTTP) — bypass disguise
    // ══════════════════════════════════════════════════════════
    if (request.headers.get('Upgrade') === 'websocket') {
      const intent = detectIntent(request, url, env);
      return processIntent(intent, request, env, ctx);
    }

    // gRPC/XHTTP POST — proxy traffic
    if (request.method === 'POST' && !pathname.startsWith('/api/') && !pathname.startsWith('/install')) {
      if (isGrpcRequest(request) || isXHTTPRequest(request)) {
        const intent = detectIntent(request, url, env);
        return processIntent(intent, request, env, ctx);
      }
    }

    // ══════════════════════════════════════════════════════════
    // STEP 3: UUID-based panel access
    // ══════════════════════════════════════════════════════════
    const panelUUID = await env.DB.prepare(
      'SELECT v FROM kvstore WHERE k = ?'
    ).bind('panel.access_uuid').first<{ v: string }>();

    const accessUuid = panelUUID?.v;

    if (accessUuid && !bypassUUID) {
      const segments = pathname.split('/').filter(Boolean);

      // No UUID in path → check disguise
      if (segments.length === 0 || segments[0] !== accessUuid) {
        // Check if not configured yet → redirect to /install
        const configured = await env.DB.prepare(
          'SELECT v FROM kvstore WHERE k = ?'
        ).bind('panel.password_hash').first<{ v: string }>();

        if (!configured || !configured.v) {
          return new Response(null, {
            status: 302,
            headers: { Location: '/install' },
          });
        }

        // Show disguise page
        const disguise = await getDisguiseConfig(env, env.DB);
        return getDecoyResponse(url.host, disguise.fallbackPage);
      }

      // UUID matches → strip it and continue
      pathname = '/' + segments.slice(1).join('/');
      url.pathname = pathname || '/';
    }

    // ══════════════════════════════════════════════════════════
    // STEP 4: Not configured → redirect to /install
    // ══════════════════════════════════════════════════════════
    if (!bypassUUID && !accessUuid) {
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
        // DB might not be ready yet
      }
    }

    // ══════════════════════════════════════════════════════════
    // STEP 5: Detect intent and process
    // ══════════════════════════════════════════════════════════
    const intent = detectIntent(request, url, env);
    const response = await processIntent(intent, request, env, ctx);

    // ══════════════════════════════════════════════════════════
    // STEP 6: Disguise fallback for unmatched paths
    // ══════════════════════════════════════════════════════════
    if (response.status === 404 && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/sub/')) {
      const disguise = await getDisguiseConfig(env, env.DB);
      if (disguise.on) {
        return getDecoyResponse(url.host, disguise.fallbackPage);
      }
    }

    return response;
  } catch (e) {
    return errorPage(e instanceof Error ? e.message : 'Unknown error');
  }
}
