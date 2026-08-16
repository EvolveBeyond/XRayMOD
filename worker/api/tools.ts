/**
 * Admin tools: full backup, audit log, canary hits summary.
 * Safe by default — never exports password hashes / 2FA secrets / sessions.
 */
import type { Env } from '../types';
import { requireAdmin } from '../auth';
import { appendAudit, getAuditLog, clientIp } from '../lib/audit';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const SECRET_KEYS = new Set([
  'panel.password_hash',
  'panel.2fa_secret',
  'panel.2fa_pending_secret',
  'panel.password_change_request',
  'panel.secret_key',
]);

const SECRET_PREFIXES = ['session:', 'ratelimit:', '2fa_challenge:'];

function isSecretKey(k: string): boolean {
  if (SECRET_KEYS.has(k)) return true;
  return SECRET_PREFIXES.some((p) => k.startsWith(p));
}

const IMPORT_ALLOW = [
  'panel.',
  'integrations.',
  'disguise.',
  'ech.',
  'tls_fragment.',
  'wizard.',
  'protocol.',
  'cleanip.',
];

function isImportableKey(k: string): boolean {
  if (isSecretKey(k)) return false;
  if (k === 'audit.log') return false;
  return IMPORT_ALLOW.some((p) => k.startsWith(p));
}

export async function handleTools(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  try {
    await requireAdmin(request, env.DB);
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ success: false, message: 'Unauthorized' }, 401);
  }

  const action = (params.action || '').toLowerCase();
  const ip = clientIp(request);

  // GET /api/tools/audit
  if (action === 'audit' && request.method === 'GET') {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200);
    const entries = await getAuditLog(env.DB, limit);
    return json({ success: true, data: entries });
  }

  // GET /api/tools/backup
  if (action === 'backup' && request.method === 'GET') {
    const settingsRows = await env.DB.prepare('SELECT k, v FROM kvstore').all<{ k: string; v: string }>();
    const settings: Record<string, string> = {};
    for (const row of settingsRows.results) {
      if (isSecretKey(row.k)) continue;
      if (row.k.startsWith('session:') || row.k.startsWith('ratelimit:')) continue;
      settings[row.k] = row.v;
    }

    const users = await env.DB.prepare(
      `SELECT id, username, role, uuid, email, traffic_limit, traffic_used, expiry_date, status, created_at
       FROM users WHERE role != 'admin' OR role = 'admin'`
    ).all();

    const safeUsers = (users.results || []).map((u: any) => ({
      username: u.username,
      role: u.role,
      uuid: u.uuid,
      email: u.email,
      traffic_limit: u.traffic_limit,
      traffic_used: u.traffic_used,
      expiry_date: u.expiry_date,
      status: u.status,
      created_at: u.created_at,
    }));

    const configs = await env.DB.prepare(
      `SELECT user_id, protocol_id, name, settings_json, port, path, link, node_ip, client_limit, created_at
       FROM configs`
    ).all();

    const protocols = await env.DB.prepare(
      'SELECT id, name, schema_json, template_json, price, client_limit, client_price FROM protocols'
    ).all();

    await appendAudit(env.DB, 'backup_export', `settings=${Object.keys(settings).length}`, ip);

    return json({
      success: true,
      data: {
        version: 2,
        exported_at: new Date().toISOString(),
        app: 'xraymod',
        settings,
        users: safeUsers,
        configs: configs.results || [],
        protocols: protocols.results || [],
      },
    });
  }

  // POST /api/tools/restore — settings only by default (safe)
  if (action === 'restore' && request.method === 'POST') {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return json({ success: false, message: 'Invalid JSON' }, 400);
    }

    const payload = body?.data || body;
    const settings = payload?.settings || payload?.config || {};
    if (!settings || typeof settings !== 'object') {
      return json({ success: false, message: 'No settings in backup' }, 400);
    }

    let imported = 0;
    for (const [k, v] of Object.entries(settings)) {
      if (!isImportableKey(k)) continue;
      await env.DB.prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
        .bind(k, String(v), Date.now())
        .run();
      imported++;
    }

    await appendAudit(env.DB, 'backup_restore', `keys=${imported}`, ip);
    return json({ success: true, message: `Restored ${imported} settings`, imported });
  }

  // GET /api/tools/canary — summary of canary hits from audit
  if (action === 'canary' && request.method === 'GET') {
    const entries = await getAuditLog(env.DB, 200);
    const hits = entries.filter((e) => e.action === 'canary_hit');
    return json({
      success: true,
      data: {
        total: hits.length,
        recent: hits.slice(0, 30),
      },
    });
  }

  // POST /api/tools/audit — manual note (optional)
  if (action === 'audit' && request.method === 'POST') {
    const body = await request.json<{ action?: string; detail?: string }>().catch(() => ({} as any));
    await appendAudit(env.DB, body.action || 'note', body.detail || '', ip);
    return json({ success: true });
  }

  return json({ success: false, message: 'Not found' }, 404);
}
