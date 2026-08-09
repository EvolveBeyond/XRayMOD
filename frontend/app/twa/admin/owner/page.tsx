'use client';

import { useCallback, useEffect, useState } from 'react';
import { BentoCell, DashboardBentoLayout } from '@/components/twa/dashboard-bento-layout';
import { useManager } from '@/lib/twa/manager-context';
import { useTwaI18n } from '@/lib/twa/i18n';
import { createReseller, fetchReseller } from '@/lib/twa/commerce';
import { Button } from '@/components';
import { toast } from 'sonner';

export default function OwnerDashboardPage() {
  const { manager, managerId, inviteUrl } = useManager();
  const { t } = useTwaI18n();
  const [wallet, setWallet] = useState({ stars: 0, dai: 0, gram: 0 });
  const [stats, setStats] = useState({ clicks: 0, conversions: 0 });
  const [children, setChildren] = useState<
    Array<{ id: string; name: string; role: string; commission_pct: number }>
  >([]);
  const [name, setName] = useState('');
  const [pct, setPct] = useState(15);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!managerId) return;
    const res = await fetchReseller(managerId);
    if (res.ok) {
      if (res.wallet) setWallet(res.wallet);
      if (res.stats) setStats(res.stats);
      if (res.children) setChildren(res.children);
    }
  }, [managerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate() {
    if (!managerId || !name.trim()) {
      toast.error('نام اسپانسر را وارد کنید');
      return;
    }
    setBusy(true);
    try {
      const res = await createReseller({
        parentId: managerId,
        name: name.trim(),
        commissionPct: pct,
      });
      if (res.ok) {
        toast.success(`${res.message} · ${res.invitePath}`);
        setName('');
        await load();
      } else {
        toast.error('ساخت ناموفق');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <h1 className="font-display text-xl font-bold">Owner · {manager?.name || t('home')}</h1>
      <DashboardBentoLayout>
        <BentoCell span={4}>
          <p className="text-[11px] text-[var(--text-faint)]">کلیک ?ref=</p>
          <p className="mt-2 font-display text-3xl font-bold tabular">{stats.clicks}</p>
        </BentoCell>
        <BentoCell span={4}>
          <p className="text-[11px] text-[var(--text-faint)]">خرید از دعوت</p>
          <p className="mt-2 font-display text-3xl font-bold tabular">{stats.conversions}</p>
        </BentoCell>
        <BentoCell span={4}>
          <p className="text-[11px] text-[var(--text-faint)]">{t('revenue')}</p>
          <p className="mt-2 font-mono text-sm">
            {wallet.stars} ⭐ · {wallet.dai} DAI
          </p>
        </BentoCell>

        <BentoCell span={12}>
          <p className="font-display font-semibold mb-2">{t('inviteLinks')}</p>
          <p className="font-mono text-[11px] break-all text-[var(--accent)]">{inviteUrl}</p>
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

        <BentoCell span={12}>
          <p className="font-display font-semibold mb-2">زیرمجموعه‌فروش (اسپانسر)</p>
          <div className="flex flex-wrap gap-2 items-end mb-3">
            <label className="flex-1 min-w-[140px]">
              <span className="text-[11px] text-[var(--text-faint)]">نام</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--stroke)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                placeholder="Pakrohk Nodes"
              />
            </label>
            <label className="w-24">
              <span className="text-[11px] text-[var(--text-faint)]">کمیسیون %</span>
              <input
                type="number"
                min={1}
                max={50}
                value={pct}
                onChange={(e) => setPct(Number(e.target.value) || 15)}
                className="mt-1 w-full rounded-md border border-[var(--stroke)] bg-[var(--surface-2)] px-3 py-2 text-sm font-mono"
              />
            </label>
            <Button size="sm" disabled={busy} onClick={() => void onCreate()}>
              ساخت + لینک ?ref=
            </Button>
          </div>
          <ul className="space-y-2 text-sm">
            {children.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap justify-between gap-2 border-b border-[var(--stroke)] py-2"
              >
                <span>
                  {c.name}{' '}
                  <span className="text-[11px] text-[var(--text-faint)]">({c.role})</span>
                </span>
                <span className="font-mono text-[12px] text-[var(--accent)]">
                  ?ref={c.id} · {c.commission_pct}%
                </span>
              </li>
            ))}
            {!children.length && (
              <li className="text-[var(--text-muted)]">{t('noData')}</li>
            )}
          </ul>
        </BentoCell>
      </DashboardBentoLayout>
    </div>
  );
}
