import { timingSafeEqual } from './auth';

export const REMOTE_SCOPES = [
  'health:read',
  'users:read',
  'users:write',
  'configs:read',
  'configs:write',
] as const;

export type RemoteScope = (typeof REMOTE_SCOPES)[number];

type RemoteKeyRow = {
  id: string;
  name: string;
  key_hash: string;
  scopes_json: string;
  status: string;
  expires_at: number | null;
};

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashRemoteKey(key: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)));
}

export function generateRemoteKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `xrm_int_${token}`;
}

function parseScopes(value: string): RemoteScope[] {
  try {
    const scopes = JSON.parse(value);
    if (!Array.isArray(scopes)) return [];
    return scopes.filter((scope): scope is RemoteScope => REMOTE_SCOPES.includes(scope));
  } catch {
    return [];
  }
}

export async function requireRemoteScope(
  request: Request,
  db: D1Database,
  scope: RemoteScope
): Promise<{ keyId: string; name: string; scopes: RemoteScope[] }> {
  const authorization = request.headers.get('Authorization') || '';
  const match = authorization.match(/^Bearer (xrm_int_[A-Za-z0-9_-]{40,128})$/);
  if (!match) throw remoteError('Unauthorized', 401);

  const keyHash = await hashRemoteKey(match[1]);
  const row = await db
    .prepare('SELECT id, name, key_hash, scopes_json, status, expires_at FROM remote_api_keys WHERE key_hash = ?')
    .bind(keyHash)
    .first<RemoteKeyRow>();
  if (!row || !timingSafeEqual(keyHash, row.key_hash) || row.status !== 'active') {
    throw remoteError('Unauthorized', 401);
  }
  if (row.expires_at && row.expires_at <= Date.now()) throw remoteError('Unauthorized', 401);

  const scopes = parseScopes(row.scopes_json);
  if (!scopes.includes(scope)) throw remoteError('Forbidden', 403);

  await db.prepare('UPDATE remote_api_keys SET last_used_at = ? WHERE id = ?').bind(Date.now(), row.id).run();
  return { keyId: row.id, name: row.name, scopes };
}

export function remoteError(message: string, status: number): Response {
  return new Response(JSON.stringify({ success: false, message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
