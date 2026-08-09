import type { Env } from './types';
import { getCleanIPs, detectIranianISP } from './utils';
import {
  buildVlessWsLink,
  buildTrojanWsLink,
  buildVmessWsLink,
  buildRecommendedLinks,
  toBase64Lines,
} from './lib/links';
import { renderUserPortal } from './user-portal';
import { getSecureBase, getCustomDomains } from './lib/secure-path';

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

/** Collect up to 10 best links for a user */
async function buildUserLinks(
  request: Request,
  env: Env,
  user: any,
  workerHost: string
): Promise<{ links: string[]; carrier: string }> {
  const cfg = await ensureConfig(env, user, workerHost);
  const ispAware =
    (
      await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?')
        .bind('panel.isp_aware_sub')
        .first<{ v: string }>()
    )?.v !== 'false';
  const carrier = ispAware ? detectIranianISP(request) : 'all';
  const cleanIPs = await getCleanIPs(env.DB, carrier === 'all' ? undefined : carrier);

  const mixed =
    (
      await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?')
        .bind('protocol.mixed_mode')
        .first<{ v: string }>()
    )?.v === 'true';

  // Primary: top-10 VLESS recommended set from main path
  let links = buildRecommendedLinks({
    uuid: user.uuid,
    workerHost,
    path: cfg.path,
    name: cfg.name,
    cleanIPs,
    max: 18,
    carrier,
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

  // Custom domains → extra D-tagged configs (BPB-style)
  const domains = await getCustomDomains(env.DB);
  const domainLinks: string[] = [];
  for (const domain of domains) {
    domainLinks.push(
      buildVlessWsLink({
        uuid: user.uuid,
        host: domain,
        path: cfg.path,
        name: `${cfg.name} · D · ${domain}`,
        sni: domain,
      })
    );
  }

  return {
    links: [...unique, ...domainLinks].slice(0, 20),
    carrier,
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

  if (format === 'status' || format === 'me' || format === 'portal') {
    return Response.redirect(`${base}/me/${user.uuid}`, 302);
  }

  if (user.status !== 'active') return text('Account is not active', 403);
  if (user.expiry_date && new Date(user.expiry_date) < new Date()) {
    return text('Subscription expired — open status portal for details', 403);
  }

  const { links, carrier } = await buildUserLinks(request, env, user, workerHost);
  const title = `Panel · ${user.username}`;
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

  if (format === 'clash') {
    return text(buildClashYaml(links, workerHost, user), 200, {
      ...headers,
      'Content-Type': 'text/yaml; charset=utf-8',
    });
  }

  if (format === 'singbox' || format === 'sing-box') {
    return text(buildSingboxJson(links, workerHost, user), 200, {
      ...headers,
      'Content-Type': 'application/json; charset=utf-8',
    });
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

function buildClashYaml(links: string[], host: string, user: any): string {
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
${names.map((n) => `      - "${n.replace(/"/g, '')}"`).join('\n')}
      - DIRECT
  - name: Auto
    type: url-test
    url: http://www.gstatic.com/generate_204
    interval: 300
    proxies:
${names.map((n) => `      - "${n.replace(/"/g, '')}"`).join('\n')}
rules:
  - MATCH,PROXY
`;
}

function buildSingboxJson(links: string[], host: string, user: any): string {
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

  return JSON.stringify(
    {
      log: { level: 'warn' },
      outbounds: [
        ...outbounds,
        { type: 'selector', tag: 'proxy', outbounds: tags.length ? tags : ['direct'] },
        {
          type: 'urltest',
          tag: 'auto',
          outbounds: tags,
          url: 'https://www.gstatic.com/generate_204',
          interval: '5m',
        },
        { type: 'direct', tag: 'direct' },
      ],
    },
    null,
    2
  );
}
