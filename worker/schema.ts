import type { Env } from './types';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  uuid TEXT UNIQUE,
  email TEXT DEFAULT '',
  traffic_limit INTEGER DEFAULT 0,
  traffic_used INTEGER DEFAULT 0,
  expiry_date TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  protocol_id TEXT,
  name TEXT DEFAULT '',
  settings_json TEXT DEFAULT '{}',
  port INTEGER DEFAULT 443,
  path TEXT DEFAULT '',
  link TEXT DEFAULT '',
  node_ip TEXT DEFAULT '',
  client_limit INTEGER DEFAULT 1,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS protocols (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  schema_json TEXT NOT NULL,
  template_json TEXT NOT NULL,
  price REAL DEFAULT 0,
  client_limit INTEGER DEFAULT 1,
  client_price REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS kvstore (
  k TEXT PRIMARY KEY,
  v TEXT,
  updated INTEGER
);

CREATE TABLE IF NOT EXISTS backends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  vps_ip TEXT NOT NULL,
  vps_port INTEGER DEFAULT 443,
  vps_uuid TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  created_at INTEGER
);
`;

const DEFAULT_PROTOCOLS = [
  {
    id: 'vless-reality',
    name: 'VLESS + Reality',
    schema_json: JSON.stringify({
      fields: [
        { name: 'port', label: 'Port', type: 'number', default: 443 },
        { name: 'uuid', label: 'UUID', type: 'text', required: true },
        { name: 'sni', label: 'SNI', type: 'text', default: 'google.com' },
        { name: 'sid', label: 'Short ID', type: 'text' },
        { name: 'pbk', label: 'Public Key', type: 'text', required: true },
        {
          name: 'flow',
          label: 'Flow',
          type: 'select',
          default: 'xtls-rprx-vision',
          options: [
            { label: 'None', value: '' },
            { label: 'Vision', value: 'xtls-rprx-vision' },
          ],
        },
      ],
    }),
    template_json: JSON.stringify({
      inbound: {
        port: '{{port}}',
        protocol: 'vless',
        settings: { clients: [{ id: '{{uuid}}', flow: '{{flow}}' }] },
        streamSettings: {
          network: 'tcp',
          security: 'reality',
          realitySettings: {
            dest: '{{sni}}:443',
            serverNames: ['{{sni}}'],
            privateKey: '{{privateKey}}',
            shortIds: ['{{sid}}'],
          },
        },
      },
    }),
    price: 0,
    client_limit: 1,
    client_price: 0,
  },
  {
    id: 'vmess-ws',
    name: 'VMess + WebSocket',
    schema_json: JSON.stringify({
      fields: [
        { name: 'port', label: 'Port', type: 'number', default: 80 },
        { name: 'uuid', label: 'UUID', type: 'text', required: true },
        { name: 'path', label: 'WS Path', type: 'text', default: '/graphql' },
        { name: 'host', label: 'Host', type: 'text' },
      ],
    }),
    template_json: JSON.stringify({
      inbound: {
        port: '{{port}}',
        protocol: 'vmess',
        settings: { clients: [{ id: '{{uuid}}' }] },
        streamSettings: {
          network: 'ws',
          wsSettings: { path: '{{path}}', headers: { Host: '{{host}}' } },
        },
      },
    }),
    price: 0,
    client_limit: 1,
    client_price: 0,
  },
  {
    id: 'trojan-ws',
    name: 'Trojan + WebSocket',
    schema_json: JSON.stringify({
      fields: [
        { name: 'port', label: 'Port', type: 'number', default: 443 },
        { name: 'password', label: 'Password', type: 'password', required: true },
        { name: 'sni', label: 'SNI', type: 'text', default: 'google.com' },
        { name: 'path', label: 'WS Path', type: 'text', default: '/trojan-ws' },
      ],
    }),
    template_json: JSON.stringify({
      inbound: {
        port: '{{port}}',
        protocol: 'trojan',
        settings: { clients: [{ password: '{{password}}' }] },
        streamSettings: {
          network: 'ws',
          security: 'tls',
          tlsSettings: { serverName: '{{sni}}' },
          wsSettings: { path: '{{path}}' },
        },
      },
    }),
    price: 0,
    client_limit: 1,
    client_price: 0,
  },
  {
    id: 'ss-ws',
    name: 'Shadowsocks + WebSocket',
    schema_json: JSON.stringify({
      fields: [
        { name: 'port', label: 'Port', type: 'number', default: 80 },
        { name: 'method', label: 'Method', type: 'select', default: 'chacha20-ietf-poly1305', options: [
          { label: 'ChaCha20-Poly1305', value: 'chacha20-ietf-poly1305' },
          { label: 'AES-256-GCM', value: 'aes-256-gcm' },
          { label: 'AES-128-GCM', value: 'aes-128-gcm' },
        ]},
        { name: 'password', label: 'Password', type: 'password', required: true },
        { name: 'path', label: 'WS Path', type: 'text', default: '/ss-ws' },
      ],
    }),
    template_json: JSON.stringify({
      inbound: {
        port: '{{port}}',
        protocol: 'shadowsocks',
        settings: { method: '{{method}}', password: '{{password}}' },
        streamSettings: { network: 'ws', wsSettings: { path: '{{path}}' } },
      },
    }),
    price: 0,
    client_limit: 1,
    client_price: 0,
  },
  {
    id: 'vless-grpc',
    name: 'VLESS + gRPC',
    schema_json: JSON.stringify({
      fields: [
        { name: 'port', label: 'Port', type: 'number', default: 443 },
        { name: 'uuid', label: 'UUID', type: 'text', required: true },
        { name: 'sni', label: 'SNI', type: 'text', default: 'google.com' },
        { name: 'serviceName', label: 'Service Name', type: 'text', default: 'grpc' },
        { name: 'mode', label: 'gRPC Mode', type: 'select', default: 'gun', options: [
          { label: 'Gun', value: 'gun' },
          { label: 'Multi', value: 'multi' },
        ]},
      ],
    }),
    template_json: JSON.stringify({
      inbound: {
        port: '{{port}}',
        protocol: 'vless',
        settings: { clients: [{ id: '{{uuid}}' }] },
        streamSettings: {
          network: 'grpc',
          security: 'tls',
          tlsSettings: { serverName: '{{sni}}' },
          grpcSettings: { serviceName: '{{serviceName}}' },
        },
      },
    }),
    price: 0,
    client_limit: 1,
    client_price: 0,
  },
];

const DEFAULT_SETTINGS = {
  'panel.password_hash': '',
  'panel.secret_key': '',
  'panel.admin_uuid': '',
  'financial.referral_commission': '15',
  'financial.min_withdrawal': '5',
  'financial.tax_fee': '2',
  'integrations.telegram_enabled': 'false',
  'integrations.ton_wallet_enabled': 'false',
  'integrations.external_server_url': '',
  'disguise.enabled': 'false',
  'disguise.admin_path': '',
  'disguise.login_path': '',
  'disguise.sub_path': '',
  'disguise.fallback_page': '1101',
  'ech.enabled': 'false',
  'ech.sni': 'cloudflare-ech.com',
  'ech.dns': 'https://dns.alidns.com/dns-query',
  'tls_fragment.enabled': 'false',
  'tls_fragment.mode': 'Shadowrocket',
  'tg.bot_token': '',
  'tg.chat_id': '',
};

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function tableExists(db: D1Database, tableName: string): Promise<boolean> {
  try {
    const result = await db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    ).bind(tableName).first();
    return result !== null;
  } catch {
    return false;
  }
}

export async function ensureSchema(db: D1Database): Promise<void> {
  // Create tables if they don't exist
  await db.exec(SCHEMA_SQL);

  // Check if protocols table is empty and seed if needed
  const protocolsExist = await tableExists(db, 'protocols');
  if (protocolsExist) {
    const count = await db.prepare('SELECT COUNT(*) as count FROM protocols').first<{ count: number }>();
    if (count && count.count === 0) {
      // Seed default protocols
      for (const p of DEFAULT_PROTOCOLS) {
        await db
          .prepare(
            'INSERT OR IGNORE INTO protocols (id, name, schema_json, template_json, price, client_limit, client_price) VALUES (?, ?, ?, ?, ?, ?, ?)'
          )
          .bind(p.id, p.name, p.schema_json, p.template_json, p.price, p.client_limit, p.client_price)
          .run();
      }
    }
  }

  // Seed default settings
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    await db
      .prepare('INSERT OR IGNORE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
      .bind(k, v, Date.now())
      .run();
  }

  // Seed default admin user if not exists
  const adminCheck = await db
    .prepare('SELECT id FROM users WHERE username = ?')
    .bind('admin')
    .first();
  if (!adminCheck) {
    const adminHash = await hashPassword('admin');
    const adminUuid = crypto.randomUUID();
    await db
      .prepare(
        'INSERT INTO users (username, password_hash, role, uuid, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .bind('admin', adminHash, 'admin', adminUuid, 'active', Date.now())
      .run();

    // Store admin UUID in settings
    await db
      .prepare(
        'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
      )
      .bind('panel.admin_uuid', adminUuid, Date.now())
      .run();
  }

  // Seed default user if not exists
  const userCheck = await db
    .prepare('SELECT id FROM users WHERE username = ?')
    .bind('user')
    .first();
  if (!userCheck) {
    const userHash = await hashPassword('user');
    const userUuid = crypto.randomUUID();
    await db
      .prepare(
        'INSERT INTO users (username, password_hash, role, uuid, status, traffic_limit, expiry_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        'user',
        userHash,
        'user',
        userUuid,
        'active',
        100,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        Date.now()
      )
      .run();
  }
}
