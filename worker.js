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
  "integrations.external_server_url": ""
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
    const all = [...rows.results, ...rows2.results, ...rows3.results];
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
  if (!token) {
    return text("Invalid subscription link", 400);
  }
  const user = await env.DB.prepare(
    "SELECT id, username, uuid, traffic_limit, traffic_used, expiry_date, status FROM users WHERE uuid = ?"
  ).bind(token).first();
  if (!user) {
    return text("Invalid subscription", 404);
  }
  if (user.status !== "active") {
    return text("Account is not active", 403);
  }
  if (user.expiry_date && new Date(user.expiry_date) < /* @__PURE__ */ new Date()) {
    return text("Subscription expired", 403);
  }
  const configs = await env.DB.prepare(
    `SELECT c.*, p.id as proto_id, p.name as proto_name, p.schema_json, p.template_json
     FROM configs c
     LEFT JOIN protocols p ON c.protocol_id = p.id
     WHERE c.user_id = ?`
  ).bind(user.id).all();
  if (configs.results.length === 0) {
    return text("No configurations available");
  }
  const accept = request.headers.get("Accept") || "";
  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "base64";
  const links = [];
  for (const config of configs.results) {
    const settings = JSON.parse(config.settings_json || "{}");
    const template = config.template_json;
    let processedTemplate = template;
    const templateData = { ...settings, uuid: user.uuid };
    for (const [key, value] of Object.entries(templateData)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      processedTemplate = processedTemplate.replace(regex, String(value));
    }
    const port = config.port || 443;
    const host = settings.host || settings.sni || "example.com";
    let uri = "";
    switch (config.proto_id) {
      case "vless-reality":
      case "vless-ws":
      case "vless-grpc":
        uri = `vless://${user.uuid}@${host}:${port}?encryption=none&security=${settings.security || "tls"}&type=${settings.network || "tcp"}&flow=${settings.flow || ""}#${encodeURIComponent(config.name)}`;
        break;
      case "vmess-ws":
      case "vmess-wss":
        const vmessObj = {
          v: "2",
          ps: config.name,
          add: host,
          port,
          id: user.uuid,
          aid: 0,
          scy: "auto",
          net: settings.network || "ws",
          type: "none",
          host,
          path: settings.path || "/",
          tls: settings.security === "tls" ? "tls" : ""
        };
        uri = `vmess://${btoa(JSON.stringify(vmessObj))}`;
        break;
      case "trojan-ws":
      case "trojan-wss":
        uri = `trojan://${settings.password || "password"}@${host}:${port}?type=${settings.network || "ws"}&host=${host}&path=${settings.path || "/"}&security=tls&sni=${settings.sni || host}#${encodeURIComponent(config.name)}`;
        break;
      case "ss-ws":
      case "ss-wss":
        const ssInfo = btoa(`${settings.method || "chacha20-ietf-poly1305"}:${settings.password || "password"}`);
        uri = `ss://${ssInfo}@${host}:${port}?type=${settings.network || "ws"}&path=${settings.path || "/"}#${encodeURIComponent(config.name)}`;
        break;
      default:
        uri = `${config.proto_id}://${btoa(processedTemplate)}@${host}:${port}#${encodeURIComponent(config.name)}`;
    }
    links.push(uri);
  }
  if (format === "clash" || accept.includes("text/yaml")) {
    return generateClashConfig(links, configs.results, user);
  }
  if (format === "singbox" || accept.includes("application/json")) {
    return generateSingboxConfig(links, configs.results, user);
  }
  const base64Config = btoa(links.join("\n"));
  return text(base64Config);
}
function generateClashConfig(links, configs, user) {
  const proxies = [];
  const proxyNames = [];
  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    const settings = JSON.parse(config.settings_json || "{}");
    const name = config.name || `Config ${i + 1}`;
    proxyNames.push(name);
    const proxy = {
      name,
      type: getClashProxyType(config.proto_id),
      server: settings.host || settings.sni || "example.com",
      port: config.port || 443,
      uuid: user.uuid
    };
    if (config.proto_id.includes("vless")) {
      proxy.flow = settings.flow || "";
      proxy.tls = settings.security === "tls" || settings.security === "reality";
      if (settings.sni) proxy.sni = settings.sni;
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
  const clashConfig = {
    "mixed-port": 7890,
    "allow-lan": false,
    "mode": "rule",
    "proxies": proxies,
    "proxy-groups": [
      {
        "name": "Proxy",
        "type": "select",
        "proxies": [...proxyNames, "DIRECT"]
      }
    ],
    "rules": ["MATCH,Proxy"]
  };
  return new Response(
    `proxies:
${JSON.stringify(clashConfig, null, 2).split("\n").map((l) => "  " + l).join("\n")}`,
    {
      headers: { "Content-Type": "text/yaml; charset=utf-8" }
    }
  );
}
function generateSingboxConfig(links, configs, user) {
  const outbounds = [];
  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    const settings = JSON.parse(config.settings_json || "{}");
    const name = config.name || `Config ${i + 1}`;
    const outbound = {
      type: getSingboxOutboundType(config.proto_id),
      tag: name,
      server: settings.host || settings.sni || "example.com",
      server_port: config.port || 443,
      uuid: user.uuid
    };
    if (config.proto_id.includes("vless")) {
      outbound.flow = settings.flow || "";
      if (settings.security === "tls") {
        outbound.tls = { enabled: true, server_name: settings.sni || settings.host };
      }
    }
    if (config.proto_id.includes("vmess")) {
      outbound.transport = {
        type: settings.network || "ws",
        path: settings.path || "/"
      };
    }
    outbounds.push(outbound);
  }
  const singboxConfig = {
    outbounds,
    inbounds: [
      {
        type: "mixed",
        listen: "127.0.0.1",
        listen_port: 2080
      }
    ]
  };
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
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
function notFound() {
  return jsonResponse({ success: false, message: "Not found" }, 404);
}
var routes = [
  // Public routes
  {
    pattern: new URLPattern({ pathname: "/install" }),
    handler: handleInstall
  },
  {
    pattern: new URLPattern({ pathname: "/api/login" }),
    handler: handleLogin
  },
  {
    pattern: new URLPattern({ pathname: "/api/health" }),
    handler: handleHealth
  },
  // Auth routes
  {
    pattern: new URLPattern({ pathname: "/api/logout" }),
    handler: handleLogout
  },
  // Admin routes
  {
    pattern: new URLPattern({ pathname: "/api/nodes" }),
    handler: handleNodes
  },
  {
    pattern: new URLPattern({ pathname: "/api/nodes/:id" }),
    handler: handleNodes
  },
  {
    pattern: new URLPattern({ pathname: "/api/users" }),
    handler: handleUsers
  },
  {
    pattern: new URLPattern({ pathname: "/api/users/:id" }),
    handler: handleUsers
  },
  {
    pattern: new URLPattern({ pathname: "/api/protocols" }),
    handler: handleProtocols
  },
  {
    pattern: new URLPattern({ pathname: "/api/configs" }),
    handler: handleConfigs
  },
  {
    pattern: new URLPattern({ pathname: "/api/configs/:id" }),
    handler: handleConfigs
  },
  {
    pattern: new URLPattern({ pathname: "/api/settings" }),
    handler: handleSettings
  },
  // Subscription route
  {
    pattern: new URLPattern({ pathname: "/sub/:token" }),
    handler: handleSubscription
  }
];
async function handleRequest(request, env, ctx) {
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
  if (!url.pathname.startsWith("/install") && !url.pathname.startsWith("/api/health")) {
    const configured = await env.DB.prepare(
      "SELECT v FROM kvstore WHERE k = ?"
    ).bind("panel.password_hash").first();
    if (!configured || !configured.v) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/install" }
      });
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
  const pagesUrl = env.PAGES_URL;
  if (env.ASSETS) {
    try {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status === 200) {
        return assetResponse;
      }
    } catch (_e) {
    }
    if (!url.pathname.startsWith("/api/") && !url.pathname.includes(".")) {
      try {
        const indexRequest = new Request(new URL("/index.html", request.url).toString(), request);
        return await env.ASSETS.fetch(indexRequest);
      } catch (_e) {
      }
    }
  }
  if (pagesUrl && !url.pathname.startsWith("/api/") && !url.pathname.startsWith("/sub/")) {
    const workerOrigin = new URL(request.url).origin;
    const apiScript = `<script>window.__API_BASE="${workerOrigin}";<\/script>`;
    const injectApiBase = async (html) => {
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
    return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XrayMOD</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #09090b; color: #fafafa;
           display: grid; place-items: center; min-height: 100vh; }
    .box { text-align: center; padding: 2rem; max-width: 480px; }
    .icon { width: 48px; height: 48px; background: #10b981; border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            font-weight: 900; font-size: 1.5rem; color: #000; margin: 0 auto 1.5rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #a1a1aa; margin-bottom: 1rem; font-size: 0.875rem; line-height: 1.6; }
    a { color: #10b981; text-decoration: none; }
    .status { padding: 1rem; background: #18181b; border: 1px solid #27272a;
              border-radius: 0.75rem; margin-top: 1.5rem; text-align: left; }
    .row { display: flex; justify-content: space-between; padding: 0.25rem 0;
            font-size: 0.875rem; }
    .label { color: #71717a; }
    .ok { color: #10b981; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">X</div>
    <h1>XrayMOD</h1>
    <p>Panel is deployed and the API is running.<br>
       The frontend needs to be built and uploaded separately.</p>
    <div class="status">
      <div class="row"><span class="label">API Health</span><span class="ok"><a href="/api/health">/api/health</a></span></div>
      <div class="row"><span class="label">Login</span><span class="ok"><a href="/api/login">POST /api/login</a></span></div>
      <div class="row"><span class="label">Docs</span><span class="ok"><a href="https://github.com/EvolveBeyond/XRayMOD">GitHub</a></span></div>
    </div>
  </div>
</body>
</html>`, {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
  return notFound();
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
