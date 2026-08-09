/**
 * Commerce core: plans, wallets, coupons, referrals, commissions.
 */

export type PlanRow = {
  id: string;
  manager_id: string;
  name: string;
  days: number;
  traffic_gb: number;
  price_stars: number;
  price_dai: number;
  active: number;
};

export async function ensureCommerceSeed(db: D1Database): Promise<void> {
  const mgr = await db.prepare(`SELECT id FROM managers WHERE id = ?`).bind('owner_demo').first();
  if (!mgr) {
    const now = Date.now();
    await db
      .prepare(
        `INSERT OR IGNORE INTO managers (id, role, name, welcome, commission_pct, parent_id, status, created_at)
         VALUES (?, 'owner', ?, ?, 20, '', 'active', ?)`
      )
      .bind(
        'owner_demo',
        'Niroomand Edge',
        'به پنل اختصاصی خوش آمدید — فروشگاه و کیف پول واقعی.',
        now
      )
      .run();
    await db
      .prepare(
        `INSERT OR IGNORE INTO managers (id, role, name, welcome, commission_pct, parent_id, status, created_at)
         VALUES (?, 'sponsor', ?, ?, 15, 'owner_demo', 'active', ?)`
      )
      .bind(
        'sponsor_demo',
        'Pakrohk Nodes',
        'فروشگاه اسپانسر — کمیسیون روی هر خرید زیرمجموعه‌.',
        now
      )
      .run();

    const plans = [
      ['plan_day', 'owner_demo', 'روزانه ۱ روز / ۱۰GB', 1, 10, 50, 0.5],
      ['plan_week', 'owner_demo', 'هفتگی ۷ روز / ۵۰GB', 7, 50, 250, 2.0],
      ['plan_month', 'owner_demo', 'ماهانه ۳۰ روز / ۲۰۰GB', 30, 200, 800, 6.0],
      ['plan_day_s', 'sponsor_demo', 'روزانه اسپانسر', 1, 8, 40, 0.4],
      ['plan_month_s', 'sponsor_demo', 'ماهانه اسپانسر', 30, 150, 700, 5.5],
    ] as const;
    for (const p of plans) {
      await db
        .prepare(
          `INSERT OR IGNORE INTO plans (id, manager_id, name, days, traffic_gb, price_stars, price_dai, active, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
        )
        .bind(p[0], p[1], p[2], p[3], p[4], p[5], p[6], now)
        .run();
    }

    await db
      .prepare(
        `INSERT OR IGNORE INTO coupons (code, manager_id, pct_off, max_uses, used_count, expires_at, active, created_at)
         VALUES ('WELCOME10', 'owner_demo', 10, 500, 0, 0, 1, ?)`
      )
      .bind(now)
      .run();
    await db
      .prepare(
        `INSERT OR IGNORE INTO coupons (code, manager_id, pct_off, max_uses, used_count, expires_at, active, created_at)
         VALUES ('VIP25', 'sponsor_demo', 25, 50, 0, 0, 1, ?)`
      )
      .bind(now)
      .run();
  }

  // Ensure referral rows for managers
  for (const id of ['owner_demo', 'sponsor_demo']) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO referrals (ref_code, manager_id, clicks, conversions, created_at)
         VALUES (?, ?, 0, 0, ?)`
      )
      .bind(id, id, Date.now())
      .run();
  }
}

export async function getOrCreateWallet(db: D1Database, ownerKey: string) {
  let w = await db
    .prepare(`SELECT owner_key, stars, dai, gram FROM wallets WHERE owner_key = ?`)
    .bind(ownerKey)
    .first<{ owner_key: string; stars: number; dai: number; gram: number }>();
  if (!w) {
    await db
      .prepare(
        `INSERT INTO wallets (owner_key, stars, dai, gram, updated_at) VALUES (?, 100, 5, 0, ?)`
      )
      .bind(ownerKey, Date.now())
      .run();
    w = { owner_key: ownerKey, stars: 100, dai: 5, gram: 0 };
  }
  return w;
}

export async function creditWallet(
  db: D1Database,
  ownerKey: string,
  amount: number,
  currency: 'stars' | 'dai' | 'gram',
  type: string,
  note: string,
  managerId = ''
): Promise<void> {
  await getOrCreateWallet(db, ownerKey);
  const col = currency === 'stars' ? 'stars' : currency === 'dai' ? 'dai' : 'gram';
  await db
    .prepare(`UPDATE wallets SET ${col} = ${col} + ?, updated_at = ? WHERE owner_key = ?`)
    .bind(amount, Date.now(), ownerKey)
    .run();
  await db
    .prepare(
      `INSERT INTO wallet_tx (owner_key, manager_id, amount, currency, type, status, note, created_at)
       VALUES (?, ?, ?, ?, ?, 'ok', ?, ?)`
    )
    .bind(ownerKey, managerId, amount, currency, type, note, Date.now())
    .run();
}

export async function debitWallet(
  db: D1Database,
  ownerKey: string,
  amount: number,
  currency: 'stars' | 'dai',
  type: string,
  note: string,
  managerId = ''
): Promise<boolean> {
  const w = await getOrCreateWallet(db, ownerKey);
  const bal = currency === 'stars' ? w.stars : w.dai;
  if (bal < amount) return false;
  const col = currency === 'stars' ? 'stars' : 'dai';
  await db
    .prepare(`UPDATE wallets SET ${col} = ${col} - ?, updated_at = ? WHERE owner_key = ?`)
    .bind(amount, Date.now(), ownerKey)
    .run();
  await db
    .prepare(
      `INSERT INTO wallet_tx (owner_key, manager_id, amount, currency, type, status, note, created_at)
       VALUES (?, ?, ?, ?, ?, 'ok', ?, ?)`
    )
    .bind(ownerKey, managerId, -amount, currency, type, note, Date.now())
    .run();
  return true;
}

export async function trackReferralClick(db: D1Database, refCode: string): Promise<void> {
  const code = refCode.trim();
  if (!code) return;
  await db
    .prepare(
      `INSERT OR IGNORE INTO referrals (ref_code, manager_id, clicks, conversions, created_at)
       VALUES (?, ?, 0, 0, ?)`
    )
    .bind(code, code, Date.now())
    .run();
  await db
    .prepare(`UPDATE referrals SET clicks = clicks + 1 WHERE ref_code = ?`)
    .bind(code)
    .run();
}

export async function purchasePlan(
  db: D1Database,
  opts: {
    buyerKey: string;
    planId: string;
    currency: 'stars' | 'dai';
    coupon?: string;
    ref?: string;
  }
): Promise<{ ok: boolean; message: string; orderId?: string; paid?: number }> {
  const plan = await db
    .prepare(`SELECT * FROM plans WHERE id = ? AND active = 1`)
    .bind(opts.planId)
    .first<PlanRow>();
  if (!plan) return { ok: false, message: 'پلن پیدا نشد' };

  let price = opts.currency === 'stars' ? plan.price_stars : plan.price_dai;
  let couponCode = '';
  if (opts.coupon) {
    const c = await db
      .prepare(
        `SELECT * FROM coupons WHERE upper(code) = upper(?) AND active = 1`
      )
      .bind(opts.coupon.trim())
      .first<{
        code: string;
        pct_off: number;
        max_uses: number;
        used_count: number;
        expires_at: number;
        manager_id: string;
      }>();
    if (!c) return { ok: false, message: 'کد تخفیف نامعتبر' };
    if (c.max_uses > 0 && c.used_count >= c.max_uses) {
      return { ok: false, message: 'سقف استفاده کد پر شده' };
    }
    if (c.expires_at > 0 && c.expires_at < Date.now()) {
      return { ok: false, message: 'کد منقضی شده' };
    }
    if (c.manager_id && c.manager_id !== plan.manager_id && c.manager_id !== 'owner_demo') {
      // allow owner coupons globally; sponsor coupons only for their plans
      if (plan.manager_id !== c.manager_id) {
        return { ok: false, message: 'این کد برای این فروشگاه نیست' };
      }
    }
    price = Math.max(0, Math.round(price * (1 - c.pct_off / 100) * 100) / 100);
    couponCode = c.code;
  }

  const ok = await debitWallet(
    db,
    opts.buyerKey,
    price,
    opts.currency,
    'purchase',
    `خرید ${plan.name}`,
    plan.manager_id
  );
  if (!ok) return { ok: false, message: 'موجودی کافی نیست — اول شارژ کن' };

  if (couponCode) {
    await db
      .prepare(`UPDATE coupons SET used_count = used_count + 1 WHERE upper(code) = upper(?)`)
      .bind(couponCode)
      .run();
  }

  const orderId = crypto.randomUUID().slice(0, 12);
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO orders (id, buyer_key, manager_id, plan_id, amount, currency, coupon, ref_code, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)`
    )
    .bind(
      orderId,
      opts.buyerKey,
      plan.manager_id,
      plan.id,
      price,
      opts.currency,
      couponCode,
      opts.ref || '',
      now
    )
    .run();

  // Commission to manager / sponsor chain
  const mgr = await db
    .prepare(`SELECT id, commission_pct, parent_id, role FROM managers WHERE id = ?`)
    .bind(plan.manager_id)
    .first<{ id: string; commission_pct: number; parent_id: string; role: string }>();

  if (mgr) {
    const pct = Number(mgr.commission_pct) || 15;
    const commission = Math.round(price * (pct / 100) * 100) / 100;
    if (commission > 0) {
      await creditWallet(
        db,
        `mgr:${mgr.id}`,
        commission,
        opts.currency,
        'profit',
        `کمیسیون سفارش ${orderId}`,
        mgr.id
      );
      await db
        .prepare(
          `INSERT INTO commissions (order_id, manager_id, amount, currency, pct, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(orderId, mgr.id, commission, opts.currency, pct, now)
        .run();
    }
    // Parent owner override share (5% of sale) if sponsor sale
    if (mgr.parent_id) {
      const parentShare = Math.round(price * 0.05 * 100) / 100;
      if (parentShare > 0) {
        await creditWallet(
          db,
          `mgr:${mgr.parent_id}`,
          parentShare,
          opts.currency,
          'profit',
          `سهم مالک از سفارش ${orderId}`,
          mgr.parent_id
        );
      }
    }
  }

  if (opts.ref) {
    await db
      .prepare(`UPDATE referrals SET conversions = conversions + 1 WHERE ref_code = ?`)
      .bind(opts.ref)
      .run();
  }

  return { ok: true, message: 'خرید موفق', orderId, paid: price };
}
