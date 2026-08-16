/**
 * Country-weighted Cloudflare edge pools for Iran-friendly clean IPs.
 * Anycast CF IPs aren't strictly "in" a country, but community-tested ranges
 * that historically perform well toward DE/NL/FI/TR/SE edges are prioritized.
 */

export type CountryCode = 'DE' | 'NL' | 'FI' | 'SE' | 'TR' | 'GB' | 'FR' | 'US';

export const PREFERRED_COUNTRIES: CountryCode[] = [
  'DE',
  'NL',
  'FI',
  'SE',
  'TR',
  'GB',
  'FR',
  'US',
];

/** CIDR /24 seeds weighted for speed from Iranian ISPs (community-tested). */
const COUNTRY_CIDRS: Record<CountryCode, string[]> = {
  DE: [
    '188.114.96.0/24',
    '188.114.97.0/24',
    '188.114.98.0/24',
    '188.114.99.0/24',
    '162.159.36.0/24',
    '162.159.46.0/24',
    '104.16.100.0/24',
    '104.16.101.0/24',
    '104.17.80.0/24',
    '172.67.70.0/24',
  ],
  NL: [
    '188.114.96.0/24',
    '162.159.128.0/24',
    '162.159.129.0/24',
    '104.21.20.0/24',
    '104.21.21.0/24',
    '172.67.140.0/24',
    '104.16.120.0/24',
  ],
  FI: [
    '188.114.96.0/24',
    '188.114.97.0/24',
    '162.159.140.0/24',
    '104.16.140.0/24',
    '172.67.160.0/24',
  ],
  SE: [
    '188.114.98.0/24',
    '162.159.150.0/24',
    '104.16.150.0/24',
    '172.67.170.0/24',
  ],
  TR: [
    '104.16.160.0/24',
    '104.17.160.0/24',
    '172.67.180.0/24',
    '162.159.160.0/24',
    '188.114.96.0/24',
  ],
  GB: [
    '104.16.170.0/24',
    '162.159.170.0/24',
    '172.67.190.0/24',
  ],
  FR: [
    '104.16.180.0/24',
    '162.159.180.0/24',
    '172.67.200.0/24',
  ],
  US: [
    '104.16.0.0/24',
    '104.17.0.0/24',
    '172.64.0.0/24',
    '162.159.0.0/24',
  ],
};

/** Extra public lists (best-effort). Failures are ignored. */
const REMOTE_LISTS = [
  'https://raw.githubusercontent.com/ircfspace/endpoint/main/ip.txt',
  'https://raw.githubusercontent.com/vfarid/cf-ip-scanner/main/ipv4.txt',
];

const GLOBAL_FALLBACK = [
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '162.159.0.0/16',
  '188.114.96.0/22',
];

function ipToInt(ip: string): number {
  const p = ip.split('.').map(Number);
  return ((p[0]! << 24) >>> 0) + (p[1]! << 16) + (p[2]! << 8) + p[3]!;
}

function intToIp(n: number): string {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join('.');
}

function randomFromCidr(cidr: string): string {
  const [base, prefixStr] = cidr.split('/');
  const prefix = Math.min(32, Math.max(8, parseInt(prefixStr || '24', 10) || 24));
  const hostBits = 32 - prefix;
  const span = Math.pow(2, Math.min(hostBits, 16)); // cap random span
  const ipInt = ipToInt(base!);
  const mask = (0xffffffff << hostBits) >>> 0;
  const offset = Math.floor(Math.random() * span);
  return intToIp(((ipInt & mask) >>> 0) + offset);
}

let remoteCache: { at: number; ips: string[] } | null = null;

async function fetchRemoteCleanIps(): Promise<string[]> {
  const now = Date.now();
  if (remoteCache && now - remoteCache.at < 30 * 60 * 1000) return remoteCache.ips;

  const found: string[] = [];
  for (const url of REMOTE_LISTS) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'XRayMOD-CleanIP' },
        cf: { cacheTtl: 1800, cacheEverything: true },
      } as RequestInit);
      if (!res.ok) continue;
      const text = await res.text();
      for (const line of text.split(/[\r\n,;]+/)) {
        const m = line.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::(\d{1,5}))?/);
        if (m?.[1]) found.push(m[1]);
        if (found.length >= 400) break;
      }
    } catch {
      /* ignore */
    }
    if (found.length >= 400) break;
  }

  remoteCache = { at: now, ips: [...new Set(found)] };
  return remoteCache.ips;
}

export type LabeledIP = {
  ip: string;
  port: number;
  country: CountryCode | 'CF';
  label: string;
};

function pickCountries(requested?: string[]): CountryCode[] {
  if (!requested?.length) return PREFERRED_COUNTRIES;
  const set = new Set(
    requested
      .map((c) => c.trim().toUpperCase())
      .filter((c): c is CountryCode => PREFERRED_COUNTRIES.includes(c as CountryCode))
  );
  return set.size ? [...set] : PREFERRED_COUNTRIES;
}

/**
 * Build a large mixed pool: country-weighted CIDRs + remote lists + global CF.
 */
export async function generateCountryCleanIPs(opts: {
  count?: number;
  port?: number;
  countries?: string[];
}): Promise<LabeledIP[]> {
  const count = Math.min(Math.max(opts.count || 64, 8), 120);
  const port = opts.port && opts.port > 0 ? opts.port : 443;
  const countries = pickCountries(opts.countries);
  const remote = await fetchRemoteCleanIps();

  const out: LabeledIP[] = [];
  const seen = new Set<string>();

  const push = (ip: string, country: CountryCode | 'CF') => {
    if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)) return;
    if (seen.has(ip)) return;
    seen.add(ip);
    out.push({
      ip,
      port,
      country,
      label: `${ip}:${port}#${country}`,
    });
  };

  // 55% from preferred country CIDRs (round-robin for diversity)
  const countryTarget = Math.ceil(count * 0.55);
  let i = 0;
  while (out.length < countryTarget && i < countryTarget * 4) {
    const cc = countries[i % countries.length]!;
    const cidrs = COUNTRY_CIDRS[cc];
    const cidr = cidrs[Math.floor(Math.random() * cidrs.length)]!;
    push(randomFromCidr(cidr), cc);
    i++;
  }

  // 30% from remote community lists
  const remoteTarget = Math.min(out.length + Math.ceil(count * 0.3), count);
  const shuffled = remote.slice().sort(() => Math.random() - 0.5);
  for (const ip of shuffled) {
    if (out.length >= remoteTarget) break;
    // Tag remote as CF; client scan will rank by real latency
    push(ip, 'CF');
  }

  // Fill remainder from global CF ranges
  while (out.length < count) {
    const cidr = GLOBAL_FALLBACK[Math.floor(Math.random() * GLOBAL_FALLBACK.length)]!;
    push(randomFromCidr(cidr), 'CF');
  }

  return out.slice(0, count);
}

/** Serialize for storage: ip:port#CC */
export function serializeLabeled(list: LabeledIP[]): string[] {
  return list.map((x) => x.label);
}

export function parseLabeled(raw: string): { ip: string; port: number; country: string } {
  const [hostPort, tag] = raw.split('#');
  const [ip, portStr] = (hostPort || '').split(':');
  return {
    ip: (ip || '').trim(),
    port: Number(portStr) || 443,
    country: (tag || 'CF').trim().toUpperCase() || 'CF',
  };
}
