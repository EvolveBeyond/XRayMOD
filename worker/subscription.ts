import type { Env } from './types';
import { getCleanIPs, detectIranianISP } from './utils';
import {
  buildVlessWsLink,
  buildTrojanWsLink,
  buildVmessWsLink,
  buildRecommendedLinks,
  toBase64Lines,
  countryFlag,
} from './lib/links';
import { renderUserPortal } from './user-portal';
import { getSecureBase, getCustomDomains } from './lib/secure-path';
import { SPEED_PROFILES, type SpeedProfile, profileMeta } from './lib/edge-ops';

function text(content: string, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(content, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...headers },
  });
}

function subHeaders(user: any, title: string, statusPage: string): Record<string, string> {
  const expire = user.expiry_date
    ? Math.floor(new Date(user.expiry_date).getTime() / 1000)
    : 0;
  return {
    'Profile-Title': 'base64:' + btoa(unescape(encodeURIComponent(title))),
    'Profile-Update-Interval': '6',
    'Profile-Web-Page-Url': statusPage,
    'Subscription-Userinfo': `upload=0; download=${user.traffic_used || 0}; total=${user.traffic_limit || 0}; expire=${expire}`,
    Announce: 'base64:' + btoa(unescape(encodeURIComponent('Usage: ' + statusPage))),
    'support-url': statusPage,
  };
}

async function ensureConfig(
  env: Env,
  user: any,
  workerHost: string
): Promise<{ path: string; name: string; results: any[] }> {
  let configs = await env.DB.prepare(
    `SELECT c.*, p.id as proto_id, p.name as proto_name
     FROM configs c
     LEFT JOIN protocols p ON c.protocol_id = p.id
     WHERE c.user_id = ?`
  )
    .bind(user.id)
    .all<any>();

  if (!configs.results.length) {
    const path = `/proxy/${crypto.randomUUID().slice(0, 10)}`;
    const link = buildVlessWsLink({
      uuid: user.uuid,
      host: workerHost,
      path,
      name: `${user.username} · Auto`,
      sni: workerHost,
    });
    await env.DB.prepare(
      `INSERT INTO configs (user_id, protocol_id, name, settings_json, port, path, link, node_ip, client_limit, created_at)
       VALUES (?, 'vless-ws', ?, ?, 443, ?, ?, ?, 3, ?)`
    )
      .bind(
        user.id,
        'XrayMOD · Recommended',
        JSON.stringify({
          path,
          host: workerHost,
          sni: workerHost,
          network: 'ws',
          security: 'tls',
          uuid: user.uuid,
          fingerprint: 'chrome',
        }),
        path,
        link,
        workerHost,
        Date.now()
      )
      .run();
    configs = await env.DB.prepare(
      `SELECT c.*, p.id as proto_id, p.name as proto_name FROM configs c
       LEFT JOIN protocols p ON c.protocol_id = p.id WHERE c.user_id = ?`
    )
      .bind(user.id)
      .all<any>();
  }

  const primary = configs.results[0];
  const settings = JSON.parse(primary.settings_json || '{}');
  return {
    path: primary.path || settings.path || '/',
    name: primary.name || user.username,
    results: configs.results,
  };
}

/** Collect best links for a user (profile + failover aware) */
async function buildUserLinks(
  request: Request,
  env: Env,
  user: any,
  workerHost: string,
  profileName?: string
): Promise<{ links: string[]; carrier: string; profile: SpeedProfile }> {
  const cfg = await ensureConfig(env, user, workerHost);
  const ispAware =
    (
      await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?')
        .bind('panel.isp_aware_sub')
        .first<{ v: string }>()
    )?.v !== 'false';
  const carrier = ispAware ? detectIranianISP(request) : 'all';
  const cleanIPs = await getCleanIPs(env.DB, carrier === 'all' ? undefined : carrier);

  const storedProfile = (
    await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?')
      .bind('panel.speed_profile')
      .first<{ v: string }>()
  )?.v as SpeedProfile | undefined;
  const profile = (
    profileName && SPEED_PROFILES[profileName as SpeedProfile]
      ? profileName
      : storedProfile && SPEED_PROFILES[storedProfile]
        ? storedProfile
        : 'stable'
  ) as SpeedProfile;
  const meta = profileMeta(profile);

  const mixed =
    (
      await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?')
        .bind('protocol.mixed_mode')
        .first<{ v: string }>()
    )?.v === 'true';

  // Weighted custom domains expand pool
  let domainPool = await getCustomDomains(env.DB);
  try {
    const w = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?')
      .bind('panel.custom_domains_weighted')
      .first<{ v: string }>();
    if (w?.v) {
      const list = JSON.parse(w.v) as { host: string; weight: number }[];
      const expanded: string[] = [];
      for (const d of list) {
        for (let i = 0; i < Math.min(d.weight || 1, 5); i++) expanded.push(d.host);
      }
      if (expanded.length) domainPool = expanded;
    }
  } catch {
    /* ignore */
  }

  let links = buildRecommendedLinks({
    uuid: user.uuid,
    workerHost,
    path: cfg.path,
    name: `${cfg.name} · ${meta.label}`,
    cleanIPs,
    max: meta.maxIps + 6,
    carrier,
    preferCountries: meta.countries,
    preferPorts: meta.ports,
    preferFingerprints: meta.fps,
    failover: true,
  });

  // Optional mixed: swap a few slots with trojan/ss style from other configs
  if (mixed && cfg.results.length > 1) {
    for (let i = 1; i < Math.min(cfg.results.length, 3); i++) {
      const c = cfg.results[i];
      const settings = JSON.parse(c.settings_json || '{}');
      const path = c.path || settings.path || cfg.path;
      const proto = String(c.proto_id || c.protocol_id || '');
      if (proto.includes('trojan')) {
        links[links.length - 1] = buildTrojanWsLink({
          uuid: user.uuid,
          password: settings.password || user.uuid,
          host: workerHost,
          path,
          name: `${c.name || 'Trojan'} · Mixed`,
          sni: settings.sni || workerHost,
        });
      } else if (proto.includes('vmess')) {
        links[links.length - 1] = buildVmessWsLink({
          uuid: user.uuid,
          host: workerHost,
          path,
          name: `${c.name || 'VMess'} · Mixed`,
          sni: settings.sni || workerHost,
        });
      }
    }
  }

  const unique = [...new Set(links.filter(Boolean))].slice(0, 16);

  // Custom / weighted domains → extra D-tagged configs
  const domainLinks: string[] = [];
  const seenDom = new Set<string>();
  for (const domain of domainPool) {
    if (seenDom.has(domain)) continue;
    seenDom.add(domain);
    domainLinks.push(
      buildVlessWsLink({
        uuid: user.uuid,
        host: domain,
        path: cfg.path,
        name: `[P${Math.min(domainLinks.length + 2, 9)}] ${countryFlag('CF')} ${cfg.name} · D · ${domain}`,
        sni: domain,
      })
    );
  }

  return {
    links: [...unique, ...domainLinks].slice(0, 20),
    carrier,
    profile,
  };
}

export async function handleSubscription(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const token = params.token;
  if (!token) return text('Invalid subscription link', 400);

  const user = await env.DB.prepare(
    'SELECT id, username, uuid, traffic_limit, traffic_used, expiry_date, status FROM users WHERE uuid = ?'
  )
    .bind(token)
    .first<any>();

  if (!user) return text('Invalid subscription', 404);

  const url = new URL(request.url);
  const workerHost = url.host;
  const origin = url.origin;
  const base = await getSecureBase(env.DB, origin);
  const format = (url.searchParams.get('format') || 'base64').toLowerCase();
  const profileParam = url.searchParams.get('profile') || undefined;
  const split =
    url.searchParams.get('split') === '1' ||
    url.searchParams.get('split') === 'true' ||
    format === 'clash-meta' ||
    format === 'singbox-split';

  if (format === 'status' || format === 'me' || format === 'portal') {
    return Response.redirect(`${base}/me/${user.uuid}`, 302);
  }

  if (user.status !== 'active') return text('Account is not active', 403);
  if (user.expiry_date && new Date(user.expiry_date) < new Date()) {
    return text('Subscription expired — open status portal for details', 403);
  }

  const { links, carrier, profile } = await buildUserLinks(
    request,
    env,
    user,
    workerHost,
    profileParam
  );
  const brandName =
    (
      await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?')
        .bind('panel.sub_name')
        .first<{ v: string }>()
    )?.v || 'XRayMOD';
  const title = `${brandName} · ${user.username} · ${profile}`;
  const headers = subHeaders(user, title, `${base}/me/${user.uuid}`);

  if (format === 'html' || format === 'page') {
    return renderUserPortal({
      user,
      origin: base,
      nodeCount: links.length,
      carrier,
      links,
      showLinks: true,
    });
  }

  if (format === 'raw' || format === 'list') {
    return text(links.join('\n'), 200, headers);
  }

  if (format === 'clash' || format === 'clash-meta') {
    return text(
      buildClashYaml(links, workerHost, user, {
        splitIran: split || format.includes('meta'),
      }),
      200,
      {
        ...headers,
        'Content-Type': 'text/yaml; charset=utf-8',
      }
    );
  }

  if (format === 'singbox' || format === 'sing-box' || format === 'singbox-split') {
    return text(
      buildSingboxJson(links, workerHost, user, {
        splitIran: split || format.includes('split'),
      }),
      200,
      {
        ...headers,
        'Content-Type': 'application/json; charset=utf-8',
      }
    );
  }

  // default base64 for v2rayNG / Hiddify / Streisand
  return new Response(toBase64Lines(links), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ...headers,
    },
  });
}

function buildClashYaml(
  links: string[],
  host: string,
  user: any,
  opts?: { splitIran?: boolean }
): string {
  const proxies: string[] = [];
  const names: string[] = [];
  links.forEach((link, i) => {
    if (!link.startsWith('vless://')) return;
    try {
      const u = new URL(link.replace('vless://', 'https://'));
      const name = decodeURIComponent(u.hash.replace('#', '') || `Node-${i + 1}`);
      names.push(name);
      const path = u.searchParams.get('path') || '/';
      const sni = u.searchParams.get('sni') || host;
      const wsHost = u.searchParams.get('host') || sni;
      proxies.push(
        `  - name: "${name.replace(/"/g, '')}"
    type: vless
    server: ${u.hostname}
    port: ${u.port || 443}
    uuid: ${user.uuid}
    network: ws
    tls: true
    servername: ${sni}
    client-fingerprint: ${u.searchParams.get('fp') || 'chrome'}
    udp: true
    ws-opts:
      path: "${path}"
      headers:
        Host: ${wsHost}`
      );
    } catch {
      /* skip */
    }
  });

  const splitRules = opts?.splitIran
    ? `rules:
  - GEOIP,IR,DIRECT
  - DOMAIN-SUFFIX,ir,DIRECT
  - DOMAIN-SUFFIX,iran,DIRECT
  - MATCH,PROXY
`
    : `rules:
  - MATCH,PROXY
`;

  return `mixed-port: 7890
allow-lan: false
mode: rule
log-level: info
proxies:
${proxies.join('\n')}
proxy-groups:
  - name: PROXY
    type: select
    proxies:
      - Auto
${names.map((n) => `      - "${n.replace(/"/g, '')}"`).join('\n')}
      - DIRECT
  - name: Auto
    type: url-test
    url: http://www.gstatic.com/generate_204
    interval: 180
    tolerance: 50
    proxies:
${names.map((n) => `      - "${n.replace(/"/g, '')}"`).join('\n')}
${splitRules}`;
}

function buildSingboxJson(
  links: string[],
  host: string,
  user: any,
  opts?: { splitIran?: boolean }
): string {
  const outbounds: any[] = [];
  const tags: string[] = [];
  links.forEach((link, i) => {
    if (!link.startsWith('vless://')) return;
    try {
      const u = new URL(link.replace('vless://', 'https://'));
      const tag = decodeURIComponent(u.hash.replace('#', '') || `node-${i + 1}`).slice(0, 48);
      tags.push(tag);
      outbounds.push({
        type: 'vless',
        tag,
        server: u.hostname,
        server_port: Number(u.port || 443),
        uuid: user.uuid,
        tls: {
          enabled: true,
          server_name: u.searchParams.get('sni') || host,
          utls: { enabled: true, fingerprint: u.searchParams.get('fp') || 'chrome' },
        },
        transport: {
          type: 'ws',
          path: u.searchParams.get('path') || '/',
          headers: { Host: u.searchParams.get('host') || u.searchParams.get('sni') || host },
        },
      });
    } catch {
      /* skip */
    }
  });

  const route = opts?.splitIran
    ? {
        rules: [
          { geoip: ['ir'], outbound: 'direct' },
          { domain_suffix: ['.ir'], outbound: 'direct' },
        ],
        final: 'proxy',
        auto_detect_interface: true,
      }
    : { final: 'proxy', auto_detect_interface: true };

  return JSON.stringify(
    {
      log: { level: 'warn' },
      dns: {
        servers: [
          { tag: 'local', address: 'local', detour: 'direct' },
          { tag: 'proxy-dns', address: '1.1.1.1', detour: 'proxy' },
        ],
        rules: opts?.splitIran ? [{ domain_suffix: ['.ir'], server: 'local' }] : [],
      },
      outbounds: [
        ...outbounds,
        { type: 'selector', tag: 'proxy', outbounds: ['auto', ...tags, 'direct'] },
        {
          type: 'urltest',
          tag: 'auto',
          outbounds: tags,
          url: 'https://www.gstatic.com/generate_204',
          interval: '3m',
          tolerance: 50,
        },
        { type: 'direct', tag: 'direct' },
        { type: 'block', tag: 'block' },
      ],
      route,
    },
    null,
    2
  );
}
