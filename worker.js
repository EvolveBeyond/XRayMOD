// worker/schema.ts
var SCHEMA_SQL = `
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
var DEFAULT_PROTOCOLS = [
  {
    id: "vless-reality",
    name: "VLESS + Reality",
    schema_json: JSON.stringify({
      fields: [
        { name: "port", label: "Port", type: "number", default: 443 },
        { name: "uuid", label: "UUID", type: "text", required: true },
        { name: "sni", label: "SNI", type: "text", default: "google.com" },
        { name: "sid", label: "Short ID", type: "text" },
        { name: "pbk", label: "Public Key", type: "text", required: true },
        {
          name: "flow",
          label: "Flow",
          type: "select",
          default: "xtls-rprx-vision",
          options: [
            { label: "None", value: "" },
            { label: "Vision", value: "xtls-rprx-vision" }
          ]
        }
      ]
    }),
    template_json: JSON.stringify({
      inbound: {
        port: "{{port}}",
        protocol: "vless",
        settings: { clients: [{ id: "{{uuid}}", flow: "{{flow}}" }] },
        streamSettings: {
          network: "tcp",
          security: "reality",
          realitySettings: {
            dest: "{{sni}}:443",
            serverNames: ["{{sni}}"],
            privateKey: "{{privateKey}}",
            shortIds: ["{{sid}}"]
          }
        }
      }
    }),
    price: 0,
    client_limit: 1,
    client_price: 0
  },
  {
    id: "vmess-ws",
    name: "VMess + WebSocket",
    schema_json: JSON.stringify({
      fields: [
        { name: "port", label: "Port", type: "number", default: 80 },
        { name: "uuid", label: "UUID", type: "text", required: true },
        { name: "path", label: "WS Path", type: "text", default: "/graphql" },
        { name: "host", label: "Host", type: "text" }
      ]
    }),
    template_json: JSON.stringify({
      inbound: {
        port: "{{port}}",
        protocol: "vmess",
        settings: { clients: [{ id: "{{uuid}}" }] },
        streamSettings: {
          network: "ws",
          wsSettings: { path: "{{path}}", headers: { Host: "{{host}}" } }
        }
      }
    }),
    price: 0,
    client_limit: 1,
    client_price: 0
  },
  {
    id: "trojan-ws",
    name: "Trojan + WebSocket",
    schema_json: JSON.stringify({
      fields: [
        { name: "port", label: "Port", type: "number", default: 443 },
        { name: "password", label: "Password", type: "password", required: true },
        { name: "sni", label: "SNI", type: "text", default: "google.com" },
        { name: "path", label: "WS Path", type: "text", default: "/trojan-ws" }
      ]
    }),
    template_json: JSON.stringify({
      inbound: {
        port: "{{port}}",
        protocol: "trojan",
        settings: { clients: [{ password: "{{password}}" }] },
        streamSettings: {
          network: "ws",
          security: "tls",
          tlsSettings: { serverName: "{{sni}}" },
          wsSettings: { path: "{{path}}" }
        }
      }
    }),
    price: 0,
    client_limit: 1,
    client_price: 0
  },
  {
    id: "ss-ws",
    name: "Shadowsocks + WebSocket",
    schema_json: JSON.stringify({
      fields: [
        { name: "port", label: "Port", type: "number", default: 80 },
        { name: "method", label: "Method", type: "select", default: "chacha20-ietf-poly1305", options: [
          { label: "ChaCha20-Poly1305", value: "chacha20-ietf-poly1305" },
          { label: "AES-256-GCM", value: "aes-256-gcm" },
          { label: "AES-128-GCM", value: "aes-128-gcm" }
        ] },
        { name: "password", label: "Password", type: "password", required: true },
        { name: "path", label: "WS Path", type: "text", default: "/ss-ws" }
      ]
    }),
    template_json: JSON.stringify({
      inbound: {
        port: "{{port}}",
        protocol: "shadowsocks",
        settings: { method: "{{method}}", password: "{{password}}" },
        streamSettings: { network: "ws", wsSettings: { path: "{{path}}" } }
      }
    }),
    price: 0,
    client_limit: 1,
    client_price: 0
  },
  {
    id: "vless-grpc",
    name: "VLESS + gRPC",
    schema_json: JSON.stringify({
      fields: [
        { name: "port", label: "Port", type: "number", default: 443 },
        { name: "uuid", label: "UUID", type: "text", required: true },
        { name: "sni", label: "SNI", type: "text", default: "google.com" },
        { name: "serviceName", label: "Service Name", type: "text", default: "grpc" },
        { name: "mode", label: "gRPC Mode", type: "select", default: "gun", options: [
          { label: "Gun", value: "gun" },
          { label: "Multi", value: "multi" }
        ] }
      ]
    }),
    template_json: JSON.stringify({
      inbound: {
        port: "{{port}}",
        protocol: "vless",
        settings: { clients: [{ id: "{{uuid}}" }] },
        streamSettings: {
          network: "grpc",
          security: "tls",
          tlsSettings: { serverName: "{{sni}}" },
          grpcSettings: { serviceName: "{{serviceName}}" }
        }
      }
    }),
    price: 0,
    client_limit: 1,
    client_price: 0
  }
];
var DEFAULT_SETTINGS = {
  "panel.password_hash": "",
  "panel.secret_key": "",
  "panel.admin_uuid": "",
  "financial.referral_commission": "15",
  "financial.min_withdrawal": "5",
  "financial.tax_fee": "2",
  "integrations.telegram_enabled": "false",
  "integrations.ton_wallet_enabled": "false",
  "integrations.external_server_url": "",
  "disguise.enabled": "false",
  "disguise.admin_path": "",
  "disguise.login_path": "",
  "disguise.sub_path": "",
  "disguise.fallback_page": "1101",
  "ech.enabled": "false",
  "ech.sni": "cloudflare-ech.com",
  "ech.dns": "https://dns.alidns.com/dns-query",
  "tls_fragment.enabled": "false",
  "tls_fragment.mode": "Shadowrocket",
  "tg.bot_token": "",
  "tg.chat_id": ""
};
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function tableExists(db, tableName) {
  try {
    const result = await db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    ).bind(tableName).first();
    return result !== null;
  } catch {
    return false;
  }
}
async function ensureSchema(db) {
  await db.exec(SCHEMA_SQL);
  const protocolsExist = await tableExists(db, "protocols");
  if (protocolsExist) {
    const count = await db.prepare("SELECT COUNT(*) as count FROM protocols").first();
    if (count && count.count === 0) {
      for (const p of DEFAULT_PROTOCOLS) {
        await db.prepare(
          "INSERT OR IGNORE INTO protocols (id, name, schema_json, template_json, price, client_limit, client_price) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(p.id, p.name, p.schema_json, p.template_json, p.price, p.client_limit, p.client_price).run();
      }
    }
  }
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    await db.prepare("INSERT OR IGNORE INTO kvstore (k, v, updated) VALUES (?, ?, ?)").bind(k, v, Date.now()).run();
  }
  const adminCheck = await db.prepare("SELECT id FROM users WHERE username = ?").bind("admin").first();
  if (!adminCheck) {
    const adminHash = await hashPassword("admin");
    const adminUuid = crypto.randomUUID();
    await db.prepare(
      "INSERT INTO users (username, password_hash, role, uuid, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind("admin", adminHash, "admin", adminUuid, "active", Date.now()).run();
    await db.prepare(
      "INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)"
    ).bind("panel.admin_uuid", adminUuid, Date.now()).run();
  }
  const userCheck = await db.prepare("SELECT id FROM users WHERE username = ?").bind("user").first();
  if (!userCheck) {
    const userHash = await hashPassword("user");
    const userUuid = crypto.randomUUID();
    await db.prepare(
      "INSERT INTO users (username, password_hash, role, uuid, status, traffic_limit, expiry_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      "user",
      userHash,
      "user",
      userUuid,
      "active",
      100,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
      Date.now()
    ).run();
  }
}

// worker/auth.ts
var SESSION_TTL = 7 * 24 * 60 * 60 * 1e3;
async function hashPassword2(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function verifyPassword(password, hash) {
  const computed = await hashPassword2(password);
  return computed === hash;
}
function generateSessionToken() {
  return crypto.randomUUID();
}
async function createSession(db, userId, role) {
  const token = generateSessionToken();
  const sessionData = JSON.stringify({
    userId,
    role,
    created: Date.now()
  });
  await db.prepare("INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)").bind(`session:${token}`, sessionData, Date.now()).run();
  return token;
}
async function getSession(db, token) {
  const row = await db.prepare("SELECT v FROM kvstore WHERE k = ?").bind(`session:${token}`).first();
  if (!row) return null;
  try {
    const data = JSON.parse(row.v);
    if (Date.now() - data.created > SESSION_TTL) {
      await db.prepare("DELETE FROM kvstore WHERE k = ?").bind(`session:${token}`).run();
      return null;
    }
    return { userId: data.userId, role: data.role };
  } catch {
    return null;
  }
}
async function deleteSession(db, token) {
  await db.prepare("DELETE FROM kvstore WHERE k = ?").bind(`session:${token}`).run();
}
function extractSessionToken(request) {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/session=([^;]+)/);
  return match ? match[1] : null;
}
function setSessionCookie(token, maxAge = SESSION_TTL / 1e3) {
  return `session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}
function clearSessionCookie() {
  return "session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
}
async function authenticateRequest(request, db) {
  const token = extractSessionToken(request);
  if (!token) return null;
  return getSession(db, token);
}
async function requireAuth(request, db) {
  const session = await authenticateRequest(request, db);
  if (!session) {
    throw new Response(
      JSON.stringify({ success: false, message: "Unauthorized" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  return session;
}
async function requireAdmin(request, db) {
  const session = await requireAuth(request, db);
  if (session.role !== "admin") {
    throw new Response(
      JSON.stringify({ success: false, message: "Forbidden" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  return session;
}

// worker/install.ts
async function handleInstall(request, env, _ctx, _params) {
  const url = new URL(request.url);
  const configured = await env.DB.prepare(
    "SELECT v FROM kvstore WHERE k = ?"
  ).bind("panel.password_hash").first();
  if (configured && configured.v) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/" }
    });
  }
  if (request.method === "POST") {
    try {
      const body = await request.json();
      const password = body.password;
      if (!password || password.length < 4) {
        return new Response(JSON.stringify({ error: "Password must be at least 4 characters" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const hash = await hashPassword2(password);
      await env.DB.prepare(
        "INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)"
      ).bind("panel.password_hash", hash, Date.now()).run();
      await env.DB.prepare(
        "UPDATE users SET password_hash = ? WHERE role = ?"
      ).bind(hash, "admin").run();
      return new Response(JSON.stringify({ success: true, message: "Password set successfully" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XrayMOD \u2014 Setup</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #09090b;
      color: #fafafa;
      display: grid;
      place-items: center;
      min-height: 100vh;
    }
    .card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 1rem;
      padding: 2.5rem;
      max-width: 440px;
      width: 100%;
    }
    .logo {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 1.5rem;
      color: #000;
      margin: 0 auto 1.5rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 800;
      text-align: center;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      text-align: center;
      color: #a1a1aa;
      margin-bottom: 2rem;
      font-size: 0.875rem;
      line-height: 1.6;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    label {
      display: block;
      font-size: 0.75rem;
      font-weight: 700;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }
    input {
      width: 100%;
      padding: 0.75rem 1rem;
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 0.75rem;
      color: #fafafa;
      font-size: 0.875rem;
      transition: border-color 0.2s;
    }
    input:focus {
      outline: none;
      border-color: #10b981;
    }
    input::placeholder { color: #52525b; }
    .btn {
      width: 100%;
      padding: 0.875rem;
      background: #10b981;
      color: #000;
      border: none;
      border-radius: 0.75rem;
      font-weight: 700;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background 0.2s;
      margin-top: 1rem;
    }
    .btn:hover { background: #34d399; }
    .btn:disabled { background: #27272a; color: #52525b; cursor: not-allowed; }
    .error {
      color: #ef4444;
      font-size: 0.75rem;
      margin-top: 0.5rem;
      display: none;
    }
    .success {
      color: #10b981;
      font-size: 0.875rem;
      margin-top: 1rem;
      text-align: center;
      display: none;
    }
    .footer {
      text-align: center;
      margin-top: 1.5rem;
      font-size: 0.75rem;
      color: #52525b;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">X</div>
    <h1>Welcome to XrayMOD</h1>
    <p class="subtitle">
      Set up your admin password to get started.<br>
      This is the only time you'll need to do this.
    </p>

    <form id="setupForm">
      <div class="form-group">
        <label for="password">Admin Password</label>
        <input
          type="password"
          id="password"
          placeholder="Enter a secure password"
          required
          minlength="4"
          autocomplete="new-password"
        >
      </div>
      <div class="form-group">
        <label for="confirmPassword">Confirm Password</label>
        <input
          type="password"
          id="confirmPassword"
          placeholder="Confirm your password"
          required
          minlength="4"
          autocomplete="new-password"
        >
      </div>
      <button type="submit" class="btn" id="submitBtn">Complete Setup</button>
    </form>

    <div class="error" id="error"></div>
    <div class="success" id="success"></div>

    <div class="footer">
      Powered by XrayMOD \u2014 Cloudflare Workers
    </div>
  </div>

  <script>
    const form = document.getElementById('setupForm');
    const error = document.getElementById('error');
    const success = document.getElementById('success');
    const submitBtn = document.getElementById('submitBtn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('password').value;
      const confirm = document.getElementById('confirmPassword').value;

      if (password !== confirm) {
        error.textContent = 'Passwords do not match';
        error.style.display = 'block';
        return;
      }

      if (password.length < 4) {
        error.textContent = 'Password must be at least 4 characters';
        error.style.display = 'block';
        return;
      }

      error.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Setting up...';

      try {
        const res = await fetch('/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });

        const data = await res.json();

        if (data.success) {
          success.textContent = 'Setup complete! Redirecting to login...';
          success.style.display = 'block';
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        } else {
          error.textContent = data.error || 'Setup failed';
          error.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Complete Setup';
        }
      } catch (err) {
        error.textContent = 'Network error. Please try again.';
        error.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Complete Setup';
      }
    });
  <\/script>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

// worker/api/login.ts
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}
async function handleLogin(request, env, _ctx, _params) {
  if (request.method !== "POST") {
    return json({ success: false, message: "Method not allowed" }, 405);
  }
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return json({ success: false, message: "Username and password required" }, 400);
    }
    const user = await env.DB.prepare(
      "SELECT id, username, password_hash, role, email FROM users WHERE username = ?"
    ).bind(username).first();
    if (!user) {
      return json({ success: false, message: "Invalid credentials" }, 401);
    }
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return json({ success: false, message: "Invalid credentials" }, 401);
    }
    const sessionToken = await createSession(env.DB, user.id, user.role);
    return json(
      {
        success: true,
        role: user.role,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      },
      200,
      { "Set-Cookie": setSessionCookie(sessionToken) }
    );
  } catch (e) {
    return json({ success: false, message: "Invalid request body" }, 400);
  }
}

// worker/api/logout.ts
async function handleLogout(request, env, _ctx, _params) {
  const token = extractSessionToken(request);
  if (token) {
    await deleteSession(env.DB, token);
  }
  return new Response(
    JSON.stringify({ success: true, message: "Logged out" }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": clearSessionCookie()
      }
    }
  );
}

// worker/api/health.ts
function json2(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
async function handleHealth(_request, env, _ctx, _params) {
  try {
    const result = await env.DB.prepare("SELECT 1 as ok").first();
    const dbOk = result !== null;
    return json2({
      status: "ok",
      service: "xraymod",
      database: dbOk ? "connected" : "disconnected",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (e) {
    return json2({
      status: "error",
      service: "xraymod",
      database: "error",
      error: e instanceof Error ? e.message : "Unknown error"
    }, 500);
  }
}

// worker/api/nodes.ts
function json3(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
async function handleNodes(request, env, _ctx, params) {
  try {
    await requireAdmin(request, env.DB);
  } catch (e) {
    if (e instanceof Response) return e;
    return json3({ success: false, message: "Unauthorized" }, 401);
  }
  if (request.method === "GET") {
    const nodes = await env.DB.prepare("SELECT * FROM kvstore WHERE k LIKE ?").bind("node:%").all();
    const parsed = nodes.results.map((n) => {
      const data = JSON.parse(n.v);
      return { id: n.k.replace("node:", ""), ...data };
    });
    if (parsed.length === 0) {
      return json3({
        success: true,
        data: [
          { id: "1", name: "Germany - Frankfurt", ip: "1.2.3.4", status: "online", cpu: 12, ram: 45, users: 42, uptime: "14d 2h" },
          { id: "2", name: "Iran - Tehran (Bridge)", ip: "5.6.7.8", status: "online", cpu: 5, ram: 20, users: 12, uptime: "5d 12h" },
          { id: "3", name: "Netherlands - Amsterdam", ip: "9.10.11.12", status: "offline", cpu: 0, ram: 0, users: 0, uptime: "0" }
        ]
      });
    }
    return json3({ success: true, data: parsed });
  }
  if (request.method === "POST") {
    const body = await request.json();
    const id = String(Date.now());
    const nodeData = {
      name: body.name || "New Server",
      ip: body.ip || "0.0.0.0",
      status: "online",
      cpu: 0,
      ram: 0,
      users: 0,
      uptime: "0m"
    };
    await env.DB.prepare("INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)").bind(`node:${id}`, JSON.stringify(nodeData), Date.now()).run();
    return json3({ success: true, data: { id, ...nodeData } }, 201);
  }
  if (request.method === "DELETE" && params.id) {
    await env.DB.prepare("DELETE FROM kvstore WHERE k = ?").bind(`node:${params.id}`).run();
    return json3({ success: true });
  }
  return json3({ success: false, message: "Method not allowed" }, 405);
}

// worker/api/users.ts
function json4(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
async function handleUsers(request, env, _ctx, params) {
  try {
    await requireAdmin(request, env.DB);
  } catch (e) {
    if (e instanceof Response) return e;
    return json4({ success: false, message: "Unauthorized" }, 401);
  }
  if (request.method === "GET") {
    const users = await env.DB.prepare(
      "SELECT id, username, role, uuid, email, traffic_limit, traffic_used, expiry_date, status, created_at FROM users"
    ).all();
    return json4({
      success: true,
      data: users.results.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        used: Math.round(u.traffic_used / (1024 * 1024 * 1024) * 10) / 10,
        limit: Math.round(u.traffic_limit / (1024 * 1024 * 1024) * 10) / 10,
        status: u.status,
        expiry: u.expiry_date,
        role: u.role
      }))
    });
  }
  if (request.method === "POST") {
    const body = await request.json();
    if (!body.username) {
      return json4({ success: false, message: "Username required" }, 400);
    }
    const password = crypto.randomUUID().slice(0, 12);
    const passwordHash = await hashPassword2(password);
    const uuid = crypto.randomUUID();
    const limitBytes = (body.limit || 100) * 1024 * 1024 * 1024;
    const expiryDate = new Date(
      Date.now() + (body.expiryDays || 30) * 24 * 60 * 60 * 1e3
    ).toISOString().split("T")[0];
    const result = await env.DB.prepare(
      `INSERT INTO users (username, password_hash, role, uuid, email, traffic_limit, expiry_date, status, created_at)
       VALUES (?, ?, 'user', ?, ?, ?, ?, 'active', ?)`
    ).bind(
      body.username,
      passwordHash,
      uuid,
      body.email || "",
      limitBytes,
      expiryDate,
      Date.now()
    ).run();
    return json4(
      {
        success: true,
        data: {
          id: result.meta.last_row_id,
          username: body.username,
          password,
          uuid
        }
      },
      201
    );
  }
  if ((request.method === "PUT" || request.method === "PATCH") && params.id) {
    const body = await request.json();
    const userId = Number(params.id);
    const updates = [];
    const values = [];
    if (body.limit !== void 0) {
      updates.push("traffic_limit = ?");
      values.push(body.limit * 1024 * 1024 * 1024);
    }
    if (body.expiry !== void 0) {
      updates.push("expiry_date = ?");
      values.push(body.expiry);
    }
    if (body.status !== void 0) {
      updates.push("status = ?");
      values.push(body.status);
    }
    if (body.used !== void 0) {
      updates.push("traffic_used = ?");
      values.push(body.used * 1024 * 1024 * 1024);
    }
    if (updates.length === 0) {
      return json4({ success: false, message: "No updates provided" }, 400);
    }
    values.push(userId);
    await env.DB.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
    return json4({ success: true });
  }
  return json4({ success: false, message: "Method not allowed" }, 405);
}

// worker/api/protocols.ts
function json5(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
async function handleProtocols(request, env, _ctx, _params) {
  try {
    await requireAdmin(request, env.DB);
  } catch (e) {
    if (e instanceof Response) return e;
    return json5({ success: false, message: "Unauthorized" }, 401);
  }
  if (request.method === "GET") {
    const protocols = await env.DB.prepare("SELECT * FROM protocols").all();
    return json5({
      success: true,
      data: protocols.results.map((p) => ({
        id: p.id,
        name: p.name,
        schema: JSON.parse(p.schema_json),
        template: p.template_json,
        price: p.price,
        clientLimit: p.client_limit,
        clientPrice: p.client_price
      }))
    });
  }
  if (request.method === "POST") {
    const body = await request.json();
    if (!body.id || !body.name) {
      return json5({ success: false, message: "id and name required" }, 400);
    }
    await env.DB.prepare(
      `INSERT OR REPLACE INTO protocols (id, name, schema_json, template_json, price, client_limit, client_price)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.id,
      body.name,
      typeof body.schema === "string" ? body.schema : JSON.stringify(body.schema),
      typeof body.template === "string" ? body.template : JSON.stringify(body.template),
      body.price || 0,
      body.clientLimit || 1,
      body.clientPrice || 0
    ).run();
    return json5({ success: true }, 201);
  }
  return json5({ success: false, message: "Method not allowed" }, 405);
}

// worker/api/configs.ts
function json6(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
async function handleConfigs(request, env, _ctx, params) {
  try {
    await requireAdmin(request, env.DB);
  } catch (e) {
    if (e instanceof Response) return e;
    return json6({ success: false, message: "Unauthorized" }, 401);
  }
  if (request.method === "GET") {
    const configs = await env.DB.prepare(
      `SELECT c.*, u.username FROM configs c
       LEFT JOIN users u ON c.user_id = u.id`
    ).all();
    return json6({
      success: true,
      data: configs.results.map((c) => ({
        id: c.id,
        userId: c.user_id,
        username: c.username,
        protocolId: c.protocol_id,
        name: c.name,
        settings: JSON.parse(c.settings_json || "{}"),
        port: c.port,
        path: c.path,
        link: c.link,
        nodeIp: c.node_ip,
        clientLimit: c.client_limit,
        createdAt: c.created_at
      }))
    });
  }
  if (request.method === "POST") {
    const body = await request.json();
    if (!body.userId || !body.protocolId) {
      return json6({ success: false, message: "userId and protocolId required" }, 400);
    }
    const protocol = await env.DB.prepare("SELECT * FROM protocols WHERE id = ?").bind(body.protocolId).first();
    if (!protocol) {
      return json6({ success: false, message: "Protocol not found" }, 404);
    }
    const user = await env.DB.prepare("SELECT uuid FROM users WHERE id = ?").bind(body.userId).first();
    if (!user) {
      return json6({ success: false, message: "User not found" }, 404);
    }
    const configPath = `/proxy/${crypto.randomUUID().slice(0, 8)}`;
    const port = body.settings.port || 443;
    let template = protocol.template_json;
    const templateData = { ...body.settings, uuid: user.uuid };
    for (const [key, value] of Object.entries(templateData)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      template = template.replace(regex, String(value));
    }
    const link = `${body.protocolId}://${btoa(template)}@server.com:${port}?#${body.name || "Config"}`;
    const result = await env.DB.prepare(
      `INSERT INTO configs (user_id, protocol_id, name, settings_json, port, path, link, node_ip, client_limit, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.userId,
      body.protocolId,
      body.name || "Config",
      JSON.stringify(body.settings),
      port,
      configPath,
      link,
      body.settings.host || "",
      body.clientLimit || 1,
      Date.now()
    ).run();
    return json6(
      {
        success: true,
        data: {
          id: result.meta.last_row_id,
          name: body.name,
          protocolId: body.protocolId,
          link,
          path: configPath
        }
      },
      201
    );
  }
  if (request.method === "DELETE" && params.id) {
    await env.DB.prepare("DELETE FROM configs WHERE id = ?").bind(Number(params.id)).run();
    return json6({ success: true });
  }
  return json6({ success: false, message: "Method not allowed" }, 405);
}

// worker/api/settings.ts
function json7(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
async function handleSettings(request, env, _ctx, _params) {
  try {
    await requireAdmin(request, env.DB);
  } catch (e) {
    if (e instanceof Response) return e;
    return json7({ success: false, message: "Unauthorized" }, 401);
  }
  if (request.method === "GET") {
    const rows = await env.DB.prepare(
      "SELECT k, v FROM kvstore WHERE k LIKE ?"
    ).bind("panel.%").all();
    const rows2 = await env.DB.prepare(
      "SELECT k, v FROM kvstore WHERE k LIKE ?"
    ).bind("financial.%").all();
    const rows3 = await env.DB.prepare(
      "SELECT k, v FROM kvstore WHERE k LIKE ?"
    ).bind("integrations.%").all();
    const rows4 = await env.DB.prepare(
      "SELECT k, v FROM kvstore WHERE k LIKE ?"
    ).bind("disguise.%").all();
    const rows5 = await env.DB.prepare(
      "SELECT k, v FROM kvstore WHERE k LIKE ?"
    ).bind("ech.%").all();
    const rows6 = await env.DB.prepare(
      "SELECT k, v FROM kvstore WHERE k LIKE ?"
    ).bind("tls_fragment.%").all();
    const rows7 = await env.DB.prepare(
      "SELECT k, v FROM kvstore WHERE k LIKE ?"
    ).bind("tg.%").all();
    const all = [...rows.results, ...rows2.results, ...rows3.results, ...rows4.results, ...rows5.results, ...rows6.results, ...rows7.results];
    const settings = {};
    for (const row of all) {
      settings[row.k] = row.v;
    }
    return json7({ success: true, data: settings });
  }
  if (request.method === "PUT" || request.method === "PATCH") {
    const body = await request.json();
    for (const [k, v] of Object.entries(body)) {
      await env.DB.prepare(
        "INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)"
      ).bind(k, String(v), Date.now()).run();
    }
    return json7({ success: true });
  }
  return json7({ success: false, message: "Method not allowed" }, 405);
}

// --- Clean IP API ---
async function handleCleanIP(request, env, _ctx, params) {
  const action = params.action;
  if (action === "scan" && request.method === "GET") {
    const url = new URL(request.url);
    const count = Math.min(parseInt(url.searchParams.get("count") || "16"), 32);
    const port = parseInt(url.searchParams.get("port") || "-1");
    const ips = await generateRandomIPs(request, count, port);
    const ispInfo = getISPInfo(request);
    return jsonResponse({ success: true, data: { ips, isp: ispInfo } });
  }
  if (action === "apply" && request.method === "POST") {
    try { await requireAdmin(request, env.DB); } catch (e) { if (e instanceof Response) return e; return jsonResponse({ success: false, message: "Unauthorized" }, 401); }
    try {
      const body = await request.json();
      const ips = body.ips || [];
      const validIPs = ips.filter(ip => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d{1,5})?$/.test(String(ip).trim()));
      if (!validIPs.length) return jsonResponse({ success: false, message: "Invalid IP format" }, 400);
      await setCleanIPs(env.DB, validIPs);
      const carrier = detectIranianISP(request);
      await env.DB.prepare("INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)").bind("cleanip.carrier", carrier, Date.now()).run();
      return jsonResponse({ success: true, data: { count: validIPs.length, carrier } });
    } catch { return jsonResponse({ success: false, message: "Invalid request" }, 400); }
  }
  if (action === "list" && request.method === "GET") {
    try { await requireAdmin(request, env.DB); } catch (e) { if (e instanceof Response) return e; return jsonResponse({ success: false, message: "Unauthorized" }, 401); }
    try {
      const row = await env.DB.prepare("SELECT v, updated FROM kvstore WHERE k = ?").bind("cleanip.ips").first();
      const carrierRow = await env.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("cleanip.carrier").first();
      return jsonResponse({ success: true, data: { ips: row ? row.v.split("\n").map(s => s.trim()).filter(Boolean) : [], carrier: carrierRow?.v || "unknown", updatedAt: row?.updated || 0 } });
    } catch { return jsonResponse({ success: true, data: { ips: [], carrier: "unknown", updatedAt: 0 } }); }
  }
  if (!action || action === "") {
    if (request.method === "GET") {
      const ispInfo = getISPInfo(request);
      const ips = await getCleanIPs(env.DB);
      return jsonResponse({ success: true, data: { isp: ispInfo, activeIPs: ips.length } });
    }
  }
  return jsonResponse({ success: false, message: "Not found" }, 404);
}

// --- Telegram Bot ---
async function tgApi(botToken, method, payload) {
  try { const r = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); return r.ok ? await r.json() : null; } catch (e) { console.error("[TG]", method, e); return null; }
}
async function sendBotMessage(botToken, chatId, text, replyMarkup) {
  await tgApi(botToken, "sendMessage", { chat_id: chatId, parse_mode: "HTML", text, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) });
}
function tgMainKeyboard(panelUrl, subUrl) {
  return { inline_keyboard: [[{ text: "📊 وضعیت", callback_data: "m:status" }, { text: "🔗 اشتراک", callback_data: "m:sub" }], [{ text: "⚙️ کانفیگ", callback_data: "m:config" }, { text: "👥 کاربران", callback_data: "m:users" }], [{ text: "🖥 پنل", web_app: { url: panelUrl } }, { text: "🔄 منو", callback_data: "m:menu" }]] };
}
function tgWelcomeText() { return `<b>🛰 به ربات XrayMOD خوش آمدید</b>\n\n<blockquote>مدیریت پنل از تلگرام:\nدریافت لینک اشتراک، وضعیت و تنظیمات</blockquote>\n\nاز دکمه‌های زیر استفاده کنید 👇`; }
function tgStatusText(host, userCount) {
  const uptime = Date.now() - ((globalThis.__workerStart || Date.now()));
  return `<b>╔═══❰📊 وضعیت ❱═══╗</b>\n\n<blockquote>⏱ <b>آپتایم:</b> <code>${Math.floor(uptime / 3600000)}h ${Math.floor((uptime % 3600000) / 60000)}m</code>\n🌐 <b>Host:</b> <code>${host}</code>\n👥 <b>کاربران:</b> <code>${userCount}</code></blockquote>\n\n<b>╚══════════════════╝</b>`;
}
function tgConfigText(cfg) { return `<b>⚙️ تنظیمات</b>\n\n<blockquote>پروتکل: <code>${cfg.protocol || "vless"}</code>\nTransport: <code>${cfg.transport || "ws"}</code>\nECH: ${cfg.ech ? "🟢" : "🔴"}\nTLS Fragment: ${cfg.tlsFrag ? "🟢" : "🔴"}</blockquote>`; }
function tgUsersText(users) { if (!users.length) return "هیچ کاربری یافت نشد."; return `<b>👥 کاربران</b>\n\n` + users.slice(0, 10).map((u, i) => `${i + 1}. <code>${u.username}</code> — ${u.status === "active" ? "🟢" : "🔴"}`).join("\n"); }

async function handleTelegramWebhook(request, env, _ctx) {
  try {
    const tgTokenRow = await env.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("tg.bot_token").first();
    const tgChatRow = await env.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("tg.chat_id").first();
    if (!tgTokenRow?.v) return new Response("Bot not configured", { status: 200 });
    const botToken = tgTokenRow.v;
    const allowedChatId = tgChatRow?.v || "";
    const update = await request.json();
    const url = new URL(request.url);
    const host = url.host;
    const protocol = url.protocol;

    if (update.callback_query) {
      const cq = update.callback_query;
      const cbChat = String(cq.message?.chat?.id || "").trim();
      if (allowedChatId && cbChat !== allowedChatId) return new Response("Unauthorized", { status: 200 });
      await tgApi(botToken, "answerCallbackQuery", { callback_query_id: cq.id });
      const data = cq.data || "";
      let sendText = null, showKb = false;
      const userRow = await env.DB.prepare("SELECT uuid FROM users WHERE role = ?").bind("admin").first();
      const subUrl = `${protocol}//${host}/sub/${userRow?.uuid || ""}`;
      const panelUrl = `${protocol}//${host}`;
      const kb = tgMainKeyboard(panelUrl, subUrl);

      if (data === "m:status") {
        const users = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first();
        sendText = tgStatusText(host, users?.count || 0);
      } else if (data === "m:config") {
        const echRow = await env.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("ech.enabled").first();
        const fragRow = await env.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("tls_fragment.enabled").first();
        sendText = tgConfigText({ protocol: "vless", transport: "ws", ech: echRow?.v === "true", tlsFrag: fragRow?.v === "true" });
      } else if (data === "m:sub") {
        sendText = `<b>🔗 لینک اشتراک:</b>\n<code>${subUrl}</code>`;
      } else if (data === "m:users") {
        const users = await env.DB.prepare("SELECT username, status FROM users LIMIT 10").all();
        sendText = tgUsersText(users.results);
      } else if (data === "m:menu") {
        sendText = tgWelcomeText(); showKb = true;
      }
      if (sendText) await sendBotMessage(botToken, cbChat, sendText, showKb ? kb : undefined);
      return new Response("OK", { status: 200 });
    }

    if (!update.message?.text) return new Response("OK", { status: 200 });
    const chatId = String(update.message.chat.id).trim();
    if (allowedChatId && chatId !== allowedChatId) return new Response("Unauthorized", { status: 200 });
    const text = update.message.text.trim();
    const cmd = text.split(" ")[0].toLowerCase();
    const userRow = await env.DB.prepare("SELECT uuid FROM users WHERE role = ?").bind("admin").first();
    const subUrl = `${protocol}//${host}/sub/${userRow?.uuid || ""}`;
    const panelUrl = `${protocol}//${host}`;
    const kb = tgMainKeyboard(panelUrl, subUrl);

    switch (cmd) {
      case "/start": case "/menu": await sendBotMessage(botToken, chatId, tgWelcomeText(), kb); break;
      case "/sub": await sendBotMessage(botToken, chatId, `<b>🔗 لینک اشتراک:</b>\n<code>${subUrl}</code>`, kb); break;
      case "/status": { const u = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first(); await sendBotMessage(botToken, chatId, tgStatusText(host, u?.count || 0), kb); break; }
      case "/config": { const ech = await env.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("ech.enabled").first(); const f = await env.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("tls_fragment.enabled").first(); await sendBotMessage(botToken, chatId, tgConfigText({ protocol: "vless", transport: "ws", ech: ech?.v === "true", tlsFrag: f?.v === "true" }), kb); break; }
      case "/users": { const u = await env.DB.prepare("SELECT username, status FROM users LIMIT 10").all(); await sendBotMessage(botToken, chatId, tgUsersText(u.results), kb); break; }
      case "/help": await sendBotMessage(botToken, chatId, "<b>📋 راهنما</b>\n\n<code>/start</code> منوی اصلی\n<code>/sub</code> لینک اشتراک\n<code>/status</code> وضعیت\n<code>/config</code> تنظیمات\n<code>/users</code> کاربران", kb); break;
      default: await sendBotMessage(botToken, chatId, "دستور ناشناخته. از /help استفاده کنید.", kb);
    }
    return new Response("OK", { status: 200 });
  } catch (e) { console.error("[TG] Webhook error:", e); return new Response("OK", { status: 200 }); }
}

async function handleTelegramLogin(request, env, _ctx) {
  const url = new URL(request.url);
  const chatId = url.searchParams.get("chat_id") || "";
  const token = url.searchParams.get("token") || "";
  if (!chatId || !token) return new Response("Invalid login link", { status: 400 });
  const adminRow = await env.DB.prepare("SELECT id, role FROM users WHERE role = ?").bind("admin").first();
  if (!adminRow) return new Response("Admin not found", { status: 500 });
  const sessionToken = crypto.randomUUID();
  await env.DB.prepare("INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)").bind(`session:${sessionToken}`, JSON.stringify({ userId: adminRow.id, role: adminRow.role, created: Date.now() }), Date.now()).run();
  return new Response(null, { status: 302, headers: { Location: "/", "Set-Cookie": `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800` } });
}

// --- Backends API ---
async function handleBackends(request, env, _ctx, params) {
  try { await requireAdmin(request, env.DB); } catch (e) { if (e instanceof Response) return e; return jsonResponse({ success: false, message: "Unauthorized" }, 401); }
  if (request.method === "GET") {
    const rows = await env.DB.prepare("SELECT * FROM backends ORDER BY created_at DESC").all();
    return jsonResponse({ success: true, data: rows.results });
  }
  if (request.method === "POST") {
    const body = await request.json();
    if (!body.vps_ip || !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(body.vps_ip)) return jsonResponse({ success: false, message: "Invalid IP" }, 400);
    const adminRow = await env.DB.prepare("SELECT id FROM users WHERE role = ?").bind("admin").first();
    const userRow = await env.DB.prepare("SELECT uuid FROM users WHERE id = ?").bind(adminRow?.id || 1).first();
    await env.DB.prepare("INSERT INTO backends (user_id, vps_ip, vps_port, vps_uuid, status, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(adminRow?.id || 1, body.vps_ip, body.vps_port || 443, userRow?.uuid || "", "active", Date.now()).run();
    return jsonResponse({ success: true });
  }
  if (request.method === "DELETE" && params.id) {
    await env.DB.prepare("DELETE FROM backends WHERE id = ?").bind(Number(params.id)).run();
    return jsonResponse({ success: true });
  }
  return jsonResponse({ success: false, message: "Not allowed" }, 405);
}

// worker/subscription.ts
function json8(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
function text(content, status = 200) {
  return new Response(content, {
    status,
    headers: { "Content-Type": "text/plain" }
  });
}
async function handleSubscription(request, env, _ctx, params) {
  const token = params.token;
  if (!token) return text("Invalid subscription link", 400);
  const user = await env.DB.prepare("SELECT id, username, uuid, traffic_limit, traffic_used, expiry_date, status FROM users WHERE uuid = ?").bind(token).first();
  if (!user) return text("Invalid subscription", 404);
  if (user.status !== "active") return text("Account is not active", 403);
  if (user.expiry_date && new Date(user.expiry_date) < new Date()) return text("Subscription expired", 403);
  const configs = await env.DB.prepare(`SELECT c.*, p.id as proto_id, p.name as proto_name, p.schema_json, p.template_json FROM configs c LEFT JOIN protocols p ON c.protocol_id = p.id WHERE c.user_id = ?`).bind(user.id).all();
  if (configs.results.length === 0) return text("No configurations available");

  // Get ECH and TLS fragment settings
  const echRow = await env.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("ech.enabled").first();
  const echSniRow = await env.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("ech.sni").first();
  const echDnsRow = await env.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("ech.dns").first();
  const tlsFragRow = await env.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("tls_fragment.enabled").first();
  const tlsFragModeRow = await env.DB.prepare("SELECT v FROM kvstore WHERE k = ?").bind("tls_fragment.mode").first();
  const echEnabled = echRow?.v === "true";
  const echSni = echSniRow?.v || "cloudflare-ech.com";
  const echDns = echDnsRow?.v || "https://dns.alidns.com/dns-query";
  const tlsFragEnabled = tlsFragRow?.v === "true";
  const tlsFragMode = tlsFragModeRow?.v || "Shadowrocket";
  const echParam = echEnabled ? `&ech=${encodeURIComponent((echSni ? echSni + "+" : "") + echDns)}` : "";
  const tlsFragParam = tlsFragEnabled ? (tlsFragMode === "Shadowrocket" ? `&fragment=${encodeURIComponent("1,40-60,30-50,tlshello")}` : `&fragment=${encodeURIComponent("3,1,tlshello")}`) : "";

  // Get clean IPs for server address
  const cleanIPs = await getCleanIPs(env.DB);
  const subUrl = new URL(request.url);
  let host = subUrl.host;
  // Check if user has a backend VPS
  const backendRow = await env.DB.prepare("SELECT vps_ip, vps_port FROM backends WHERE user_id = ? AND status = ?").bind(user.id, "active").first();
  if (backendRow) {
    host = backendRow.vps_port === 443 ? backendRow.vps_ip : `${backendRow.vps_ip}:${backendRow.vps_port}`;
  } else if (cleanIPs.length > 0) {
    host = cleanIPs[0].split(":")[0];
  }

  const accept = request.headers.get("Accept") || "";
  const format = subUrl.searchParams.get("format") || "base64";
  const links = [];
  for (const config of configs.results) {
    const settings = JSON.parse(config.settings_json || "{}");
    const port = config.port || 443;
    let uri = "";
    switch (config.proto_id) {
      case "vless-reality":
      case "vless-ws":
      case "vless-wss":
        uri = `vless://${user.uuid}@${host}:${port}?encryption=none&security=${settings.security || "tls"}&type=${settings.network || "tcp"}&flow=${settings.flow || ""}${echParam}${tlsFragParam}#${encodeURIComponent(config.name)}`;
        break;
      case "vless-grpc":
        uri = `vless://${user.uuid}@${host}:${port}?encryption=none&security=tls&type=grpc&mode=${settings.mode || "gun"}&serviceName=${settings.serviceName || "grpc"}&sni=${settings.sni || host}${echParam}${tlsFragParam}#${encodeURIComponent(config.name)}`;
        break;
      case "vmess-ws":
      case "vmess-wss":
        uri = `vmess://${btoa(JSON.stringify({ v: "2", ps: config.name, add: host, port, id: user.uuid, aid: 0, scy: "auto", net: settings.network || "ws", type: "none", host, path: settings.path || "/", tls: settings.security === "tls" ? "tls" : "" }))}`;
        break;
      case "trojan-ws":
      case "trojan-wss":
        uri = `trojan://${settings.password || "password"}@${host}:${port}?type=${settings.network || "ws"}&host=${host}&path=${settings.path || "/"}&security=tls&sni=${settings.sni || host}${echParam}${tlsFragParam}#${encodeURIComponent(config.name)}`;
        break;
      case "ss-ws":
      case "ss-wss":
        uri = `ss://${btoa(`${settings.method || "chacha20-ietf-poly1305"}:${settings.password || "password"}`)}@${host}:${port}?type=${settings.network || "ws"}&path=${settings.path || "/"}#${encodeURIComponent(config.name)}`;
        break;
      default:
        uri = `${config.proto_id}://${btoa(config.template_json)}@${host}:${port}#${encodeURIComponent(config.name)}`;
    }
    links.push(uri);
  }
  if (format === "clash" || accept.includes("text/yaml")) return generateClashConfig(links, configs.results, user, echEnabled, echSni);
  if (format === "singbox" || accept.includes("application/json")) return generateSingboxConfig(links, configs.results, user, echEnabled, echSni);
  return text(btoa(links.join("\n")));
}
function generateClashConfig(links, configs, user, echEnabled = false, echSni = "cloudflare-ech.com") {
  const proxies = [];
  const proxyNames = [];
  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    const settings = JSON.parse(config.settings_json || "{}");
    const name = config.name || `Config ${i + 1}`;
    proxyNames.push(name);
    const proxy = { name, type: getClashProxyType(config.proto_id), server: settings.host || settings.sni || "example.com", port: config.port || 443, uuid: user.uuid };
    if (config.proto_id.includes("vless")) {
      proxy.flow = settings.flow || "";
      proxy.tls = settings.security === "tls" || settings.security === "reality";
      if (settings.sni) proxy.sni = settings.sni;
      if (config.proto_id === "vless-grpc") {
        proxy.network = "grpc";
        proxy["grpc-opts"] = { "grpc-service-name": settings.serviceName || "grpc" };
      }
      if (echEnabled) proxy["ech-opts"] = { enable: true, "query-server-name": echSni };
    }
    if (config.proto_id.includes("vmess")) {
      proxy.network = settings.network || "ws";
      if (settings.path) proxy["ws-opts"] = { path: settings.path };
      proxy.tls = settings.security === "tls";
    }
    if (config.proto_id.includes("trojan")) {
      proxy.password = settings.password || "password";
      proxy.network = settings.network || "ws";
      proxy.tls = true;
    }
    if (config.proto_id.includes("ss")) {
      proxy.cipher = settings.method || "chacha20-ietf-poly1305";
      proxy.password = settings.password || "password";
    }
    proxies.push(proxy);
  }
  const clashConfig = { "mixed-port": 7890, "allow-lan": false, "mode": "rule", "proxies": proxies, "proxy-groups": [{ "name": "Proxy", "type": "select", "proxies": [...proxyNames, "DIRECT"] }], "rules": ["MATCH,Proxy"] };
  return new Response(`proxies:\n${JSON.stringify(clashConfig, null, 2).split("\n").map((l) => "  " + l).join("\n")}`, { headers: { "Content-Type": "text/yaml; charset=utf-8" } });
}
function generateSingboxConfig(links, configs, user, echEnabled = false, echSni = "cloudflare-ech.com") {
  const outbounds = [];
  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    const settings = JSON.parse(config.settings_json || "{}");
    const name = config.name || `Config ${i + 1}`;
    const outbound = { type: getSingboxOutboundType(config.proto_id), tag: name, server: settings.host || settings.sni || "example.com", server_port: config.port || 443, uuid: user.uuid };
    if (config.proto_id.includes("vless")) {
      outbound.flow = settings.flow || "";
      if (settings.security === "tls") {
        outbound.tls = { enabled: true, server_name: settings.sni || settings.host };
        if (echEnabled) outbound.tls.ech = { enabled: true, query_server_name: echSni };
      }
      if (config.proto_id === "vless-grpc") {
        outbound.transport = { type: "grpc", serviceName: settings.serviceName || "grpc" };
      }
    }
    if (config.proto_id.includes("vmess")) {
      outbound.transport = { type: settings.network || "ws", path: settings.path || "/" };
    }
    outbounds.push(outbound);
  }
  const singboxConfig = { outbounds, inbounds: [{ type: "mixed", listen: "127.0.0.1", listen_port: 2080 }] };
  return json8(singboxConfig);
}
function getClashProxyType(protoId) {
  if (protoId.includes("vless")) return "vless";
  if (protoId.includes("vmess")) return "vmess";
  if (protoId.includes("trojan")) return "trojan";
  if (protoId.includes("ss")) return "ss";
  return "ss";
}
function getSingboxOutboundType(protoId) {
  if (protoId.includes("vless")) return "vless";
  if (protoId.includes("vmess")) return "vmess";
  if (protoId.includes("trojan")) return "trojan";
  if (protoId.includes("ss")) return "shadowsocks";
  return "shadowsocks";
}

// worker/proxy/vless.ts
function parseVlessHeader(buffer) {
  const view = new Uint8Array(buffer);
  if (view.length < 22) return null;
  const version = view[0];
  if (version !== 0) return null;
  const uuidBytes = view.slice(1, 17);
  const uuid = formatUuid(uuidBytes);
  const command = view[18];
  const port = view[19] << 8 | view[20];
  const atype = view[21];
  let address = "";
  let offset = 22;
  switch (atype) {
    case 1:
      if (view.length < offset + 4) return null;
      address = `${view[offset]}.${view[offset + 1]}.${view[offset + 2]}.${view[offset + 3]}`;
      offset += 4;
      break;
    case 2:
      if (view.length < offset + 1) return null;
      const domainLen = view[offset];
      offset += 1;
      if (view.length < offset + domainLen) return null;
      address = new TextDecoder().decode(view.slice(offset, offset + domainLen));
      offset += domainLen;
      break;
    case 3:
      if (view.length < offset + 16) return null;
      const ipv6Parts = [];
      for (let i = 0; i < 8; i++) {
        ipv6Parts.push(
          (view[offset + i * 2] << 8 | view[offset + i * 2 + 1]).toString(16)
        );
      }
      address = ipv6Parts.join(":");
      offset += 16;
      break;
    default:
      return null;
  }
  return { uuid, command, address, port };
}
function formatUuid(bytes) {
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join("-");
}
function buildVlessResponse() {
  return new Uint8Array([0, 0, 1, 0, 0, 0]);
}

// worker/proxy/trojan.ts
function parseTrojanHeader(buffer) {
  const view = new Uint8Array(buffer);
  if (view.length < 62) return null;
  if (view[0] !== 13 || view[1] !== 10) return null;
  const passwordHex = new TextDecoder().decode(view.slice(2, 58));
  if (view[58] !== 13 || view[59] !== 10) return null;
  const command = view[60];
  const atype = view[61];
  let address = "";
  let offset = 62;
  switch (atype) {
    case 1:
      if (view.length < offset + 4) return null;
      address = `${view[offset]}.${view[offset + 1]}.${view[offset + 2]}.${view[offset + 3]}`;
      offset += 4;
      break;
    case 2:
      if (view.length < offset + 1) return null;
      const domainLen = view[offset];
      offset += 1;
      if (view.length < offset + domainLen) return null;
      address = new TextDecoder().decode(view.slice(offset, offset + domainLen));
      offset += domainLen;
      break;
    case 3:
      if (view.length < offset + 16) return null;
      const ipv6Parts = [];
      for (let i = 0; i < 8; i++) {
        ipv6Parts.push(
          (view[offset + i * 2] << 8 | view[offset + i * 2 + 1]).toString(16)
        );
      }
      address = ipv6Parts.join(":");
      offset += 16;
      break;
    default:
      return null;
  }
  if (view.length < offset + 2) return null;
  const port = view[offset] << 8 | view[offset + 1];
  return { password: passwordHex, command, address, port };
}
function buildTrojanResponse() {
  return new Uint8Array([0, 0, 0, 0, 1, 0, 0]);
}

// worker/proxy/index.ts
async function handleProxyTraffic(request, env, _ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const config = await env.DB.prepare(
    "SELECT c.*, p.id as proto_id, p.template_json FROM configs c LEFT JOIN protocols p ON c.protocol_id = p.id WHERE c.path = ?"
  ).bind(path).first();
  if (!config) {
    return new Response("Not found", { status: 404 });
  }
  const user = await env.DB.prepare(
    "SELECT id, uuid, traffic_limit, traffic_used, status, expiry_date FROM users WHERE id = ?"
  ).bind(config.user_id).first();
  if (!user || user.status !== "active") {
    return new Response("Forbidden", { status: 403 });
  }
  if (user.traffic_limit > 0 && user.traffic_used >= user.traffic_limit) {
    return new Response("Quota exceeded", { status: 403 });
  }
  if (user.expiry_date && new Date(user.expiry_date) < /* @__PURE__ */ new Date()) {
    return new Response("Subscription expired", { status: 403 });
  }
  const upgradeHeader = request.headers.get("Upgrade");
  if (upgradeHeader !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }
  const [clientWs, serverWs] = Object.values(new WebSocketPair());
  const protocol = config.protocol_id;
  serverWs.accept();
  handleWebSocketConnection(
    serverWs,
    protocol,
    config,
    user,
    env.DB
  ).catch((err) => {
    console.error("WebSocket error:", err);
    try {
      serverWs.close(1011, "Internal error");
    } catch {
    }
  });
  return new Response(null, {
    status: 101,
    webSocket: clientWs
  });
}
async function handleWebSocketConnection(ws, protocol, config, user, db) {
  let totalUpload = 0;
  let totalDownload = 0;
  const firstMessage = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timeout")), 1e4);
    ws.addEventListener(
      "message",
      (event) => {
        clearTimeout(timeout);
        if (event.data instanceof ArrayBuffer) {
          resolve(event.data);
        } else if (event.data instanceof Blob) {
          event.data.arrayBuffer().then(resolve);
        } else {
          resolve(new TextEncoder().encode(String(event.data)).buffer);
        }
      },
      { once: true }
    );
    ws.addEventListener("close", () => {
      clearTimeout(timeout);
      reject(new Error("Closed"));
    });
  });
  totalUpload += firstMessage.byteLength;
  let targetHost = "";
  let targetPort = 0;
  if (protocol === "vless-reality" || protocol === "vless-ws") {
    const parsed = parseVlessHeader(firstMessage);
    if (!parsed) {
      ws.close(1008, "Invalid VLESS header");
      return;
    }
    targetHost = parsed.address;
    targetPort = parsed.port;
    ws.send(buildVlessResponse());
  } else if (protocol === "trojan-ws") {
    const parsed = parseTrojanHeader(firstMessage);
    if (!parsed) {
      ws.close(1008, "Invalid Trojan header");
      return;
    }
    targetHost = parsed.address;
    targetPort = parsed.port;
    ws.send(buildTrojanResponse());
  } else {
    const settings = JSON.parse(config.settings_json || "{}");
    targetHost = settings.host || settings.sni || "example.com";
    targetPort = settings.port || 443;
  }
  try {
    const targetUrl = `wss://${targetHost}:${targetPort}`;
    const targetWs = new WebSocket(targetUrl);
    await new Promise((resolve, reject) => {
      targetWs.addEventListener("open", () => resolve(), { once: true });
      targetWs.addEventListener("error", (e) => reject(e), { once: true });
      setTimeout(() => reject(new Error("Target connection timeout")), 1e4);
    });
    ws.addEventListener("message", async (event) => {
      const data = event.data instanceof ArrayBuffer ? event.data : event.data instanceof Blob ? await event.data.arrayBuffer() : new TextEncoder().encode(String(event.data)).buffer;
      totalUpload += data.byteLength;
      targetWs.send(data);
    });
    targetWs.addEventListener("message", async (event) => {
      const data = event.data instanceof ArrayBuffer ? event.data : event.data instanceof Blob ? await event.data.arrayBuffer() : new TextEncoder().encode(String(event.data)).buffer;
      totalDownload += data.byteLength;
      ws.send(data);
    });
    ws.addEventListener("close", () => {
      targetWs.close();
    });
    targetWs.addEventListener("close", () => {
      ws.close();
    });
  } catch (err) {
    console.log(`Target ${targetHost}:${targetPort} not reachable, keeping proxy alive`);
  }
  ws.addEventListener("close", async () => {
    try {
      await db.prepare(
        "UPDATE users SET traffic_used = traffic_used + ? WHERE id = ?"
      ).bind(totalUpload + totalDownload, user.id).run();
    } catch (err) {
      console.error("Failed to update traffic:", err);
    }
  });
}

// worker/router.ts
var routes = [
  { pattern: new URLPattern({ pathname: "/install" }), handler: handleInstall },
  { pattern: new URLPattern({ pathname: "/api/login" }), handler: handleLogin },
  { pattern: new URLPattern({ pathname: "/api/logout" }), handler: handleLogout },
  { pattern: new URLPattern({ pathname: "/api/health" }), handler: handleHealth },
  { pattern: new URLPattern({ pathname: "/api/nodes" }), handler: handleNodes },
  { pattern: new URLPattern({ pathname: "/api/nodes/:id" }), handler: handleNodes },
  { pattern: new URLPattern({ pathname: "/api/users" }), handler: handleUsers },
  { pattern: new URLPattern({ pathname: "/api/users/:id" }), handler: handleUsers },
  { pattern: new URLPattern({ pathname: "/api/protocols" }), handler: handleProtocols },
  { pattern: new URLPattern({ pathname: "/api/configs" }), handler: handleConfigs },
  { pattern: new URLPattern({ pathname: "/api/configs/:id" }), handler: handleConfigs },
  { pattern: new URLPattern({ pathname: "/api/settings" }), handler: handleSettings },
  { pattern: new URLPattern({ pathname: "/api/cleanip" }), handler: handleCleanIP },
  { pattern: new URLPattern({ pathname: "/api/cleanip/:action" }), handler: handleCleanIP },
  { pattern: new URLPattern({ pathname: "/api/backends" }), handler: handleBackends },
  { pattern: new URLPattern({ pathname: "/api/backends/:id" }), handler: handleBackends },
  { pattern: new URLPattern({ pathname: "/bot" }), handler: handleTelegramWebhook },
  { pattern: new URLPattern({ pathname: "/admin" }), handler: handleTelegramLogin },
  { pattern: new URLPattern({ pathname: "/sub/:token" }), handler: handleSubscription }
];
var FALLBACK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XrayMOD</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,sans-serif;background:#09090b;color:#fafafa;display:grid;place-items:center;min-height:100vh}
    .box{text-align:center;padding:2rem;max-width:440px}
    .icon{width:48px;height:48px;background:#10b981;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1.5rem;color:#000;margin:0 auto 1.5rem}
    h1{font-size:1.5rem;margin-bottom:.5rem}
    p{color:#a1a1aa;font-size:.875rem;line-height:1.6}
    .links{margin-top:1.5rem;display:flex;flex-direction:column;gap:.5rem}
    .links a{color:#10b981;text-decoration:none;font-size:.875rem}
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">X</div>
    <h1>XrayMOD</h1>
    <p>Panel is deployed. The frontend will be served from GitHub.</p>
    <div class="links">
      <a href="/install">Setup (first time)</a>
      <a href="/api/health">API Health</a>
      <a href="https://github.com/EvolveBeyond/XRayMOD">GitHub</a>
    </div>
  </div>
</body>
</html>`;
// --- Utility Functions ---
function detectIranianISP(request) {
  const cf = (request && request.cf) || {};
  const org = String(cf.asOrganization || "").toLowerCase();
  const asn = Number(cf.asn || 0);
  const country = String(cf.country || "").toUpperCase();
  if (country !== "IR") return "all";
  if (asn === 44244 || org.includes("irancell") || org.includes("mtn")) return "mtn";
  if (asn === 197207 || org.includes("mcci") || org.includes("hamrah")) return "mci";
  if (asn === 57218 || org.includes("rightel")) return "rightel";
  if (asn === 31549 || org.includes("shatel")) return "shatel";
  return "ir";
}
function getISPInfo(request) {
  const cf = (request && request.cf) || {};
  return { asn: cf.asn || 0, isp: cf.asOrganization || "", country: cf.country || "", carrier: detectIranianISP(request) };
}
const _cidrListCache = new Map();
const CF_PORTS = [443, 2053, 2083, 2087, 2096, 8443];
function ipToInt(ip) { const p = ip.split(".").map(Number); return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3]; }
function intToIp(n) { return [(n >>> 24) & 0xFF, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF].join("."); }
function randomIPFromCIDR(cidr) {
  const [base, prefixStr] = cidr.split("/");
  const hostBits = 32 - parseInt(prefixStr);
  const ipInt = ipToInt(base);
  const mask = (0xFFFFFFFF << hostBits) >>> 0;
  return intToIp(((ipInt & mask) >>> 0) + Math.floor(Math.random() * Math.pow(2, hostBits)));
}
async function fetchCIDRList(carrier) {
  const now = Date.now();
  const cached = _cidrListCache.get(carrier);
  if (cached && now - cached.at < 3600000) return cached.list;
  try {
    const r = await fetch("https://raw.githubusercontent.com/Leon406/SubCrawler/master/sub/cf/cloudflare_v4.txt", { headers: { "User-Agent": "XRayMOD" }, cf: { cacheTtl: 1800, cacheEverything: true } });
    const text = r.ok ? await r.text() : "104.16.0.0/13";
    const list = text.split(/[\r\n,;]+/).map(s => s.trim()).filter(s => s && /^\d+\.\d+\.\d+\.\d+\/\d+$/.test(s));
    _cidrListCache.set(carrier, { at: now, list: list.length ? list : ["104.16.0.0/13"] });
    return _cidrListCache.get(carrier).list;
  } catch { return ["104.16.0.0/13"]; }
}
async function generateRandomIPs(request, count = 16, port = -1) {
  const carrier = detectIranianISP(request);
  const cidrList = await fetchCIDRList(carrier);
  return Array.from({ length: count }, () => {
    const ip = randomIPFromCIDR(cidrList[Math.floor(Math.random() * cidrList.length)]);
    const targetPort = port === -1 ? CF_PORTS[Math.floor(Math.random() * CF_PORTS.length)] : port;
    return `${ip}:${targetPort}`;
  });
}
async function getCleanIPs(db) {
  try { const row = await db.prepare("SELECT v FROM kvstore WHERE k = ?").bind("cleanip.ips").first(); return row && row.v ? row.v.split("\n").map(s => s.trim()).filter(Boolean) : []; } catch { return []; }
}
async function setCleanIPs(db, ips) {
  const unique = [...new Set(ips)].slice(0, 30);
  await db.prepare("INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)").bind("cleanip.ips", unique.join("\n"), Date.now()).run();
}
function isGrpcRequest(request) { return (request.headers.get("Content-Type") || "").startsWith("application/grpc"); }
function isXHTTPRequest(request) {
  const referer = request.headers.get("Referer") || "";
  if (referer.includes("x_padding")) return true;
  const contentType = request.headers.get("Content-Type") || "";
  if (contentType.includes("application/octet-stream") && request.method === "POST") return true;
  return false;
}

function errorPage(msg) {
  return new Response(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>XrayMOD Error</title>
<style>body{font-family:system-ui;background:#09090b;color:#fafafa;display:grid;place-items:center;min-height:100vh;margin:0}
.box{text-align:center;padding:2rem;max-width:400px}
h1{color:#ef4444;font-size:1.2rem;margin-bottom:.5rem}
p{color:#a1a1aa;font-size:.875rem}</style></head>
<body><div class="box"><h1>Error</h1><p>${msg}</p></div></body></html>`, {
    status: 500,
    headers: { "Content-Type": "text/html" }
  });
}

// --- Disguise System (Error 1101 bypass) ---
var EMPTY_DISGUISE = { on: false, adminPath: "", loginPath: "", subPath: "", pubAdmin: "/admin", pubLogin: "/login", fallbackPage: "1101" };
function cleanPath(v) {
  return String(v || "").trim().toLowerCase().replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9_-]/g, "").slice(0, 40);
}
async function getDisguiseConfig(env, db) {
  try {
    if (env.PANEL_RECOVERY === "1" || env.PANEL_RECOVERY === "true") return { ...EMPTY_DISGUISE };
    const rows = await db.prepare("SELECT k, v FROM kvstore WHERE k LIKE ?").bind("disguise.%").all();
    const settings = {};
    for (const row of rows.results) settings[row.k] = row.v;
    const enabled = settings["disguise.enabled"] === "true";
    const adminPath = cleanPath(env.ADMIN_PATH) || cleanPath(settings["disguise.admin_path"]);
    const loginPath = cleanPath(env.LOGIN_PATH) || cleanPath(settings["disguise.login_path"]);
    const subPath = cleanPath(env.SUB_PATH) || cleanPath(settings["disguise.sub_path"]);
    const on = (enabled || !!(env.ADMIN_PATH || env.LOGIN_PATH || env.SUB_PATH)) && !!(adminPath || loginPath || subPath);
    if (!on) return { ...EMPTY_DISGUISE, fallbackPage: settings["disguise.fallback_page"] || "1101" };
    return { on: true, adminPath, loginPath, subPath, pubAdmin: adminPath ? "/" + adminPath : "/admin", pubLogin: loginPath ? "/" + loginPath : "/login", fallbackPage: env.DISGUISE_PAGE || settings["disguise.fallback_page"] || "1101" };
  } catch (e) { return { ...EMPTY_DISGUISE }; }
}
function remapDisguisePath(pathname, config) {
  if (!config.on) return { remapped: pathname, isDecoy: false };
  const clean = pathname.toLowerCase().replace(/\/+$/, "");
  if (config.adminPath && clean === "/" + config.adminPath) return { remapped: "/admin", isDecoy: false };
  if (config.adminPath && clean.startsWith("/" + config.adminPath + "/")) return { remapped: "/admin" + clean.slice(config.adminPath.length + 1), isDecoy: false };
  if (config.loginPath && clean === "/" + config.loginPath) return { remapped: "/login", isDecoy: false };
  if (config.subPath && clean === "/" + config.subPath) return { remapped: "/sub", isDecoy: false };
  if (config.subPath && clean.startsWith("/" + config.subPath + "/")) return { remapped: "/sub" + clean.slice(config.subPath.length + 1), isDecoy: false };
  if (clean === "/admin" || clean === "/login") return { remapped: pathname, isDecoy: true };
  return { remapped: pathname, isDecoy: false };
}
function html1101(host) {
  const now = new Date();
  const ts = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0") + " " + String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0") + ":" + String(now.getSeconds()).padStart(2, "0");
  const rayId = Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b => b.toString(16).padStart(2, "0")).join("");
  return `<!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endif]-->
<!--[if IE 8]>    <html class="no-js ie8 oldie" lang="en-US"> <![endif]-->
<!--[if gt IE 8]><!--> <html class="no-js" lang="en-US"> <!--<![endif]-->
<head>
<title>Worker threw exception | ${host} | Cloudflare</title>
<meta charset="UTF-8" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta http-equiv="X-UA-Compatible" content="IE=Edge" />
<meta name="robots" content="noindex, nofollow" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link rel="stylesheet" id="cf_styles-css" href="/cdn-cgi/styles/cf.errors.css" />
<!--[if lt IE 9]><link rel="stylesheet" id='cf_styles-ie.css' href="/cdn-cgi/styles/cf.errors.ie.css" /><![endif]-->
<style>body{margin:0;padding:0}</style>
<!--[if gte IE 10]><!-->
<script>
  if (!navigator.cookieEnabled) {
    window.addEventListener('DOMContentLoaded', function () {
      var cookieEl = document.getElementById('cookie-alert');
      cookieEl.style.display = 'block';
    })
  }
</script>
<!--<![endif]-->
</head>
<body>
    <div id="cf-wrapper">
        <div class="cf-alert cf-alert-error cf-cookie-error" id="cookie-alert" data-translate="enable_cookies">Please enable cookies.</div>
        <div id="cf-error-details" class="cf-error-details-wrapper">
            <div class="cf-wrapper cf-header cf-error-overview">
                <h1>
                    <span class="cf-error-type" data-translate="error">Error</span>
                    <span class="cf-error-code">1101</span>
                    <small class="heading-ray-id">Ray ID: ${rayId} &bull; ${ts} UTC</small>
                </h1>
                <h2 class="cf-subheadline" data-translate="error_desc">Worker threw exception</h2>
            </div>
            <section></section>
            <div class="cf-section cf-wrapper">
                <div class="cf-columns two">
                    <div class="cf-column">
                        <h2 data-translate="what_happened">What happened?</h2>
                        <p>You've requested a page on a website (${host}) that is on the <a href="https://www.cloudflare.com/5xx-error-landing?utm_source=error_100x" target="_blank">Cloudflare</a> network. An unknown error occurred while rendering the page.</p>
                    </div>
                    <div class="cf-column">
                        <h2 data-translate="what_can_i_do">What can I do?</h2>
                        <p><strong>If you are the owner of this website:</strong><br />refer to <a href="https://developers.cloudflare.com/workers/observability/errors/" target="_blank">Workers - Errors and Exceptions</a> and check Workers Logs for ${host}.</p>
                    </div>
                </div>
            </div>
            <div class="cf-section cf-wrapper">
                <h2 data-translate="more_info">More information</h2>
                <p>If you are the owner of this website, you can check <a href="https://developers.cloudflare.com/workers/observability/errors/" target="_blank">Workers Logs</a> for ${host} to learn more about this error.</p>
            </div>
        </div>
    </div>
</body>
</html>`;
}
function nginxPage() {
  return `<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
  body { width: 35em; margin: 0 auto; font-family: Tahoma, Verdana, Arial, sans-serif; }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>
<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>
<p><em>Thank you for using nginx.</em></p>
</body>
</html>`;
}
function getDecoyResponse(host, pageType) {
  const html = pageType === "1101" ? html1101(host) : nginxPage();
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=UTF-8" } });
}

async function handleRequest(request, env, ctx) {
  try {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400"
        }
      });
    }
    const url = new URL(request.url);
    ctx.waitUntil(ensureSchema(env.DB));
    if (request.headers.get("Upgrade") === "websocket") {
      return handleProxyTraffic(request, env, ctx);
    }
    // gRPC/XHTTP transport — POST-based proxy traffic
    if (request.method === "POST" && !url.pathname.startsWith("/api/") && !url.pathname.startsWith("/install")) {
      if (isGrpcRequest(request)) return handleProxyTraffic(request, env, ctx);
      if (isXHTTPRequest(request)) return handleProxyTraffic(request, env, ctx);
    }
    let pathname = url.pathname;
    const disguise = await getDisguiseConfig(env, env.DB);
    if (disguise.on) {
      const { remapped, isDecoy } = remapDisguisePath(pathname, disguise);
      if (isDecoy) return getDecoyResponse(url.host, disguise.fallbackPage);
      if (remapped !== pathname) { pathname = remapped; url.pathname = pathname; }
    }
    const skipInstallCheck = pathname.startsWith("/install") || pathname.startsWith("/api/") || pathname.startsWith("/sub/");
    if (!skipInstallCheck) {
      try {
        const configured = await env.DB.prepare(
          "SELECT v FROM kvstore WHERE k = ?"
        ).bind("panel.password_hash").first();
        if (!configured || !configured.v) {
          return new Response(null, {
            status: 302,
            headers: { Location: "/install" }
          });
        }
      } catch (_e) {
      }
    }
    for (const route of routes) {
      const match = route.pattern.exec(url);
      if (match) {
        const params = {};
        const routeParams = match.pathname.groups;
        for (const [key, value] of Object.entries(routeParams)) {
          if (value) params[key] = value;
        }
        return route.handler(request, env, ctx, params);
      }
    }
    if (disguise.on && !url.pathname.startsWith("/api/") && !url.pathname.startsWith("/sub/") && !url.pathname.startsWith("/install")) {
      return getDecoyResponse(url.host, disguise.fallbackPage);
    }
    const pagesUrl = env.PAGES_URL;
    if (pagesUrl && !url.pathname.startsWith("/api/") && !url.pathname.startsWith("/sub/")) {
      const workerOrigin = new URL(request.url).origin;
      const apiScript = `<script>window.__API_BASE="${workerOrigin}";<\/script>`;
      const injectApiBase = (html) => {
        const modified = html.replace("<head>", `<head>${apiScript}`);
        return new Response(modified, {
          status: 200,
          headers: { "Content-Type": "text/html" }
        });
      };
      try {
        const assetPath = url.pathname === "/" ? "/index.html" : url.pathname;
        const remoteUrl = pagesUrl.replace(/\/$/, "") + assetPath;
        const remoteResponse = await fetch(remoteUrl);
        if (remoteResponse.status === 200) {
          const contentType = remoteResponse.headers.get("content-type") || "";
          const body = await remoteResponse.text();
          if (contentType.includes("text/html") || assetPath.endsWith(".html")) {
            return injectApiBase(body);
          }
          return new Response(body, {
            status: 200,
            headers: { "Content-Type": contentType }
          });
        }
      } catch (_e) {
      }
      try {
        const spaUrl = pagesUrl.replace(/\/$/, "") + "/index.html";
        const spaResponse = await fetch(spaUrl);
        if (spaResponse.status === 200) {
          const html = await spaResponse.text();
          return injectApiBase(html);
        }
      } catch (_e) {
      }
    }
    if (!url.pathname.startsWith("/api/") && !url.pathname.startsWith("/sub/")) {
      return new Response(FALLBACK_HTML, {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }
    return notFound();
  } catch (e) {
    return errorPage(e instanceof Error ? e.message : "Unknown error");
  }
}
function notFound() {
  return jsonResponse({ success: false, message: "Not found" }, 404);
}
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

// worker/index.ts
var index_default = {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  }
};
export {
  index_default as default
};
