import type { Env } from '../types';
import { requireAdmin } from '../auth';
import {
  backendsAsLegacyAgents,
  deleteAgent,
  findAgentByToken,
  generateNodeToken,
  getAgent,
  hashNodeToken,
  listAgents,
  newAgentId,
  NODE_AGENT_PROTOCOL_VERSION,
  NODE_AGENT_TOKEN_PREFIX,
  putAgent,
  type NodeAgentRecord,
  type NodeHeartbeatPayload,
} from '../lib/node-agent';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function publicAgent(a: NodeAgentRecord) {
  const { token_hash: _t, ...rest } = a;
  return rest;
}

async function requireAgentAuth(request: Request, env: Env): Promise<NodeAgentRecord> {
  const authorization = request.headers.get('Authorization') || '';
  const match = authorization.match(/^Bearer (xrm_node_[A-Za-z0-9_-]{16,128})$/);
  if (!match) {
    throw json({ success: false, message: 'Unauthorized' }, 401);
  }
  const agent = await findAgentByToken(env.DB, match[1]);
  if (!agent || agent.status === 'disabled') {
    throw json({ success: false, message: 'Unauthorized' }, 401);
  }
  return agent;
}

export async function handleAgents(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const action = (params.action || '').toLowerCase();

  // Agent-authenticated control-plane endpoints (no admin session)
  if (action === 'heartbeat' && request.method === 'POST') {
    try {
      const agent = await requireAgentAuth(request, env);
      const body = (await request.json().catch(() => ({}))) as NodeHeartbeatPayload;
      agent.last_seen = Date.now();
      agent.status = 'online';
      agent.last_error = body.error || '';
      if (Array.isArray(body.capabilities)) agent.capabilities = body.capabilities;
      if (typeof body.hostname === 'string' && body.hostname) agent.host = body.hostname;
      agent.protocol_version = Number(body.protocol_version) || NODE_AGENT_PROTOCOL_VERSION;
      await putAgent(env.DB, agent);
      return json({
        success: true,
        protocol_version: NODE_AGENT_PROTOCOL_VERSION,
        agent_id: agent.id,
        status: agent.status,
      });
    } catch (e) {
      if (e instanceof Response) return e;
      return json({ success: false, message: 'Heartbeat failed' }, 500);
    }
  }

  if (action === 'config' && request.method === 'GET') {
    try {
      const agent = await requireAgentAuth(request, env);
      const users = await env.DB.prepare(
        "SELECT uuid, status FROM users WHERE role != 'admin' AND uuid IS NOT NULL LIMIT 500"
      ).all<{ uuid: string; status: string }>();
      return json({
        success: true,
        protocol_version: NODE_AGENT_PROTOCOL_VERSION,
        agent_id: agent.id,
        status: agent.status,
        desired: {
          users: users.results || [],
          note: 'Apply this user set on the node runtime (Xray/sing-box). The Worker does not terminate VPN sessions.',
        },
      });
    } catch (e) {
      if (e instanceof Response) return e;
      return json({ success: false, message: 'Config pull failed' }, 500);
    }
  }

  if (action === 'health' && request.method === 'GET') {
    try {
      const agent = await requireAgentAuth(request, env);
      return json({
        success: true,
        agent_id: agent.id,
        status: agent.status,
        last_seen: agent.last_seen,
        protocol_version: NODE_AGENT_PROTOCOL_VERSION,
      });
    } catch (e) {
      if (e instanceof Response) return e;
      return json({ success: false, message: 'Health failed' }, 500);
    }
  }

  try {
    await requireAdmin(request, env.DB);
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ success: false, message: 'Unauthorized' }, 401);
  }

  if (request.method === 'GET' && !action) {
    const agents = await listAgents(env.DB);
    const legacy = await backendsAsLegacyAgents(env.DB);
    return json({
      success: true,
      data: {
        agents: agents.map(publicAgent),
        legacy_backends: legacy.map(publicAgent),
        token_prefix: NODE_AGENT_TOKEN_PREFIX,
        protocol_version: NODE_AGENT_PROTOCOL_VERSION,
      },
    });
  }

  if (request.method === 'POST' && (!action || action === 'enroll')) {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      host?: string;
      port?: number;
    };
    const id = newAgentId();
    const rawToken = generateNodeToken();
    const rec: NodeAgentRecord = {
      id,
      name: (body.name || 'Node').slice(0, 80),
      host: (body.host || '').slice(0, 255),
      port: Number(body.port) > 0 ? Number(body.port) : 443,
      status: 'pending',
      protocol_version: NODE_AGENT_PROTOCOL_VERSION,
      last_seen: null,
      last_error: '',
      capabilities: [],
      token_hash: await hashNodeToken(rawToken),
      created_at: Date.now(),
    };
    await putAgent(env.DB, rec);
    return json(
      {
        success: true,
        data: {
          ...publicAgent(rec),
          token: rawToken,
          enroll: {
            heartbeat: 'POST /api/agents/heartbeat',
            config: 'GET /api/agents/config',
            health: 'GET /api/agents/health',
            authorization: `Bearer ${NODE_AGENT_TOKEN_PREFIX}…`,
          },
        },
        message: 'Copy the token now — it is not shown again.',
      },
      201
    );
  }

  if (request.method === 'DELETE' && params.action) {
    const existing = await getAgent(env.DB, params.action);
    if (!existing) return json({ success: false, message: 'Not found' }, 404);
    await deleteAgent(env.DB, params.action);
    return json({ success: true });
  }

  return json({ success: false, message: 'Method not allowed' }, 405);
}
