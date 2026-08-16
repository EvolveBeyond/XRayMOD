/**
 * Local E2E against wrangler dev --local — Gen 1.9.12 SECURE PATH aware.
 * Flow: wait /install → bootstrap → API under /{SECURE}/api → sub under /{SECURE}/sub
 *
 * Run: npm run test:e2e
 * Requires: npm run build:ui first (or uses existing frontend/out)
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;
const ADMIN_PASS = 'TestPass123!';
const PERSIST_DIR = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'xraymod-e2e-'));

function log(msg) {
  console.log(`  ${msg}`);
}

async function waitForInstall(timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${BASE}/install`);
      if (r.status === 200 || r.status === 302) return;
    } catch {
      /* retry */
    }
    await sleep(800);
  }
  throw new Error('wrangler dev did not become ready in time');
}

async function json(res) {
  const t = await res.text();
  try {
    return JSON.parse(t);
  } catch {
    return { raw: t, status: res.status };
  }
}

async function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, stdio: 'inherit' });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function main() {
  console.log('\nXRayMOD local E2E (Gen 1.9.12)\n');

  if (!fs.existsSync(path.join(ROOT, 'frontend/out/index.html'))) {
    console.log('Building UI…');
    await run('npm', ['run', 'build:ui'], ROOT);
  }

  console.log(`Starting wrangler dev --local on :${PORT}…`);
  const child = spawn(
    'npx',
    ['wrangler', 'dev', '--local', '--persist-to', PERSIST_DIR, '--port', String(PORT), '--ip', '127.0.0.1'],
    {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    }
  );

  let stderr = '';
  child.stderr.on('data', (d) => {
    stderr += d.toString();
  });
  child.stdout.on('data', (d) => {
    const s = d.toString();
    if (process.env.VERBOSE) process.stdout.write(s);
  });

  const cleanup = () => {
    try {
      child.kill('SIGTERM');
    } catch {
      /* ignore */
    }
    try {
      fs.rmSync(PERSIST_DIR, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(130);
  });

  try {
    await waitForInstall();
    log('worker ready');

    // Public /api/health before install may 404 (not configured) — install first
    let secure = '';
    {
      const r = await fetch(`${BASE}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: ADMIN_PASS }),
      });
      const body = await json(r);
      assert.equal(body.success, true, `install failed: ${JSON.stringify(body)}`);
      assert.ok(body.accessUUID, 'missing accessUUID');
      secure = `/${body.accessUUID}`;
      log(`✓ POST /install → SECURE PATH ${body.accessUUID.slice(0, 8)}…`);
    }

    const api = (p) => `${BASE}${secure}${p}`;

    // Bare public fingerprints must be closed
    {
      const r = await fetch(`${BASE}/api/health`);
      assert.equal(r.status, 404, 'bare /api/health should 404');
      const r2 = await fetch(`${BASE}/sub/does-not-exist`);
      assert.equal(r2.status, 404, 'bare /sub should 404');
      log('✓ bare /api and /sub → 404');
    }

    // Unauthenticated health under SECURE PATH = silent ok
    {
      const r = await fetch(api('/api/health'));
      const body = await json(r);
      assert.equal(r.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.service, undefined);
      log('✓ GET /{SECURE}/api/health (anonymous)');
    }

    let cookie = '';
    {
      const r = await fetch(api('/api/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: ADMIN_PASS }),
      });
      const body = await json(r);
      if (body.require2fa) throw new Error('2FA unexpectedly enabled');
      assert.equal(body.success, true, `login failed: ${JSON.stringify(body)}`);
      const setCookie = r.headers.getSetCookie?.() || [];
      const raw = setCookie[0] || r.headers.get('set-cookie') || '';
      cookie = raw.split(';')[0];
      assert.ok(cookie.startsWith('session='), 'missing session cookie');
      log('✓ POST /{SECURE}/api/login');
    }

    const auth = { Cookie: cookie, 'Content-Type': 'application/json' };

    // Authenticated health
    {
      const r = await fetch(api('/api/health'), { headers: { Cookie: cookie } });
      const body = await json(r);
      assert.equal(body.status, 'ok');
      assert.equal(body.version, '1.9.12');
      log('✓ GET /{SECURE}/api/health (admin) version 1.9.12');
    }

    // Admin dashboard
    {
      const r = await fetch(api('/api/admin/dashboard'), { headers: { Cookie: cookie } });
      const body = await json(r);
      assert.equal(body.success, true);
      assert.equal(body.data.version, '1.9.12');
      assert.ok(body.data.secure_path);
      log('✓ GET /{SECURE}/api/admin/dashboard');
    }

    // Remote API auth
    {
      const r = await fetch(api('/api/remote/health'));
      assert.equal(r.status, 401, 'remote health must require a bearer API key');
      const body = await json(r);
      assert.equal(body.success, false);
      assert.equal(body.data, undefined, 'unauthorized response must not leak integration data');
      log('✓ GET /{SECURE}/api/remote/health → 401');
    }

    // Remote keys
    let remoteKey = '';
    let remoteKeyId = '';
    {
      const r = await fetch(api('/api/remote/keys'), {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ name: 'E2E control center', scopes: ['health:read', 'users:read', 'users:write', 'configs:read', 'configs:write'] }),
      });
      assert.equal(r.status, 201, `remote key create failed: ${r.status}`);
      const body = await json(r);
      assert.equal(body.success, true);
      assert.match(body.data.key, /^xrm_int_[A-Za-z0-9_-]{40,}$/);
      assert.ok(body.data.id);
      assert.equal(body.data.key_hash, undefined, 'key hash must never be returned');
      remoteKey = body.data.key;
      remoteKeyId = body.data.id;

      const listed = await fetch(api('/api/remote/keys'), { headers: { Cookie: cookie } });
      const listedBody = await json(listed);
      assert.equal(listedBody.success, true);
      const created = listedBody.data.find((key) => key.id === remoteKeyId);
      assert.ok(created, 'created API key must be listed');
      assert.equal(created.key, undefined, 'API key secret must not be returned after creation');
      assert.equal(created.key_hash, undefined, 'API key hash must not be returned');
      log('✓ GET/POST /{SECURE}/api/remote/keys');
    }

    const remoteAuth = (key = remoteKey) => ({
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
    });

    // Remote health
    {
      const r = await fetch(api('/api/remote/health'), { headers: remoteAuth() });
      assert.equal(r.status, 200);
      const body = await json(r);
      assert.equal(body.success, true);
      assert.equal(body.data.configured, true);
      assert.equal(body.data.traffic, undefined, 'remote health must not expose admin-only traffic details');
      log('✓ GET /{SECURE}/api/remote/health');
    }

    // Remote key checks
    {
      for (const value of ['', 'wrong', `${remoteKey}extra`]) {
        const r = await fetch(api('/api/remote/users'), {
          headers: { Authorization: value ? 'Bearer ' + value : '' },
        });
        assert.equal(r.status, 401, `invalid bearer credential must be rejected (${value || 'empty'})`);
      }

      const limited = await fetch(api('/api/remote/keys'), {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ name: 'health only', scopes: ['health:read'] }),
      });
      const limitedBody = await json(limited);
      const r = await fetch(api('/api/remote/users'), {
        headers: { Authorization: 'Bearer ' + limitedBody.data.key },
      });
      assert.equal(r.status, 403, 'scope-insufficient key must be rejected');

      const invalidCreate = await fetch(api('/api/remote/keys'), {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ name: 'expired key', scopes: ['health:read'], expiresAt: Date.now() - 1 }),
      });
      assert.equal(invalidCreate.status, 400, 'expired API key must not be created');
      log('✓ remote key validation');
    }

    // Remote users and configs
    let remoteUserId = 0;
    let remoteConfigId = 0;
    {
      const username = `remote_${Date.now().toString(36)}`;
      const createUser = await fetch(api('/api/remote/users'), {
        method: 'POST',
        headers: remoteAuth(),
        body: JSON.stringify({ username, limit: 3, expiryDays: 14 }),
      });
      assert.equal(createUser.status, 201);
      const createdUser = await json(createUser);
      assert.equal(createdUser.success, true);
      assert.ok(createdUser.data.id);
      assert.ok(createdUser.data.uuid);
      assert.ok(createdUser.data.sub_url.includes(`${secure}/sub/`));
      remoteUserId = createdUser.data.id;

      const userList = await fetch(api('/api/remote/users'), { headers: remoteAuth() });
      const users = await json(userList);
      assert.equal(users.success, true);
      assert.ok(users.data.some((user) => user.id === remoteUserId && user.username === username));

      const createConfig = await fetch(api('/api/remote/configs'), {
        method: 'POST',
        headers: remoteAuth(),
        body: JSON.stringify({ userId: remoteUserId, protocolId: 'vless-ws', name: 'Remote test', settings: {} }),
      });
      assert.equal(createConfig.status, 201);
      const createdConfig = await json(createConfig);
      assert.equal(createdConfig.success, true);
      assert.ok(createdConfig.data.id);
      assert.ok(createdConfig.data.subscription.includes(`${secure}/sub/`));
      remoteConfigId = createdConfig.data.id;

      const configList = await fetch(api('/api/remote/configs'), { headers: remoteAuth() });
      const configs = await json(configList);
      assert.equal(configs.success, true);
      assert.ok(configs.data.some((config) => config.id === remoteConfigId && config.userId === remoteUserId));
      log('✓ GET/POST /{SECURE}/api/remote/users|configs');
    }

    // Remote key revocation
    {
      const revoke = await fetch(api(`/api/remote/keys/${remoteKeyId}`), {
        method: 'DELETE',
        headers: { Cookie: cookie },
      });
      assert.equal(revoke.status, 200);
      assert.equal((await json(revoke)).success, true);

      const revoked = await fetch(api('/api/remote/users'), { headers: remoteAuth() });
      assert.equal(revoked.status, 401, 'revoked key must be rejected immediately');
      const localStillWorks = await fetch(api('/api/users'), { headers: { Cookie: cookie } });
      assert.equal(localStillWorks.status, 200, 'API-key revocation must not affect local admin sessions');
      log('✓ DELETE /{SECURE}/api/remote/keys/:id');
    }

    // Users
    let newUserUuid = '';
    {
      const r = await fetch(api('/api/users'), { headers: { Cookie: cookie } });
      const body = await json(r);
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data));
      log(`✓ GET /{SECURE}/api/users (${body.data.length})`);
    }

    {
      const uname = `e2e_${Date.now().toString(36)}`;
      const r = await fetch(api('/api/users'), {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ username: uname, limit: 10, expiryDays: 7 }),
      });
      const body = await json(r);
      assert.equal(body.success, true, JSON.stringify(body));
      newUserUuid = body.data.uuid;
      assert.ok(body.data.sub_url.includes(secure + '/sub/'));
      log(`✓ POST /{SECURE}/api/users → SECURE sub URL`);
    }

    // Settings
    {
      const r = await fetch(api('/api/settings'), {
        method: 'PUT',
        headers: auth,
        body: JSON.stringify({ 'panel.sub_name': 'E2E-XRayMOD' }),
      });
      assert.equal((await json(r)).success, true);
      const r2 = await fetch(api('/api/settings'), { headers: { Cookie: cookie } });
      assert.equal((await json(r2)).data['panel.sub_name'], 'E2E-XRayMOD');
      log('✓ GET/PUT /{SECURE}/api/settings');
    }

    // Subscription under SECURE PATH
    {
      const r = await fetch(api(`/sub/${newUserUuid}`));
      assert.equal(r.status, 200, `sub status ${r.status}`);
      const text = await r.text();
      assert.ok(text.length > 0, 'empty subscription body');
      log('✓ GET /{SECURE}/sub/:uuid');
    }

    // Portal
    {
      const r = await fetch(api(`/me/${newUserUuid}`));
      assert.equal(r.status, 200);
      log('✓ GET /{SECURE}/me/:uuid');
    }

    console.log('\nAll E2E checks passed.\n');
    cleanup();
    process.exit(0);
  } catch (e) {
    console.error('\nE2E failed:', e);
    if (stderr) console.error('\n--- wrangler stderr (tail) ---\n', stderr.slice(-4000));
    cleanup();
    process.exit(1);
  }
}

main();
