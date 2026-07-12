import type { Env } from '../types';
import { requireAdmin } from '../auth';
import { detectIranianISP, getISPInfo, generateRandomIPs, getCleanIPs, setCleanIPs, getCleanIPConfig, jsonResponse } from '../utils';

export async function handleCleanIP(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const action = params.action;

  // GET /api/cleanip/scan — public, returns random IPs for visitor's ISP
  if (action === 'scan' && request.method === 'GET') {
    const url = new URL(request.url);
    const count = Math.min(parseInt(url.searchParams.get('count') || '16'), 32);
    const port = parseInt(url.searchParams.get('port') || '-1');
    const ips = await generateRandomIPs(request, count, port);
    const ispInfo = getISPInfo(request);
    return jsonResponse({ success: true, data: { ips, isp: ispInfo } });
  }

  // POST /api/cleanip/apply — admin only, saves IPs
  if (action === 'apply' && request.method === 'POST') {
    try {
      await requireAdmin(request, env.DB);
    } catch (e) {
      if (e instanceof Response) return e;
      return jsonResponse({ success: false, message: 'Unauthorized' }, 401);
    }

    try {
      const body = await request.json<{ ips?: string[] }>();
      const ips = body.ips || [];
      if (!ips.length) {
        return jsonResponse({ success: false, message: 'No IPs provided' }, 400);
      }

      // Validate IPs format
      const validIPs = ips.filter((ip) => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d{1,5})?$/.test(ip.trim()));
      if (!validIPs.length) {
        return jsonResponse({ success: false, message: 'Invalid IP format' }, 400);
      }

      await setCleanIPs(env.DB, validIPs);
      const carrier = detectIranianISP(request);
      await env.DB.prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
        .bind('cleanip.carrier', carrier, Date.now())
        .run();

      return jsonResponse({ success: true, data: { count: validIPs.length, carrier } });
    } catch {
      return jsonResponse({ success: false, message: 'Invalid request' }, 400);
    }
  }

  // GET /api/cleanip/list — admin only, returns saved IPs
  if (action === 'list' && request.method === 'GET') {
    try {
      await requireAdmin(request, env.DB);
    } catch (e) {
      if (e instanceof Response) return e;
      return jsonResponse({ success: false, message: 'Unauthorized' }, 401);
    }

    const config = await getCleanIPConfig(env.DB);
    return jsonResponse({ success: true, data: config });
  }

  // GET /api/cleanip — ISP info for the visitor
  if (!action || action === '') {
    if (request.method === 'GET') {
      const ispInfo = getISPInfo(request);
      const ips = await getCleanIPs(env.DB);
      return jsonResponse({ success: true, data: { isp: ispInfo, activeIPs: ips.length } });
    }
  }

  return jsonResponse({ success: false, message: 'Not found' }, 404);
}
