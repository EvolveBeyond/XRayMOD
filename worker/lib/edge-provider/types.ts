/**
 * Edge Provider abstraction — control-plane integration with edge platforms.
 * Cloudflare is the first concrete provider; VPN data-plane stays on nodes.
 */

export type EdgeProviderId = 'cloudflare';

/** Features the control plane may use; honesty > marketing. */
export type EdgeCapability =
  | 'workers'
  | 'd1'
  | 'workers_assets'
  | 'custom_hostname'
  | 'spectrum'
  | 'static_ip'
  | 'load_balancing'
  | 'zero_trust_access';

export type CapabilityStatus = 'available' | 'unavailable' | 'unknown' | 'plan_gated';

export type EdgeCapabilityReport = {
  capability: EdgeCapability;
  status: CapabilityStatus;
  /** Human-readable; never claim VPN-detection evasion. */
  note?: string;
};

export type EdgeCredentials = {
  apiToken: string;
  accountId: string;
};

export interface EdgeProvider {
  readonly id: EdgeProviderId;
  readonly displayName: string;

  /** Low-level authenticated API call (provider-specific path vocabulary). */
  request(
    creds: EdgeCredentials,
    method: string,
    path: string,
    body?: unknown,
    contentType?: string
  ): Promise<unknown>;

  /**
   * Conservative capability discovery. Prefer `unknown` / `plan_gated` over
   * false “available” when the plan cannot be proven.
   */
  discoverCapabilities(creds: EdgeCredentials): Promise<EdgeCapabilityReport[]>;
}

export type EdgeProviderSummary = {
  provider: EdgeProviderId;
  displayName: string;
  capabilities: EdgeCapabilityReport[];
};
