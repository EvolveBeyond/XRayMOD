/**
 * Self-contained login UI — no React/Next dependency.
 * Panel login page (matches frontend brand).
 */
export function renderLoginPage(origin: string, panelPrefix: string): Response {
  const prefix = panelPrefix || '';
  const html = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <meta name="theme-color" content="#060b12" />
  <title>Login · XrayMOD</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Syne:wght@600;700;800&display=swap" rel="stylesheet" />
  <script>window.__API_BASE=${JSON.stringify(origin)};window.__PANEL_PREFIX=${JSON.stringify(prefix)};</script>
  <style>
    :root {
      --bg: #060b12;
      --panel: #101b2a;
      --border: rgba(140,175,210,.16);
      --text: #e8eef6;
      --muted: #8fa3b8;
      --faint: #5c7188;
      --accent: #1ec8c8;
      --coral: #ff5c45;
      --input: #0a121c;
      --danger: #ff5c6a;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      font-family: Manrope, ui-sans-serif, system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: grid;
      place-items: center;
      padding: 1.25rem;
      -webkit-font-smoothing: antialiased;
    }
    body::before {
      content: "";
      position: fixed; inset: 0; z-index: -2; pointer-events: none;
      background:
        radial-gradient(ellipse 55% 40% at 85% -5%, rgba(30,200,200,.14), transparent 55%),
        radial-gradient(ellipse 40% 35% at -5% 40%, rgba(255,92,69,.06), transparent 50%),
        linear-gradient(165deg, #08101a 0%, #060b12 100%);
    }
    body::after {
      content: "";
      position: fixed; inset: 0; z-index: -1; pointer-events: none; opacity: .04;
      background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(140,175,210,.4) 2px, rgba(140,175,210,.4) 3px);
    }
    .wrap { width: 100%; max-width: 400px; animation: in .45s cubic-bezier(.16,1,.3,1) both; }
    @keyframes in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: .9rem;
      padding: 2rem 1.6rem 1.6rem;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.03);
    }
    .logo {
      width: 56px; height: 56px; margin: 0 auto 1.15rem;
      border-radius: 12px;
      display: grid; place-items: center;
      background: #0d1622;
      border: 1px solid var(--border);
      position: relative;
    }
    .logo::before {
      content: "";
      position: absolute; inset: 6px;
      border: 1.5px solid var(--accent);
      border-radius: 99px;
      opacity: .85;
      animation: pulse 3.2s ease-in-out infinite;
    }
    .logo::after {
      content: "";
      width: 8px; height: 8px; border-radius: 99px;
      background: var(--coral);
      box-shadow: 0 0 12px rgba(255,92,69,.65);
      position: relative; z-index: 1;
    }
    @keyframes pulse {
      0%,100% { opacity: .35; transform: scale(1); }
      50% { opacity: .75; transform: scale(1.08); }
    }
    h1 {
      text-align: center;
      font-family: Syne, sans-serif;
      font-size: 1.55rem; font-weight: 800; letter-spacing: -.03em;
    }
    h1 span { color: var(--accent); }
    .sub { text-align: center; color: var(--muted); font-size: .875rem; margin: .45rem 0 1.6rem; line-height: 1.6; }
    label {
      display: block; font-size: .68rem; font-weight: 700; color: var(--faint);
      text-transform: uppercase; letter-spacing: .1em; margin-bottom: .4rem;
    }
    .field { margin-bottom: 1rem; position: relative; }
    input {
      width: 100%;
      padding: .95rem 1rem;
      background: var(--input);
      border: 1px solid rgba(140,175,210,.18);
      border-radius: .65rem;
      color: var(--text);
      font-size: .95rem;
      transition: border-color .15s, box-shadow .15s;
      outline: none;
      font-family: inherit;
    }
    input:focus {
      border-color: rgba(30,200,200,.55);
      box-shadow: 0 0 0 3px rgba(30,200,200,.12);
    }
    input::placeholder { color: var(--faint); }
    .toggle {
      position: absolute; left: .75rem; top: 2.1rem;
      background: none; border: 0; color: var(--faint); cursor: pointer; font-size: .75rem; padding: .25rem;
      font-family: inherit;
    }
    .toggle:hover { color: var(--muted); }
    .btn {
      width: 100%; margin-top: .35rem;
      padding: 1rem;
      border: 0; border-radius: .65rem;
      background: var(--coral);
      color: #fff; font-weight: 700; font-size: .95rem;
      cursor: pointer;
      box-shadow: 0 10px 28px -14px rgba(255,92,69,.7);
      transition: transform .12s, filter .12s, opacity .12s;
      font-family: inherit;
    }
    .btn:hover { filter: brightness(1.08); }
    .btn:active { transform: scale(.985); }
    .btn:disabled { opacity: .5; cursor: not-allowed; transform: none; filter: none; }
    .err {
      display: none; margin: .75rem 0 0;
      padding: .85rem 1rem; border-radius: .65rem;
      background: rgba(255,92,69,.1); border: 1px solid rgba(255,92,69,.28);
      color: var(--coral); font-size: .85rem; line-height: 1.55;
    }
    .err.show { display: block; }
    .langs { display: flex; justify-content: center; gap: .5rem; margin-top: 1rem; }
    .lang {
      padding: .35rem .7rem; border-radius: .5rem;
      border: 1px solid rgba(140,175,210,.18);
      background: var(--input); color: var(--muted);
      font-weight: 800; font-size: .7rem; cursor: pointer; font-family: Syne, sans-serif;
    }
    .lang.on { background: var(--accent); color: #041414; border-color: transparent; }
    .foot {
      text-align: center; margin-top: 1.15rem;
      font-size: .7rem; color: var(--faint); line-height: 1.7;
      font-family: Syne, sans-serif; letter-spacing: .04em;
    }
    .spin {
      display: inline-block; width: 1em; height: 1em; margin-left: .4rem;
      border: 2px solid rgba(255,255,255,.25); border-top-color: #fff;
      border-radius: 50%; animation: s .7s linear infinite; vertical-align: -2px;
    }
    @keyframes s { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="logo" aria-hidden="true"></div>
      <h1>Xray<span>MOD</span></h1>
      <p class="sub">Secure panel sign-in</p>

      <form id="f" autocomplete="on">
        <div class="field">
          <label for="user">Username / email</label>
          <input id="user" name="username" type="text" value="" autocomplete="username" required placeholder="admin" dir="ltr" />
        </div>
        <div class="field">
          <label for="pass">Password</label>
          <input id="pass" class="has-toggle" name="password" type="password" autocomplete="current-password" required placeholder="••••••••" dir="ltr" />
          <button type="button" class="toggle" id="eye" aria-label="toggle">Show</button>
        </div>
        <div class="field" id="totpWrap" style="display:none">
          <label for="totp">Authenticator code</label>
          <input id="totp" name="totp" type="text" inputmode="numeric" maxlength="6" placeholder="000000" style="text-align:center;letter-spacing:.35em;font-family:ui-monospace,monospace" />
        </div>
        <div class="err" id="err"></div>
        <button class="btn" id="go" type="submit">Sign in</button>
      </form>
    </div>
    <p class="foot" id="foot">SECURE PATH · private entry<br/>Unauthorized requests return 404</p>
  </div>

  <script>
(function () {
  var API = (window.__API_BASE || location.origin).replace(/\\/$/, '') + (window.__PANEL_PREFIX || '');
  var PREFIX = window.__PANEL_PREFIX || '';
  var form = document.getElementById('f');
  var err = document.getElementById('err');
  var go = document.getElementById('go');
  var eye = document.getElementById('eye');
  var pass = document.getElementById('pass');
  var totpWrap = document.getElementById('totpWrap');
  var challenge = null;
  var t = {
    show: 'Show', hide: 'Hide', bad: 'Invalid username or password',
    net: 'Network error — try again', ok: 'OK — redirecting...'
  };

  eye.addEventListener('click', function () {
    var show = pass.type === 'password';
    pass.type = show ? 'text' : 'password';
    eye.textContent = show ? t.hide : t.show;
  });

  function showError(msg) {
    err.textContent = msg || 'Error';
    err.classList.add('show');
  }
  function clearError() {
    err.textContent = '';
    err.classList.remove('show');
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    e.stopPropagation();
    clearError();
    go.disabled = true;
    var old = go.innerHTML;
    go.innerHTML = 'Signing in <span class="spin"></span>';

    var body;
    if (challenge) {
      body = { challenge: challenge, totp: document.getElementById('totp').value.trim() };
    } else {
      body = {
        username: document.getElementById('user').value.trim(),
        password: pass.value
      };
    }

    try {
      var res = await fetch(API + '/api/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body)
      });
      var data = {};
      try { data = await res.json(); } catch (_) {}

      if (data.require2fa && data.challenge) {
        challenge = data.challenge;
        totpWrap.style.display = 'block';
        document.getElementById('totp').required = true;
        document.getElementById('totp').focus();
        go.disabled = false;
        go.innerHTML = 'Verify code';
        return;
      }

      if (data.success) {
        go.innerHTML = t.ok;
        location.replace(PREFIX + '/panel');
        return;
      }

      showError(data.message || data.error || t.bad);
      go.disabled = false;
      go.innerHTML = old;
    } catch (err2) {
      showError(t.net);
      go.disabled = false;
      go.innerHTML = old;
    }
  });
})();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
