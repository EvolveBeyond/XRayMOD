import type { Env } from './types';

// --- ISP Detection ---

export function detectIranianISP(request: Request): string {
  const cf = (request as any).cf || {};
  const org = String(cf.asOrganization || '').toLowerCase();
  const asn = Number(cf.asn || 0);
  const country = String(cf.country || '').toUpperCase();

  if (country !== 'IR') return 'all';
  if (asn === 44244 || org.includes('irancell') || org.includes('mtn')) return 'mtn';
  if (asn === 197207 || org.includes('mcci') || org.includes('hamrah')) return 'mci';
  if (asn === 57218 || org.includes('rightel')) return 'rightel';
  if (asn === 31549 || org.includes('shatel')) return 'shatel';
  return 'ir';
}

export function getISPInfo(request: Request): { asn: number; isp: string; country: string; carrier: string } {
  const cf = (request as any).cf || {};
  return {
    asn: cf.asn || 0,
    isp: cf.asOrganization || '',
    country: cf.country || '',
    carrier: detectIranianISP(request),
  };
}

// --- CIDR Random IP Generation ---

const CIDR_LISTS: Record<string, { at: number; list: string[] }> = {};

const CF_CIDR_URLS: Record<string, string> = {
  all: 'https://raw.githubusercontent.com/Leon406/SubCrawler/master/sub/cf/cloudflare_v4.txt',
  mtn: 'https://raw.githubusercontent.com/Leon406/SubCrawler/master/sub/cf/cloudflare_v4.txt',
  mci: 'https://raw.githubusercontent.com/Leon406/SubCrawler/master/sub/cf/cloudflare_v4.txt',
};

const CF_PORTS = [443, 2053, 2083, 2087, 2096, 8443];

function ipToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function intToIp(n: number): string {
  return [(n >>> 24) & 0xFF, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF].join('.');
}

function randomIPFromCIDR(cidr: string): string {
  const [base, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr);
  const hostBits = 32 - prefix;
  const ipInt = ipToInt(base);
  const mask = (0xFFFFFFFF << hostBits) >>> 0;
  const randomOffset = Math.floor(Math.random() * Math.pow(2, hostBits));
  return intToIp(((ipInt & mask) >>> 0) + randomOffset);
}

async function fetchCIDRList(carrier: string): Promise<string[]> {
  const now = Date.now();
  const cached = CIDR_LISTS[carrier];
  if (cached && now - cached.at < 3600000) return cached.list;

  const url = CF_CIDR_URLS[carrier] || CF_CIDR_URLS.all;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'XRayMOD' },
      cf: { cacheTtl: 1800, cacheEverything: true },
    });
    if (!r.ok) return ['104.16.0.0/13'];
    const text = await r.text();
    const list = text
      .split(/[\r\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s && /^\d+\.\d+\.\d+\.\d+\/\d+$/.test(s));
    CIDR_LISTS[carrier] = { at: now, list: list.length ? list : ['104.16.0.0/13'] };
    return CIDR_LISTS[carrier].list;
  } catch {
    return ['104.16.0.0/13'];
  }
}

export async function generateRandomIPs(
  request: Request,
  count: number = 16,
  port: number = -1
): Promise<string[]> {
  const carrier = detectIranianISP(request);
  const cidrList = await fetchCIDRList(carrier);

  return Array.from({ length: count }, () => {
    const ip = randomIPFromCIDR(cidrList[Math.floor(Math.random() * cidrList.length)]);
    const targetPort = port === -1 ? CF_PORTS[Math.floor(Math.random() * CF_PORTS.length)] : port;
    return `${ip}:${targetPort}`;
  });
}

// --- Clean IP Storage ---

export async function getCleanIPs(db: D1Database): Promise<string[]> {
  try {
    const row = await db.prepare('SELECT v FROM kvstore WHERE k = ?').bind('cleanip.ips').first<{ v: string }>();
    if (!row || !row.v) return [];
    return row.v.split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export async function setCleanIPs(db: D1Database, ips: string[]): Promise<void> {
  const unique = [...new Set(ips)].slice(0, 30);
  await db.prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
    .bind('cleanip.ips', unique.join('\n'), Date.now())
    .run();
}

export async function getCleanIPConfig(db: D1Database): Promise<{ ips: string[]; carrier: string; updatedAt: number }> {
  try {
    const row = await db.prepare('SELECT v, updated FROM kvstore WHERE k = ?').bind('cleanip.ips').first<{ v: string; updated: number }>();
    const carrierRow = await db.prepare('SELECT v FROM kvstore WHERE k = ?').bind('cleanip.carrier').first<{ v: string }>();
    return {
      ips: row ? row.v.split('\n').map((s) => s.trim()).filter(Boolean) : [],
      carrier: carrierRow?.v || 'unknown',
      updatedAt: row?.updated || 0,
    };
  } catch {
    return { ips: [], carrier: 'unknown', updatedAt: 0 };
  }
}

// --- Helpers ---

export function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
