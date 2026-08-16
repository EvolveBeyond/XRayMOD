import type { Env } from '../types';
import { requireRemoteScope, type RemoteScope } from '../remote-auth';
import { handleUsersAuthorized } from './users';
import { handleConfigsAuthorized } from './configs';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

async function remoteHealth(request: Request, env: Env): Promise<Response> {
  await requireRemoteScope(request, env.DB, 'health:read');
  const configured = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?')
    .bind('panel.password_hash')
    .first<{ v: string }>();
  const version = await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?')
    .bind('panel.version')
    .first<{ v: string }>();
  return json({
    success: true,
    data: {
      api_version: 'v1',
      configured: Boolean(configured?.v),
      version: version?.v || 'unknown',
      capabilities: ['health:read', 'users:read', 'users:write', 'configs:read', 'configs:write'],
    },
  });
}

function scopedAuthorizer(scope: RemoteScope) {
  return async (request: Request, env: Env) => requireRemoteScope(request, env.DB, scope);
}

export async function handleRemote(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  try {
    const resource = params.resource;
    const id = params.id;
    if (resource === 'health' && request.method === 'GET' && !id) {
      return await remoteHealth(request, env);
    }
    if (resource === 'users') {
      const scope = request.method === 'GET' ? 'users:read' : 'users:write';
      return await handleUsersAuthorized(request, env, ctx, { id }, scopedAuthorizer(scope));
    }
    if (resource === 'configs') {
      const scope = request.method === 'GET' ? 'configs:read' : 'configs:write';
      return await handleConfigsAuthorized(request, env, ctx, { id }, scopedAuthorizer(scope));
    }
    return json({ success: false, message: 'Not found' }, 404);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Remote API error', error);
    return json({ success: false, message: 'Remote request failed' }, 500);
  }
}
