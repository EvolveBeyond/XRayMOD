import type { Env } from '../types';
import { requireAdmin } from '../auth';
import { buildVlessWsLink, buildTrojanWsLink, buildVmessWsLink } from '../lib/links';
import { getSecureBase } from '../lib/secure-path';

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type Authorizer = (request: Request, env: Env) => Promise<unknown>;

export async function handleConfigs(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  return handleConfigsAuthorized(request, env, ctx, params, async (req, authorizationEnv) =>
    requireAdmin(req, authorizationEnv.DB)
  );
}

export async function handleConfigsAuthorized(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>,
  authorize: Authorizer
): Promise<Response> {
  try {
    await authorize(request, env);
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ success: false, message: 'Unauthorized' }, 401);
  }

  if (request.method === 'GET') {
    const configs = await env.DB.prepare(
      `SELECT c.*, u.username FROM configs c
       LEFT JOIN users u ON c.user_id = u.id`
    ).all();

    return json({
      success: true,
      data: configs.results.map((c: any) => ({
        id: c.id,
        userId: c.user_id,
        username: c.username,
        protocolId: c.protocol_id,
        name: c.name,
        settings: JSON.parse(c.settings_json || '{}'),
        port: c.port,
        path: c.path,
        link: c.link,
        nodeIp: c.node_ip,
        clientLimit: c.client_limit,
        createdAt: c.created_at,
      })),
    });
  }

  if (request.method === 'POST') {
    const body = await request.json<{
      userId: number;
      protocolId: string;
      name: string;
      settings: Record<string, any>;
      clientLimit?: number;
    }>();

    if (!body.userId || !body.protocolId) {
      return json({ success: false, message: 'userId and protocolId required' }, 400);
    }

    // Get the protocol template
    const protocol = await env.DB.prepare('SELECT * FROM protocols WHERE id = ?')
      .bind(body.protocolId)
      .first<any>();

    if (!protocol) {
      return json({ success: false, message: 'Protocol not found' }, 404);
    }

    // Get user UUID
    const user = await env.DB.prepare('SELECT uuid FROM users WHERE id = ?')
      .bind(body.userId)
      .first<{ uuid: string }>();

    if (!user) {
      return json({ success: false, message: 'User not found' }, 404);
    }

    const origin = new URL(request.url).origin;
    const base = await getSecureBase(env.DB, origin);
    const workerHost = new URL(request.url).host;
    const configPath =
      body.settings.path ||
      `/proxy/${crypto.randomUUID().slice(0, 10)}`;
    const path = configPath.startsWith('/') ? configPath : `/${configPath}`;
    const port = 443;
    const name = body.name || 'XrayMOD Node';
    const settings: Record<string, any> = {
      ...body.settings,
      uuid: user.uuid,
      path,
      host: workerHost,
      sni: body.settings.sni || workerHost,
      network: body.settings.network || 'ws',
      security: 'tls',
      fingerprint: body.settings.fingerprint || 'chrome',
      port,
    };

    let link = '';
    const pid = body.protocolId;
    if (pid.includes('trojan')) {
      const password = String(settings.password || user.uuid);
      settings.password = password;
      link = buildTrojanWsLink({
        uuid: user.uuid,
        password,
        host: workerHost,
        path,
        name,
        sni: settings.sni,
      });
    } else if (pid.includes('vmess')) {
      link = buildVmessWsLink({
        uuid: user.uuid,
        host: workerHost,
        path,
        name,
        sni: settings.sni,
      });
    } else {
      // Default & recommended: VLESS + WS + TLS
      link = buildVlessWsLink({
        uuid: user.uuid,
        host: workerHost,
        path,
        name,
        sni: settings.sni,
        fingerprint: settings.fingerprint,
      });
    }

    const result = await env.DB.prepare(
      `INSERT INTO configs (user_id, protocol_id, name, settings_json, port, path, link, node_ip, client_limit, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        body.userId,
        body.protocolId.startsWith('vless') ? body.protocolId : body.protocolId,
        name,
        JSON.stringify(settings),
        port,
        path,
        link,
        workerHost,
        body.clientLimit || 3,
        Date.now()
      )
      .run();

    return json(
      {
        success: true,
        data: {
          id: result.meta.last_row_id,
          name,
          protocolId: body.protocolId,
          link,
          path,
          subscription: `${base}/sub/${user.uuid}`,
          tip: 'Use SECURE PATH subscription URL. Clients: v2rayNG ≥2.2.3 (Hev TUN), sing-box ≥1.12.0.',
        },
      },
      201
    );
  }

  if ((request.method === 'DELETE') && params.id) {
    await env.DB.prepare('DELETE FROM configs WHERE id = ?')
      .bind(Number(params.id))
      .run();
    return json({ success: true });
  }

  return json({ success: false, message: 'Method not allowed' }, 405);
}
