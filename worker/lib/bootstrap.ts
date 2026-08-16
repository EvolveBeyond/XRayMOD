import type { Env } from '../types';
import { hashPassword } from '../auth';
import { buildVlessWsLink } from './links';
import { XRayMOD_VERSION } from './version';

function genPassword(len = 14): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export type BootstrapResult = {
  username: string;
  password: string;
  accessUUID: string;
  adminUuid: string;
  panelUrl: string;
  loginUrl: string;
  subscriptionUrl: string;
  subscriptionRaw: string;
  configLink: string;
  configPath: string;
  workerHost: string;
};

/** Full first-time setup: password, UUID, default VLESS-WS config, credentials dump */
export async function bootstrapPanel(
  env: Env,
  origin: string,
  opts?: { password?: string; username?: string }
): Promise<BootstrapResult> {
  const username = opts?.username || 'admin';
  const password = opts?.password && opts.password.length >= 6 ? opts.password : genPassword(16);
  const hash = await hashPassword(password);
  const accessUUID = crypto.randomUUID();
  const now = Date.now();
  const workerHost = new URL(origin).host;

  await env.DB.prepare(
    'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
  )
    .bind('panel.password_hash', hash, now)
    .run();
  await env.DB.prepare(
    'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
  )
    .bind('panel.access_uuid', accessUUID, now)
    .run();

  const secretKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  await env.DB.prepare(
    'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
  )
    .bind('panel.secret_key', secretKey, now)
    .run();

  // Ensure admin row
  let admin = await env.DB.prepare(
    "SELECT id, uuid FROM users WHERE role = 'admin' LIMIT 1"
  ).first<{ id: number; uuid: string }>();

  if (!admin) {
    const uuid = crypto.randomUUID();
    const r = await env.DB.prepare(
      `INSERT INTO users (username, password_hash, role, uuid, status, traffic_limit, created_at)
       VALUES (?, ?, 'admin', ?, 'active', 0, ?)`
    )
      .bind(username, hash, uuid, now)
      .run();
    admin = { id: r.meta.last_row_id as number, uuid };
  } else {
    await env.DB.prepare(
      'UPDATE users SET password_hash = ?, username = ?, status = ? WHERE id = ?'
    )
      .bind(hash, username, 'active', admin.id)
      .run();
  }

  await env.DB.prepare(
    'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
  )
    .bind('panel.admin_uuid', admin.uuid, now)
    .run();

  // Default working config: VLESS + WS + TLS (CF best practice)
  const configPath = `/proxy/${crypto.randomUUID().slice(0, 10)}`;
  const settings = {
    port: 443,
    uuid: admin.uuid,
    path: configPath,
    host: workerHost,
    sni: workerHost,
    network: 'ws',
    security: 'tls',
    fingerprint: 'chrome',
  };
  const link = buildVlessWsLink({
    uuid: admin.uuid,
    host: workerHost,
    path: configPath,
    name: 'XrayMOD · Recommended',
    sni: workerHost,
  });

  // Remove previous auto configs for clean slate
  await env.DB.prepare(
    "DELETE FROM configs WHERE user_id = ? AND name LIKE 'XrayMOD%'"
  )
    .bind(admin.id)
    .run();

  await env.DB.prepare(
    `INSERT INTO configs (user_id, protocol_id, name, settings_json, port, path, link, node_ip, client_limit, created_at)
     VALUES (?, 'vless-ws', ?, ?, 443, ?, ?, ?, 3, ?)`
  )
    .bind(
      admin.id,
      'XrayMOD · Recommended',
      JSON.stringify(settings),
      configPath,
      link,
      workerHost,
      now
    )
    .run();

  // Ensure vless-ws protocol exists
  await env.DB.prepare(
    `INSERT OR IGNORE INTO protocols (id, name, schema_json, template_json, price, client_limit, client_price)
     VALUES ('vless-ws', 'VLESS + WebSocket (Recommended)', ?, ?, 0, 3, 0)`
  )
    .bind(
      JSON.stringify({
        fields: [
          { name: 'path', label: 'WS Path', type: 'text', default: '/proxy' },
          { name: 'sni', label: 'SNI', type: 'text' },
          { name: 'fingerprint', label: 'Fingerprint', type: 'text', default: 'chrome' },
        ],
      }),
      JSON.stringify({ protocol: 'vless', network: 'ws', security: 'tls' })
    )
    .run();

  await env.DB.prepare(
    'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
  )
    .bind('panel.bootstrapped', 'true', now)
    .run();

  // Gen 5.1 secure defaults: silent 404 fallback + disguise enabled
  await env.DB.prepare(
    'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
  )
    .bind('disguise.enabled', 'true', now)
    .run();
  await env.DB.prepare(
    'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
  )
    .bind('disguise.fallback_page', '404', now)
    .run();
  await env.DB.prepare(
    'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
  )
    .bind('panel.started_at', String(now), now)
    .run();
  await env.DB.prepare(
    'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
  )
    .bind('panel.version', XRayMOD_VERSION, now)
    .run();

  // Optional CF email from install username if it looks like an email
  if (username.includes('@')) {
    await env.DB.prepare(
      'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
    )
      .bind('panel.cf_email', username.toLowerCase(), now)
      .run();
    await env.DB.prepare(
      'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
    )
      .bind('panel.cf_email_enforce', 'true', now)
      .run();
    await env.DB.prepare(
      "UPDATE users SET email = ? WHERE role = 'admin'"
    )
      .bind(username.toLowerCase())
      .run();
  }

  // Store plain credentials once for recovery screen (hashed password still used for login)
  await env.DB.prepare(
    'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
  )
    .bind(
      'panel.credentials_json',
      JSON.stringify({
        username,
        password,
        accessUUID,
        adminUuid: admin.uuid,
        createdAt: now,
      }),
      now
    )
    .run();

  const panelUrl = `${origin}/${accessUUID}/panel`;
  const loginUrl = `${origin}/${accessUUID}/login`;
  const subscriptionUrl = `${origin}/${accessUUID}/sub/${admin.uuid}`;
  const subscriptionRaw = `${origin}/${accessUUID}/sub/${admin.uuid}?format=raw`;

  return {
    username,
    password,
    accessUUID,
    adminUuid: admin.uuid,
    panelUrl,
    loginUrl,
    subscriptionUrl,
    subscriptionRaw,
    configLink: link,
    configPath,
    workerHost,
  };
}

export async function getStoredCredentials(
  env: Env,
  origin: string
): Promise<BootstrapResult | null> {
  const row = await env.DB.prepare(
    'SELECT v FROM kvstore WHERE k = ?'
  )
    .bind('panel.credentials_json')
    .first<{ v: string }>();
  if (!row?.v) return null;
  try {
    const c = JSON.parse(row.v);
    const accessUUID =
      c.accessUUID ||
      (
        await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?')
          .bind('panel.access_uuid')
          .first<{ v: string }>()
      )?.v;
    const adminUuid =
      c.adminUuid ||
      (
        await env.DB.prepare("SELECT uuid FROM users WHERE role = 'admin' LIMIT 1").first<{
          uuid: string;
        }>()
      )?.uuid;
    if (!accessUUID || !adminUuid) return null;

    const cfg = await env.DB.prepare(
      "SELECT path, link FROM configs WHERE name LIKE 'XrayMOD%' ORDER BY id DESC LIMIT 1"
    ).first<{ path: string; link: string }>();

    return {
      username: c.username || 'admin',
      password: c.password || '(changed — use your password)',
      accessUUID,
      adminUuid,
      panelUrl: `${origin}/${accessUUID}/panel`,
      loginUrl: `${origin}/${accessUUID}/login`,
      subscriptionUrl: `${origin}/${accessUUID}/sub/${adminUuid}`,
      subscriptionRaw: `${origin}/${accessUUID}/sub/${adminUuid}?format=raw`,
      configLink: cfg?.link || '',
      configPath: cfg?.path || '',
      workerHost: new URL(origin).host,
    };
  } catch {
    return null;
  }
}
