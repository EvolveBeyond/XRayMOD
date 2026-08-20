/**
 * Public per-user status portal — traffic, expiry, nodes, QR, sub links.
 * Token = user.uuid (same as subscription). No login required.
 */
import { getCleanIPs, detectIranianISP } from './utils';
import { buildRecommendedLinks } from './lib/links';
import { getSecureBase } from './lib/secure-path';

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtBytes(n: number): string {
  if (!n || n <= 0) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return (i === 0 ? String(Math.round(v)) : v.toFixed(i >= 3 ? 2 : 1)) + ' ' + u[i];
}

function daysLeft(expiry: string): number | null {
  if (!expiry) return null;
  const ms = new Date(expiry).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

export type PortalUser = {
  username: string;
  uuid: string;
  traffic_limit: number;
  traffic_used: number;
  expiry_date: string;
  status: string;
};

export function renderUserPortal(opts: {
  user: PortalUser;
  origin: string;
  nodeCount: number;
  carrier?: string;
  links?: string[];
  showLinks?: boolean;
}): Response {
  const { user, origin, nodeCount, carrier = '—', links = [], showLinks = true } = opts;
  const used = Number(user.traffic_used || 0);
  const limit = Number(user.traffic_limit || 0);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const remain = limit > 0 ? Math.max(0, limit - used) : 0;
  const dl = daysLeft(user.expiry_date || '');
  const expired =
    user.status !== 'active' ||
    (user.expiry_date && new Date(user.expiry_date) < new Date());
  const expireLabel = user.expiry_date
    ? new Date(user.expiry_date).toLocaleDateString('en-US')
    : 'No expiry';
  const daysLabel =
    dl === null ? 'Unlimited' : dl < 0 ? 'Expired' : dl === 0 ? 'Today' : `${dl} days`;

  const subUrl = `${origin}/sub/${user.uuid}`;
  const meUrl = `${origin}/me/${user.uuid}`;
  const statusColor = expired ? '#f43f5e' : pct >= 90 ? '#f59e0b' : '#10b981';
  const statusText = expired
    ? user.status === 'disabled'
      ? 'Disabled'
      : 'Expired'
    : pct >= 90
      ? 'Quota almost used'
      : 'Active';

  const warn =
    !expired && pct >= 80
      ? `<div class="warn">⚠️ Over ${pct}% quota used — ${fmtBytes(remain)} remaining</div>`
      : '';
  const expWarn =
    !expired && dl !== null && dl <= 3 && dl >= 0
      ? `<div class="warn">⏳ Only ${daysLabel} until expiry</div>`
      : '';

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(subUrl)}`;

  const nodeItems = showLinks && links.length
    ? links
        .slice(0, 10)
        .map((l, i) => {
          const name = escapeHtml(
            decodeURIComponent((l.split('#')[1] || `node-${i + 1}`).replace(/\+/g, ' '))
          );
          return `<div class="node">
            <div class="node-top"><span class="badge">${i + 1}</span><span class="node-name">${name}</span></div>
            <code>${escapeHtml(l)}</code>
            <button type="button" class="btn-sm" data-copy="${escapeHtml(l)}">Copy config</button>
          </div>`;
        })
        .join('')
    : expired
      ? `<p class="muted center">Account inactive — contact support to renew.</p>`
      : `<p class="muted center">No nodes to display.</p>`;

  const html = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta name="robots" content="noindex,nofollow"/>
<meta name="theme-color" content="#050506"/>
<title>${escapeHtml(user.username)} · Subscription status</title>
<style>
:root{--bg:#050506;--card:#0e0e12;--line:#27272a;--muted:#71717a;--text:#fafafa;--ok:#10b981;--warn:#f59e0b;--bad:#f43f5e;--r:1.1rem}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:ui-sans-serif,system-ui,Tahoma,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;line-height:1.55;
  background-image:radial-gradient(ellipse 80% 50% at 20% -10%,rgba(16,185,129,.16),transparent 50%),
  radial-gradient(ellipse 50% 40% at 100% 0%,rgba(59,130,246,.08),transparent 45%)}
.wrap{max-width:440px;margin:0 auto;padding:1.1rem 1rem 2.5rem}
.brand{display:flex;align-items:center;gap:.55rem;margin-bottom:1rem}
.logo{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#34d399,#059669);display:grid;place-items:center;font-weight:900;color:#052e1c;font-size:.95rem;box-shadow:0 8px 24px rgba(16,185,129,.25)}
.brand b{font-size:.95rem;font-weight:900;letter-spacing:-.02em}
.brand span{display:block;font-size:.68rem;color:var(--muted);font-weight:500}
.hero{background:linear-gradient(160deg,#0a1f16 0%,var(--card) 55%);border:1px solid #1a3d2e;border-radius:calc(var(--r) + 4px);padding:1.15rem;position:relative;overflow:hidden}
.hero::after{content:"";position:absolute;inset:auto -20% -40% auto;width:180px;height:180px;background:radial-gradient(circle,rgba(16,185,129,.18),transparent 70%);pointer-events:none}
.hero h1{font-size:1.25rem;font-weight:900;margin-bottom:.2rem}
.pill{display:inline-flex;align-items:center;gap:.35rem;font-size:.72rem;font-weight:800;padding:.28rem .65rem;border-radius:999px;background:color-mix(in srgb,${statusColor} 15%,transparent);color:${statusColor};border:1px solid color-mix(in srgb,${statusColor} 35%,transparent);margin-top:.45rem}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:.55rem;margin-top:1rem}
.stat{background:rgba(9,9,11,.7);border:1px solid var(--line);border-radius:.85rem;padding:.7rem}
.stat label{display:block;font-size:.65rem;color:var(--muted);font-weight:600;margin-bottom:.2rem}
.stat strong{font-size:.92rem;font-weight:800;color:var(--ok);font-variant-numeric:tabular-nums}
.bar-wrap{margin-top:.9rem}
.bar-meta{display:flex;justify-content:space-between;font-size:.68rem;color:var(--muted);margin-bottom:.35rem;font-variant-numeric:tabular-nums}
.bar{height:8px;background:#18181b;border-radius:99px;overflow:hidden;border:1px solid var(--line)}
.bar>i{display:block;height:100%;width:${pct}%;background:linear-gradient(90deg,${statusColor},#34d399);border-radius:99px;transition:width .4s ease}
.warn{margin-top:.75rem;padding:.55rem .7rem;border-radius:.7rem;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.28);color:#fbbf24;font-size:.75rem;font-weight:600}
.card{margin-top:.85rem;background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:1rem}
.card h2{font-size:.8rem;font-weight:800;margin-bottom:.75rem;color:#e4e4e7;display:flex;align-items:center;justify-content:space-between}
.card h2 em{font-style:normal;font-size:.65rem;color:var(--muted);font-weight:600}
.qr-row{display:flex;gap:.9rem;align-items:center}
.qr-row img{width:112px;height:112px;border-radius:.75rem;background:#fff;padding:6px;flex-shrink:0}
.qr-row p{font-size:.78rem;color:var(--muted)}
.qr-row .t{color:var(--text);font-weight:800;font-size:.88rem;margin-bottom:.25rem}
.actions{display:grid;grid-template-columns:1fr 1fr;gap:.45rem;margin-top:.85rem}
.btn,.btn-sm{border:0;cursor:pointer;font-weight:800;border-radius:.7rem;font-family:inherit}
.btn{padding:.7rem .5rem;font-size:.78rem;background:var(--ok);color:#052e1c}
.btn.ghost{background:#18181b;color:var(--ok);border:1px solid var(--line)}
.btn-sm{padding:.4rem .7rem;font-size:.72rem;background:rgba(16,185,129,.15);color:var(--ok);border:1px solid rgba(16,185,129,.3);margin-top:.45rem}
.formats{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.65rem}
.formats a{font-size:.7rem;font-weight:800;text-decoration:none;padding:.4rem .65rem;border-radius:.55rem;background:#18181b;color:var(--ok);border:1px solid var(--line)}
.formats a.main{background:var(--ok);color:#052e1c;border-color:transparent}
.node{background:#09090b;border:1px solid var(--line);border-radius:.85rem;padding:.75rem;margin-bottom:.5rem}
.node-top{display:flex;align-items:center;gap:.45rem;margin-bottom:.4rem}
.badge{width:22px;height:22px;border-radius:7px;background:rgba(16,185,129,.15);color:var(--ok);font-size:.65rem;font-weight:900;display:grid;place-items:center}
.node-name{font-size:.78rem;font-weight:700;color:#d4d4d8}
code{display:block;font-size:.6rem;word-break:break-all;color:#71717a;background:#050506;padding:.5rem;border-radius:.5rem;border:1px solid #1f1f23;max-height:4.2em;overflow:hidden}
.muted{color:var(--muted);font-size:.8rem}.center{text-align:center;padding:.8rem}
.foot{margin-top:1.4rem;text-align:center;font-size:.65rem;color:#3f3f46}
.tip{margin-top:.55rem;font-size:.7rem;color:var(--muted);line-height:1.45}
.url{font-size:.62rem;word-break:break-all;color:#52525b;margin-top:.4rem}
</style>
</head>
<body>
<div class="wrap">
  <div class="brand">
    <div class="logo">X</div>
    <div><b>XrayMOD</b><span>Subscription status page</span></div>
  </div>

  <section class="hero">
    <h1>${escapeHtml(user.username)}</h1>
    <div class="pill">● ${statusText}</div>
    <div class="grid">
      <div class="stat"><label>Used</label><strong>${fmtBytes(used)}</strong></div>
      <div class="stat"><label>Quota</label><strong>${limit > 0 ? fmtBytes(limit) : '∞'}</strong></div>
      <div class="stat"><label>Remaining</label><strong>${limit > 0 ? fmtBytes(remain) : '∞'}</strong></div>
      <div class="stat"><label>Expiry</label><strong>${escapeHtml(daysLabel)}</strong></div>
    </div>
    <div class="bar-wrap">
      <div class="bar-meta"><span>${pct}% used</span><span>Expires: ${escapeHtml(expireLabel)}</span></div>
      <div class="bar"><i></i></div>
    </div>
    ${warn}${expWarn}
  </section>

  <section class="card">
    <h2>Quick connect <em>${nodeCount} nodes · ISP: ${escapeHtml(carrier)}</em></h2>
    <div class="qr-row">
      <img src="${qrSrc}" width="112" height="112" alt="QR" loading="lazy"/>
      <div>
        <p class="t">Scan QR or copy link</p>
        <p>Hiddify · v2rayNG · Streisand · NekoBox</p>
        <p class="url">${escapeHtml(subUrl)}</p>
      </div>
    </div>
    <div class="actions">
      <button type="button" class="btn" data-copy="${escapeHtml(subUrl)}">Copy sub link</button>
      <button type="button" class="btn ghost" data-copy="${escapeHtml(meUrl)}">Copy status page</button>
    </div>
    <div class="formats">
      <a class="main" href="${escapeHtml(subUrl)}">Base64</a>
      <a href="${escapeHtml(subUrl)}?format=raw">Raw</a>
      <a href="${escapeHtml(subUrl)}?format=clash">Clash</a>
      <a href="${escapeHtml(subUrl)}?format=singbox">sing-box</a>
      <a href="${escapeHtml(subUrl)}?format=html">Nodes</a>
    </div>
    <p class="tip">Bookmark this page to always see remaining quota and days.</p>
  </section>

  <section class="card">
    <h2>Best configs <em>up to 10 recommended</em></h2>
    ${nodeItems}
  </section>

  <p class="foot">SECURE PATH · auto-updating subscription</p>
</div>
<script>
document.querySelectorAll('[data-copy]').forEach(function(el){
  el.addEventListener('click',function(){
    var t=el.getAttribute('data-copy')||'';
    navigator.clipboard.writeText(t).then(function(){
      var old=el.textContent;el.textContent='Copied ✓';
      setTimeout(function(){el.textContent=old},1200);
    });
  });
});
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function handleUserPortal(
  request: Request,
  env: { DB: D1Database },
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const token = params.token;
  if (!token) {
    return new Response('Not found', { status: 404 });
  }

  const user = await env.DB.prepare(
    'SELECT id, username, uuid, traffic_limit, traffic_used, expiry_date, status FROM users WHERE uuid = ?'
  )
    .bind(token)
    .first<any>();

  if (!user) {
    return new Response('Invalid link', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  const url = new URL(request.url);
  const base = await getSecureBase(env.DB, url.origin);

  // Count configs; links only if active & not expired
  const cfg = await env.DB.prepare(
    'SELECT path, settings_json, name FROM configs WHERE user_id = ? LIMIT 1'
  )
    .bind(user.id)
    .first<any>();

  const nodeCountRow = await env.DB.prepare(
    'SELECT COUNT(*) as c FROM configs WHERE user_id = ?'
  )
    .bind(user.id)
    .first<{ c: number }>();

  const active =
    user.status === 'active' &&
    !(user.expiry_date && new Date(user.expiry_date) < new Date());

  let links: string[] = [];
  let carrier = '—';

  if (active && cfg) {
    const ispAware =
      (
        await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?')
          .bind('panel.isp_aware_sub')
          .first<{ v: string }>()
      )?.v !== 'false';
    carrier = ispAware ? detectIranianISP(request) : 'all';
    const cleanIPs = await getCleanIPs(env.DB, carrier === 'all' ? undefined : carrier);
    const settings = JSON.parse(cfg.settings_json || '{}');
    const path = cfg.path || settings.path || '/';
    links = buildRecommendedLinks({
      uuid: user.uuid,
      workerHost: url.host,
      path,
      name: cfg.name || user.username,
      cleanIPs,
      max: 10,
      carrier,
    });
  }

  return renderUserPortal({
    user,
    origin: base,
    nodeCount: Math.max(nodeCountRow?.c || 0, links.length ? 1 : 0),
    carrier,
    links,
    showLinks: active,
  });
}
