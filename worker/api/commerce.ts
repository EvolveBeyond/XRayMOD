/**
 * Commerce API — Mini App store, wallet, coupons, referrals.
 * Public (buyer) + admin (session) endpoints.
 */

import type { Env } from '../types';
import { ensureSchema } from '../schema';
import {
  ensureCommerceSeed,
  getOrCreateWallet,
  creditWallet,
  purchasePlan,
  trackReferralClick,
} from '../lib/commerce';
import { runAlertChecks } from '../lib/alerts';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Buyer-Key, X-Ref',
    },
  });
}

async function kvGet(db: D1Database, k: string): Promise<string> {
  const row = await db.prepare('SELECT v FROM kvstore WHERE k = ?').bind(k).first<{ v: string }>();
  return row?.v || '';
}

function buyerKey(req: Request, body?: Record<string, unknown>): string {
  const h = req.headers.get('X-Buyer-Key') || '';
  if (h.trim()) return h.trim().slice(0, 64);
  const b = String(body?.buyerKey || body?.tgId || '').trim();
  if (b) return b.slice(0, 64);
  // anonymous demo wallet per day bucket
  return `anon:${new Date().toISOString().slice(0, 10)}`;
}

export async function handleCommerce(
  req: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  if (req.method === 'OPTIONS') return json({ ok: true });

  await ensureSchema(env.DB);
  await ensureCommerceSeed(env.DB);

  const url = new URL(req.url);
  const route = (params.action || url.pathname.replace(/^\/api\/commerce\/?/, '') || 'catalog').replace(
    /\/$/,
    ''
  );

  // GET /api/commerce/catalog?manager=owner_demo
  if ((route === 'catalog' || route === '') && req.method === 'GET') {
    const managerId = url.searchParams.get('manager') || 'owner_demo';
    const mgr = await env.DB.prepare(`SELECT * FROM managers WHERE id = ? AND status = 'active'`)
      .bind(managerId)
      .first();
    if (!mgr) return json({ ok: false, error: 'manager_not_found' }, 404);
    const { results: plans } = await env.DB.prepare(
      `SELECT id, name, days, traffic_gb, price_stars, price_dai FROM plans WHERE manager_id = ? AND active = 1 ORDER BY days`
    )
      .bind(managerId)
      .all();
    const commission = Number((mgr as { commission_pct?: number }).commission_pct) || 15;
    return json({
      ok: true,
      manager: {
        id: (mgr as { id: string }).id,
        role: (mgr as { role: string }).role,
        name: (mgr as { name: string }).name,
        welcome: (mgr as { welcome: string }).welcome,
        commissionPct: commission,
        parentId: (mgr as { parent_id: string }).parent_id || '',
      },
      plans: plans || [],
      invitePath: `?ref=${managerId}`,
    });
  }

  // GET /api/commerce/manager?ref=
  if (route === 'manager' && req.method === 'GET') {
    const ref = url.searchParams.get('ref') || url.searchParams.get('id') || '';
    if (!ref) return json({ ok: false, error: 'ref_required' }, 400);
    await trackReferralClick(env.DB, ref);
    const mgr = await env.DB.prepare(`SELECT * FROM managers WHERE id = ?`)
      .bind(ref)
      .first();
    if (!mgr) return json({ ok: false, error: 'not_found' }, 404);
    const refRow = await env.DB.prepare(`SELECT clicks, conversions FROM referrals WHERE ref_code = ?`)
      .bind(ref)
      .first<{ clicks: number; conversions: number }>();
    return json({
      ok: true,
      manager: {
        id: (mgr as { id: string }).id,
        role: (mgr as { role: string }).role,
        name: (mgr as { name: string }).name,
        welcome: (mgr as { welcome: string }).welcome,
        commissionPct: Number((mgr as { commission_pct?: number }).commission_pct) || 15,
        parentId: (mgr as { parent_id: string }).parent_id || '',
      },
      stats: { clicks: refRow?.clicks || 0, conversions: refRow?.conversions || 0 },
      invitePath: `?ref=${ref}`,
    });
  }

  // GET /api/commerce/wallet
  if (route === 'wallet' && req.method === 'GET') {
    const key = buyerKey(req);
    const managerId = url.searchParams.get('manager') || '';
    const w = await getOrCreateWallet(env.DB, key);
    let mgrWallet = null;
    if (managerId) {
      mgrWallet = await getOrCreateWallet(env.DB, `mgr:${managerId}`);
    }
    const { results: tx } = await env.DB.prepare(
      `SELECT amount, currency, type, status, note, created_at FROM wallet_tx
       WHERE owner_key = ? OR owner_key = ? ORDER BY created_at DESC LIMIT 40`
    )
      .bind(key, managerId ? `mgr:${managerId}` : key)
      .all();
    return json({
      ok: true,
      buyer: w,
      managerWallet: mgrWallet,
      transactions: tx || [],
    });
  }

  // POST /api/commerce/topup  { amount, currency, buyerKey }
  if (route === 'topup' && req.method === 'POST') {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const key = buyerKey(req, body);
    const amount = Number(body.amount) || 0;
    const currency = body.currency === 'dai' ? 'dai' : 'stars';
    if (amount <= 0 || amount > 100000) return json({ ok: false, error: 'bad_amount' }, 400);
    // Demo top-up (Stars invoice stub) — credits immediately for Mini App UX
    await creditWallet(env.DB, key, amount, currency, 'deposit', 'شارژ کیف پول (Stars/Demo)');
    const w = await getOrCreateWallet(env.DB, key);
    return json({ ok: true, wallet: w, message: 'شارژ انجام شد' });
  }

  // POST /api/commerce/purchase
  if (route === 'purchase' && req.method === 'POST') {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const key = buyerKey(req, body);
    const planId = String(body.planId || '');
    const currency = body.currency === 'dai' ? 'dai' : 'stars';
    const coupon = String(body.coupon || '');
    const ref = String(body.ref || req.headers.get('X-Ref') || '');
    if (!planId) return json({ ok: false, error: 'plan_required' }, 400);
    const result = await purchasePlan(env.DB, {
      buyerKey: key,
      planId,
      currency,
      coupon: coupon || undefined,
      ref: ref || undefined,
    });
    if (!result.ok) return json(result, 400);
    return json(result);
  }

  // POST /api/commerce/coupon/validate
  if (route === 'coupon/validate' && req.method === 'POST') {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const code = String(body.code || '').trim();
    const managerId = String(body.managerId || '');
    if (!code) return json({ ok: false, error: 'code_required' }, 400);
    const c = await env.DB.prepare(
      `SELECT code, pct_off, max_uses, used_count, expires_at, manager_id, active FROM coupons WHERE upper(code) = upper(?)`
    )
      .bind(code)
      .first<{
        code: string;
        pct_off: number;
        max_uses: number;
        used_count: number;
        expires_at: number;
        manager_id: string;
        active: number;
      }>();
    if (!c || !c.active) return json({ ok: false, valid: false, message: 'کد نامعتبر' });
    if (c.max_uses > 0 && c.used_count >= c.max_uses) {
      return json({ ok: false, valid: false, message: 'سقف استفاده پر شده' });
    }
    if (c.expires_at > 0 && c.expires_at < Date.now()) {
      return json({ ok: false, valid: false, message: 'منقضی شده' });
    }
    if (managerId && c.manager_id && c.manager_id !== managerId && c.manager_id !== 'owner_demo') {
      return json({ ok: false, valid: false, message: 'کد این فروشگاه نیست' });
    }
    return json({
      ok: true,
      valid: true,
      code: c.code,
      pctOff: c.pct_off,
      message: `${c.pct_off}٪ تخفیف`,
    });
  }

  // GET /api/commerce/reseller?manager=
  if (route === 'reseller' && req.method === 'GET') {
    const managerId = url.searchParams.get('manager') || 'owner_demo';
    const mgr = await env.DB.prepare(`SELECT * FROM managers WHERE id = ?`).bind(managerId).first();
    if (!mgr) return json({ ok: false, error: 'not_found' }, 404);
    const wallet = await getOrCreateWallet(env.DB, `mgr:${managerId}`);
    const ref = await env.DB.prepare(`SELECT clicks, conversions FROM referrals WHERE ref_code = ?`)
      .bind(managerId)
      .first<{ clicks: number; conversions: number }>();
    const { results: commissions } = await env.DB.prepare(
      `SELECT order_id, amount, currency, pct, created_at FROM commissions WHERE manager_id = ? ORDER BY created_at DESC LIMIT 30`
    )
      .bind(managerId)
      .all();
    const { results: children } = await env.DB.prepare(
      `SELECT id, name, role, commission_pct, status FROM managers WHERE parent_id = ?`
    )
      .bind(managerId)
      .all();
    const host = url.origin;
    const inviteUrl = `${host}/twa/user?ref=${managerId}`;
    const startappUrl = `https://t.me/${(await kvGet(env.DB, 'tg.bot_username')) || 'YourBot'}/app?startapp=${managerId}`;
    return json({
      ok: true,
      manager: {
        id: (mgr as { id: string }).id,
        name: (mgr as { name: string }).name,
        role: (mgr as { role: string }).role,
        commissionPct: Number((mgr as { commission_pct?: number }).commission_pct) || 15,
      },
      wallet,
      stats: { clicks: ref?.clicks || 0, conversions: ref?.conversions || 0 },
      commissions: commissions || [],
      children: children || [],
      inviteUrl,
      startappUrl,
      refParam: `?ref=${managerId}`,
    });
  }

  // POST /api/commerce/reseller/create — owner creates sponsor
  if (route === 'reseller/create' && req.method === 'POST') {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const parentId = String(body.parentId || 'owner_demo');
    const name = String(body.name || 'Reseller').slice(0, 64);
    const commissionPct = Math.min(50, Math.max(1, Number(body.commissionPct) || 15));
    const id =
      String(body.id || '')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 32) || `s_${crypto.randomUUID().slice(0, 8)}`;
    const parent = await env.DB.prepare(`SELECT id FROM managers WHERE id = ?`).bind(parentId).first();
    if (!parent) return json({ ok: false, error: 'parent_not_found' }, 404);
    await env.DB.prepare(
      `INSERT OR IGNORE INTO managers (id, role, name, welcome, commission_pct, parent_id, status, created_at)
       VALUES (?, 'sponsor', ?, ?, ?, ?, 'active', ?)`
    )
      .bind(id, name, `فروشگاه ${name}`, commissionPct, parentId, Date.now())
      .run();
    await env.DB.prepare(
      `INSERT OR IGNORE INTO referrals (ref_code, manager_id, clicks, conversions, created_at)
       VALUES (?, ?, 0, 0, ?)`
    )
      .bind(id, id, Date.now())
      .run();
    // seed a default monthly plan
    await env.DB.prepare(
      `INSERT OR IGNORE INTO plans (id, manager_id, name, days, traffic_gb, price_stars, price_dai, active, created_at)
       VALUES (?, ?, ?, 30, 100, 600, 5, 1, ?)`
    )
      .bind(`plan_${id}`, id, `ماهانه ${name}`, Date.now())
      .run();
    return json({
      ok: true,
      id,
      invitePath: `?ref=${id}`,
      message: 'زیرمجموعه‌فروش ساخته شد',
    });
  }

  // POST /api/commerce/alerts/run — manual trigger
  if (route === 'alerts/run' && req.method === 'POST') {
    const r = await runAlertChecks(env);
    return json({ ok: true, ...r });
  }

  // GET /api/commerce/alerts/status
  if (route === 'alerts/status' && req.method === 'GET') {
    const last = await kvGet(env.DB, 'alerts.last_run');
    const enabled = (await kvGet(env.DB, 'alerts.enabled')) !== 'false';
    const hasTg = !!(await kvGet(env.DB, 'tg.bot_token')) && !!(await kvGet(env.DB, 'tg.chat_id'));
    return json({ ok: true, enabled, hasTg, last: last ? JSON.parse(last) : null });
  }

  return json({ ok: false, error: 'not_found', path: route }, 404);
}
