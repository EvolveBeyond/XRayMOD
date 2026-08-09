'use client';

import { useCallback, useEffect, useState } from 'react';
import { BentoCell, DashboardBentoLayout } from '@/components/twa/dashboard-bento-layout';
import { useManager } from '@/lib/twa/manager-context';
import { useTwaI18n } from '@/lib/twa/i18n';
import { fetchWallet, topUp } from '@/lib/twa/commerce';
import { Button } from '@/components';
import { toast } from 'sonner';

type Tx = {
  amount: number;
  currency: string;
  type: string;
  status: string;
  note: string;
  created_at: number;
};

export default function UserWalletPage() {
  const { managerId } = useManager();
  const { t } = useTwaI18n();
  const [stars, setStars] = useState(0);
  const [dai, setDai] = useState(0);
  const [gram, setGram] = useState(0);
  const [tx, setTx] = useState<Tx[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchWallet(managerId || undefined);
    if (res.ok && res.buyer) {
      setStars(res.buyer.stars);
      setDai(res.buyer.dai);
      setGram(res.buyer.gram);
      setTx((res.transactions as Tx[]) || []);
    }
  }, [managerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onTopUp(amount: number, currency: 'stars' | 'dai') {
    setBusy(true);
    try {
      const res = await topUp(amount, currency);
      if (res.ok) {
        toast.success(res.message || 'شارژ شد');
        await load();
      } else {
        toast.error('شارژ ناموفق');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <h1 className="font-display text-lg font-bold">{t('wallet')}</h1>
      <DashboardBentoLayout>
        <BentoCell span={4}>
          <p className="text-[11px] text-[var(--text-faint)]">Stars</p>
          <p className="font-display text-2xl font-bold tabular">{stars}</p>
        </BentoCell>
        <BentoCell span={4}>
          <p className="text-[11px] text-[var(--text-faint)]">Gram</p>
          <p className="font-display text-2xl font-bold tabular">{gram}</p>
        </BentoCell>
        <BentoCell span={4}>
          <p className="text-[11px] text-[var(--text-faint)]">DAI</p>
          <p className="font-display text-2xl font-bold tabular">{dai}</p>
        </BentoCell>
        <BentoCell span={12}>
          <div className="mb-3 flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => void onTopUp(100, 'stars')}>
              +100 ⭐
            </Button>
            <Button size="sm" disabled={busy} onClick={() => void onTopUp(500, 'stars')}>
              +500 ⭐
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void onTopUp(5, 'dai')}
            >
              +5 DAI
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="text-[var(--text-faint)] text-start">
                <tr>
                  <th className="py-2 font-medium">تاریخ</th>
                  <th className="py-2 font-medium">مبلغ</th>
                  <th className="py-2 font-medium">نوع</th>
                  <th className="py-2 font-medium">یادداشت</th>
                </tr>
              </thead>
              <tbody>
                {tx.map((row, i) => (
                  <tr key={`${row.created_at}-${i}`} className="border-t border-[var(--stroke)]">
                    <td className="py-2 font-mono">
                      {row.created_at
                        ? new Date(row.created_at).toLocaleDateString('fa-IR')
                        : '—'}
                    </td>
                    <td className="py-2 font-mono">
                      {row.amount} {row.currency}
                    </td>
                    <td className="py-2">{row.type}</td>
                    <td className="py-2 text-[var(--text-muted)]">{row.note || row.status}</td>
                  </tr>
                ))}
                {!tx.length && (
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
