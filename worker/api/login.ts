import type { Env } from '../types';
import { verifyPassword, createSession, setSessionCookie } from '../auth';

function json(data: any, status = 200, headers: Record<string, string> = {}): Response {
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

  try {
    const { username, password } = await request.json<{ username: string; password: string }>();

    if (!username || !password) {
      return json({ success: false, message: 'Username and password required' }, 400);
    }

    const user = await env.DB.prepare(
      'SELECT id, username, password_hash, role, email FROM users WHERE username = ?'
    )
      .bind(username)
      .first<{
        id: number;
        username: string;
        password_hash: string;
        role: string;
        email: string;
      }>();

    if (!user) {
      return json({ success: false, message: 'Invalid credentials' }, 401);
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return json({ success: false, message: 'Invalid credentials' }, 401);
    }

    const sessionToken = await createSession(env.DB, user.id, user.role);

    // Check if first login
    const firstLoginRow = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('panel.first_login_done').first<{ v: string }>();
    const isFirstLogin = !firstLoginRow?.v || firstLoginRow.v !== 'true';

    let initialConfig: any = null;
    if (isFirstLogin && user.role === 'admin') {
      const url = new URL(request.url);
      const accessUUID = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?').bind('panel.access_uuid').first<{ v: string }>();
      const adminUser = await env.DB.prepare('SELECT uuid FROM users WHERE role = ?').bind('admin').first<{ uuid: string }>();

      initialConfig = {
        panelUrl: `${url.protocol}//${url.host}/${accessUUID?.v || ''}`,
        subscriptionUrl: `${url.protocol}//${url.host}/sub/${adminUser?.uuid || ''}`,
        adminUuid: adminUser?.uuid || '',
        accessUuid: accessUUID?.v || '',
        instructions: [
          'Save your Panel URL — this is the only way to access your panel',
          'Share the Subscription URL with clients to connect',
          'Install a client app (V2RayNG, sing-box, Clash) and import the subscription',
          'Go to Settings to configure protocols, ECH, clean IPs, and Telegram bot',
        ],
      };

      // Mark first login done
      await env.DB.prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
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
      { 'Set-Cookie': setSessionCookie(sessionToken) }
    );
  } catch (e) {
    return json({ success: false, message: 'Invalid request body' }, 400);
  }
}
