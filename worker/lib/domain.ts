/**
 * Domain vocabulary for the Secure VPN Infrastructure Control Plane.
 * Legacy names (backend / cleanip / disguise) stay as compatibility aliases.
 */

export type DataPlaneKind = 'node_agent' | 'legacy_backend' | 'in_worker_proxy';

export const DOMAIN = {
  node: 'node',
  nodeAgent: 'node_agent',
  backendLegacy: 'backend',
  edgeEndpoint: 'edge_endpoint',
  originProtection: 'origin_protection',
  panelSurface: 'panel_surface',
} as const;

export function backendAsNodeLabel(legacy = true): string {
  return legacy ? 'Node (legacy backend)' : 'Node Agent';
}

/** Honest copy for former “Clean IP” surfaces. */
export const EDGE_ENDPOINT_DISCLAIMER =
  'Cloudflare anycast addresses are not residential, “clean”, or guaranteed to evade VPN/proxy classification.';

/** Honest copy for former “disguise/stealth” surfaces. */
export const ORIGIN_PROTECTION_DISCLAIMER =
  'Public panel paths return a generic error page so scanners do not fingerprint the admin UI. This is origin protection, not traffic camouflage.';
