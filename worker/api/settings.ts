import type { Env } from '../types';
import {
  requireAdmin,
  verifyPassword,
  hashPassword,
  generateTotpSecret,
  verifyTotp,
  totpOtpauthUrl,
} from '../auth';
import { appendAudit, clientIp } from '../lib/audit';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const SETTING_PREFIXES = [
  'panel.%',
  'integrations.%',
  'disguise.%',
  'ech.%',
  'tls_fragment.%',
  'wizard.%',
  'protocol.%',
  'cleanip.%',
];

const BLOCKED_KEYS = new Set([
  'panel.password_hash',
  'panel.password_change_request',
  'panel.2fa_secret',
]);

export async function handleSettings(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  try {
    await requireAdmin(request, env.DB);
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ success: false, message: 'Unauthorized' }, 401);
  }

  if (request.method === 'GET') {
    const all: { k: string; v: string }[] = [];
    for (const prefix of SETTING_PREFIXES) {
      const rows = await env.DB.prepare('SELECT k, v FROM kvstore WHERE k LIKE ?')
        .bind(prefix)
        .all<{ k: string; v: string }>();
      all.push(...rows.results);
    }

    const settings: Record<string, string> = {};
    for (const row of all) {
      if (row.k === 'panel.password_hash' || row.k === 'panel.2fa_secret') continue;
      settings[row.k] = row.v;
    }

    settings['panel.2fa_enabled'] = settings['panel.2fa_enabled'] || 'false';
    return json({ success: true, data: settings });
  }

  if (request.method === 'PUT' || request.method === 'PATCH' || request.method === 'POST') {
    const body = await request.json<Record<string, unknown>>();

    // ── Password change ──
    if (body.currentPassword && body.newPassword) {
      const current = String(body.currentPassword);
      const next = String(body.newPassword);
      if (next.length < 6) {
        return json({ success: false, message: 'Password must be at least 6 characters' }, 400);
      }

      const admin = await env.DB.prepare(
        "SELECT id, password_hash FROM users WHERE role = 'admin' LIMIT 1"
      ).first<{ id: number; password_hash: string }>();

      if (!admin) {
        return json({ success: false, message: 'Admin user not found' }, 404);
      }

      let ok = await verifyPassword(current, admin.password_hash);
      if (!ok) {
        const panelHash = await env.DB.prepare(
          'SELECT v FROM kvstore WHERE k = ?'
        ).bind('panel.password_hash').first<{ v: string }>();
        if (!panelHash?.v || !(await verifyPassword(current, panelHash.v))) {
          return json({ success: false, message: 'Current password is incorrect' }, 401);
        }
      }

      const newHash = await hashPassword(next);
      await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        .bind(newHash, admin.id)
        .run();
      await env.DB.prepare(
        'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
      )
        .bind('panel.password_hash', newHash, Date.now())
        .run();

      await appendAudit(env.DB, 'password_change', '', clientIp(request));
      return json({ success: true, message: 'Password updated' });
    }

    // ── 2FA setup: generate secret ──
    if (body.action === '2fa-setup') {
      const secret = generateTotpSecret();
      await env.DB.prepare(
        'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
      )
        .bind('panel.2fa_pending_secret', secret, Date.now())
        .run();

      const admin = await env.DB.prepare(
        "SELECT username FROM users WHERE role = 'admin' LIMIT 1"
      ).first<{ username: string }>();

      return json({
        success: true,
        secret,
        otpauth: totpOtpauthUrl(secret, admin?.username || 'admin'),
      });
    }

    // ── 2FA enable with code verification ──
    if (body.action === '2fa-enable') {
      const code = String(body.code || '');
      const pending = await env.DB.prepare(
        'SELECT v FROM kvstore WHERE k = ?'
      ).bind('panel.2fa_pending_secret').first<{ v: string }>();

      const secret = String(body.secret || pending?.v || '');
      if (!secret || !(await verifyTotp(secret, code))) {
        return json({ success: false, message: 'Invalid 2FA code' }, 400);
      }

      await env.DB.prepare(
        'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
      )
        .bind('panel.2fa_secret', secret, Date.now())
        .run();
      await env.DB.prepare(
        'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
      )
        .bind('panel.2fa_enabled', 'true', Date.now())
        .run();
      await env.DB.prepare('DELETE FROM kvstore WHERE k = ?')
        .bind('panel.2fa_pending_secret')
        .run();

      return json({ success: true, message: '2FA enabled' });
    }

    // ── 2FA disable ──
    if (body.action === '2fa-disable') {
      const code = String(body.code || '');
      const secretRow = await env.DB.prepare(
        'SELECT v FROM kvstore WHERE k = ?'
      ).bind('panel.2fa_secret').first<{ v: string }>();

      if (secretRow?.v && code) {
        if (!(await verifyTotp(secretRow.v, code))) {
          return json({ success: false, message: 'Invalid 2FA code' }, 400);
        }
      }

      await env.DB.prepare(
        'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
      )
        .bind('panel.2fa_enabled', 'false', Date.now())
        .run();
      await env.DB.prepare('DELETE FROM kvstore WHERE k = ?').bind('panel.2fa_secret').run();
      await env.DB.prepare('DELETE FROM kvstore WHERE k = ?').bind('panel.2fa_pending_secret').run();

      return json({ success: true, message: '2FA disabled' });
    }

    const changed: string[] = [];
    for (const [k, v] of Object.entries(body)) {
      if (BLOCKED_KEYS.has(k)) continue;
      if (['currentPassword', 'newPassword', 'action', 'code', 'secret', 'totp'].includes(k)) continue;
      await env.DB.prepare(
        'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
      )
        .bind(k, String(v), Date.now())
        .run();
      changed.push(k);
    }

    if (changed.length) {
      await appendAudit(
        env.DB,
        'settings_update',
        changed.slice(0, 20).join(','),
        clientIp(request)
      );
    }

    return json({ success: true });
  }

  return json({ success: false, message: 'Method not allowed' }, 405);
}
