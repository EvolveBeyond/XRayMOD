/**
 * Share-link builders for Cloudflare Workers edge proxy.
 * Best-practice for CF free/paid Workers: VLESS + WebSocket + TLS (443).
 */

export type LinkOpts = {
  uuid: string;
  host: string;
  port?: number;
  path: string;
  name: string;
  sni?: string;
  fingerprint?: string;
  alpn?: string;
  /** optional extra query params */
  extra?: Record<string, string>;
};

/** CF edge HTTPS ports that often work in Iran */
export const CF_EDGE_PORTS = [443, 2053, 2083, 2087, 2096, 8443] as const;
export const FINGERPRINTS = ['chrome', 'firefox', 'safari', 'edge'] as const;

const COUNTRY_NAMES: Record<string, string> = {
  DE: 'Germany',
  NL: 'Netherlands',
  FI: 'Finland',
  SE: 'Sweden',
  TR: 'Turkey',
  GB: 'UK',
  FR: 'France',
  US: 'USA',
  IR: 'Iran',
  CF: 'Cloudflare',
};

/** ISO country code → flag emoji (🇩🇪). CF → cloud. */
export function countryFlag(code: string): string {
  const cc = String(code || '')
    .trim()
    .toUpperCase();
  if (!cc || cc === 'CF') return '☁️';
  if (!/^[A-Z]{2}$/.test(cc)) return '🌐';
  const A = 0x1f1e6;
  return String.fromCodePoint(A + cc.charCodeAt(0) - 65, A + cc.charCodeAt(1) - 65);
}

export function countryLabel(code: string): string {
  const cc = String(code || 'CF')
    .trim()
    .toUpperCase() || 'CF';
  const flag = countryFlag(cc);
  const name = COUNTRY_NAMES[cc] || cc;
  return `${flag} ${name}`;
}

function qs(params: Record<string, string | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  }
  return parts.join('&');
}

/** Recommended default for CF Workers — works with v2rayNG, Streisand, Hiddify, NekoBox */
export function buildVlessWsLink(o: LinkOpts): string {
  const port = o.port ?? 443;
  const sni = o.sni || o.host;
  const path = o.path.startsWith('/') ? o.path : `/${o.path}`;
  const query = qs({
    encryption: 'none',
    security: 'tls',
    type: 'ws',
    host: o.extra?.host || o.host,
    path,
    sni,
    fp: o.fingerprint || 'chrome',
    alpn: o.alpn || 'http/1.1',
    ...o.extra,
  });
  return `vless://${o.uuid}@${o.host}:${port}?${query}#${encodeURIComponent(o.name)}`;
}

export function buildTrojanWsLink(o: LinkOpts & { password: string }): string {
  const port = o.port ?? 443;
  const sni = o.sni || o.host;
  const path = o.path.startsWith('/') ? o.path : `/${o.path}`;
  const query = qs({
    security: 'tls',
    type: 'ws',
    host: o.host,
    path,
    sni,
    fp: o.fingerprint || 'chrome',
    ...o.extra,
  });
  return `trojan://${encodeURIComponent(o.password)}@${o.host}:${port}?${query}#${encodeURIComponent(o.name)}`;
}

export function buildVmessWsLink(o: LinkOpts): string {
  const port = o.port ?? 443;
  const path = o.path.startsWith('/') ? o.path : `/${o.path}`;
  const obj = {
    v: '2',
    ps: o.name,
    add: o.host,
    port,
    id: o.uuid,
    aid: 0,
    scy: 'auto',
    net: 'ws',
    type: 'none',
    host: o.host,
    path,
    tls: 'tls',
    sni: o.sni || o.host,
    fp: o.fingerprint || 'chrome',
  };
  return `vmess://${btoa(JSON.stringify(obj))}`;
}

/**
 * Build up to `max` best configs for CF edge:
 * 1) Direct worker host :443 chrome
 * 2) Clean IPs (ISP-aware) with SNI=worker
 * 3) CF alternate ports on worker host
 * 4) Fingerprint variants to fill remaining slots
 */
export function buildRecommendedLinks(args: {
  uuid: string;
  workerHost: string;
  path: string;
  name: string;
  cleanIPs?: string[];
  max?: number;
  carrier?: string;
}): string[] {
  const { uuid, workerHost, path, name, cleanIPs = [], max = 10, carrier } = args;
  const links: string[] = [];
  const seen = new Set<string>();

  const push = (link: string) => {
    if (links.length >= max) return;
    if (seen.has(link)) return;
    seen.add(link);
    links.push(link);
  };

  const label = (part: string) => `${name} · ${part}`;

  // 1. Primary direct (most reliable)
  push(
    buildVlessWsLink({
      uuid,
      host: workerHost,
      port: 443,
      path,
      name: label(`${countryFlag('CF')} Direct`),
      sni: workerHost,
      fingerprint: 'chrome',
    })
  );

  // 2. Clean IPs first — prefer country-tagged (DE/NL/FI/TR…) for speed
  type IpEntry = { ip: string; port: number; country: string };
  const entries: IpEntry[] = [];
  const seenIp = new Set<string>();
  for (const raw of cleanIPs) {
    const [hostPort, tag] = String(raw).split('#');
    const [ip, portStr] = (hostPort || '').split(':');
    const clean = (ip || '').trim();
    if (!clean || !/^\d{1,3}(\.\d{1,3}){3}$/.test(clean) || seenIp.has(clean)) continue;
    seenIp.add(clean);
    const country = (tag || '').trim().toUpperCase() || 'CF';
    entries.push({ ip: clean, port: Number(portStr) || 443, country });
  }
  // Preferred countries first
  const prefer = ['DE', 'NL', 'FI', 'SE', 'TR', 'GB', 'FR'];
  entries.sort((a, b) => {
    const ai = prefer.indexOf(a.country);
    const bi = prefer.indexOf(b.country);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  let i = 0;
  for (const e of entries) {
    if (links.length >= max) break;
    i++;
    const fp = FINGERPRINTS[i % FINGERPRINTS.length];
    const isp = carrier && carrier !== 'all' ? ` · ${carrier.toUpperCase()}` : '';
    // e.g. "🇩🇪 Germany · 188.114.96.12 · MTN"
    const tag = `${countryLabel(e.country)} · ${e.ip}${isp}`;
    push(
      buildVlessWsLink({
        uuid,
        host: e.ip,
        port: e.port || 443,
        path,
        name: label(tag),
        sni: workerHost,
        fingerprint: fp,
        extra: { host: workerHost },
      })
    );
  }
  const ips = entries.map((e) => e.ip);
  const countryByIp = new Map(entries.map((e) => [e.ip, e.country]));

  // 3. CF alternate ports on worker host
  for (const port of CF_EDGE_PORTS) {
    if (links.length >= max) break;
    if (port === 443) continue;
    push(
      buildVlessWsLink({
        uuid,
        host: workerHost,
        port,
        path,
        name: label(`${countryFlag('CF')} Port ${port}`),
        sni: workerHost,
        fingerprint: 'chrome',
      })
    );
  }

  // 4. Fingerprint variants on clean IP #1 or worker
  const host2 = ips[0] || workerHost;
  const host2Cc = countryByIp.get(host2) || 'CF';
  for (const fp of FINGERPRINTS) {
    if (links.length >= max) break;
    if (fp === 'chrome' && host2 === workerHost) continue;
    push(
      buildVlessWsLink({
        uuid,
        host: host2,
        port: 443,
        path,
        name: label(`${countryLabel(host2Cc)} · FP ${fp}`),
        sni: workerHost,
        fingerprint: fp,
        extra: host2 !== workerHost ? { host: workerHost } : undefined,
      })
    );
  }

  // 5. Extra clean IPs on port 8443 if still short
  for (const ip of ips.slice(0, 4)) {
    if (links.length >= max) break;
    const cc = countryByIp.get(ip) || 'CF';
    push(
      buildVlessWsLink({
        uuid,
        host: ip,
        port: 8443,
        path,
        name: label(`${countryLabel(cc)} · ${ip}:8443`),
        sni: workerHost,
        fingerprint: 'chrome',
        extra: { host: workerHost },
      })
    );
  }

  return links.slice(0, max);
}

export function toBase64Lines(lines: string[]): string {
  return btoa(unescape(encodeURIComponent(lines.join('\n'))));
}
