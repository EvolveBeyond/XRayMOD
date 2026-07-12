import type { Env } from '../types';
import { requireAdmin } from '../auth';

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleBackends(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  try {
    await requireAdmin(request, env.DB);
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ success: false, message: 'Unauthorized' }, 401);
  }

  // GET /api/backends — list all backends
  if (request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT * FROM backends ORDER BY created_at DESC').all<any>();
    return json({ success: true, data: rows.results });
  }

  // POST /api/backends — register a backend
  if (request.method === 'POST') {
    const body = await request.json<{ user_id?: number; vps_ip: string; vps_port?: number; vps_uuid?: string }>();

    if (!body.vps_ip) {
      return json({ success: false, message: 'VPS IP is required' }, 400);
    }

    // Validate IP format
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(body.vps_ip)) {
      return json({ success: false, message: 'Invalid IP format' }, 400);
    }

    const port = body.vps_port || 443;

    // Get admin user ID
    const adminRow = await env.DB.prepare('SELECT id FROM users WHERE role = ?').bind('admin').first<{ id: number }>();
    const userId = body.user_id || adminRow?.id || 1;

    // Get user UUID for backend
    const userRow = await env.DB.prepare('SELECT uuid FROM users WHERE id = ?').bind(userId).first<{ uuid: string }>();

    await env.DB.prepare(
      'INSERT INTO backends (user_id, vps_ip, vps_port, vps_uuid, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(userId, body.vps_ip, port, userRow?.uuid || '', 'active', Date.now()).run();

    return json({ success: true, message: 'Backend registered' });
  }

  // DELETE /api/backends/:id — remove a backend
  if (request.method === 'DELETE') {
    const id = params.id;
    if (!id) return json({ success: false, message: 'ID required' }, 400);

    await env.DB.prepare('DELETE FROM backends WHERE id = ?').bind(Number(id)).run();
    return json({ success: true, message: 'Backend removed' });
  }

  return json({ success: false, message: 'Method not allowed' }, 405);
}
