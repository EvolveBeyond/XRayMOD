import type { Env, User } from '../types';
import { requireAdmin, hashPassword } from '../auth';
import { buildVlessWsLink } from '../lib/links';
import { getSecureBase, getSecurePrefix } from '../lib/secure-path';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type Authorizer = (request: Request, env: Env) => Promise<unknown>;

function mapUser(u: User, prefix = '') {
  const limitGB = Math.round((u.traffic_limit / (1024 * 1024 * 1024)) * 10) / 10;
  const usedGB = Math.round((u.traffic_used / (1024 * 1024 * 1024)) * 10) / 10;
  const daysLeft = u.expiry_date
    ? Math.ceil((new Date(u.expiry_date).getTime() - Date.now()) / 86400000)
    : null;
  return {
    id: u.id,
    username: u.username,
    email: u.email || '',
    uuid: u.uuid,
    role: u.role,
    status: u.status,
    enable: u.status === 'active',
    traffic_limit: u.traffic_limit,
    traffic_used: u.traffic_used,
    used: usedGB,
    limit: limitGB,
    expiry: u.expiry_date,
    expiry_date: u.expiry_date,
    days_left: daysLeft,
    created_at: u.created_at,
    speed_limit: 0,
    sub_id: u.uuid,
    sub_path: `${prefix}/sub/${u.uuid}`,
    status_path: `${prefix}/me/${u.uuid}`,
  };
}

export async function handleUsers(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  return handleUsersAuthorized(request, env, ctx, params, async (req, authorizationEnv) =>
    requireAdmin(req, authorizationEnv.DB)
  );
}

export async function handleUsersAuthorized(
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
    const prefix = await getSecurePrefix(env.DB);
    const users = await env.DB.prepare(
      'SELECT id, username, role, uuid, email, traffic_limit, traffic_used, expiry_date, status, created_at FROM users'
    ).all<User>();

    return json({
      success: true,
      data: users.results.map((u) => mapUser(u, prefix)),
    });
  }

  if (request.method === 'POST') {
    const body = await request.json<{
      username: string;
      email?: string;
      limit?: number;
      traffic_limit?: number;
      expiryDays?: number;
      expiry_days?: number;
      enable?: boolean;
    }>();

    if (!body.username) {
      return json({ success: false, message: 'Username required' }, 400);
    }

    const password = crypto.randomUUID().slice(0, 12);
    const passwordHash = await hashPassword(password);
    const uuid = crypto.randomUUID();
    const limitGB = body.limit ?? body.traffic_limit ?? 100;
    const limitBytes = limitGB * 1024 * 1024 * 1024;
    const days = body.expiryDays ?? body.expiry_days ?? 30;
    const expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const status = body.enable === false ? 'disabled' : 'active';

    try {
      const result = await env.DB.prepare(
        `INSERT INTO users (username, password_hash, role, uuid, email, traffic_limit, expiry_date, status, created_at)
         VALUES (?, ?, 'user', ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          body.username,
          passwordHash,
          uuid,
          body.email || '',
          limitBytes,
          expiryDate,
          status,
          Date.now()
        )
        .run();

      const userId = result.meta.last_row_id as number;

      const workerHost = new URL(request.url).host;
      const configPath = `/proxy/${crypto.randomUUID().slice(0, 10)}`;
      const link = buildVlessWsLink({
        uuid,
        host: workerHost,
        path: configPath,
        name: `${body.username} · VLESS-WS`,
        sni: workerHost,
      });
      const settings = {
        port: 443,
        uuid,
        path: configPath,
        host: workerHost,
        sni: workerHost,
        security: 'tls',
        network: 'ws',
        fingerprint: 'chrome',
      };
      await env.DB.prepare(
        `INSERT INTO configs (user_id, protocol_id, name, settings_json, port, path, link, node_ip, client_limit, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          userId,
          'vless-ws',
          `${body.username} · Recommended`,
          JSON.stringify(settings),
          443,
          configPath,
          link,
          workerHost,
          3,
          Date.now()
        )
        .run();

      const base = await getSecureBase(env.DB, new URL(request.url).origin);
      const prefix = await getSecurePrefix(env.DB);

      return json(
        {
          success: true,
          data: {
            id: userId,
            username: body.username,
            password,
            uuid,
            sub: `${prefix}/sub/${uuid}`,
            status: `${prefix}/me/${uuid}`,
            sub_url: `${base}/sub/${uuid}`,
            status_url: `${base}/me/${uuid}`,
          },
        },
        201
      );
    } catch {
      return json({ success: false, message: 'Username already exists' }, 409);
    }
  }

  if ((request.method === 'PUT' || request.method === 'PATCH') && params.id) {
    const body = await request.json<{
      limit?: number;
      traffic_limit?: number;
      expiry?: string;
      expiry_date?: string;
      status?: string;
      enable?: boolean;
      used?: number;
      username?: string;
      email?: string;
    }>();

    const userId = Number(params.id);
    const updates: string[] = [];
    const values: unknown[] = [];

    const limitGB = body.limit ?? body.traffic_limit;
    if (limitGB !== undefined) {
      updates.push('traffic_limit = ?');
      values.push(limitGB * 1024 * 1024 * 1024);
    }
    const expiry = body.expiry ?? body.expiry_date;
    if (expiry !== undefined) {
      updates.push('expiry_date = ?');
      values.push(expiry);
    }
    if (body.status !== undefined) {
      updates.push('status = ?');
      values.push(body.status);
    } else if (body.enable !== undefined) {
      updates.push('status = ?');
      values.push(body.enable ? 'active' : 'disabled');
    }
    if (body.used !== undefined) {
      updates.push('traffic_used = ?');
      values.push(body.used * 1024 * 1024 * 1024);
    }
    if (body.username !== undefined) {
      updates.push('username = ?');
      values.push(body.username);
    }
    if (body.email !== undefined) {
      updates.push('email = ?');
      values.push(body.email);
    }

    if (updates.length === 0) {
      return json({ success: false, message: 'No updates provided' }, 400);
    }

    values.push(userId);
    await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return json({ success: true });
  }

  if (request.method === 'DELETE' && params.id) {
    const userId = Number(params.id);
    await env.DB.prepare('DELETE FROM configs WHERE user_id = ?').bind(userId).run();
    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
    return json({ success: true });
  }

  // POST /api/users/:id/reset — reset traffic
  if (request.method === 'POST' && params.id === 'reset') {
    return json({ success: false, message: 'Use POST /api/users with body {action:reset,id}' }, 400);
  }

  return json({ success: false, message: 'Method not allowed' }, 405);
}
