import type {
  EdgeCapabilityReport,
  EdgeCredentials,
  EdgeProvider,
  EdgeProviderSummary,
} from './types';

const CF_API = 'https://api.cloudflare.com/client/v4';

/**
 * Cloudflare as Edge Provider: Workers/D1/assets control plane only.
 * Does not execute VPN data-plane traffic.
 */
export class CloudflareEdgeProvider implements EdgeProvider {
  readonly id = 'cloudflare' as const;
  readonly displayName = 'Cloudflare';

  async request(
    creds: EdgeCredentials,
    method: string,
    path: string,
    body?: unknown,
    contentType = 'application/json'
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${creds.apiToken}`,
    };
    let payload: BodyInit | undefined;
    if (body !== undefined) {
      if (typeof body === 'string' || body instanceof ArrayBuffer || body instanceof Uint8Array) {
        headers['Content-Type'] = contentType;
        payload = body as BodyInit;
      } else if (body instanceof FormData) {
        payload = body;
      } else {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
      }
    }
    const res = await fetch(`${CF_API}${path}`, {
      method,
      headers,
      body: payload,
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      errors?: unknown;
      result?: unknown;
    };
    if (!res.ok || data.success === false) {
      const err = JSON.stringify(data.errors || data).slice(0, 500);
      throw new Error(`CF ${method} ${path}: ${err}`);
    }
    return data;
  }

  async discoverCapabilities(creds: EdgeCredentials): Promise<EdgeCapabilityReport[]> {
    const reports: EdgeCapabilityReport[] = [
      {
        capability: 'workers',
        status: 'available',
        note: 'Control-plane Worker runtime (panel/API/UI assets).',
      },
      {
        capability: 'd1',
        status: 'available',
        note: 'Panel state store; not a VPN traffic path.',
      },
      {
        capability: 'workers_assets',
        status: 'available',
        note: 'Static panel export binding.',
      },
      {
        capability: 'custom_hostname',
        status: 'unknown',
        note: 'Depends on zone + SSL for SaaS / custom domains setup.',
      },
      {
        capability: 'spectrum',
        status: 'plan_gated',
        note: 'Requires eligible Cloudflare plan; not assumed available.',
      },
      {
        capability: 'static_ip',
        status: 'plan_gated',
        note: 'Static addressing is plan/product specific; never marketed as “clean IP”.',
      },
      {
        capability: 'load_balancing',
        status: 'plan_gated',
        note: 'Optional; detect before enabling in wizard UI.',
      },
      {
        capability: 'zero_trust_access',
        status: 'unknown',
        note: 'Optional Access policies for panel hardening.',
      },
    ];

    // Soft probe: account token validity. Failures leave defaults above.
    try {
      await this.request(creds, 'GET', `/accounts/${creds.accountId}`);
    } catch {
      for (const r of reports) {
        if (r.capability === 'workers' || r.capability === 'd1') {
          r.status = 'unknown';
          r.note = 'Cloudflare account probe failed; token/account may be missing or invalid.';
        }
      }
    }

    return reports;
  }
}

export function getDefaultEdgeProvider(): EdgeProvider {
  return new CloudflareEdgeProvider();
}

export async function edgeProviderSummary(
  creds: EdgeCredentials | null
): Promise<EdgeProviderSummary> {
  const provider = getDefaultEdgeProvider();
  const capabilities = creds
    ? await provider.discoverCapabilities(creds)
    : [
        {
          capability: 'workers' as const,
          status: 'unknown' as const,
          note: 'No Cloudflare credentials configured in panel kvstore.',
        },
      ];
  return {
    provider: provider.id,
    displayName: provider.displayName,
    capabilities,
  };
}
