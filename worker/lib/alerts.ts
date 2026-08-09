/**
 * Telegram alert bot: Worker pause, monthly cap, weak IPs, suspicious login.
 */

import type { Env } from '../types';

async function kvGet(db: D1Database, k: string): Promise<string> {
  const row = await db.prepare('SELECT v FROM kvstore WHERE k = ?').bind(k).first<{ v: string }>();
  return row?.v || '';
}

async function kvSet(db: D1Database, k: string, v: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO kvstore (k, v, updated) VALUES (?, ?, ?)
       ON CONFLICT(k) DO UPDATE SET v = excluded.v, updated = excluded.updated`
    )
    .bind(k, v, Date.now())
    .run();
}

async function sendTg(botToken: string, chatId: string, text: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, parse_mode: 'HTML', text }),
    });
  } catch (e) {
    console.error('[alerts] send failed', e);
  }
}

/** Dedup: don't re-send same alert key within cooldownMs */
async function shouldFire(db: D1Database, key: string, cooldownMs: number): Promise<boolean> {
  const raw = await kvGet(db, `alert.last.${key}`);
  const last = Number(raw) || 0;
  if (Date.now() - last < cooldownMs) return false;
  await kvSet(db, `alert.last.${key}`, String(Date.now()));
  return true;
}

export async function runAlertChecks(env: Env): Promise<{ sent: string[] }> {
  const db = env.DB;
  const enabled = (await kvGet(db, 'alerts.enabled')) !== 'false';
  if (!enabled) return { sent: [] };

  const botToken = (await kvGet(db, 'tg.bot_token')) || '';
  const chatId = (await kvGet(db, 'tg.chat_id')) || '';
  if (!botToken || !chatId) return { sent: [] };

  const sent: string[] = [];
  const cool = 6 * 60 * 60 * 1000; // 6h

  // 1) Worker / panel paused
  const paused = (await kvGet(db, 'panel.paused')) === 'true';
  if (paused && (await shouldFire(db, 'worker_paused', cool))) {
    await sendTg(
      botToken,
      chatId,
      '🚨 <b>Worker متوقف است</b>\nسرویس proxy/subscription در حالت pause است. از پنل فعال کنید.'
    );
    sent.push('worker_paused');
  }

  // 2) Monthly traffic cap (users.traffic_used vs panel.monthly_cap_gb)
  const capGB = Number(await kvGet(db, 'panel.monthly_cap_gb')) || 0;
  if (capGB > 0) {
    const trafficRow = await db
      .prepare('SELECT SUM(traffic_used) as total FROM users')
      .first<{ total: number }>();
    const usedBytes = Number(trafficRow?.total) || 0;
    const usedGB = usedBytes / 1073741824;
    const pct = (usedGB / capGB) * 100;
    if (pct >= 95 && (await shouldFire(db, 'cap_95', cool))) {
      await sendTg(
        botToken,
        chatId,
        `⚠️ <b>کپ ماهانه تقریباً پر</b>\nمصرف: ${Math.round(pct)}٪ (${usedGB.toFixed(1)} / ${capGB} GB)`
      );
      sent.push('cap_95');
    } else if (pct >= 80 && (await shouldFire(db, 'cap_80', cool))) {
      await sendTg(
        botToken,
        chatId,
        `📊 <b>کپ ماهانه ۸۰٪+</b>\nمصرف: ${Math.round(pct)}٪ — ظرفیت را افزایش دهید.`
      );
      sent.push('cap_80');
    }
  }

  // 3) Weak / dead clean IPs from health log
  try {
    const health = await kvGet(db, 'cleanip.health_log');
    if (health) {
      const log = JSON.parse(health) as {
        removed?: number;
        dead?: string[];
        at?: number;
      };
      const removed = Number(log.removed) || log.dead?.length || 0;
      const recent = !log.at || Date.now() - log.at < 24 * 60 * 60 * 1000;
      if (removed > 0 && recent && (await shouldFire(db, 'weak_ips', cool))) {
        const sample = (log.dead || []).slice(0, 3).join(', ') || '—';
        await sendTg(
          botToken,
          chatId,
          `🛰️ <b>IPهای ضعیف</b>\nحذف‌شده از health-check: ${removed}\nنمونه: <code>${sample}</code>`
        );
        sent.push('weak_ips');
      }
    }
  } catch {
    /* ignore */
  }

  // 4) Suspicious login — sum recent ratelimit:login:* counters
  try {
    const { results } = await db
      .prepare(
        `SELECT v, updated FROM kvstore WHERE k LIKE 'ratelimit:login:%' ORDER BY updated DESC LIMIT 40`
      )
      .all<{ v: string; updated: number }>();
    const windowMs = 30 * 60 * 1000;
    let fails = 0;
    let hotIps = 0;
    for (const row of results || []) {
      if (Date.now() - (row.updated || 0) > windowMs) continue;
      try {
        const data = JSON.parse(row.v || '{}') as { count?: number };
        const c = Number(data.count) || 0;
        fails += c;
        if (c >= 5) hotIps++;
      } catch {
        /* ignore */
      }
    }
    if ((fails >= 12 || hotIps >= 2) && (await shouldFire(db, 'suspicious_login', cool))) {
      await sendTg(
        botToken,
        chatId,
        `🔐 <b>لاگین مشکوک</b>\n${fails} تلاش ناموفق · ${hotIps} IP داغ در ۳۰ دقیقه.\nرمز را عوض کنید یا IP را بررسی کنید.`
      );
      sent.push('suspicious_login');
    }
  } catch {
    /* ignore */
  }

  if (sent.length) {
    await kvSet(db, 'alerts.last_run', JSON.stringify({ at: Date.now(), sent }));
  } else {
    await kvSet(db, 'alerts.last_run', JSON.stringify({ at: Date.now(), sent: [] }));
  }
  return { sent };
}
