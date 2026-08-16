/**
 * Lab / Advanced ops API — speed profiles, guest subs, whitelabel,
 * live dash, backup, multi-node, canary reports, rollback, etc.
 */
import type { Env } from '../types';
import { requireAdmin } from '../auth';
import {
  refreshAutoCleanIps,
  healthCheckCleanIps,
  SPEED_PROFILES,
  type SpeedProfile,
  runScheduledEdgeOps,
} from '../lib/edge-ops';
import { getSecureBase } from '../lib/secure-path';
import { listWorkerVersions, rollbackWorkerVersion, readUpdateJob } from '../lib/self-update';
import { XRayMOD_VERSION } from '../lib/version';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function kvGet(db: D1Database, k: string): Promise<string> {
  const row = await db.prepare('SELECT v FROM kvstore WHERE k = ?').bind(k).first<{ v: string }>();
  return row?.v || '';
}

async function kvSet(db: D1Database, k: string, v: string): Promise<void> {
  await db
    .prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
    .bind(k, v, Date.now())
    .run();
}

async function requireAdm(request: Request, env: Env): Promise<Response | null> {
  try {
    await requireAdmin(request, env.DB);
    return null;
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ success: false, message: 'Unauthorized' }, 401);
  }
}

export async function handleLab(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const action = params.action || '';
  const url = new URL(request.url);

  // ── Public guest sub redeem ─────────────────────────────────
  if (action === 'guest' && request.method === 'GET') {
    const token = url.searchParams.get('token') || '';
    const raw = await kvGet(env.DB, `guest.sub.${token}`);
    if (!raw) return json({ success: false, message: 'لینک مهمان نامعتبر است' }, 404);
    try {
      const g = JSON.parse(raw) as { exp: number; userUuid: string; profile?: string };
      if (Date.now() > g.exp) {
        await env.DB.prepare('DELETE FROM kvstore WHERE k = ?').bind(`guest.sub.${token}`).run();
        return json({ success: false, message: 'لینک مهمان منقضی شده' }, 410);
      }
      const base = await getSecureBase(env.DB, url.origin);
      const profile = g.profile || 'stable';
      return Response.redirect(`${base}/sub/${g.userUuid}?format=base64&profile=${profile}`, 302);
    } catch {
      return json({ success: false, message: 'خراب' }, 400);
    }
  }

  const denied = await requireAdm(request, env);
  if (denied) return denied;

  // GET /api/lab/overview
  if ((action === 'overview' || action === '') && request.method === 'GET') {
    const [
      users,
      traffic,
      cleanLog,
      healthLog,
      autoLog,
      brand,
      canary,
      nodes,
      profile,
      cron,
      domains,
    ] = await Promise.all([
      env.DB.prepare(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active
         FROM users`
      ).first<{ total: number; active: number }>(),
      env.DB.prepare(
        `SELECT COALESCE(SUM(traffic_used),0) as used FROM users`
      ).first<{ used: number }>(),
      kvGet(env.DB, 'cleanip.auto_log'),
      kvGet(env.DB, 'cleanip.health_log'),
      kvGet(env.DB, 'cleanip.auto_enabled'),
      kvGet(env.DB, 'brand.config'),
      kvGet(env.DB, 'canary.report'),
      kvGet(env.DB, 'panel.nodes_json'),
      kvGet(env.DB, 'panel.speed_profile'),
      kvGet(env.DB, 'edge.last_cron'),
      kvGet(env.DB, 'panel.custom_domains_weighted'),
    ]);

    // "Online" approx: sessions updated in last 5 minutes
    const sessions = await env.DB.prepare(
      `SELECT COUNT(*) as n FROM kvstore WHERE k LIKE 'session:%' AND updated > ?`
    )
      .bind(Date.now() - 5 * 60 * 1000)
      .first<{ n: number }>();

    const audit = await env.DB.prepare(
      `SELECT v FROM kvstore WHERE k = 'audit.log'`
    ).first<{ v: string }>();

    let recentAsn = '—';
    try {
      const list = audit?.v ? (JSON.parse(audit.v) as any[]) : [];
      const hit = list.find((x) => String(x?.detail || '').includes('asn='));
      if (hit) recentAsn = String(hit.detail);
    } catch {
      /* ignore */
    }

    return json({
      success: true,
      data: {
        users: users || { total: 0, active: 0 },
        traffic_used: traffic?.used || 0,
        online_approx: sessions?.n || 0,
        speed_profile: profile || 'stable',
        profiles: SPEED_PROFILES,
        auto_clean: autoLog !== 'false',
        last_cron: cron ? Number(cron) : 0,
        auto_log: safeJson(cleanLog),
        health_log: safeJson(healthLog),
        brand: safeJson(brand) || defaultBrand(),
        canary: safeJson(canary) || { hits: [], blocked: [] },
        nodes: safeJson(nodes) || [],
        weighted_domains: safeJson(domains) || [],
        recent_asn: recentAsn,
        features: FEATURE_CATALOG,
      },
    });
  }

  // POST /api/lab/auto-clean — run now
  if (action === 'auto-clean' && request.method === 'POST') {
    type AutoBody = { topN?: number; enabled?: boolean };
    const body: AutoBody = await request.json<AutoBody>().catch(() => ({} as AutoBody));
    if (typeof body.enabled === 'boolean') {
      await kvSet(env.DB, 'cleanip.auto_enabled', body.enabled ? 'true' : 'false');
    }
    const result = await refreshAutoCleanIps(env.DB, body.topN || 28);
    return json({ success: true, data: { result, message: 'استخر Clean-IP شبانه/دستی به‌روز شد' } });
  }

  // POST /api/lab/health-check
  if (action === 'health-check' && request.method === 'POST') {
    const result = await healthCheckCleanIps(env.DB);
    return json({
      success: true,
      data: {
        ...result,
        message: `${result.removed.length} آی‌پی مرده حذف شد · ${result.kept.length} زنده ماند`,
      },
    });
  }

  // POST /api/lab/cron-run — manual cron
  if (action === 'cron-run' && request.method === 'POST') {
    await runScheduledEdgeOps(env.DB);
    return json({ success: true, message: 'Cron edge ops اجرا شد' });
  }

  // PUT /api/lab/profile
  if (action === 'profile' && (request.method === 'PUT' || request.method === 'POST')) {
    type ProfBody = { profile?: SpeedProfile };
    const body: ProfBody = await request.json<ProfBody>().catch(() => ({} as ProfBody));
    const p = (body.profile || 'stable') as SpeedProfile;
    if (!SPEED_PROFILES[p]) return json({ success: false, message: 'پروفایل نامعتبر' }, 400);
    await kvSet(env.DB, 'panel.speed_profile', p);
    return json({ success: true, data: { profile: p, meta: SPEED_PROFILES[p] } });
  }

  // POST /api/lab/guest-link — 24h guest sub + QR payload
  if (action === 'guest-link' && request.method === 'POST') {
    type GuestBody = { hours?: number; profile?: string; userUuid?: string };
    const body: GuestBody = await request.json<GuestBody>().catch(() => ({} as GuestBody));
    const hours = Math.min(Math.max(Number(body.hours) || 24, 1), 168);
    let userUuid = body.userUuid || '';
    if (!userUuid) {
      const admin = await env.DB.prepare(
        `SELECT uuid FROM users WHERE role='admin' ORDER BY id ASC LIMIT 1`
      ).first<{ uuid: string }>();
      userUuid = admin?.uuid || '';
    }
    if (!userUuid) return json({ success: false, message: 'کاربری نیست' }, 400);
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 22);
    const exp = Date.now() + hours * 3600 * 1000;
    await kvSet(
      env.DB,
      `guest.sub.${token}`,
      JSON.stringify({ exp, userUuid, profile: body.profile || 'stable', hours })
    );
    const base = await getSecureBase(env.DB, url.origin);
    const guestUrl = `${base}/api/lab/guest?token=${token}`;
    return json({
      success: true,
      data: {
        url: guestUrl,
        token,
        expiresAt: exp,
        hours,
        qr: guestUrl,
        message: `لینک مهمان ${hours} ساعته آماده است`,
      },
    });
  }

  // GET/PUT whitelabel
  if (action === 'brand' && request.method === 'GET') {
    return json({ success: true, data: safeJson(await kvGet(env.DB, 'brand.config')) || defaultBrand() });
  }
  if (action === 'brand' && (request.method === 'PUT' || request.method === 'POST')) {
    type BrandBody = Record<string, unknown> & { sub_banner?: string; sub_name?: string };
    const body: BrandBody = await request.json<BrandBody>().catch(() => ({} as BrandBody));
    const next = { ...defaultBrand(), ...body };
    await kvSet(env.DB, 'brand.config', JSON.stringify(next));
    if (typeof body.sub_banner === 'string') {
      await kvSet(env.DB, 'panel.sub_banner', String(body.sub_banner));
    }
    if (typeof body.sub_name === 'string') {
      await kvSet(env.DB, 'panel.sub_name', String(body.sub_name));
    }
    return json({ success: true, data: next, message: 'وایت‌لیبل ذخیره شد' });
  }

  // Weighted domains
  if (action === 'domains' && (request.method === 'PUT' || request.method === 'POST')) {
    type DomBody = { domains?: { host: string; weight: number }[] };
    const body: DomBody = await request.json<DomBody>().catch(() => ({} as DomBody));
    const list = (body.domains || [])
      .filter((d) => d.host && d.host.includes('.'))
      .map((d) => ({ host: d.host.toLowerCase(), weight: Math.max(1, Number(d.weight) || 1) }))
      .slice(0, 20);
    await kvSet(env.DB, 'panel.custom_domains_weighted', JSON.stringify(list));
    await kvSet(env.DB, 'panel.custom_domains', list.map((d) => d.host).join(','));
    return json({ success: true, data: list });
  }

  // Canary report
  if (action === 'canary' && request.method === 'GET') {
    return json({
      success: true,
      data: safeJson(await kvGet(env.DB, 'canary.report')) || { hits: [], blocked: [] },
    });
  }
  if (action === 'canary' && request.method === 'POST') {
    type CanBody = { blockIp?: string; clear?: boolean };
    const body: CanBody = await request.json<CanBody>().catch(() => ({} as CanBody));
    if (body.clear) {
      await kvSet(env.DB, 'canary.report', JSON.stringify({ hits: [], blocked: [] }));
      await kvSet(env.DB, 'canary.blocked_ips', '[]');
      return json({ success: true, message: 'گزارش پاک شد' });
    }
    if (body.blockIp) {
      const raw = await kvGet(env.DB, 'canary.blocked_ips');
      const list: string[] = safeJson(raw) || [];
      if (!list.includes(body.blockIp)) list.push(body.blockIp);
      await kvSet(env.DB, 'canary.blocked_ips', JSON.stringify(list.slice(0, 200)));
      return json({ success: true, data: { blocked: list } });
    }
    return json({ success: false, message: 'noop' }, 400);
  }

  // Fragment / reality presets
  if (action === 'presets' && request.method === 'POST') {
    type PresetBody = { preset?: string };
    const body: PresetBody = await request.json<PresetBody>().catch(() => ({} as PresetBody));
    const preset = body.preset || 'fragment';
    if (preset === 'fragment') {
      await kvSet(env.DB, 'tls_fragment.enabled', 'true');
      await kvSet(env.DB, 'tls_fragment.mode', 'sni');
      await kvSet(env.DB, 'tls_fragment.length', '10-20');
      await kvSet(env.DB, 'tls_fragment.sleep', '10-20');
    } else if (preset === 'ech') {
      await kvSet(env.DB, 'ech.enabled', 'true');
    } else if (preset === 'stealth-max') {
      await kvSet(env.DB, 'disguise.enabled', 'true');
      await kvSet(env.DB, 'disguise.fallback_page', '404');
      await kvSet(env.DB, 'tls_fragment.enabled', 'true');
    } else if (preset === 'reality-ready') {
      // Workers can't terminate Reality; store client-side hint flags for sub builders
      await kvSet(env.DB, 'panel.reality_ready', 'true');
      await kvSet(env.DB, 'tls_fragment.enabled', 'true');
      await kvSet(env.DB, 'panel.fingerprint', 'chrome');
    }
    return json({ success: true, message: `پریست ${preset} اعمال شد` });
  }

  // Backup
  if (action === 'backup' && request.method === 'GET') {
    const kv = await env.DB.prepare(`SELECT k, v, updated FROM kvstore`).all<{
      k: string;
      v: string;
      updated: number;
    }>();
    const users = await env.DB.prepare(`SELECT * FROM users`).all();
    const configs = await env.DB.prepare(`SELECT * FROM configs`).all();
    const payload = {
      version: XRayMOD_VERSION,
      exportedAt: Date.now(),
      kv: (kv.results || []).filter(
        (r) => !r.k.startsWith('session:') && !r.k.startsWith('ratelimit:')
      ),
      users: users.results || [],
      configs: configs.results || [],
    };
    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="xraymod-backup-${Date.now()}.json"`,
      },
    });
  }

  // Restore
  if (action === 'restore' && request.method === 'POST') {
    const body = await request
      .json<{
        kv?: { k: string; v: string; updated?: number }[];
        users?: any[];
        configs?: any[];
      }>()
      .catch(() => null);
    if (!body?.kv) return json({ success: false, message: 'فایل بکاپ نامعتبر' }, 400);
    let n = 0;
    for (const row of body.kv) {
      if (!row.k || row.k.startsWith('session:')) continue;
      await kvSet(env.DB, row.k, String(row.v ?? ''));
      n++;
    }
    return json({
      success: true,
      message: `${n} کلید تنظیمات بازگردانی شد (کاربران موجود حفظ شدند مگر در ایمپورت جدا)`,
    });
  }

  // Multi-node
  if (action === 'nodes' && request.method === 'GET') {
    return json({ success: true, data: safeJson(await kvGet(env.DB, 'panel.nodes_json')) || [] });
  }
  if (action === 'nodes' && (request.method === 'PUT' || request.method === 'POST')) {
    type NodesBody = {
      nodes?: { name: string; worker: string; accountId?: string; weight?: number }[];
    };
    const body: NodesBody = await request.json<NodesBody>().catch(() => ({} as NodesBody));
    const nodes = (body.nodes || []).slice(0, 20);
    await kvSet(env.DB, 'panel.nodes_json', JSON.stringify(nodes));
    return json({ success: true, data: nodes });
  }

  // Versions / rollback
  if (action === 'versions' && request.method === 'GET') {
    const token = await kvGet(env.DB, 'panel.cf_api_token');
    const accountId = await kvGet(env.DB, 'panel.cf_account_id');
    const workerName = await kvGet(env.DB, 'panel.worker_name');
    if (!token || !accountId || !workerName) {
      return json({ success: false, message: 'توکن/اکانت Cloudflare ذخیره نشده' }, 400);
    }
    const versions = await listWorkerVersions(token, accountId, workerName);
    return json({ success: true, data: { versions, workerName } });
  }
  if (action === 'rollback' && request.method === 'POST') {
    type RbBody = { versionId?: string };
    const body: RbBody = await request.json<RbBody>().catch(() => ({} as RbBody));
    const token = await kvGet(env.DB, 'panel.cf_api_token');
    const accountId = await kvGet(env.DB, 'panel.cf_account_id');
    const workerName = await kvGet(env.DB, 'panel.worker_name');
    if (!token || !accountId || !workerName || !body.versionId) {
      return json({ success: false, message: 'پارامتر ناقص' }, 400);
    }
    await rollbackWorkerVersion(token, accountId, workerName, body.versionId);
    return json({ success: true, message: 'Rollback انجام شد' });
  }

  // Update job status passthrough
  if (action === 'update-job' && request.method === 'GET') {
    const job = await readUpdateJob(env.DB);
    return json({ success: true, job });
  }

  return json({ success: false, message: 'Not found' }, 404);
}

function safeJson(raw: string): any {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function defaultBrand() {
  return {
    name: 'XRayMOD',
    logo_url: '',
    accent: '#1ec8c8',
    coral: '#ff5c45',
    bg: '#060b12',
    domain: '',
    sub_name: 'XRayMOD',
    sub_banner: 'Secure edge · Clean IP · Smart sub',
    support_url: '',
  };
}

export const FEATURE_CATALOG = [
  { id: 'auto-clean', title: 'Auto Clean-IP شبانه', group: 'speed' },
  { id: 'health', title: 'Health-check لبه', group: 'speed' },
  { id: 'profiles', title: 'پروفایل سرعت', group: 'speed' },
  { id: 'guest', title: 'ساب مهمان ۲۴ساعته + QR', group: 'sub' },
  { id: 'split', title: 'Split Routing ایران', group: 'sub' },
  { id: 'failover', title: 'Failover هوشمند', group: 'sub' },
  { id: 'live', title: 'داشبورد لحظه‌ای', group: 'ux' },
  { id: 'brand', title: 'وایت‌لیبل', group: 'ux' },
  { id: 'domains', title: 'دامنه وزنی', group: 'stealth' },
  { id: 'canary', title: 'Canary حرفه‌ای', group: 'stealth' },
  { id: 'presets', title: 'Fragment / Reality presets', group: 'stealth' },
  { id: 'rollback', title: 'Rollback یک‌کلیکی', group: 'ops' },
  { id: 'backup', title: 'Backup / Restore', group: 'ops' },
  { id: 'nodes', title: 'Multi-node', group: 'ops' },
];
