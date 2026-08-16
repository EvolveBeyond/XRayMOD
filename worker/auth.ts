import type { Env, User } from './types';

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
const LOGIN_RATE_LIMIT = 5;
const LOGIN_RATE_WINDOW = 60000;
// Keep iterations modest: Workers free/bundled CPU is tight; 12k is still salted+slow enough for panel passwords.
const PBKDF2_ITERATIONS = 12_000;
const SALT_BYTES = 16;

export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  const len = Math.max(ba.length, bb.length);
  let result = ba.length === bb.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    result |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return result === 0;
}

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Legacy SHA-256 (no salt) — kept for migration */
async function hashPasswordLegacy(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return toHex(hashBuffer);
}

/** Fast hash for seed/bootstrap only (legacy format). Prefer hashPassword for real user passwords. */
export async function hashPasswordFast(password: string): Promise<string> {
  return hashPasswordLegacy(password);
}

/** PBKDF2-SHA256 with random salt: `pbkdf2$12000$<saltHex>$<hashHex>` */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
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
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    key,
    256
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored) return false;

  // New format
  if (stored.startsWith('pbkdf2$')) {
    const parts = stored.split('$');
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10) || PBKDF2_ITERATIONS;
    const salt = fromHex(parts[2]);
    const expected = parts[3];
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      key,
      256
    );
    return timingSafeEqual(toHex(bits), expected);
  }

  // Legacy SHA-256
  const legacy = await hashPasswordLegacy(password);
  return timingSafeEqual(legacy, stored);
}

// ── TOTP (RFC 6238) ──────────────────────────────────────────

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateTotpSecret(bytes = 20): string {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  let bits = '';
  for (const b of raw) bits += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out;
}

function base32Decode(input: string): Uint8Array {
  const clean = input.replace(/=+$/, '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const c of clean) {
    const val = BASE32_ALPHABET.indexOf(c);
    if (val < 0) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

async function hotp(secret: Uint8Array, counter: number): Promise<string> {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  // high 32 bits always 0 for practical counters
  view.setUint32(0, 0);
  view.setUint32(4, counter >>> 0);

  const key = await crypto.subtle.importKey(
    'raw',
    secret,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));
  const offset = sig[sig.length - 1] & 0x0f;
  const code =
    ((sig[offset] & 0x7f) << 24) |
    ((sig[offset + 1] & 0xff) << 16) |
    ((sig[offset + 2] & 0xff) << 8) |
    (sig[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, '0');
}

export async function verifyTotp(secretBase32: string, code: string, window = 1): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const secret = base32Decode(secretBase32);
  const timestep = Math.floor(Date.now() / 1000 / 30);
  for (let w = -window; w <= window; w++) {
    const expected = await hotp(secret, timestep + w);
    if (timingSafeEqual(expected, code)) return true;
  }
  return false;
}

export function totpOtpauthUrl(secret: string, account: string, issuer = 'XRayMOD'): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// ── Rate limit ───────────────────────────────────────────────

export async function checkLoginRateLimit(db: D1Database, ip: string): Promise<boolean> {
  const key = `ratelimit:login:${ip}`;
  const row = await db.prepare('SELECT v, updated FROM kvstore WHERE k = ?').bind(key).first<{ v: string; updated: number }>();
  if (!row) return true;
  const data = JSON.parse(row.v || '{"count":0,"first":0}');
  const now = Date.now();
  if (now - data.first > LOGIN_RATE_WINDOW) {
    await db.prepare('DELETE FROM kvstore WHERE k = ?').bind(key).run();
    return true;
  }
  return data.count < LOGIN_RATE_LIMIT;
}

export async function recordLoginAttempt(db: D1Database, ip: string): Promise<void> {
  const key = `ratelimit:login:${ip}`;
  const row = await db.prepare('SELECT v FROM kvstore WHERE k = ?').bind(key).first<{ v: string }>();
  const now = Date.now();
  let data = { count: 1, first: now };
  if (row) {
    const prev = JSON.parse(row.v || '{"count":0,"first":0}');
    if (now - prev.first > LOGIN_RATE_WINDOW) {
      data = { count: 1, first: now };
    } else {
      data = { count: prev.count + 1, first: prev.first };
    }
  }
  await db.prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)').bind(key, JSON.stringify(data), now).run();
}

// ── Sessions ─────────────────────────────────────────────────

export function generateSessionToken(): string {
  return crypto.randomUUID() + '-' + toHex(crypto.getRandomValues(new Uint8Array(16)));
}

export async function createSession(
  db: D1Database,
  userId: number,
  role: string
): Promise<string> {
  const token = generateSessionToken();
  const sessionData = JSON.stringify({
    userId,
    role,
    created: Date.now(),
  });
  await db
    .prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
    .bind(`session:${token}`, sessionData, Date.now())
    .run();
  return token;
}

export async function getSession(
  db: D1Database,
  token: string
): Promise<{ userId: number; role: string } | null> {
  if (!token || token.length < 10) return null;
  const row = await db
    .prepare('SELECT v FROM kvstore WHERE k = ?')
    .bind(`session:${token}`)
    .first<{ v: string }>();
  if (!row) return null;

  try {
    const data = JSON.parse(row.v);
    if (Date.now() - data.created > SESSION_TTL) {
      await db.prepare('DELETE FROM kvstore WHERE k = ?').bind(`session:${token}`).run();
      return null;
    }
    return { userId: data.userId, role: data.role };
  } catch {
    return null;
  }
}

export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await db.prepare('DELETE FROM kvstore WHERE k = ?').bind(`session:${token}`).run();
}

export function extractSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
  return match ? match[1] : null;
}

export function setSessionCookie(token: string, request?: Request, maxAge = SESSION_TTL / 1000): string {
  const isHttps = request
    ? new URL(request.url).protocol === 'https:'
    : true;
  const parts = [
    `session=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(maxAge)}`,
  ];
  if (isHttps) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookie(request?: Request): string {
  const isHttps = request
    ? new URL(request.url).protocol === 'https:'
    : true;
  const parts = ['session=', 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (isHttps) parts.push('Secure');
  return parts.join('; ');
}

export async function authenticateRequest(
  request: Request,
  db: D1Database
): Promise<{ userId: number; role: string } | null> {
  const token = extractSessionToken(request);
  if (!token) return null;
  return getSession(db, token);
}

export async function requireAuth(
  request: Request,
  db: D1Database
): Promise<{ userId: number; role: string }> {
  const session = await authenticateRequest(request, db);
  if (!session) {
    throw new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return session;
}

export async function requireAdmin(
  request: Request,
  db: D1Database
): Promise<{ userId: number; role: string }> {
  const session = await requireAuth(request, db);
  if (session.role !== 'admin') {
    throw new Response(JSON.stringify({ success: false, message: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return session;
}

/** Pending 2FA challenge tokens (short-lived) */
export async function create2faChallenge(db: D1Database, userId: number, role: string): Promise<string> {
  const token = crypto.randomUUID();
  await db
    .prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
    .bind(
      `2fa:${token}`,
      JSON.stringify({ userId, role, created: Date.now() }),
      Date.now()
    )
    .run();
  return token;
}

export async function consume2faChallenge(
  db: D1Database,
  token: string
): Promise<{ userId: number; role: string } | null> {
  const row = await db
    .prepare('SELECT v FROM kvstore WHERE k = ?')
    .bind(`2fa:${token}`)
    .first<{ v: string }>();
  if (!row) return null;
  await db.prepare('DELETE FROM kvstore WHERE k = ?').bind(`2fa:${token}`).run();
  try {
    const data = JSON.parse(row.v);
    if (Date.now() - data.created > 5 * 60 * 1000) return null;
    return { userId: data.userId, role: data.role };
  } catch {
    return null;
  }
}
