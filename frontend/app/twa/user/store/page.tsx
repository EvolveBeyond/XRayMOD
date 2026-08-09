'use client';

import { BentoCell, DashboardBentoLayout } from '@/components/twa/dashboard-bento-layout';
import { useManager } from '@/lib/twa/manager-context';
import { useTwaI18n } from '@/lib/twa/i18n';
import { Button } from '@/components';
import { toast } from 'sonner';

export default function UserStorePage() {
  const { manager, protocols } = useManager();
  const { t } = useTwaI18n();

  return (
    <div className="space-y-3">
      <h1 className="font-display text-lg font-bold">{t('store')}</h1>
      <p className="text-[12px] text-[var(--text-muted)]">
        {manager?.name} — {t('scopedNote')}
      </p>
      <DashboardBentoLayout>
        <BentoCell span={6}>
          <p className="font-display font-semibold">{t('buyServer')}</p>
          <p className="mt-1 text-[12px] text-[var(--text-muted)]">RAM / CPU / Bandwidth</p>
          <p className="mt-3 font-mono text-[var(--accent)]">from 2.5 DAI · Stars</p>
          <Button
            size="sm"
            className="mt-3"
            onClick={() => toast.message('UI placeholder — wire CF purchase later')}
          >
            {t('buyServer')}
          </Button>
        </BentoCell>
        <BentoCell span={6}>
          <p className="font-display font-semibold">Buy Domain</p>
          <p className="mt-1 text-[12px] text-[var(--text-muted)]">Availability + Gram pricing</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => toast.message('…')}>
            Check domain
          </Button>
        </BentoCell>
        <BentoCell span={12}>
          <p className="font-display font-semibold mb-2">Manager inventory</p>
          <ul className="space-y-2 text-sm">
            {protocols.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between border-b border-[var(--stroke)] py-2 last:border-0"
              >
                <span>{p.name}</span>
                <span className="font-mono text-[var(--accent)]">{p.priceDai} DAI</span>
              </li>
            ))}
            {!protocols.length && (
              <li className="text-[var(--text-muted)]">{t('noData')}</li>
            )}
          </ul>
        </BentoCell>
      </DashboardBentoLayout>
    </div>
  );
}
