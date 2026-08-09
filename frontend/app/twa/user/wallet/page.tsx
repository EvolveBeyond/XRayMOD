'use client';

import { BentoCell, DashboardBentoLayout } from '@/components/twa/dashboard-bento-layout';
import { useManager } from '@/lib/twa/manager-context';
import { MOCK_WALLET } from '@/lib/twa/mock';
import { useTwaI18n } from '@/lib/twa/i18n';
import { Button } from '@/components';
import { toast } from 'sonner';

export default function UserWalletPage() {
  const { transactions } = useManager();
  const { t } = useTwaI18n();
  const w = MOCK_WALLET;

  return (
    <div className="space-y-3">
      <h1 className="font-display text-lg font-bold">{t('wallet')}</h1>
      <DashboardBentoLayout>
        <BentoCell span={4}>
          <p className="text-[11px] text-[var(--text-faint)]">Stars</p>
          <p className="font-display text-2xl font-bold tabular">{w.stars}</p>
        </BentoCell>
        <BentoCell span={4}>
          <p className="text-[11px] text-[var(--text-faint)]">Gram</p>
          <p className="font-display text-2xl font-bold tabular">{w.gram}</p>
        </BentoCell>
        <BentoCell span={4}>
          <p className="text-[11px] text-[var(--text-faint)]">DAI</p>
          <p className="font-display text-2xl font-bold tabular">{w.dai}</p>
        </BentoCell>
        <BentoCell span={12}>
          <div className="mb-3 flex gap-2">
            <Button size="sm" onClick={() => toast.message('Top Up')}>
              Top Up
            </Button>
            <Button size="sm" variant="secondary" onClick={() => toast.message('Withdraw')}>
              Withdraw
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="text-[var(--text-faint)] text-start">
                <tr>
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">Amount</th>
                  <th className="py-2 font-medium">Type</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-t border-[var(--stroke)]">
                    <td className="py-2 font-mono">{tx.date}</td>
                    <td className="py-2 font-mono">
                      {tx.amount} {tx.currency}
                    </td>
                    <td className="py-2">{tx.type}</td>
                    <td className="py-2">{tx.status}</td>
                  </tr>
                ))}
                {!transactions.length && (
                  <tr>
                    <td colSpan={4} className="py-4 text-[var(--text-muted)]">
                      {t('noData')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </BentoCell>
      </DashboardBentoLayout>
    </div>
  );
}
