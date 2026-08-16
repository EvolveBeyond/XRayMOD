/**
 * Edge ops: nightly clean-IP refresh, health checks, speed profiles.
 */
import { generateCountryCleanIPs, serializeLabeled, PREFERRED_COUNTRIES } from './cleanip-pool';
import { setCleanIPs, getCleanIPs } from '../utils';
import { countryFlag, countryLabel } from './links';

export type SpeedProfile = 'gaming' | 'youtube' | 'stable';

export const SPEED_PROFILES: Record<
  SpeedProfile,
  { label: string; ports: number[]; fps: string[]; countries: string[]; maxIps: number }
> = {
  gaming: {
    label: 'گیمینگ',
    ports: [443, 2053],
    fps: ['chrome', 'firefox'],
    countries: ['DE', 'NL', 'FI', 'SE'],
    maxIps: 8,
  },
  youtube: {
    label: 'یوتیوب',
    ports: [443, 8443, 2096],
    fps: ['chrome', 'safari'],
    countries: ['DE', 'NL', 'TR', 'GB'],
    maxIps: 10,
  },
  stable: {
    label: 'پایدار',
    ports: [443],
    fps: ['chrome'],
    countries: ['DE', 'NL', 'FI', 'SE', 'TR', 'FR'],
    maxIps: 12,
  },
};

async function kvSet(db: D1Database, k: string, v: string): Promise<void> {
  await db
    .prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
    .bind(k, v, Date.now())
    .run();
}

async function kvGet(db: D1Database, k: string): Promise<string> {
  const row = await db.prepare('SELECT v FROM kvstore WHERE k = ?').bind(k).first<{ v: string }>();
  return row?.v || '';
}

/** Probe CF edge IP from Worker (dead detection). */
export async function probeEdgeIp(
  ip: string,
  port = 443,
  timeoutMs = 2500
): Promise<{ ok: boolean; ms: number }> {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://${ip}:${port}/cdn-cgi/trace`, {
      method: 'GET',
      redirect: 'manual',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'XRayMOD-Health/5.1' },
      cf: { cacheTtl: 0, cacheEverything: false },
    } as RequestInit);
    clearTimeout(timer);
    // Any TCP/TLS response (even 4xx) means edge is alive
    void res;
    return { ok: true, ms: Date.now() - t0 };
  } catch {
    clearTimeout(timer);
    return { ok: false, ms: Date.now() - t0 };
  }
}

export async function healthCheckCleanIps(
  db: D1Database,
  opts?: { concurrency?: number }
): Promise<{ kept: string[]; removed: string[]; checked: number }> {
  const ips = await getCleanIPs(db);
  if (!ips.length) return { kept: [], removed: [], checked: 0 };

  const concurrency = opts?.concurrency || 6;
  const kept: string[] = [];
  const removed: string[] = [];

  for (let i = 0; i < ips.length; i += concurrency) {
    const batch = ips.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (raw) => {
        const [hostPort] = raw.split('#');
        const [ip, portStr] = (hostPort || '').split(':');
        const port = Number(portStr) || 443;
        if (!ip) return { raw, ok: false };
        // 2 samples — both fail → dead
        const a = await probeEdgeIp(ip, port);
        const b = a.ok ? a : await probeEdgeIp(ip, port);
        return { raw, ok: a.ok || b.ok };
      })
    );
    for (const r of results) {
      if (r.ok) kept.push(r.raw);
      else removed.push(r.raw);
    }
  }

  if (kept.length || removed.length) {
    await setCleanIPs(db, kept.length ? kept : ips.slice(0, 3));
    await kvSet(
      db,
      'cleanip.health_log',
      JSON.stringify({
        at: Date.now(),
        checked: ips.length,
        kept: kept.length,
        removed: removed.length,
        dead: removed.slice(0, 20),
      })
    );
  }

  return { kept, removed, checked: ips.length };
}

const ISPS = ['mtn', 'mci', 'rightel', 'shatel', 'ir', 'all'] as const;

/** Nightly / on-demand: refresh Top-N country IPs per ISP bucket. */
export async function refreshAutoCleanIps(
  db: D1Database,
  topN = 24
): Promise<{ isp: string; count: number }[]> {
  const out: { isp: string; count: number }[] = [];
  const labeled = await generateCountryCleanIPs({
    count: Math.min(topN * 2, 80),
    port: 443,
    countries: [...PREFERRED_COUNTRIES],
  });
  const serialized = serializeLabeled(labeled);

  // Health-filter quickly
  const alive: string[] = [];
  for (let i = 0; i < serialized.length && alive.length < topN; i += 8) {
    const batch = serialized.slice(i, i + 8);
    const probed = await Promise.all(
      batch.map(async (raw) => {
        const [hp] = raw.split('#');
        const [ip, p] = (hp || '').split(':');
        const r = await probeEdgeIp(ip || '', Number(p) || 443, 2000);
        return r.ok ? raw : null;
      })
    );
    for (const x of probed) if (x) alive.push(x);
  }

  const pool = (alive.length ? alive : serialized).slice(0, topN);
  for (const isp of ISPS) {
    await setCleanIPs(db, pool, isp === 'all' ? undefined : isp);
    out.push({ isp, count: pool.length });
  }

  await kvSet(
    db,
    'cleanip.auto_log',
    JSON.stringify({
      at: Date.now(),
      topN,
      pool: pool.slice(0, 12),
      countries: PREFERRED_COUNTRIES,
      note: 'nightly auto clean-IP',
    })
  );
  await kvSet(db, 'cleanip.auto_enabled', (await kvGet(db, 'cleanip.auto_enabled')) || 'true');

  return out;
}

export async function runScheduledEdgeOps(db: D1Database): Promise<void> {
  const auto = (await kvGet(db, 'cleanip.auto_enabled')) !== 'false';
  if (auto) {
    await refreshAutoCleanIps(db, 28);
  }
  const health = (await kvGet(db, 'cleanip.health_enabled')) !== 'false';
  if (health) {
    await healthCheckCleanIps(db);
  }
  await kvSet(db, 'edge.last_cron', String(Date.now()));
}

export function profileMeta(profile: SpeedProfile) {
  return SPEED_PROFILES[profile] || SPEED_PROFILES.stable;
}

export { countryFlag, countryLabel };
