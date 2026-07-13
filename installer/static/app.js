// XRayMOD Installer — XRayMOD Worker Base
let accessToken = null;
let currentMode = null;

function show(id) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function selectMode(mode) {
  currentMode = mode;
  if (mode === 'cloudflare') show('step-cf');
  else if (mode === 'update') show('step-update');
  else if (mode === 'delete') show('step-delete');
}

function goBack() { show('step-welcome'); }

function setStatus(id, msg, ok) {
  const el = document.getElementById(id);
  el.className = 'status-msg ' + (ok ? 'ok' : 'err');
  el.textContent = msg;
}

function showResult(title, desc, html) {
  document.getElementById('result-title').textContent = title;
  document.getElementById('result-desc').textContent = desc;
  document.getElementById('result-body').innerHTML = html;
  show('step-result');
}

// ── OAuth ───────────────────────────────────────────────────
async function connectCloudflare(forMode) {
  currentMode = forMode || currentMode;
  const btnId = currentMode === 'update' ? 'updateConnectBtn' : currentMode === 'delete' ? 'deleteConnectBtn' : 'connectBtn';
  const btn = document.getElementById(btnId);
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-small"></span> Connecting...';

  try {
    const res = await fetch('/api/oauth/url');
    const data = await res.json();
    window.open(data.url, '_blank', 'width=600,height=700');
    setStatus(currentMode === 'update' ? 'update-status' : currentMode === 'delete' ? 'delete-status' : 'token-status', 'Waiting for authorization...', null);

    const pollRes = await fetch('/api/oauth/wait', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeout: 300 }),
    });
    const pollData = await pollRes.json();

    if (pollData.success) {
      accessToken = pollData.access_token;
      if (currentMode === 'update') {
        document.getElementById('update-oauth-section').style.display = 'none';
        document.getElementById('update-connected-section').style.display = 'block';
        document.getElementById('updateBtn').disabled = false;
      } else if (currentMode === 'delete') {
        document.getElementById('delete-oauth-section').style.display = 'none';
        document.getElementById('delete-connected-section').style.display = 'block';
        document.getElementById('deleteBtn').disabled = false;
      } else {
        document.getElementById('account-name').textContent = pollData.account.name;
        document.getElementById('oauth-section').style.display = 'none';
        document.getElementById('connected-section').style.display = 'block';
        document.getElementById('deployBtn').disabled = false;
      }
      setStatus(currentMode === 'update' ? 'update-status' : currentMode === 'delete' ? 'delete-status' : 'token-status', 'Connected!', true);
    } else {
      setStatus(currentMode === 'update' ? 'update-status' : currentMode === 'delete' ? 'delete-status' : 'token-status', pollData.error || 'Failed', false);
      btn.disabled = false;
      btn.innerHTML = '<span class="btn-icon">CF</span> Connect to Cloudflare';
    }
  } catch (e) {
    setStatus('token-status', 'Error: ' + e.message, false);
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">CF</span> Connect to Cloudflare';
  }
}

// ── Deploy ──────────────────────────────────────────────────
async function deploy() {
  if (!accessToken) return;
  document.getElementById('deployBtn').disabled = true;
  show('step-progress');
  renderProgress(['Verify account', 'Create D1', 'Download XRayMOD worker', 'Deploy worker', 'Enable subdomain'], 0);

  try {
    const res = await fetch('/api/deploy', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: accessToken,
        worker_name: document.getElementById('workerName').value.trim() || undefined,
      }),
    });
    const data = await res.json();
    if (data.success) {
      renderProgress(['Verify account', 'Create D1', 'Download XRayMOD worker', 'Deploy worker', 'Enable subdomain'], 5);
      setTimeout(() => {
        const installUrl = data.worker_url + '/install';
        showResult('Deployment Complete!', 'Follow the steps below to set up your panel.', `
          <div class="result-card highlight">
            <div class="result-label-big">Step 1: Set your password</div>
            <div class="result-row"><code class="result-value url">${installUrl}</code><button class="copy-btn" onclick="navigator.clipboard.writeText('${installUrl}')">Copy</button></div>
            <a href="${installUrl}" target="_blank" class="btn-primary" style="display:block;text-align:center;text-decoration:none;margin-top:.75rem">Open Setup Page</a>
          </div>
          <div class="result-card">
            <div class="result-label-big">Step 2: Panel URL (after setup)</div>
            <div class="result-row"><code class="result-value url">${data.worker_url}</code><button class="copy-btn" onclick="navigator.clipboard.writeText('${data.worker_url}')">Copy</button></div>
          </div>
          <div class="result-card">
            <div class="result-label-big">Account</div>
            <div class="result-row"><span class="result-label">Name</span><code class="result-value">${data.account_name || ''}</code></div>
            <div class="result-row"><span class="result-label">Worker</span><code class="result-value">${data.worker_name}</code></div>
            <div class="result-row"><span class="result-label">Database</span><code class="result-value">${data.d1_database}</code></div>
          </div>
        `);
      }, 500);
    } else {
      show('step-cf');
      setStatus('token-status', data.error || 'Deploy failed', false);
      document.getElementById('deployBtn').disabled = false;
    }
  } catch (e) {
    show('step-cf');
    setStatus('token-status', 'Error: ' + e.message, false);
    document.getElementById('deployBtn').disabled = false;
  }
}

// ── Update ──────────────────────────────────────────────────
async function updatePanel() {
  if (!accessToken) return;
  document.getElementById('updateBtn').disabled = true;
  show('step-progress');
  renderProgress(['Download XRayMOD worker', 'Deploy worker', 'Enable subdomain'], 0);

  try {
    const res = await fetch('/api/update', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken }),
    });
    const data = await res.json();
    if (data.success) {
      renderProgress(['Download XRayMOD worker', 'Deploy worker', 'Enable subdomain'], 3);
      setTimeout(() => {
        showResult('Update Complete!', 'Panel updated with latest XRayMOD worker.', `
          <div class="result-card highlight">
            <div class="result-label-big">Your Panel URL</div>
            <div class="result-row"><code class="result-value url">${data.worker_url}</code><button class="copy-btn" onclick="navigator.clipboard.writeText('${data.worker_url}')">Copy</button></div>
          </div>
        `);
      }, 500);
    } else {
      show('step-update');
      setStatus('update-status', data.error || 'Update failed', false);
      document.getElementById('updateBtn').disabled = false;
    }
  } catch (e) {
    show('step-update');
    setStatus('update-status', 'Error: ' + e.message, false);
    document.getElementById('updateBtn').disabled = false;
  }
}

// ── Delete ──────────────────────────────────────────────────
async function deletePanel() {
  const confirm = document.getElementById('deleteConfirm').value.trim();
  if (!accessToken) return;
  if (confirm !== 'DELETE') {
    setStatus('delete-status', 'Type DELETE to confirm', false);
    return;
  }
  document.getElementById('deleteBtn').disabled = true;
  show('step-progress');
  renderProgress(['Delete worker', 'Delete database'], 0);

  try {
    const res = await fetch('/api/delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken, confirm: 'DELETE' }),
    });
    const data = await res.json();
    if (data.success) {
      const r = data.results;
      renderProgress([
        r.worker ? 'Delete worker \u2713' : 'Delete worker \u2717',
        r.d1 ? 'Delete database \u2713' : 'Delete database \u2717',
      ], 2);
      setTimeout(() => {
        showResult('Panel Deleted', 'Resources have been removed.', `
          <div class="result-card">
            <div class="result-row"><span class="result-label">Worker</span><code class="result-value">${r.worker ? 'Deleted' : 'Not found'}</code></div>
            <div class="result-row"><span class="result-label">Database</span><code class="result-value">${r.d1 ? 'Deleted' : 'Not found'}</code></div>
          </div>
        `);
      }, 500);
    } else {
      show('step-delete');
      setStatus('delete-status', data.error || 'Delete failed', false);
      document.getElementById('deleteBtn').disabled = false;
    }
  } catch (e) {
    show('step-delete');
    setStatus('delete-status', 'Error: ' + e.message, false);
    document.getElementById('deleteBtn').disabled = false;
  }
}

// ── Helpers ─────────────────────────────────────────────────
function renderProgress(steps, done) {
  document.getElementById('progress-steps').innerHTML = steps.map((s, i) => {
    const cls = i < done ? 'done' : i === done ? 'active' : '';
    return `<div class="progress-step ${cls}"><span class="dot"></span>${s}</div>`;
  }).join('');
}

// ── Init ────────────────────────────────────────────────────
(async () => {
  try {
    const [statusRes, tokenRes] = await Promise.all([
      fetch('/api/status'),
      fetch('/api/check-token'),
    ]);
    const status = await statusRes.json();
    const token = await tokenRes.json();

    if (status.installed) {
      document.getElementById('existing-deploy').style.display = 'block';
    }

    if (token.valid) {
      accessToken = token.access_token;
      document.getElementById('oauth-section').innerHTML =
        '<div class="status-msg ok"><span class="check-icon">&#10003;</span> Connected to <strong>' + token.account.name + '</strong></div>';
      document.getElementById('deployBtn').disabled = false;
      document.getElementById('update-oauth-section').innerHTML =
        '<div class="status-msg ok"><span class="check-icon">&#10003;</span> Connected</div>';
      document.getElementById('updateBtn').disabled = false;
      document.getElementById('delete-oauth-section').innerHTML =
        '<div class="status-msg ok"><span class="check-icon">&#10003;</span> Connected</div>';
      document.getElementById('deleteBtn').disabled = false;
    }
  } catch (e) {}
})();
