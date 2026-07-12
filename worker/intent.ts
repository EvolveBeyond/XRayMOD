/**
 * IOP (Intent-Oriented Programming) — Intent detection for XRayMOD Worker.
 *
 * Each request carries its own intent. The pipeline routes by purpose.
 * Processors are independent — add new intents without touching existing code.
 */
import type { Env } from './types';
import { isGrpcRequest } from './proxy/grpc';
import { isXHTTPRequest } from './proxy/xhttp';

// ── Intent Types ────────────────────────────────────────────
export type Intent =
  | { type: 'proxy'; transport: 'websocket' | 'grpc' | 'xhttp' }
  | { type: 'api'; resource: string; action?: string }
  | { type: 'subscription'; token: string }
  | { type: 'install' }
  | { type: 'telegram'; endpoint: 'webhook' | 'login' }
  | { type: 'static'; path: string }
  | { type: 'unknown'; path: string };

// ── Intent Detection ────────────────────────────────────────
export function detectIntent(request: Request, url: URL, env: Env): Intent {
  const pathname = url.pathname;

  // 1. Proxy traffic — WebSocket upgrade
  if (request.headers.get('Upgrade') === 'websocket') {
    return { type: 'proxy', transport: 'websocket' };
  }

  // 2. Proxy traffic — gRPC/XHTTP POST
  if (request.method === 'POST' && !pathname.startsWith('/api/') && !pathname.startsWith('/install')) {
    if (isGrpcRequest(request)) {
      return { type: 'proxy', transport: 'grpc' };
    }
    if (isXHTTPRequest(request)) {
      return { type: 'proxy', transport: 'xhttp' };
    }
  }

  // 3. Install page
  if (pathname === '/install') {
    return { type: 'install' };
  }

  // 4. Telegram endpoints
  if (pathname === '/bot') {
    return { type: 'telegram', endpoint: 'webhook' };
  }
  if (pathname === '/admin') {
    return { type: 'telegram', endpoint: 'login' };
  }

  // 5. Subscription links
  const subMatch = pathname.match(/^\/sub\/([^/]+)/);
  if (subMatch) {
    return { type: 'subscription', token: subMatch[1] };
  }

  // 6. API routes
  if (pathname.startsWith('/api/')) {
    const segments = pathname.split('/').filter(Boolean);
    const resource = segments[1] || '';
    const action = segments[2];
    return { type: 'api', resource, action };
  }

  // 7. Static / SPA
  if (!pathname.startsWith('/api/') && !pathname.startsWith('/sub/')) {
    return { type: 'static', path: pathname };
  }

  return { type: 'unknown', path: pathname };
}

// ── Intent-Based Processor Registry ─────────────────────────
type Processor = (
  intent: Intent,
  request: Request,
  env: Env,
  ctx: ExecutionContext
) => Promise<Response | null>;

const processors: Record<Intent['type'], Processor[]> = {
  proxy: [],
  api: [],
  subscription: [],
  install: [],
  telegram: [],
  static: [],
  unknown: [],
};

export function registerProcessor(
  intentType: Intent['type'],
  processor: Processor
): void {
  processors[intentType].push(processor);
}

export async function processIntent(
  intent: Intent,
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const chain = processors[intent.type];
  for (const processor of chain) {
    const response = await processor(intent, request, env, ctx);
    if (response) return response;
  }
  // No processor handled it — return 404
  return new Response(JSON.stringify({ success: false, message: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}
