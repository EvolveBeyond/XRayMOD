'use client';

import { BentoCell, DashboardBentoLayout } from '@/components/twa/dashboard-bento-layout';
import { ServerLoadCard } from '@/components/twa/server-load-card';
import { useManager } from '@/lib/twa/manager-context';
import { useTwaI18n } from '@/lib/twa/i18n';
import { Button } from '@/components';
import { toast } from 'sonner';

export default function SponsorDashboardPage() {
  const { servers, inviteUrl } = useManager();
  const { t } = useTwaI18n();

  return (
    <div className="space-y-3">
      <h1 className="font-display text-xl font-bold">Sponsor · {t('home')}</h1>
      <DashboardBentoLayout>
        <BentoCell span={6}>
          <p className="text-[11px] text-[var(--text-faint)]">Active users</p>
          <p className="font-display text-3xl font-bold tabular mt-2">248</p>
          <p className="mt-3 text-[12px] text-[var(--text-muted)]">Monthly bandwidth</p>
          <div className="mt-1 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
            <div className="h-full w-[55%] bg-[var(--accent)]" />
          </div>
          <p className="mt-1 text-[11px] font-mono text-[var(--text-faint)]">550 / 1000 GB</p>
        </BentoCell>
        <BentoCell span={6}>
          <ServerLoadCard label="Server load (CPU)" value={servers[0]?.cpuLoad ?? 0.35} />
        </BentoCell>
        <BentoCell span={12}>
          <p className="font-display font-semibold mb-3">Server inventory</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {servers.map((s) => (
              <div
                key={s.id}
                className="rounded-lg border border-[var(--stroke)] bg-[var(--surface-2)] p-3"
              >
                <p className="font-mono text-sm">{s.ip}</p>
                <p className="text-[12px] text-[var(--text-muted)]">{s.location}</p>
                <p className="text-[11px] mt-2">
                  Conn: {s.activeConnections} · RAM {(s.ramLoad * 100).toFixed(0)}%
                </p>
                <ul className="mt-2 space-y-1 text-[11px]">
                  {s.domains.map((d) => (
                    <li key={d.domain} className="flex justify-between">
                      <span>{d.domain}</span>
                      <span className={d.dnsOk ? 'text-emerald-400' : 'text-[var(--warn)]'}>
                        DNS {d.dnsOk ? 'OK' : 'FAIL'}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => toast.message('Manage Domains dialog')}
                >
                  Manage Domains
                </Button>
              </div>
            ))}
            {!servers.length && <p className="text-sm text-[var(--text-muted)]">{t('noData')}</p>}
          </div>
        </BentoCell>
        <BentoCell span={12}>
          <p className="font-display font-semibold mb-2">{t('inviteLinks')}</p>
          <p className="font-mono text-[11px] break-all text-[var(--text-muted)]">{inviteUrl}</p>
          <Button
            size="sm"
            className="mt-2"
            onClick={() => {
              void navigator.clipboard.writeText(inviteUrl);
              toast.success(t('copyInvite'));
            }}
          >
            {t('copyInvite')}
          </Button>
        </BentoCell>
      </DashboardBentoLayout>
    </div>
  );
}
