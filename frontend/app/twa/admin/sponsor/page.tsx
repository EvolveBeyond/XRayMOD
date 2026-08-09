'use client';

import { useCallback, useEffect, useState } from 'react';
import { BentoCell, DashboardBentoLayout } from '@/components/twa/dashboard-bento-layout';
import { useManager } from '@/lib/twa/manager-context';
import { useTwaI18n } from '@/lib/twa/i18n';
import { fetchReseller } from '@/lib/twa/commerce';
import { Button } from '@/components';
import { toast } from 'sonner';

export default function SponsorDashboardPage() {
  const { manager, managerId, inviteUrl } = useManager();
  const { t } = useTwaI18n();
  const [wallet, setWallet] = useState({ stars: 0, dai: 0, gram: 0 });
  const [stats, setStats] = useState({ clicks: 0, conversions: 0 });
  const [commissions, setCommissions] = useState<
    Array<{ order_id: string; amount: number; currency: string; pct: number; created_at: number }>
  >([]);
  const [liveInvite, setLiveInvite] = useState(inviteUrl);

  const load = useCallback(async () => {
    if (!managerId) return;
    const res = await fetchReseller(managerId);
    if (res.ok) {
      if (res.wallet) setWallet(res.wallet);
      if (res.stats) setStats(res.stats);
      if (res.commissions) setCommissions(res.commissions);
      if (res.inviteUrl) setLiveInvite(res.inviteUrl);
    }
  }, [managerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (inviteUrl) setLiveInvite(inviteUrl);
  }, [inviteUrl]);

  return (
    <div className="space-y-3">
      <h1 className="font-display text-xl font-bold">
        Sponsor · {manager?.name || t('home')}
      </h1>
      <DashboardBentoLayout>
        <BentoCell span={4}>
          <p className="text-[11px] text-[var(--text-faint)]">کلیک دعوت</p>
          <p className="font-display text-3xl font-bold tabular mt-2">{stats.clicks}</p>
        </BentoCell>
        <BentoCell span={4}>
          <p className="text-[11px] text-[var(--text-faint)]">تبدیل به خرید</p>
          <p className="font-display text-3xl font-bold tabular mt-2">{stats.conversions}</p>
        </BentoCell>
        <BentoCell span={4}>
          <p className="text-[11px] text-[var(--text-faint)]">کمیسیون</p>
          <p className="font-display text-3xl font-bold tabular mt-2">
            {manager?.sponsorProfitPct ?? 15}%
          </p>
        </BentoCell>

        <BentoCell span={12}>
          <p className="font-display font-semibold mb-2">کیف پول کمیسیون</p>
          <div className="flex gap-6 text-sm font-mono">
            <span>{wallet.stars} ⭐</span>
            <span>{wallet.dai} DAI</span>
            <span>{wallet.gram} Gram</span>
          </div>
        </BentoCell>

        <BentoCell span={12}>
          <p className="font-display font-semibold mb-2">{t('inviteLinks')}</p>
          <p className="text-[12px] text-[var(--text-muted)] mb-1">
            لینک دعوت با پارامتر <code className="font-mono">?ref={managerId}</code>
          </p>
          <p className="font-mono text-[11px] break-all text-[var(--accent)]">{liveInvite}</p>
          <Button
            size="sm"
            className="mt-2"
            onClick={() => {
              void navigator.clipboard.writeText(liveInvite);
              toast.success(t('copyInvite'));
            }}
          >
            {t('copyInvite')}
          </Button>
        </BentoCell>

        <BentoCell span={12}>
          <p className="font-display font-semibold mb-2">آخرین کمیسیون‌ها</p>
          <ul className="space-y-2 text-[12px]">
            {commissions.map((c) => (
              <li
                key={`${c.order_id}-${c.created_at}`}
                className="flex justify-between border-b border-[var(--stroke)] py-2"
              >
                <span className="font-mono text-[var(--text-muted)]">#{c.order_id}</span>
                <span className="font-mono">
                  +{c.amount} {c.currency} ({c.pct}%)
                </span>
              </li>
            ))}
            {!commissions.length && (
              <li className="text-[var(--text-muted)]">{t('noData')}</li>
            )}
          </ul>
        </BentoCell>
      </DashboardBentoLayout>
    </div>
  );
}
