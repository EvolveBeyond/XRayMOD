/**
 * Proxy processor — handles WebSocket, gRPC, and XHTTP traffic.
 * Independent processor — register once, works forever.
 */
import type { Env, Intent } from '../intent';
import { handleProxyTraffic } from '../proxy';

export const proxyProcessor = async (
  intent: Intent,
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response | null> => {
  if (intent.type !== 'proxy') return null;

  // Kill switch check
  const pausedRow = await env.DB.prepare(
    'SELECT v FROM kvstore WHERE k = ?'
  ).bind('panel.paused').first<{ v: string }>();
  if (pausedRow?.v === 'true') {
    return new Response('Service paused', { status: 503 });
  }

  // Monthly cap check
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

  return handleProxyTraffic(request, env, ctx);
};
