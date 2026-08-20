import type { Env } from '../types';
import { requireAdmin } from '../auth';
import {
  detectIranianISP,
  getISPInfo,
  generateRandomIPs,
  getCleanIPs,
  setCleanIPs,
  getCleanIPConfig,
  jsonResponse,
} from '../utils';
import {
  generateCountryCleanIPs,
  PREFERRED_COUNTRIES,
  serializeLabeled,
} from '../lib/cleanip-pool';
import { buildRecommendedLinks } from '../lib/links';
import { getSecureBase } from '../lib/secure-path';

export async function handleCleanIP(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const action = params.action;
  const url = new URL(request.url);

  // GET /api/cleanip/scan — country-weighted + ISP-aware candidates
  if (action === 'scan' && request.method === 'GET') {
    const count = Math.min(parseInt(url.searchParams.get('count') || '64', 10) || 64, 120);
    const port = parseInt(url.searchParams.get('port') || '443', 10);
    const countries = (url.searchParams.get('countries') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const labeled = await generateCountryCleanIPs({
      count,
      port: Number.isFinite(port) ? port : 443,
      countries: countries.length ? countries : undefined,
    });
    const ispInfo = getISPInfo(request);

    // Also mix a few pure randoms for diversity
    const extra = await generateRandomIPs(request, Math.min(16, Math.floor(count / 4)), port);
    const ips = [
      ...serializeLabeled(labeled),
      ...extra.map((e) => {
        const [ip, p] = e.split(':');
        return `${ip}:${p || port}#CF`;
      }),
    ];
    const unique = [...new Set(ips)].slice(0, count);

    return jsonResponse({
      success: true,
      data: {
        ips: unique,
        labeled,
        countries: countries.length ? countries : PREFERRED_COUNTRIES,
        isp: ispInfo,
      },
    });
  }

  // POST /api/cleanip/recommend — build & save recommended pool + return sub URL
  if (action === 'recommend' && (request.method === 'POST' || request.method === 'GET')) {
    try {
      await requireAdmin(request, env.DB);
    } catch (e) {
      if (e instanceof Response) return e;
      return jsonResponse({ success: false, message: 'Unauthorized' }, 401);
    }

    type RecBody = { count?: number; countries?: string[]; apply?: boolean };
    const body: RecBody =
      request.method === 'POST'
        ? await request.json<RecBody>().catch(() => ({} as RecBody))
        : {};
    const count = Math.min(Number(body.count) || 48, 80);
    const countries = body.countries?.length ? body.countries : PREFERRED_COUNTRIES;

    const labeled = await generateCountryCleanIPs({ count, port: 443, countries });
    const serialized = serializeLabeled(labeled);

    // Keep existing good IPs, prepend recommended
    const existing = await getCleanIPs(env.DB);
    const merged = [...new Set([...serialized, ...existing])].slice(0, 80);

    if (body.apply !== false) {
      const carrier = detectIranianISP(request);
      await setCleanIPs(env.DB, merged, carrier);
      await env.DB.prepare(
        'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
      )
        .bind('cleanip.carrier', carrier, Date.now())
        .run();
      await env.DB.prepare(
        'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
      )
        .bind('cleanip.recommended_at', String(Date.now()), Date.now())
        .run();
    }

    const admin = await env.DB.prepare(
      `SELECT id, username, uuid FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1`
    ).first<{ id: number; username: string; uuid: string }>();

    const workerHost = url.host;
    let path = '/';
    if (admin) {
      const cfg = await env.DB.prepare(
        `SELECT path, settings_json FROM configs WHERE user_id = ? ORDER BY id ASC LIMIT 1`
      )
        .bind(admin.id)
        .first<{ path: string; settings_json: string }>();
      if (cfg) {
        const settings = JSON.parse(cfg.settings_json || '{}');
        path = cfg.path || settings.path || '/';
      } else {
        path = `/proxy/${crypto.randomUUID().slice(0, 10)}`;
        const { buildVlessWsLink } = await import('../lib/links');
        const link = buildVlessWsLink({
          uuid: admin.uuid,
          host: workerHost,
          path,
          name: `${admin.username} · Recommended`,
          sni: workerHost,
        });
        await env.DB.prepare(
          `INSERT INTO configs (user_id, protocol_id, name, settings_json, port, path, link, node_ip, client_limit, created_at)
           VALUES (?, 'vless-ws', ?, ?, 443, ?, ?, ?, 5, ?)`
        )
          .bind(
            admin.id,
            'XrayMOD · Recommended',
            JSON.stringify({
              path,
              host: workerHost,
              sni: workerHost,
              network: 'ws',
              security: 'tls',
              uuid: admin.uuid,
              fingerprint: 'chrome',
            }),
            path,
            link,
            workerHost,
            Date.now()
          )
          .run();
      }
    }

    const links = admin
      ? buildRecommendedLinks({
          uuid: admin.uuid,
          workerHost,
          path,
          name: 'XrayMOD · Recommended',
          cleanIPs: merged,
          max: 18,
          carrier: detectIranianISP(request),
        })
      : [];

    const secure = await getSecureBase(env.DB, url.origin);
    const subUrl = admin ? `${secure}/sub/${admin.uuid}` : '';

    return jsonResponse({
      success: true,
      data: {
        count: merged.length,
        countries,
        ips: merged.slice(0, 24),
        links: links.slice(0, 8),
        subscriptionUrl: subUrl,
        message:
          'Recommended subscription ready — good country Clean IPs saved and included in the sub',
      },
    });
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

      // Allow ip:port or ip:port#CC
      const validIPs = ips
        .map((ip) => ip.trim())
        .filter((ip) => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d{1,5})?(#[A-Za-z0-9_-]+)?$/.test(ip));
      if (!validIPs.length) {
        return jsonResponse({ success: false, message: 'Invalid IP format' }, 400);
      }

      const carrier = detectIranianISP(request);
      await setCleanIPs(env.DB, validIPs, carrier);
      await env.DB.prepare(
        'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
      )
        .bind('cleanip.carrier', carrier, Date.now())
        .run();

      return jsonResponse({ success: true, data: { count: validIPs.length, carrier } });
    } catch {
      return jsonResponse({ success: false, message: 'Invalid request' }, 400);
    }
  }

  // GET /api/cleanip/list — admin only
  if (action === 'list' && request.method === 'GET') {
    try {
      await requireAdmin(request, env.DB);
    } catch (e) {
      if (e instanceof Response) return e;
      return jsonResponse({ success: false, message: 'Unauthorized' }, 401);
    }

    const config = await getCleanIPConfig(env.DB);
    return jsonResponse({
      success: true,
      data: { ...config, countries: PREFERRED_COUNTRIES },
    });
  }

  // GET /api/cleanip — ISP info
  if (!action || action === '') {
    if (request.method === 'GET') {
      const ispInfo = getISPInfo(request);
      const ips = await getCleanIPs(env.DB);
      return jsonResponse({
        success: true,
        data: {
          isp: ispInfo,
          activeIPs: ips.length,
          countries: PREFERRED_COUNTRIES,
        },
      });
    }
  }

  return jsonResponse({ success: false, message: 'Not found' }, 404);
}
