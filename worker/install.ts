import type { Env } from './types';
import { hashPassword } from './auth';

export async function handleInstall(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);

  // Check if already configured
  const configured = await env.DB.prepare(
    'SELECT v FROM kvstore WHERE k = ?'
  )
    .bind('panel.password_hash')
    .first<{ v: string }>();

  if (configured && configured.v) {
    // Already configured, redirect to login
    return new Response(null, {
      status: 302,
      headers: { Location: '/' },
    });
  }

  // Handle POST (set password)
  if (request.method === 'POST') {
    try {
      const body = await request.json<{ password: string }>();
      const password = body.password;

      if (!password || password.length < 4) {
        return new Response(JSON.stringify({ error: 'Password must be at least 4 characters' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Hash password and store
      const hash = await hashPassword(password);
      await env.DB.prepare(
        'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
      )
        .bind('panel.password_hash', hash, Date.now())
        .run();

      // Generate random panel access UUID
      const accessUUID = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
      )
        .bind('panel.access_uuid', accessUUID, Date.now())
        .run();

      // Generate random secret key
      const secretKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      await env.DB.prepare(
        'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
      )
        .bind('panel.secret_key', secretKey, Date.now())
        .run();

      // Update admin user password
      await env.DB.prepare(
        'UPDATE users SET password_hash = ? WHERE role = ?'
      )
        .bind(hash, 'admin')
        .run();

      return new Response(JSON.stringify({ success: true, message: 'Password set successfully', accessUUID }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // GET - Show install page
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XrayMOD — Setup</title>
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
      Powered by XrayMOD — Cloudflare Workers
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
          success.innerHTML = 'Setup complete!<br><br>' +
            '<b>Your Panel URL:</b><br>' +
            '<code style="background:#18181b;padding:8px;border-radius:6px;display:block;margin-top:8px;word-break:break-all">' +
            window.location.origin + '/' + data.accessUUID + '</code><br>' +
            '<small style="color:#a1a1aa">Save this URL! It is the only way to access your panel.</small>' +
            '<br><br>Redirecting to login...';
          success.style.display = 'block';
          setTimeout(() => {
            window.location.href = '/' + data.accessUUID;
          }, 5000);
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
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
