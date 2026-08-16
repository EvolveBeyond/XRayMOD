/**
 * In-panel admin ops (BPB 5.1-style): update check, password reset hint,
 * custom domains, remote settings sync, usage snapshot.
 */
import type { Env } from '../types';
import { requireAdmin, hashPassword } from '../auth';
import { appendAudit, clientIp } from '../lib/audit';
import {
  readUpdateJob,
  saveCfToken,
  startSelfUpdate,
} from '../lib/self-update';
import { XRayMOD_VERSION } from '../lib/version';

export const APP_VERSION = XRayMOD_VERSION;
const GITHUB_RELEASES =
  'https://api.github.com/repos/askarniroomand/XRayMOD/releases/latest';
const GITHUB_COMMITS =
  'https://api.github.com/repos/askarniroomand/XRayMOD/commits/main';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const REMOTE_BLOCK = new Set([
  'panel.password_hash',
  'panel.2fa_secret',
  'panel.2fa_pending_secret',
  'panel.secret_key',
  'panel.access_uuid',
  'panel.admin_uuid',
  'panel.credentials_json',
  'panel.cf_email',
  'panel.custom_domains',
]);

export async function handleAdmin(
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

  // GET /api/admin  or /api/admin/dashboard
  if ((!action || action === 'dashboard') && request.method === 'GET') {
    const traffic = await env.DB.prepare(
      'SELECT COALESCE(SUM(traffic_used), 0) as total FROM users'
    ).first<{ total: number }>();
    const users = await env.DB.prepare(
      "SELECT COUNT(*) as c FROM users WHERE role != 'admin'"
    ).first<{ c: number }>();
    const paused = await env.DB.prepare(
      'SELECT v FROM kvstore WHERE k = ?'
    ).bind('panel.paused').first<{ v: string }>();
    const cap = await env.DB.prepare(
      'SELECT v FROM kvstore WHERE k = ?'
    ).bind('panel.monthly_cap_gb').first<{ v: string }>();
    const domains = await env.DB.prepare(
      'SELECT v FROM kvstore WHERE k = ?'
    ).bind('panel.custom_domains').first<{ v: string }>();
    const cfEmail = await env.DB.prepare(
      'SELECT v FROM kvstore WHERE k = ?'
    ).bind('panel.cf_email').first<{ v: string }>();
    const access = await env.DB.prepare(
      'SELECT v FROM kvstore WHERE k = ?'
    ).bind('panel.access_uuid').first<{ v: string }>();

    const used = traffic?.total || 0;
    const capGB = Number(cap?.v || 0);
    const capBytes = capGB > 0 ? capGB * 1073741824 : 0;
    const usagePct = capBytes > 0 ? Math.min(100, Math.round((used / capBytes) * 100)) : 0;

    return json({
      success: true,
      data: {
        version: APP_VERSION,
        paused: paused?.v === 'true',
        users: users?.c || 0,
        traffic_used: used,
        monthly_cap_gb: capGB,
        usage_percent: usagePct,
        warn_80: usagePct >= 80,
        custom_domains: (domains?.v || '')
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean),
        cf_email: cfEmail?.v || '',
        secure_path: access?.v || '',
        panel_entry: access?.v ? `/${access.v}/panel` : '',
      },
    });
  }

  // GET /api/admin/update-check — compare with GitHub main + latest release
  if (action === 'update-check' && request.method === 'GET') {
    try {
      const [relRes, commitRes] = await Promise.all([
        fetch(GITHUB_RELEASES, {
          headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'XRayMOD-Panel',
          },
        }),
        fetch(GITHUB_COMMITS, {
          headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'XRayMOD-Panel',
          },
        }),
      ]);

      let latest = APP_VERSION;
      let release_url = '';
      let notes = '';
      if (relRes.ok) {
        const data = (await relRes.json()) as {
          tag_name?: string;
          html_url?: string;
          body?: string;
        };
        latest = (data.tag_name || '').replace(/^v/i, '') || APP_VERSION;
        release_url = data.html_url || '';
        notes = (data.body || '').slice(0, 2000);
      }

      let main_sha = '';
      let main_message = '';
      if (commitRes.ok) {
        const c = (await commitRes.json()) as {
          sha?: string;
          commit?: { message?: string };
        };
        main_sha = (c.sha || '').slice(0, 12);
        main_message = (c.commit?.message || '').split('\n')[0];
      }

      const last = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?')
        .bind('panel.last_update_commit')
        .first<{ v: string }>();
      const tokenRow = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?')
        .bind('panel.cf_api_token')
        .first<{ v: string }>();
      const has_token = !!(tokenRow?.v && tokenRow.v.length > 20);

      const update_available =
        (!!latest && latest !== APP_VERSION && compareSemver(latest, APP_VERSION) > 0) ||
        (!!main_sha && !!last?.v && main_sha !== last.v.slice(0, 12)) ||
        (!!main_sha && !last?.v);

      return json({
        success: true,
        current: APP_VERSION,
        latest: latest || APP_VERSION,
        update_available,
        release_url,
        notes,
        main_sha,
        main_message,
        last_applied_commit: last?.v || '',
        has_token,
        how: 'دکمه «بروزرسانی الان» آخرین کد GitHub را می‌گیرد و روی همین Worker دیپلوی می‌کند. D1 و کاربران پاک نمی‌شوند.',
      });
    } catch (e) {
      return json({
        success: true,
        current: APP_VERSION,
        latest: APP_VERSION,
        update_available: false,
        message: e instanceof Error ? e.message : 'Update check failed',
      });
    }
  }

  // PUT /api/admin/cf-token — store CF API token for in-panel updates
  if (action === 'cf-token' && (request.method === 'PUT' || request.method === 'POST')) {
    const body = await request
      .json<{
        token?: string;
        account_id?: string;
        worker_name?: string;
        d1_id?: string;
      }>()
      .catch(() => ({} as any));
    try {
      await saveCfToken(
        env.DB,
        String(body.token || ''),
        body.account_id,
        body.worker_name,
        body.d1_id
      );
      await appendAudit(env.DB, 'cf_token_saved', 'ok', ip);
      return json({ success: true, message: 'Cloudflare token saved for updates' });
    } catch (e) {
      return json(
        { success: false, message: e instanceof Error ? e.message : 'Save failed' },
        400
      );
    }
  }

  // GET /api/admin/update-status — live job progress
  if (action === 'update-status' && request.method === 'GET') {
    const job = await readUpdateJob(env.DB);
    return json({ success: true, job });
  }

  // POST /api/admin/self-update — start GitHub → Cloudflare update (async)
  if (action === 'self-update' && request.method === 'POST') {
    const body = await request.json<{ token?: string; force?: boolean }>().catch(() => ({} as any));
    if (body.token && String(body.token).length > 20) {
      await saveCfToken(env.DB, String(body.token));
    }

    const running = await readUpdateJob(env.DB);
    if (running?.status === 'running' && Date.now() - running.startedAt < 10 * 60 * 1000) {
      return json({ success: true, job: running, message: 'Update already running' });
    }

    // Kick off in background so the request returns quickly; UI polls update-status
    const req = request;
    _ctx.waitUntil(
      (async () => {
        const job = await startSelfUpdate(env, req, {
          token: body.token,
          force: !!body.force,
        });
        await appendAudit(
          env.DB,
          job.status === 'done' ? 'self_update_ok' : 'self_update_error',
          job.commit || job.error || '',
          ip
        );
      })()
    );

    // Small delay so first steps exist for the UI
    await new Promise((r) => setTimeout(r, 150));
    const job = await readUpdateJob(env.DB);
    return json({ success: true, job, message: 'Update started' });
  }

  // POST /api/admin/reset-password — set new password (admin already authenticated)
  if (action === 'reset-password' && request.method === 'POST') {
    const body = await request.json<{ password?: string }>().catch(() => ({} as any));
    const next = String(body.password || '');
    if (next.length < 8) {
      return json({ success: false, message: 'Password must be at least 8 characters' }, 400);
    }
    const hash = await hashPassword(next);
    const admin = await env.DB.prepare(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    ).first<{ id: number }>();
    if (!admin) return json({ success: false, message: 'Admin not found' }, 404);
    await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .bind(hash, admin.id)
      .run();
    await env.DB.prepare(
      'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
    )
      .bind('panel.password_hash', hash, Date.now())
      .run();
    await appendAudit(env.DB, 'password_reset', 'admin_dashboard', ip);
    return json({ success: true, message: 'Password reset' });
  }

  // PUT /api/admin/domains — custom domains (D-tag in subs)
  if (action === 'domains' && (request.method === 'PUT' || request.method === 'POST')) {
    const body = await request.json<{ domains?: string[] | string }>().catch(() => ({} as any));
    let list: string[] = [];
    if (Array.isArray(body.domains)) {
      list = body.domains.map(String);
    } else if (typeof body.domains === 'string') {
      list = body.domains.split(/[,\n\s]+/);
    }
    const cleaned = [
      ...new Set(
        list
          .map((d) =>
            d
              .trim()
              .toLowerCase()
              .replace(/^https?:\/\//, '')
              .replace(/\/.*$/, '')
              .replace(/[^a-z0-9.-]/g, '')
          )
          .filter((d) => d.includes('.') && d.length < 253)
      ),
    ].slice(0, 20);
    await env.DB.prepare(
      'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
    )
      .bind('panel.custom_domains', cleaned.join(','), Date.now())
      .run();
    await appendAudit(env.DB, 'custom_domains', cleaned.join(','), ip);
    return json({ success: true, domains: cleaned });
  }

  // PUT /api/admin/cf-email — bind Cloudflare account email as login username
  if (action === 'cf-email' && (request.method === 'PUT' || request.method === 'POST')) {
    const body = await request.json<{ email?: string; enforce?: boolean }>().catch(() => ({} as any));
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ success: false, message: 'Invalid email' }, 400);
    }
    const now = Date.now();
    await env.DB.prepare(
      'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
    )
      .bind('panel.cf_email', email, now)
      .run();
    await env.DB.prepare(
      'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
    )
      .bind('panel.cf_email_enforce', body.enforce === false ? 'false' : 'true', now)
      .run();
    if (email) {
      await env.DB.prepare(
        "UPDATE users SET username = ?, email = ? WHERE role = 'admin'"
      )
        .bind(email, email)
        .run();
    }
    await appendAudit(env.DB, 'cf_email_set', email ? 'set' : 'cleared', ip);
    return json({ success: true, email, enforce: body.enforce !== false });
  }

  // POST /api/admin/remote-sync — pull settings from another XRayMOD panel
  if (action === 'remote-sync' && request.method === 'POST') {
    const body = await request
      .json<{ url?: string; cookie?: string; token?: string }>()
      .catch(() => ({} as any));
    const remoteUrl = String(body.url || '').trim().replace(/\/$/, '');
    if (!remoteUrl.startsWith('https://')) {
      return json({ success: false, message: 'Remote URL must be https://…/{SECURE_PATH}' }, 400);
    }
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body.cookie) headers.Cookie = String(body.cookie);
    if (body.token) headers.Authorization = `Bearer ${body.token}`;

    let remote: any;
    try {
      const res = await fetch(`${remoteUrl}/api/tools/backup`, { headers });
      if (!res.ok) {
        return json({ success: false, message: `Remote backup failed (${res.status})` }, 502);
      }
      remote = await res.json();
    } catch (e) {
      return json({
        success: false,
        message: e instanceof Error ? e.message : 'Remote fetch failed',
      }, 502);
    }

    const settings = remote?.data?.settings || remote?.settings || {};
    let imported = 0;
    for (const [k, v] of Object.entries(settings)) {
      if (REMOTE_BLOCK.has(k)) continue;
      if (k.startsWith('session:') || k.startsWith('ratelimit:') || k.startsWith('2fa_')) continue;
      if (!k.includes('.')) continue;
      await env.DB.prepare(
        'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
      )
        .bind(k, String(v), Date.now())
        .run();
      imported++;
    }
    await appendAudit(env.DB, 'remote_sync', `keys=${imported} from=${remoteUrl}`, ip);
    return json({
      success: true,
      imported,
      message: `Synced ${imported} settings (UUID, path, domains, secrets excluded)`,
    });
  }

  // POST /api/admin/pause — kill switch
  if (action === 'pause' && request.method === 'POST') {
    const body = await request.json<{ paused?: boolean }>().catch(() => ({} as any));
    const paused = body.paused !== false;
    await env.DB.prepare(
      'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
    )
      .bind('panel.paused', paused ? 'true' : 'false', Date.now())
      .run();
    await appendAudit(env.DB, paused ? 'kill_switch_on' : 'kill_switch_off', '', ip);
    return json({ success: true, paused });
  }

  return json({ success: false, message: 'Not found' }, 404);
}

function compareSemver(a: string, b: string): number {
  const pa = a.replace(/[^0-9.]/g, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.replace(/[^0-9.]/g, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}
