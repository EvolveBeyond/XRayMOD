import type { Env } from '../types';
import { extractSessionToken, deleteSession, clearSessionCookie } from '../auth';

export async function handleLogout(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const token = extractSessionToken(request);
  if (token) {
    await deleteSession(env.DB, token);
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Logged out' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearSessionCookie(),
      },
    }
  );
}
