import type { Env } from './types';
import { bootstrapPanel, getStoredCredentials, type BootstrapResult } from './lib/bootstrap';

export async function handleInstall(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const origin = url.origin;

  const accessRow = await env.DB.prepare(
    'SELECT v FROM kvstore WHERE k = ?'
  )
    .bind('panel.access_uuid')
    .first<{ v: string }>();

  const pwRow = await env.DB.prepare(
    'SELECT v FROM kvstore WHERE k = ?'
  )
    .bind('panel.password_hash')
    .first<{ v: string }>();

  // Already configured
  if (accessRow?.v && pwRow?.v) {
    if (request.method === 'GET' && (url.searchParams.get('creds') === '1' || url.searchParams.get('info') === '1')) {
      const creds = await getStoredCredentials(env, origin);
      return renderResultPage(creds);
    }
    if (request.method === 'GET' && !url.searchParams.has('reset')) {
      return new Response(null, {
        status: 302,
        headers: { Location: `/${accessRow.v}/login` },
      });
    }
  }

  if (request.method === 'POST') {
    try {
      let password: string | undefined;
      let username: string | undefined;
      try {
        const body = (await request.json()) as {
          password?: string;
          username?: string;
          auto?: boolean;
        };
        if (!body.auto && body.password) password = body.password;
        if (body.username) username = body.username;
      } catch {
        /* empty body = auto */
      }

      if (password && password.length < 6) {
        return json({ success: false, error: 'Password min 6 chars' }, 400);
      }

      // If already set, return stored
      if (accessRow?.v && pwRow?.v && !url.searchParams.has('reset')) {
        const existing = await getStoredCredentials(env, origin);
        if (existing) return json({ success: true, ...existing });
      }

      const result = await bootstrapPanel(env, origin, { password, username });
      return json({ success: true, ...result });
    } catch (e) {
      console.error('install failed', e);
      return json(
        { success: false, error: e instanceof Error ? e.message : 'Setup failed' },
        500
      );
    }
  }

  return renderSetupPage(origin);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function esc(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function rowHtml(label: string, value: string): string {
  return `<div class="card"><div class="lab">${esc(label)}</div><div class="row"><div class="val">${esc(value)}</div><button type="button" class="copy" data-v="${esc(value)}">Copy</button></div></div>`;
}

function renderSetupPage(origin: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Install XrayMOD</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;font-family:system-ui,Tahoma,sans-serif;background:#050506;color:#fafafa;display:grid;place-items:center;padding:1.25rem}
body::before{content:"";position:fixed;inset:0;z-index:-1;background:radial-gradient(ellipse 80% 50% at 50% -20%,rgba(16,185,129,.2),transparent 50%)}
.card{width:100%;max-width:440px;background:rgba(18,18,22,.9);border:1px solid #27272a;border-radius:1.4rem;padding:2rem;box-shadow:0 25px 50px rgba(0,0,0,.5)}
.logo{width:64px;height:64px;margin:0 auto 1rem;border-radius:1.1rem;display:grid;place-items:center;background:linear-gradient(145deg,#34d399,#059669);color:#000;font-weight:900;font-size:1.6rem;box-shadow:0 12px 40px rgba(16,185,129,.35)}
h1{text-align:center;font-size:1.5rem;font-weight:900}
h1 span{color:#10b981}
.sub{text-align:center;color:#71717a;font-size:.875rem;margin:.5rem 0 1.5rem;line-height:1.7}
.btn{width:100%;padding:1rem;border:0;border-radius:.9rem;background:linear-gradient(180deg,#34d399,#10b981);color:#052e1c;font-weight:800;font-size:1rem;cursor:pointer;box-shadow:0 10px 30px rgba(16,185,129,.3)}
.btn:disabled{opacity:.6;cursor:wait}
.hint{margin-top:1rem;font-size:.75rem;color:#52525b;text-align:center;line-height:1.6}
.err{display:none;margin-top:1rem;padding:.75rem;border-radius:.75rem;background:rgba(244,63,94,.1);border:1px solid rgba(244,63,94,.25);color:#fb7185;font-size:.85rem}
</style>
</head>
<body>
<div class="card">
  <div class="logo">X</div>
  <h1>Xray<span>MOD</span></h1>
  <p class="sub">One click sets up the panel:<br/>username, password, panel link, sub and recommended config</p>
  <button class="btn" id="go" type="button">🚀 Auto install and show details</button>
  <div class="err" id="err"></div>
  <p class="hint">${esc(origin)}</p>
</div>
<script>
document.getElementById('go').onclick=async function(){
  var b=this;b.disabled=true;b.textContent='Installing...';
  try{
    var r=await fetch('/install',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({auto:true})});
    var d=await r.json();
    if(!d.success) throw new Error(d.error||'fail');
    sessionStorage.setItem('xraymod_creds',JSON.stringify(d));
    location.href='/install?creds=1';
  }catch(e){
    document.getElementById('err').style.display='block';
    document.getElementById('err').textContent=e.message||'Error';
    b.disabled=false;b.textContent='🚀 Auto install and show details';
  }
};
</script>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function renderResultPage(creds: BootstrapResult | null): Response {
  if (!creds) {
    return new Response(null, { status: 302, headers: { Location: '/install' } });
  }
  const c = creds;
  const blocks = [
    rowHtml('Username', c.username),
    rowHtml('Password', c.password),
    rowHtml('Panel ID (Access UUID)', c.accessUUID),
    rowHtml('Panel login URL', c.loginUrl),
    rowHtml('Panel URL', c.panelUrl),
    rowHtml('Subscription URL', c.subscriptionUrl),
    rowHtml('Sub (raw text)', c.subscriptionRaw),
    rowHtml('Recommended config (VLESS+WS)', c.configLink),
    rowHtml('Admin UUID', c.adminUuid),
  ].join('');

  const html = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Panel details · XrayMOD</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;font-family:system-ui,Tahoma,sans-serif;background:#050506;color:#fafafa;padding:1.5rem;line-height:1.5}
.wrap{max-width:560px;margin:0 auto}
h1{font-size:1.35rem;font-weight:900;margin-bottom:.25rem}
.sub{color:#71717a;font-size:.85rem;margin-bottom:1.25rem}
.card{background:rgba(18,18,22,.92);border:1px solid #27272a;border-radius:1.1rem;padding:1.1rem 1.2rem;margin-bottom:.75rem}
.lab{font-size:.65rem;font-weight:800;color:#71717a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.35rem}
.val{font-family:ui-monospace,monospace;font-size:.82rem;word-break:break-all;color:#e4e4e7;background:#09090b;padding:.65rem .75rem;border-radius:.65rem;border:1px solid #1f1f23}
.row{display:flex;gap:.5rem;align-items:stretch}
.row .val{flex:1}
button.copy{flex-shrink:0;padding:0 .9rem;border:0;border-radius:.65rem;background:#27272a;color:#a1a1aa;font-size:.75rem;font-weight:700;cursor:pointer}
button.copy:hover{background:#10b981;color:#000}
.warn{background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);color:#fbbf24;padding:.85rem 1rem;border-radius:.85rem;font-size:.8rem;margin-bottom:1rem}
.actions{display:flex;flex-direction:column;gap:.6rem;margin-top:1.25rem}
.btn{display:block;text-align:center;padding:.95rem;border-radius:.9rem;font-weight:800;text-decoration:none}
.btn-p{background:linear-gradient(180deg,#34d399,#10b981);color:#052e1c}
.btn-s{background:#18181b;border:1px solid #27272a;color:#e4e4e7}
</style>
</head>
<body>
<div class="wrap">
  <h1>✅ Panel is ready</h1>
  <p class="sub">Save this information — the panel URL is private</p>
  <div class="warn">⚠️ Keep password and links in a safe place.</div>
  ${blocks}
  <div class="actions">
    <a class="btn btn-p" href="${esc(c.loginUrl)}">Sign in to panel</a>
    <a class="btn btn-s" href="${esc(c.subscriptionUrl)}" target="_blank" rel="noopener">Open subscription</a>
  </div>
</div>
<script>
document.querySelectorAll('button.copy').forEach(function(btn){
  btn.addEventListener('click',function(){
    var t=btn.getAttribute('data-v')||'';
    navigator.clipboard.writeText(t).then(function(){
      var o=btn.textContent;btn.textContent='Copied';
      setTimeout(function(){btn.textContent=o},1200);
    });
  });
});
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
