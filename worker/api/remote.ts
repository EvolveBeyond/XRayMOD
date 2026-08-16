import type { Env } from '../types';
import { requireAdmin } from '../auth';
import {
  generateRemoteKey,
  hashRemoteKey,
  REMOTE_SCOPES,
  type RemoteScope,
} from '../remote-auth';
import { appendAudit, clientIp } from '../lib/audit';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function normalizeScopes(value: unknown): RemoteScope[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > REMOTE_SCOPES.length) return null;
  const scopes = [...new Set(value)];
  return scopes.every((scope): scope is RemoteScope => typeof scope === 'string' && REMOTE_SCOPES.includes(scope as RemoteScope))
    ? scopes as RemoteScope[]
    : null;
}

export async function handleRemoteKeys(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  try {
    await requireAdmin(request, env.DB);
  } catch (error) {
    return error instanceof Response ? error : json({ success: false, message: 'Unauthorized' }, 401);
  }

  const id = params.id;
  if (request.method === 'GET' && !id) {
    const rows = await env.DB.prepare(
      'SELECT id, name, scopes_json, status, expires_at, last_used_at, created_at, revoked_at FROM remote_api_keys ORDER BY created_at DESC'
    ).all<any>();
    return json({
      success: true,
      data: rows.results.map((row) => ({
        id: row.id,
        name: row.name,
        scopes: JSON.parse(row.scopes_json),
        status: row.status,
        expires_at: row.expires_at,
        last_used_at: row.last_used_at,
        created_at: row.created_at,
        revoked_at: row.revoked_at,
      })),
    });
  }

  if (request.method === 'POST' && !id) {
    let body: { name?: unknown; scopes?: unknown; expiresAt?: unknown };
    try {
      body = await request.json();
    } catch {
      return json({ success: false, message: 'Invalid JSON' }, 400);
    }
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const scopes = normalizeScopes(body.scopes);
    const expiresAt = body.expiresAt === undefined ? null : Number(body.expiresAt);
    if (!name || name.length > 80 || !scopes) return json({ success: false, message: 'A name and valid non-empty scopes are required' }, 400);
    if (expiresAt !== null && (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now())) {
      return json({ success: false, message: 'expiresAt must be a future Unix timestamp in milliseconds' }, 400);
    }

    const key = generateRemoteKey();
    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO remote_api_keys (id, name, key_hash, scopes_json, status, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, name, await hashRemoteKey(key), JSON.stringify(scopes), 'active', expiresAt, Date.now()).run();
    await appendAudit(env.DB, 'remote_key_created', `id=${id} scopes=${scopes.join(',')}`, clientIp(request), 'remote');
    return json({ success: true, data: { id, name, scopes, expires_at: expiresAt, key } }, 201);
  }

  if (request.method === 'DELETE' && id) {
    const result = await env.DB.prepare(
      "UPDATE remote_api_keys SET status = 'revoked', revoked_at = ? WHERE id = ? AND status = 'active'"
    ).bind(Date.now(), id).run();
    if (!result.meta.changes) return json({ success: false, message: 'Active key not found' }, 404);
    await appendAudit(env.DB, 'remote_key_revoked', `id=${id}`, clientIp(request), 'remote');
    return json({ success: true });
  }

  return json({ success: false, message: 'Method not allowed' }, 405);
}