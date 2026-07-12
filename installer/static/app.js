// XRayMOD Installer — Frontend Logic with OAuth2
let selectedMode = null;
let accessToken = null;

function show(id) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function selectMode(mode) {
  selectedMode = mode;
  if (mode === 'cloudflare') {
    show('step-cf');
  } else {
    show('step-server');
  }
}

function goBack() {
  show('step-welcome');
}

function setStatus(msg, ok) {
  const el = document.getElementById('token-status');
  el.className = 'status-msg ' + (ok ? 'ok' : 'err');
  el.textContent = msg;
}

// ── OAuth2 Flow ─────────────────────────────────────────────
async function connectCloudflare() {
  const btn = document.getElementById('connectBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-small"></span> Connecting...';

  try {
    // Get OAuth URL
    const res = await fetch('/api/oauth/url');
    const data = await res.json();

    // Open Cloudflare OAuth page
    const authWindow = window.open(data.url, '_blank', 'width=600,height=700');

    setStatus('Waiting for Cloudflare authorization...', null);

    // Poll for completion
    const pollRes = await fetch('/api/oauth/wait', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeout: 300 }),
    });

    const pollData = await pollRes.json();

    if (pollData.success) {
      accessToken = pollData.access_token;
      document.getElementById('account-name').textContent = pollData.account.name;
      document.getElementById('oauth-section').style.display = 'none';
      document.getElementById('connected-section').style.display = 'block';
      document.getElementById('deployBtn').disabled = false;
      setStatus('Connected to ' + pollData.account.name, true);
    } else {
      setStatus(pollData.error || 'Connection failed', false);
      btn.disabled = false;
      btn.innerHTML = '<span class="btn-icon">CF</span> Connect to Cloudflare';
    }
  } catch (e) {
    setStatus('Error: ' + e.message, false);
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">CF</span> Connect to Cloudflare';
  }
}

// ── Deploy ──────────────────────────────────────────────────
async function deploy() {
  if (!accessToken) return;
  const btn = document.getElementById('deployBtn');
  btn.disabled = true;

  show('step-progress');
  const steps = [
    'Verifying Cloudflare account',
    'Creating D1 database',
    'Downloading panel code',
    'Deploying Worker',
    'Enabling subdomain',
  ];
  renderProgress(steps, 0);

  try {
    const res = await fetch('/api/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: accessToken,
        worker_name: document.getElementById('workerName').value.trim() || undefined,
        admin_password: document.getElementById('adminPassword').value.trim() || undefined,
      }),
    });
    const data = await res.json();

    if (data.success) {
      renderProgress(steps, steps.length);
      setTimeout(() => {
        document.getElementById('result-url').textContent = data.worker_url;
        document.getElementById('result-pass').textContent = data.admin_password;
        document.getElementById('result-db').textContent = data.d1_database;
        show('step-result');
      }, 500);
    } else {
      show('step-cf');
      setStatus(data.error || 'Deployment failed', false);
      btn.disabled = false;
    }
  } catch (e) {
    show('step-cf');
    setStatus('Network error: ' + e.message, false);
    btn.disabled = false;
  }
}

// ── Helpers ─────────────────────────────────────────────────
function renderProgress(steps, done) {
  const el = document.getElementById('progress-steps');
  el.innerHTML = steps.map((s, i) => {
    const cls = i < done ? 'done' : i === done ? 'active' : '';
    return `<div class="progress-step ${cls}"><span class="dot"></span>${s}</div>`;
  }).join('');
}

function copy(id) {
  const text = document.getElementById(id).textContent;
  navigator.clipboard.writeText(text);
}
