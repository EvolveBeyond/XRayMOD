import type { Env } from './types';
import { getCleanIPs } from './utils';

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function text(content: string, status = 200): Response {
  return new Response(content, {
    status,
    headers: { 'Content-Type': 'text/plain' },
  });
}

export async function handleSubscription(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const token = params.token;
  if (!token) {
    return text('Invalid subscription link', 400);
  }

  // Find user by UUID token
  const user = await env.DB.prepare(
    'SELECT id, username, uuid, traffic_limit, traffic_used, expiry_date, status FROM users WHERE uuid = ?'
  )
    .bind(token)
    .first<any>();

  if (!user) {
    return text('Invalid subscription', 404);
  }

  if (user.status !== 'active') {
    return text('Account is not active', 403);
  }

  if (user.expiry_date && new Date(user.expiry_date) < new Date()) {
    return text('Subscription expired', 403);
  }

  // Get all configs for this user
  const configs = await env.DB.prepare(
    `SELECT c.*, p.id as proto_id, p.name as proto_name, p.schema_json, p.template_json
     FROM configs c
     LEFT JOIN protocols p ON c.protocol_id = p.id
     WHERE c.user_id = ?`
  )
    .bind(user.id)
    .all<any>();

  if (configs.results.length === 0) {
    return text('No configurations available');
  }

  // Get ECH and TLS fragment settings
  const echRow = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('ech.enabled').first<{ v: string }>();
  const echSniRow = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('ech.sni').first<{ v: string }>();
  const echDnsRow = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('ech.dns').first<{ v: string }>();
  const tlsFragRow = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('tls_fragment.enabled').first<{ v: string }>();
  const tlsFragModeRow = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('tls_fragment.mode').first<{ v: string }>();

  const echEnabled = echRow?.v === 'true';
  const echSni = echSniRow?.v || 'cloudflare-ech.com';
  const echDns = echDnsRow?.v || 'https://dns.alidns.com/dns-query';
  const tlsFragEnabled = tlsFragRow?.v === 'true';
  const tlsFragMode = tlsFragModeRow?.v || 'Shadowrocket';

  // Build ECH and TLS fragment link params
  const echParam = echEnabled ? `&ech=${encodeURIComponent((echSni ? echSni + '+' : '') + echDns)}` : '';
  const tlsFragParam = tlsFragEnabled
    ? tlsFragMode === 'Shadowrocket'
      ? `&fragment=${encodeURIComponent('1,40-60,30-50,tlshello')}`
      : `&fragment=${encodeURIComponent('3,1,tlshello')}`
    : '';

  // Get clean IPs for server address
  const cleanIPs = await getCleanIPs(env.DB);
  const url = new URL(request.url);

  // Check if user has a backend VPS
  let host = url.host;
  const backendRow = await env.DB.prepare('SELECT vps_ip, vps_port FROM backends WHERE user_id = ? AND status = ?')
    .bind(user.id, 'active')
    .first<{ vps_ip: string; vps_port: number }>();
  if (backendRow) {
    host = backendRow.vps_port === 443 ? backendRow.vps_ip : `${backendRow.vps_ip}:${backendRow.vps_port}`;
  } else if (cleanIPs.length > 0) {
    host = cleanIPs[0].split(':')[0];
  }

  // Check Accept header for format preference
  const accept = request.headers.get('Accept') || '';
  const format = url.searchParams.get('format') || 'base64';

  // Generate links for each config
  const links: string[] = [];
  for (const config of configs.results) {
    const settings = JSON.parse(config.settings_json || '{}');
    const template = config.template_json;

    // Replace template variables
    let processedTemplate = template;
    const templateData = { ...settings, uuid: user.uuid };
    for (const [key, value] of Object.entries(templateData)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processedTemplate = processedTemplate.replace(regex, String(value));
    }

    const port = config.port || 443;

    // Generate URI based on protocol
    let uri = '';
    switch (config.proto_id) {
      case 'vless-reality':
      case 'vless-ws':
      case 'vless-wss':
        uri = `vless://${user.uuid}@${host}:${port}?encryption=none&security=${settings.security || 'tls'}&type=${settings.network || 'tcp'}&flow=${settings.flow || ''}${echParam}${tlsFragParam}#${encodeURIComponent(config.name)}`;
        break;
      case 'vless-grpc':
        const grpcMode = settings.mode || 'gun';
        uri = `vless://${user.uuid}@${host}:${port}?encryption=none&security=tls&type=grpc&mode=${grpcMode}&serviceName=${settings.serviceName || 'grpc'}&sni=${settings.sni || host}${echParam}${tlsFragParam}#${encodeURIComponent(config.name)}`;
        break;
      case 'vmess-ws':
      case 'vmess-wss':
        const vmessObj = {
          v: '2',
          ps: config.name,
          add: host,
          port: port,
          id: user.uuid,
          aid: 0,
          scy: 'auto',
          net: settings.network || 'ws',
          type: 'none',
          host: host,
          path: settings.path || '/',
          tls: settings.security === 'tls' ? 'tls' : '',
        };
        uri = `vmess://${btoa(JSON.stringify(vmessObj))}`;
        break;
      case 'trojan-ws':
      case 'trojan-wss':
        uri = `trojan://${settings.password || 'password'}@${host}:${port}?type=${settings.network || 'ws'}&host=${host}&path=${settings.path || '/'}&security=tls&sni=${settings.sni || host}${echParam}${tlsFragParam}#${encodeURIComponent(config.name)}`;
        break;
      case 'ss-ws':
      case 'ss-wss':
        const ssInfo = btoa(`${settings.method || 'chacha20-ietf-poly1305'}:${settings.password || 'password'}`);
        uri = `ss://${ssInfo}@${host}:${port}?type=${settings.network || 'ws'}&path=${settings.path || '/'}#${encodeURIComponent(config.name)}`;
        break;
      default:
        uri = `${config.proto_id}://${btoa(processedTemplate)}@${host}:${port}#${encodeURIComponent(config.name)}`;
    }

    links.push(uri);
  }

  // Format output
  if (format === 'clash' || accept.includes('text/yaml')) {
    return generateClashConfig(links, configs.results, user, echEnabled, echSni);
  }

  if (format === 'singbox' || accept.includes('application/json')) {
    return generateSingboxConfig(links, configs.results, user, echEnabled, echSni);
  }

  // Default: base64 encoded
  const base64Config = btoa(links.join('\n'));
  return text(base64Config);
}

function generateClashConfig(
  links: string[],
  configs: any[],
  user: any,
  echEnabled = false,
  echSni = 'cloudflare-ech.com'
): Response {
  const proxies: any[] = [];
  const proxyNames: string[] = [];

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    const settings = JSON.parse(config.settings_json || '{}');
    const name = config.name || `Config ${i + 1}`;
    proxyNames.push(name);

    const proxy: any = {
      name,
      type: getClashProxyType(config.proto_id),
      server: settings.host || settings.sni || 'example.com',
      port: config.port || 443,
      uuid: user.uuid,
    };

    if (config.proto_id.includes('vless')) {
      proxy.flow = settings.flow || '';
      proxy.tls = settings.security === 'tls' || settings.security === 'reality';
      if (settings.sni) proxy.sni = settings.sni;

      // gRPC support
      if (config.proto_id === 'vless-grpc') {
        proxy.network = 'grpc';
        proxy['grpc-opts'] = { 'grpc-service-name': settings.serviceName || 'grpc' };
      }

      // ECH support for Clash
      if (echEnabled) {
        proxy['ech-opts'] = {
          enable: true,
          'query-server-name': echSni,
        };
      }
    }

    if (config.proto_id.includes('vmess')) {
      proxy.network = settings.network || 'ws';
      if (settings.path) proxy['ws-opts'] = { path: settings.path };
      proxy.tls = settings.security === 'tls';
    }

    if (config.proto_id.includes('trojan')) {
      proxy.password = settings.password || 'password';
      proxy.network = settings.network || 'ws';
      proxy.tls = true;
    }

    if (config.proto_id.includes('ss')) {
      proxy.cipher = settings.method || 'chacha20-ietf-poly1305';
      proxy.password = settings.password || 'password';
    }

    proxies.push(proxy);
  }

  const clashConfig = {
    'mixed-port': 7890,
    'allow-lan': false,
    'mode': 'rule',
    'proxies': proxies,
    'proxy-groups': [
      {
        'name': 'Proxy',
        'type': 'select',
        'proxies': [...proxyNames, 'DIRECT'],
      },
    ],
    'rules': ['MATCH,Proxy'],
  };

  return new Response(
    `proxies:\n${JSON.stringify(clashConfig, null, 2)
      .split('\n')
      .map((l) => '  ' + l)
      .join('\n')}`,
    {
      headers: { 'Content-Type': 'text/yaml; charset=utf-8' },
    }
  );
}

function generateSingboxConfig(
  links: string[],
  configs: any[],
  user: any,
  echEnabled = false,
  echSni = 'cloudflare-ech.com'
): Response {
  const outbounds: any[] = [];

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    const settings = JSON.parse(config.settings_json || '{}');
    const name = config.name || `Config ${i + 1}`;

    const outbound: any = {
      type: getSingboxOutboundType(config.proto_id),
      tag: name,
      server: settings.host || settings.sni || 'example.com',
      server_port: config.port || 443,
      uuid: user.uuid,
    };

    if (config.proto_id.includes('vless')) {
      outbound.flow = settings.flow || '';
      if (settings.security === 'tls') {
        outbound.tls = { enabled: true, server_name: settings.sni || settings.host };
        // ECH support for sing-box
        if (echEnabled) {
          (outbound.tls as any).ech = {
            enabled: true,
            query_server_name: echSni,
          };
        }
      }
      // gRPC transport for sing-box
      if (config.proto_id === 'vless-grpc') {
        outbound.transport = {
          type: 'grpc',
          serviceName: settings.serviceName || 'grpc',
        };
      }
    }

    if (config.proto_id.includes('vmess')) {
      outbound.transport = {
        type: settings.network || 'ws',
        path: settings.path || '/',
      };
    }

    outbounds.push(outbound);
  }

  const singboxConfig = {
    outbounds,
    inbounds: [
      {
        type: 'mixed',
        listen: '127.0.0.1',
        listen_port: 2080,
      },
    ],
  };

  return json(singboxConfig);
}

function getClashProxyType(protoId: string): string {
  if (protoId.includes('vless')) return 'vless';
  if (protoId.includes('vmess')) return 'vmess';
  if (protoId.includes('trojan')) return 'trojan';
  if (protoId.includes('ss')) return 'ss';
  return 'ss';
}

function getSingboxOutboundType(protoId: string): string {
  if (protoId.includes('vless')) return 'vless';
  if (protoId.includes('vmess')) return 'vmess';
  if (protoId.includes('trojan')) return 'trojan';
  if (protoId.includes('ss')) return 'shadowsocks';
  return 'shadowsocks';
}
