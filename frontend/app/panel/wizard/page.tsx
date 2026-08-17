'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, KeyRound } from 'lucide-react';
import { api } from '@/lib/api';
import { getApiBase } from '@/lib/paths';
import { Card, CardHeader, Button, Input, PageHeader } from '@/components';
import { toast } from 'sonner';

type Cap = { capability: string; status: string; note?: string };
type WizardData = {
  configured?: boolean;
  artifact?: { channel?: string; url?: string; product_version?: string; note?: string };
  state?: { step?: string };
};

export default function WizardPage() {
  const [info, setInfo] = useState<WizardData | null>(null);
  const [caps, setCaps] = useState<Cap[]>([]);
  const [planGated, setPlanGated] = useState<string[]>([]);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const w = await api.get('/api/wizard');
      setInfo(w?.data || w);
      const c = await api.get('/api/wizard/capabilities');
      setCaps(c?.data?.capabilities || []);
      setPlanGated(c?.data?.plan_gated || []);
    } catch {
      toast.error('Wizard API unavailable');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submitToken = async () => {
    if (token.trim().length < 20) {
      toast.error('Cloudflare API token is too short');
      return;
    }
    setBusy(true);
    try {
      const base = getApiBase().replace(/\/$/, '');
      const res = await fetch(`${base}/api/wizard/setup`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${token.trim()}`, Accept: 'application/json' },
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        data?: { accountName?: string; accountId?: string };
      };
      if (!res.ok || data.success === false) {
        toast.error(data.message || 'Token rejected');
      } else {
        toast.success(`Account ${data.data?.accountName || data.data?.accountId || 'ok'}`);
        setToken('');
        await load();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Setup failed');
    }
    setBusy(false);
  };

  const steps = ['auth', 'capabilities', 'artifacts', 'deploy', 'done'];
  const current = info?.state?.step || 'idle';

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        eyebrow="Onboarding"
        title="Wizard"
        description="Canonical deploy path: token → plan check → rolling artifacts. Shell installers are deprecated."
        actions={
          <Button variant="secondary" onClick={load}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        }
      />

      <p className="text-sm text-zinc-500">
        OAuth is preferred when a Cloudflare OAuth app is configured; API tokens remain supported.
        Wizard deploys <code className="text-emerald-400">releases/tag/rolling</code>, not a mutable
        branch tip.
      </p>

      <div className="flex flex-wrap gap-2">
        {steps.map((s) => (
          <span
            key={s}
            className={`text-xs px-3 py-1 rounded-full border ${
              current === s
                ? 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10'
                : 'border-zinc-800 text-zinc-500'
            }`}
          >
            {s}
          </span>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="1. Auth" description="API token today · OAuth preferred" />
          <div className="space-y-3">
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Cloudflare API token (Edit Workers + D1)"
            />
            <Button onClick={submitToken} disabled={busy}>
              <KeyRound size={14} />
              Save token & probe account
            </Button>
            {info?.configured ? (
              <p className="text-xs text-emerald-400">Wizard token stored.</p>
            ) : (
              <p className="text-xs text-amber-300">No wizard token yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="2. Capabilities" description="Plan-gated features stay blocked" />
          <div className="space-y-2 max-h-56 overflow-auto">
            {caps.map((c) => (
              <div key={c.capability} className="flex justify-between gap-2 text-xs">
                <span className="font-mono text-zinc-300">{c.capability}</span>
                <span
                  className={
                    c.status === 'available'
                      ? 'text-emerald-400'
                      : c.status === 'plan_gated'
                        ? 'text-amber-300'
                        : 'text-zinc-500'
                  }
                >
                  {c.status}
                </span>
              </div>
            ))}
            {!caps.length && <p className="text-xs text-zinc-500">Save a token to probe the account.</p>}
          </div>
          {planGated.length > 0 && (
            <p className="text-[11px] text-amber-300 mt-2">
              Blocked until plan proves them: {planGated.join(', ')}
            </p>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="3. Artifacts" description="Verified rolling bundle" />
        <div className="text-sm text-zinc-400 space-y-1">
          <p>
            Channel: <code className="text-emerald-400">{info?.artifact?.channel || 'rolling'}</code>
            {info?.artifact?.product_version ? ` · ${info.artifact.product_version}` : ''}
          </p>
          <p className="text-xs break-all">{info?.artifact?.url}</p>
          <p className="text-xs text-zinc-500">{info?.artifact?.note}</p>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="4. Data plane"
          description="Enroll a Node Agent — do not run VPN traffic inside the Worker"
        />
        <p className="text-sm text-zinc-400 mb-2">After enroll on the Nodes page, on the VPS:</p>
        <pre className="text-[11px] bg-zinc-950 border border-zinc-800 rounded-xl p-3 overflow-x-auto text-zinc-300">
          {`bash scripts/node-agent.sh https://YOUR_WORKER.workers.dev xrm_node_…`}
        </pre>
        <p className="text-[11px] text-zinc-500 mt-2">
          Shell <code>install.sh</code> is a compatibility path only.
        </p>
      </Card>
    </div>
  );
}
