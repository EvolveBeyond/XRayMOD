/**
 * IOP Router — routes requests by intent, not by URL patterns.
 *
 * Pipeline: detect intent → process by intent type → return response
 * Each processor is independent — add new intents without touching this file.
 */
import type { Env } from './types';
import { ensureSchema } from './schema';
import { detectIntent, processIntent } from './intent';

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
    // CORS preflight — fast exit, no intent detection needed
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

    // ── IOP Pipeline ────────────────────────────────────────
    // 1. Detect intent from request
    const intent = detectIntent(request, url, env);

    // 2. Process by intent type
    return processIntent(intent, request, env, ctx);
  } catch (e) {
    return errorPage(e instanceof Error ? e.message : 'Unknown error');
  }
}
