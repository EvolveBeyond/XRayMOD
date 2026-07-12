import type { Env } from '../types';
import { requireAdmin } from '../auth';

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleSettings(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  try {
    await requireAdmin(request, env.DB);
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ success: false, message: 'Unauthorized' }, 401);
  }

  if (request.method === 'GET') {
    const rows = await env.DB.prepare(
      'SELECT k, v FROM kvstore WHERE k LIKE ?'
    )
      .bind('panel.%')
      .all<{ k: string; v: string }>();

    const rows2 = await env.DB.prepare(
      'SELECT k, v FROM kvstore WHERE k LIKE ?'
    )
      .bind('financial.%')
      .all<{ k: string; v: string }>();

    const rows3 = await env.DB.prepare(
      'SELECT k, v FROM kvstore WHERE k LIKE ?'
    )
      .bind('integrations.%')
      .all<{ k: string; v: string }>();

    const rows4 = await env.DB.prepare(
      'SELECT k, v FROM kvstore WHERE k LIKE ?'
    )
      .bind('disguise.%')
      .all<{ k: string; v: string }>();

    const rows5 = await env.DB.prepare(
      'SELECT k, v FROM kvstore WHERE k LIKE ?'
    )
      .bind('ech.%')
      .all<{ k: string; v: string }>();

    const rows6 = await env.DB.prepare(
      'SELECT k, v FROM kvstore WHERE k LIKE ?'
    )
      .bind('tls_fragment.%')
      .all<{ k: string; v: string }>();

    const rows7 = await env.DB.prepare(
      'SELECT k, v FROM kvstore WHERE k LIKE ?'
    )
      .bind('tg.%')
      .all<{ k: string; v: string }>();

    const all = [...rows.results, ...rows2.results, ...rows3.results, ...rows4.results, ...rows5.results, ...rows6.results, ...rows7.results];
    const settings: Record<string, any> = {};
    for (const row of all) {
      settings[row.k] = row.v;
    }

    return json({ success: true, data: settings });
  }

  if (request.method === 'PUT' || request.method === 'PATCH') {
    const body = await request.json<Record<string, string>>();

    for (const [k, v] of Object.entries(body)) {
      await env.DB.prepare(
        'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
      )
        .bind(k, String(v), Date.now())
        .run();
    }

    return json({ success: true });
  }

  return json({ success: false, message: 'Method not allowed' }, 405);
}
