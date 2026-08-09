'use client';

import { BentoCell, DashboardBentoLayout } from '@/components/twa/dashboard-bento-layout';
import { useManager } from '@/lib/twa/manager-context';
import { useTwaI18n } from '@/lib/twa/i18n';
import { ServerLoadCard } from '@/components/twa/server-load-card';

export default function OwnerDashboardPage() {
  const { protocols, transactions } = useManager();
  const { t } = useTwaI18n();
  const active = protocols.filter((p) => p.status === 'active').length;
  const profit = transactions
    .filter((x) => x.type === 'profit' || x.type === 'purchase')
    .reduce((s, x) => s + x.amount, 0);

  return (
    <div className="space-y-3">
      <h1 className="font-display text-xl font-bold">Owner · {t('home')}</h1>
      <DashboardBentoLayout>
        <BentoCell span={4}>
          <p className="text-[11px] text-[var(--text-faint)]">{t('activeProtocols')}</p>
          <p className="mt-2 font-display text-3xl font-bold tabular">{active}</p>
          <p className="text-[12px] text-[var(--text-muted)] mt-1">
            {t('subordinates')}: {profit.toFixed(1)} DAI
          </p>
        </BentoCell>
        <BentoCell span={4}>
          <p className="text-[11px] text-[var(--text-faint)] mb-2">{t('serverHealth')}</p>
          <ServerLoadCard label="Uptime proxy" value={0.97} />
        </BentoCell>
        <BentoCell span={4}>
          <p className="text-[11px] text-[var(--text-faint)] mb-3">{t('revenue')}</p>
          <div className="space-y-2 text-[12px]">
            <div className="flex justify-between">
              <span>DAI</span>
              <span className="font-mono">62%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
              <div className="h-full w-[62%] bg-[var(--accent)]" />
            </div>
            <div className="flex justify-between">
              <span>Stars</span>
              <span className="font-mono">28%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
              <div className="h-full w-[28%] bg-[var(--coral)]" />
            </div>
            <div className="flex justify-between">
              <span>Gram</span>
              <span className="font-mono">10%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
              <div className="h-full w-[10%] bg-[var(--info)]" />
            </div>
          </div>
        </BentoCell>
      </DashboardBentoLayout>
    </div>
  );
}
