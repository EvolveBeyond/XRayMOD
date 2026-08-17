/**
 * Node Agent contract — control plane ↔ data plane.
 * Agents run on operator nodes (Xray / sing-box). The Worker never carries VPN traffic.
 */

export const NODE_AGENT_PROTOCOL_VERSION = 1;
export const NODE_AGENT_TOKEN_PREFIX = 'xrm_node_';
export const HEARTBEAT_STALE_MS = 3 * 60 * 1000;

export type NodeAgentStatus = 'pending' | 'online' | 'stale' | 'disabled' | 'error';

export type NodeAgentRecord = {
  id: string;
  name: string;
  host: string;
  port: number;
  status: NodeAgentStatus;
  protocol_version: number;
  last_seen: number | null;
  last_error: string;
  capabilities: string[];
  /** One-time token hash (SHA-256 hex). Raw token shown once at enroll. */
  token_hash: string;
  created_at: number;
  /** Compatibility: sourced from backends table when migrated. */
  legacy_backend_id?: number;
};

export type NodeHeartbeatPayload = {
  agent_id?: string;
  protocol_version?: number;
  hostname?: string;
  load?: { cpu?: number; ram?: number; users?: number };
  capabilities?: string[];
  error?: string;
};

export type NodeConfigPull = {
  protocol_version: number;
  agent_id: string;
  status: NodeAgentStatus;
  /** Config fragments for the node runtime — not executed in the Worker. */
  desired: {
    users: Array<{ uuid: string; status: string }>;
    note: string;
  };
};

export function generateNodeToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const token = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `${NODE_AGENT_TOKEN_PREFIX}${token}`;
}

export async function hashNodeToken(token: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function newAgentId(): string {
  return crypto.randomUUID();
}

export function deriveStatus(rec: NodeAgentRecord, now = Date.now()): NodeAgentStatus {
  if (rec.status === 'disabled' || rec.status === 'error') return rec.status;
  if (!rec.last_seen) return 'pending';
  if (now - rec.last_seen > HEARTBEAT_STALE_MS) return 'stale';
  return 'online';
}

export function parseAgentJson(raw: string): NodeAgentRecord | null {
  try {
    const o = JSON.parse(raw) as NodeAgentRecord;
    if (!o?.id || !o.token_hash) return null;
    return o;
  } catch {
    return null;
  }
}

export async function listAgents(db: D1Database): Promise<NodeAgentRecord[]> {
  const rows = await db
    .prepare('SELECT k, v FROM kvstore WHERE k LIKE ?')
    .bind('agent:%')
    .all<{ k: string; v: string }>();
  const now = Date.now();
  return (rows.results || [])
    .map((r) => parseAgentJson(r.v))
    .filter((a): a is NodeAgentRecord => !!a)
    .map((a) => ({ ...a, status: deriveStatus(a, now) }));
}

export async function getAgent(db: D1Database, id: string): Promise<NodeAgentRecord | null> {
  const row = await db
    .prepare('SELECT v FROM kvstore WHERE k = ?')
    .bind(`agent:${id}`)
    .first<{ v: string }>();
  if (!row?.v) return null;
  const rec = parseAgentJson(row.v);
  return rec ? { ...rec, status: deriveStatus(rec) } : null;
}

export async function putAgent(db: D1Database, rec: NodeAgentRecord): Promise<void> {
  await db
    .prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
    .bind(`agent:${rec.id}`, JSON.stringify(rec), Date.now())
    .run();
}

export async function deleteAgent(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM kvstore WHERE k = ?').bind(`agent:${id}`).run();
}

export async function findAgentByToken(
  db: D1Database,
  bearer: string
): Promise<NodeAgentRecord | null> {
  if (!bearer.startsWith(NODE_AGENT_TOKEN_PREFIX)) return null;
  const hash = await hashNodeToken(bearer);
  const agents = await listAgents(db);
  return agents.find((a) => a.token_hash === hash) || null;
}

/** Map existing backends rows into agent-shaped objects (read-only shim). */
export async function backendsAsLegacyAgents(db: D1Database): Promise<NodeAgentRecord[]> {
  const rows = await db.prepare('SELECT * FROM backends ORDER BY created_at DESC').all<{
    id: number;
    vps_ip: string;
    vps_port: number;
    status: string;
    created_at: number;
  }>();
  return (rows.results || []).map((b) => ({
    id: `legacy-backend-${b.id}`,
    name: `Legacy backend ${b.vps_ip}`,
    host: b.vps_ip,
    port: b.vps_port || 443,
    status: b.status === 'active' ? 'online' : 'pending',
    protocol_version: NODE_AGENT_PROTOCOL_VERSION,
    last_seen: null,
    last_error: '',
    capabilities: ['legacy_backend'],
    token_hash: '',
    created_at: b.created_at || 0,
    legacy_backend_id: b.id,
  }));
}
