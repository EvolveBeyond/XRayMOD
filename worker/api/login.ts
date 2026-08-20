import type { Env } from '../types';
import {
  verifyPassword,
  createSession,
  setSessionCookie,
  checkLoginRateLimit,
  recordLoginAttempt,
  create2faChallenge,
  consume2faChallenge,
  verifyTotp,
} from '../auth';

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export async function handleLogin(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed' }, 405);
  }

  const clientIP =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    'unknown';
  const allowed = await checkLoginRateLimit(env.DB, clientIP);
  if (!allowed) {
    return json({ success: false, message: 'Too many attempts, try again later' }, 429);
  }

  try {
    const body = await request.json<{
      username?: string;
      password?: string;
      totp?: string;
      challenge?: string;
    }>();

    // Complete 2FA challenge
    if (body.challenge && body.totp) {
      const challenge = await consume2faChallenge(env.DB, body.challenge);
      if (!challenge) {
        await recordLoginAttempt(env.DB, clientIP);
        return json({ success: false, message: 'Invalid or expired 2FA challenge' }, 401);
      }

      const secretRow = await env.DB.prepare(
        'SELECT v FROM kvstore WHERE k = ?'
      ).bind('panel.2fa_secret').first<{ v: string }>();

      if (!secretRow?.v || !(await verifyTotp(secretRow.v, body.totp))) {
        await recordLoginAttempt(env.DB, clientIP);
        return json({ success: false, message: 'Invalid 2FA code' }, 401);
      }

      const sessionToken = await createSession(env.DB, challenge.userId, challenge.role);
      const user = await env.DB.prepare(
        'SELECT id, username, email FROM users WHERE id = ?'
      ).bind(challenge.userId).first<{ id: number; username: string; email: string }>();

      return json(
        {
          success: true,
          role: challenge.role,
          user: user
            ? { id: user.id, username: user.username, email: user.email }
            : { id: challenge.userId, username: '', email: '' },
        },
        200,
        { 'Set-Cookie': setSessionCookie(sessionToken, request) }
      );
    }

    const { username, password } = body;
    if (!username || !password) {
      return json({ success: false, message: 'Username and password required' }, 400);
    }

    // BPB-style: when CF email is enforced, login username must match
    const cfEmailRow = await env.DB.prepare(
      'SELECT v FROM kvstore WHERE k = ?'
    ).bind('panel.cf_email').first<{ v: string }>();
    const enforceRow = await env.DB.prepare(
      'SELECT v FROM kvstore WHERE k = ?'
    ).bind('panel.cf_email_enforce').first<{ v: string }>();
    const cfEmail = (cfEmailRow?.v || '').trim().toLowerCase();
    const enforce = enforceRow?.v !== 'false' && !!cfEmail;
    if (enforce && username.trim().toLowerCase() !== cfEmail) {
      await recordLoginAttempt(env.DB, clientIP);
      return json(
        {
          success: false,
          message: 'Sign in with the Cloudflare email stored in the panel',
        },
        401
      );
    }

    const user = await env.DB.prepare(
      'SELECT id, username, password_hash, role, email FROM users WHERE username = ? OR (email != "" AND lower(email) = lower(?))'
    )
      .bind(username, username)
      .first<{
        id: number;
        username: string;
        password_hash: string;
        role: string;
        email: string;
      }>();

    if (!user) {
      await recordLoginAttempt(env.DB, clientIP);
      return json({ success: false, message: 'Invalid credentials' }, 401);
    }

    let valid = await verifyPassword(password, user.password_hash);
    let needsHashSync = false;

    // Fallback: panel.password_hash (install path)
    if (!valid && user.role === 'admin') {
      const panelHash = await env.DB.prepare(
        'SELECT v FROM kvstore WHERE k = ?'
      ).bind('panel.password_hash').first<{ v: string }>();
      if (panelHash?.v) {
        valid = await verifyPassword(password, panelHash.v);
        if (valid && panelHash.v !== user.password_hash) needsHashSync = true;
      }
    }

    // Fallback: install credentials_json plaintext (recovery after deploy/hash drift)
    if (!valid && user.role === 'admin') {
      const credRow = await env.DB.prepare(
        'SELECT v FROM kvstore WHERE k = ?'
      ).bind('panel.credentials_json').first<{ v: string }>();
      if (credRow?.v) {
        try {
          const cred = JSON.parse(credRow.v) as { username?: string; password?: string };
          const cu = String(cred.username || 'admin').trim().toLowerCase();
          const cp = String(cred.password || '');
          if (
            cp &&
            username.trim().toLowerCase() === cu &&
            password === cp
          ) {
            valid = true;
            needsHashSync = true;
          }
        } catch {
          /* ignore */
        }
      }
    }

    if (!valid) {
      await recordLoginAttempt(env.DB, clientIP);
      return json(
        { success: false, message: 'Invalid username or password' },
        401
      );
    }

    // Transparent upgrade / resync hashes after recovery fallbacks
    if (!user.password_hash.startsWith('pbkdf2$') || needsHashSync) {
      const { hashPassword } = await import('../auth');
      const upgraded = await hashPassword(password);
      await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        .bind(upgraded, user.id)
        .run();
      if (user.role === 'admin') {
        await env.DB.prepare(
          'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
        )
          .bind('panel.password_hash', upgraded, Date.now())
          .run();
      }
    }

    // 2FA gate for admin
    const twoFA = await env.DB.prepare(
      'SELECT v FROM kvstore WHERE k = ?'
    ).bind('panel.2fa_enabled').first<{ v: string }>();

    if (twoFA?.v === 'true' && user.role === 'admin') {
      if (body.totp) {
        const secretRow = await env.DB.prepare(
          'SELECT v FROM kvstore WHERE k = ?'
        ).bind('panel.2fa_secret').first<{ v: string }>();
        if (!secretRow?.v || !(await verifyTotp(secretRow.v, body.totp))) {
          await recordLoginAttempt(env.DB, clientIP);
          return json({ success: false, message: 'Invalid 2FA code' }, 401);
        }
      } else {
        const challenge = await create2faChallenge(env.DB, user.id, user.role);
        return json({
          success: false,
          require2fa: true,
          challenge,
          message: '2FA code required',
        }, 200);
      }
    }

    const sessionToken = await createSession(env.DB, user.id, user.role);

    const firstLoginRow = await env.DB.prepare(
      'SELECT v FROM kvstore WHERE k = ?'
    ).bind('panel.first_login_done').first<{ v: string }>();
    const isFirstLogin = !firstLoginRow?.v || firstLoginRow.v !== 'true';

    let initialConfig: Record<string, unknown> | null = null;
    if (isFirstLogin && user.role === 'admin') {
      const url = new URL(request.url);
      const accessUUID = await env.DB.prepare(
        'SELECT v FROM kvstore WHERE k = ?'
      ).bind('panel.access_uuid').first<{ v: string }>();
      const adminUser = await env.DB.prepare(
        'SELECT uuid FROM users WHERE role = ?'
      ).bind('admin').first<{ uuid: string }>();

      initialConfig = {
        panelUrl: `${url.protocol}//${url.host}/${accessUUID?.v || ''}/panel`,
        subscriptionUrl: `${url.protocol}//${url.host}/${accessUUID?.v || ''}/sub/${adminUser?.uuid || ''}`,
        adminUuid: adminUser?.uuid || '',
        accessUuid: accessUUID?.v || '',
        securePath: accessUUID?.v || '',
        instructions: [
          'Save your Panel URL — SECURE PATH is required; /panel alone will not work',
          'Share the Subscription URL (includes SECURE PATH) with clients',
          'Install a client (v2rayNG ≥2.2.3, sing-box ≥1.12.0) and enable Hev TUN on Android',
          'Set Cloudflare email in Admin Dashboard for stronger login binding',
        ],
      };

      await env.DB.prepare(
        'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
      )
        .bind('panel.first_login_done', 'true', Date.now())
        .run();
    }

    return json(
      {
        success: true,
        role: user.role,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        ...(initialConfig ? { initialConfig } : {}),
      },
      200,
      { 'Set-Cookie': setSessionCookie(sessionToken, request) }
    );
  } catch {
    return json({ success: false, message: 'Invalid request body' }, 400);
  }
}
