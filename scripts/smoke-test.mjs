/**
 * Offline smoke tests — pure logic (auth, routes, static candidates).
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Node 18+ has global crypto; ensure WebCrypto for PBKDF2
if (!globalThis.crypto) globalThis.crypto = webcrypto;

const results = [];
function ok(name) {
  results.push({ name, pass: true });
  console.log(`  ✓ ${name}`);
}
function fail(name, err) {
  results.push({ name, pass: false, err: String(err) });
  console.error(`  ✗ ${name}: ${err}`);
}

// ── Minimal reimplementation of auth core for isolation ──
function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  const len = Math.max(ba.length, bb.length);
  let result = ba.length === bb.length ? 0 : 1;
  for (let i = 0; i < len; i++) result |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  return result === 0;
}

function toHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    key,
    256
  );
  return `pbkdf2$100000$${toHex(salt)}$${toHex(bits)}`;
}

async function verifyPassword(password, stored) {
  if (!stored.startsWith('pbkdf2$')) return false;
  const [, iter, saltHex, expected] = stored.split('$');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: fromHex(saltHex),
      iterations: parseInt(iter, 10),
      hash: 'SHA-256',
    },
    key,
    256
  );
  return timingSafeEqual(toHex(bits), expected);
}

// Route matching (mirrors worker/router.ts)
function matchRoute(pathname) {
  const routes = [
    [/^\/api\/login$/, []],
    [/^\/api\/health$/, []],
    [/^\/api\/admin(?:\/([^/]+))?$/, ['action']],
    [/^\/api\/users(?:\/([^/]+))?$/, ['id']],
    [/^\/api\/cleanip(?:\/([^/]+))?$/, ['action']],
    [/^\/api\/nodes(?:\/([^/]+))?$/, ['id']],
    [/^\/api\/backends(?:\/([^/]+))?$/, ['id']],
    [/^\/api\/remote\/keys(?:\/([^/]+))?$/, ['id']],
    [/^\/api\/remote\/([^/]+)(?:\/([^/]+))?$/, ['resource', 'id']],
    [/^\/sub\/([^/]+)$/, ['token']],
  ];
  for (const [pattern, names] of routes) {
    const m = pathname.match(pattern);
    if (!m) continue;
    const params = {};
    names.forEach((n, i) => {
      if (m[i + 1]) params[n] = m[i + 1].replace(/^\//, '');
    });
    return { params, pattern: pattern.source };
  }
  return null;
}

async function main() {
  console.log('\nXRayMOD smoke tests\n');

  // Auth
  try {
    const h = await hashPassword('secret123');
    assert.ok(h.startsWith('pbkdf2$'));
    assert.equal(await verifyPassword('secret123', h), true);
    assert.equal(await verifyPassword('wrong', h), false);
    ok('PBKDF2 hash + verify');
  } catch (e) {
    fail('PBKDF2 hash + verify', e);
  }

  try {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    assert.notEqual(a, b); // different salts
    ok('Unique salt per hash');
  } catch (e) {
    fail('Unique salt per hash', e);
  }

  // Routes
  try {
    assert.deepEqual(matchRoute('/api/admin/update-check')?.params, { action: 'update-check' });
    assert.deepEqual(matchRoute('/api/cleanip/scan')?.params, { action: 'scan' });
    assert.deepEqual(matchRoute('/api/users/42')?.params, { id: '42' });
    assert.deepEqual(matchRoute('/api/backends/7')?.params, { id: '7' });
    assert.deepEqual(matchRoute('/api/remote/keys/key-1')?.params, { id: 'key-1' });
    assert.deepEqual(matchRoute('/api/remote/users/42')?.params, { resource: 'users', id: '42' });
    assert.deepEqual(matchRoute('/sub/abc-def')?.params, { token: 'abc-def' });
    assert.equal(matchRoute('/api/login')?.params && Object.keys(matchRoute('/api/login').params).length, 0);
    assert.equal(matchRoute('/nope'), null);
    ok('Route param extraction');
  } catch (e) {
    fail('Route param extraction', e);
  }

  // Static candidates logic
  try {
    const build = (pathname) => {
      const p = pathname === '' ? '/' : pathname;
      const clean = p.replace(/\/+$/, '') || '/';
      const out = [];
      if (clean === '/') return ['/index.html', '/login.html', '/panel.html'];
      out.push(clean);
      if (!clean.includes('.')) {
        out.push(`${clean}.html`, `${clean}/index.html`);
      }
      return [...new Set(out)];
    };
    assert.ok(build('/panel/users').includes('/panel/users.html'));
    assert.ok(build('/login').includes('/login.html'));
    ok('Static asset path candidates');
  } catch (e) {
    fail('Static asset path candidates', e);
  }

  // Frontend out exists
  try {
    const fs = await import('node:fs');
    const root = path.resolve(__dirname, '..');
    assert.ok(fs.existsSync(path.join(root, 'frontend/out/index.html')), 'index.html missing — run npm run build:ui');
    assert.ok(fs.existsSync(path.join(root, 'frontend/out/login.html')), 'login.html missing');
    assert.ok(fs.existsSync(path.join(root, 'frontend/out/panel.html')), 'panel.html missing');
    ok('Next.js export artifacts present');
  } catch (e) {
    fail('Next.js export artifacts present', e);
  }

  // Worker entry files
  try {
    const fs = await import('node:fs');
    const root = path.resolve(__dirname, '..');
    for (const f of [
      'worker/index.ts',
      'worker/router.ts',
      'worker/auth.ts',
      'worker/static.ts',
      'worker/api/login.ts',
      'worker/api/users.ts',
      'wrangler.toml',
    ]) {
      assert.ok(fs.existsSync(path.join(root, f)), `missing ${f}`);
    }
    ok('Core worker files present');
  } catch (e) {
    fail('Core worker files present', e);
  }

  // Remote key UI
  try {
    const fs = await import('node:fs');
    const root = path.resolve(__dirname, '..');
    const adminPage = fs.readFileSync(path.join(root, 'frontend/app/panel/admin/page.tsx'), 'utf8');
    assert.ok(adminPage.includes("/api/remote/keys"), 'remote key UI endpoint missing');
    assert.ok(adminPage.includes('Remote access'), 'remote key UI section missing');
    ok('Remote key UI source present');
  } catch (e) {
    fail('Remote key UI source present', e);
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
