/**
 * Control-plane security policy — not a data-plane firewall.
 * Stored in kvstore `security.policy_json`.
 */

export type SecurityPolicy = {
  require_secure_path: boolean;
  origin_protection: boolean;
  pause_data_plane: boolean;
  /** When true, Worker refuses WebSocket/gRPC/XHTTP proxy upgrades. */
  disable_in_worker_proxy: boolean;
  monthly_cap_gb: number;
  notes: string;
};

export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  require_secure_path: true,
  origin_protection: true,
  pause_data_plane: false,
  disable_in_worker_proxy: false,
  monthly_cap_gb: 0,
  notes: 'VPN/proxy traffic belongs on Node Agents, not inside the Worker.',
};

export function parseSecurityPolicy(raw: string | null | undefined): SecurityPolicy {
  if (!raw) return { ...DEFAULT_SECURITY_POLICY };
  try {
    const parsed = JSON.parse(raw) as Partial<SecurityPolicy>;
    return {
      require_secure_path: parsed.require_secure_path !== false,
      origin_protection: parsed.origin_protection !== false,
      pause_data_plane: parsed.pause_data_plane === true,
      disable_in_worker_proxy: parsed.disable_in_worker_proxy === true,
      monthly_cap_gb: Number(parsed.monthly_cap_gb) > 0 ? Number(parsed.monthly_cap_gb) : 0,
      notes: typeof parsed.notes === 'string' ? parsed.notes : DEFAULT_SECURITY_POLICY.notes,
    };
  } catch {
    return { ...DEFAULT_SECURITY_POLICY };
  }
}

export async function readSecurityPolicy(db: D1Database): Promise<SecurityPolicy> {
  const row = await db
    .prepare('SELECT v FROM kvstore WHERE k = ?')
    .bind('security.policy_json')
    .first<{ v: string }>();
  const policy = parseSecurityPolicy(row?.v);
  const paused = await db
    .prepare('SELECT v FROM kvstore WHERE k = ?')
    .bind('panel.paused')
    .first<{ v: string }>();
  if (paused?.v === 'true') policy.pause_data_plane = true;
  const cap = await db
    .prepare('SELECT v FROM kvstore WHERE k = ?')
    .bind('panel.monthly_cap_gb')
    .first<{ v: string }>();
  if (cap?.v) policy.monthly_cap_gb = Number(cap.v) || policy.monthly_cap_gb;
  return policy;
}

export async function writeSecurityPolicy(db: D1Database, policy: SecurityPolicy): Promise<void> {
  const now = Date.now();
  await db
    .prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
    .bind('security.policy_json', JSON.stringify(policy), now)
    .run();
  await db
    .prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
    .bind('panel.paused', policy.pause_data_plane ? 'true' : 'false', now)
    .run();
  if (policy.monthly_cap_gb >= 0) {
    await db
      .prepare('INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)')
      .bind('panel.monthly_cap_gb', String(policy.monthly_cap_gb), now)
      .run();
  }
}
