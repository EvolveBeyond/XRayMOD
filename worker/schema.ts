import type { Env } from './types';
import { hashPasswordFast } from './auth';

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
    id: 'vless-ws',
    name: 'VLESS + WebSocket (Recommended)',
    schema_json: JSON.stringify({
      fields: [
        { name: 'path', label: 'WS Path', type: 'text', default: '/proxy' },
        { name: 'sni', label: 'SNI', type: 'text' },
        { name: 'fingerprint', label: 'Fingerprint', type: 'text', default: 'chrome' },
      ],
    }),
    template_json: JSON.stringify({
      protocol: 'vless',
      network: 'ws',
      security: 'tls',
    }),
    price: 0,
    client_limit: 3,
    client_price: 0,
  },
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
  'panel.access_uuid': '',
  'financial.referral_commission': '15',
  'financial.min_withdrawal': '5',
  'financial.tax_fee': '2',
  'integrations.telegram_enabled': 'false',
  'integrations.ton_wallet_enabled': 'false',
  'integrations.external_server_url': '',
  'disguise.enabled': 'true',
  'disguise.admin_path': '',
  'disguise.login_path': '',
  'disguise.sub_path': '',
  'disguise.fallback_page': '404',
  'disguise.canary_paths': 'wp-admin,phpmyadmin,.env,xmlrpc.php,actuator,admin.php,wp-login.php',
  'panel.cf_email': '',
  'panel.cf_email_enforce': 'false',
  'panel.custom_domains': '',
  'panel.version': '5.1.1',
  'ech.enabled': 'false',
  'ech.sni': 'cloudflare-ech.com',
  'ech.dns': 'https://dns.alidns.com/dns-query',
  'tls_fragment.enabled': 'false',
  'tls_fragment.mode': 'Shadowrocket',
  'tg.bot_token': '',
  'tg.chat_id': '',
  'panel.started_at': '',
  'panel.paused': 'false',
  'protocol.mixed_mode': 'false',
  'panel.monthly_cap_gb': '0',
  'panel.sub_html_enhanced': 'true',
  'panel.isp_aware_sub': 'true',
  'cleanip.auto_enabled': 'true',
  'cleanip.health_enabled': 'true',
  'panel.speed_profile': 'stable',
  'panel.sub_name': 'XRayMOD',
  'panel.sub_banner': 'Secure edge · Clean IP · Smart sub',
  'panel.tg_login_enabled': 'false',
  'canary.blocked_ips': '[]',
  'canary.report': '{"hits":[],"blocked":[]}',
  'brand.config': '',
  'panel.nodes_json': '[]',
  'panel.custom_domains_weighted': '[]',
  'alerts.enabled': 'true',
  'tg.bot_username': '',
};

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

const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
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
  )`,
  `CREATE TABLE IF NOT EXISTS configs (
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
  )`,
  `CREATE TABLE IF NOT EXISTS protocols (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    schema_json TEXT NOT NULL,
    template_json TEXT NOT NULL,
    price REAL DEFAULT 0,
    client_limit INTEGER DEFAULT 1,
    client_price REAL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS kvstore (
    k TEXT PRIMARY KEY,
    v TEXT,
    updated INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS backends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    vps_ip TEXT NOT NULL,
    vps_port INTEGER DEFAULT 443,
    vps_uuid TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS managers (
    id TEXT PRIMARY KEY,
    role TEXT DEFAULT 'sponsor',
    name TEXT NOT NULL,
    welcome TEXT DEFAULT '',
    commission_pct REAL DEFAULT 15,
    parent_id TEXT DEFAULT '',
    tg_id TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    manager_id TEXT NOT NULL,
    name TEXT NOT NULL,
    days INTEGER DEFAULT 30,
    traffic_gb REAL DEFAULT 100,
    price_stars REAL DEFAULT 0,
    price_dai REAL DEFAULT 0,
    active INTEGER DEFAULT 1,
    created_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS wallets (
    owner_key TEXT PRIMARY KEY,
    stars REAL DEFAULT 0,
    dai REAL DEFAULT 0,
    gram REAL DEFAULT 0,
    updated_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS wallet_tx (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_key TEXT NOT NULL,
    manager_id TEXT DEFAULT '',
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'stars',
    type TEXT DEFAULT 'deposit',
    status TEXT DEFAULT 'ok',
    note TEXT DEFAULT '',
    created_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS coupons (
    code TEXT PRIMARY KEY,
    manager_id TEXT DEFAULT '',
    pct_off REAL DEFAULT 10,
    max_uses INTEGER DEFAULT 0,
    used_count INTEGER DEFAULT 0,
    expires_at INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    created_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS referrals (
    ref_code TEXT PRIMARY KEY,
    manager_id TEXT NOT NULL,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    created_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    buyer_key TEXT NOT NULL,
    manager_id TEXT DEFAULT '',
    plan_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'stars',
    coupon TEXT DEFAULT '',
    ref_code TEXT DEFAULT '',
    status TEXT DEFAULT 'paid',
    created_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS commissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    manager_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'stars',
    pct REAL DEFAULT 0,
    created_at INTEGER
  )`,
];

/** Per-isolate cache — avoid re-running heavy DDL/seed on every request */
let schemaReady = false;
let schemaPromise: Promise<void> | null = null;

export async function ensureSchema(db: D1Database): Promise<void> {
  if (schemaReady) return;
  if (schemaPromise) return schemaPromise;
  schemaPromise = ensureSchemaInner(db)
    .then(() => {
      schemaReady = true;
    })
    .catch((err) => {
      schemaPromise = null;
      throw err;
    });
  return schemaPromise;
}

async function ensureSchemaInner(db: D1Database): Promise<void> {
  if (!db) {
    throw new Error('D1 binding DB is missing');
  }

  // Create tables (individually — multi-statement not reliable)
  for (const sql of TABLES) {
    await db.prepare(sql).run();
  }

  // Fast path: already fully seeded — still soft-insert any new default keys
  const version = await db
    .prepare('SELECT v FROM kvstore WHERE k = ?')
    .bind('schema.version')
    .first<{ v: string }>();
  if (
    version?.v === '2' ||
    version?.v === '3' ||
    version?.v === '4' ||
    version?.v === '5'
  ) {
    const nowSoft = Date.now();
    for (const k of [
      'disguise.canary_paths',
      'panel.sub_html_enhanced',
      'panel.isp_aware_sub',
      'panel.cf_email',
      'panel.cf_email_enforce',
      'panel.custom_domains',
      'panel.version',
      'alerts.enabled',
      'tg.bot_username',
    ] as const) {
      const def = (DEFAULT_SETTINGS as Record<string, string>)[k];
      if (def === undefined) continue;
      await db
        .prepare('INSERT OR IGNORE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
        .bind(k, def, nowSoft)
        .run();
    }
    // Gen 5.1.1: harden existing panels once
    if (version.v !== '4' && version.v !== '5') {
      await db
        .prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
        .bind('disguise.fallback_page', '404', nowSoft)
        .run();
      await db
        .prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
        .bind('disguise.enabled', 'true', nowSoft)
        .run();
      await db
        .prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
        .bind('panel.version', '5.1.1', nowSoft)
        .run();
    }
    // v5: commerce seed (managers/plans/coupons) — idempotent
    if (version.v !== '5') {
      const { ensureCommerceSeed } = await import('./lib/commerce');
      await ensureCommerceSeed(db);
      await db
        .prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
        .bind('schema.version', '5', nowSoft)
        .run();
    }
    return;
  }

  // Protocols seed
  const protoCount = await db
    .prepare('SELECT COUNT(*) as count FROM protocols')
    .first<{ count: number }>();
  if (!protoCount || protoCount.count === 0) {
    for (const p of DEFAULT_PROTOCOLS) {
      await db
        .prepare(
          'INSERT OR IGNORE INTO protocols (id, name, schema_json, template_json, price, client_limit, client_price) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(p.id, p.name, p.schema_json, p.template_json, p.price, p.client_limit, p.client_price)
        .run();
    }
  }

  // Settings seed (cheap INSERT OR IGNORE)
  const now = Date.now();
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    const value = k === 'panel.started_at' && !v ? String(now) : v;
    await db
      .prepare('INSERT OR IGNORE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
      .bind(k, value, now)
      .run();
  }

  // Admin seed — use fast hash (legacy SHA-256) so cold start stays under Workers CPU limit
  const adminCheck = await db
    .prepare('SELECT id FROM users WHERE username = ?')
    .bind('admin')
    .first();
  if (!adminCheck) {
    const adminHash = await hashPasswordFast('admin');
    const adminUuid = crypto.randomUUID();
    await db
      .prepare(
        'INSERT INTO users (username, password_hash, role, uuid, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .bind('admin', adminHash, 'admin', adminUuid, 'active', now)
      .run();
    await db
      .prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
      .bind('panel.admin_uuid', adminUuid, now)
      .run();
  }

  // Demo user (optional, non-fatal)
  try {
    const userCheck = await db
      .prepare('SELECT id FROM users WHERE username = ?')
      .bind('user')
      .first();
    if (!userCheck) {
      const userHash = await hashPasswordFast('user');
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
          100 * 1024 * 1024 * 1024,
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          now
        )
        .run();
    }
  } catch {
    /* ignore seed user failures */
  }

  const { ensureCommerceSeed } = await import('./lib/commerce');
  await ensureCommerceSeed(db);

  await db
    .prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
    .bind('schema.version', '5', now)
    .run();
}
