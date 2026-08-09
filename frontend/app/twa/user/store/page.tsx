'use client';

import { useCallback, useEffect, useState } from 'react';
import { BentoCell, DashboardBentoLayout } from '@/components/twa/dashboard-bento-layout';
import { useManager } from '@/lib/twa/manager-context';
import { useTwaI18n } from '@/lib/twa/i18n';
import {
  fetchCatalog,
  purchasePlan,
  validateCoupon,
  type CommercePlan,
} from '@/lib/twa/commerce';
import { Button } from '@/components';
import { toast } from 'sonner';

export default function UserStorePage() {
  const { manager, managerId, refCode } = useManager();
  const { t } = useTwaI18n();
  const [plans, setPlans] = useState<CommercePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [coupon, setCoupon] = useState('');
  const [couponOk, setCouponOk] = useState<{ pct: number; msg: string } | null>(null);
  const [currency, setCurrency] = useState<'stars' | 'dai'>('stars');
  const [buying, setBuying] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!managerId) return;
    setLoading(true);
    try {
      const res = await fetchCatalog(managerId);
      if (res.ok && res.plans) setPlans(res.plans);
      else setPlans([]);
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [managerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onValidateCoupon() {
    if (!managerId || !coupon.trim()) return;
    const res = await validateCoupon(coupon.trim(), managerId);
    if (res.valid) {
      setCouponOk({ pct: res.pctOff || 0, msg: res.message || 'OK' });
      toast.success(res.message || 'تخفیف اعمال شد');
    } else {
      setCouponOk(null);
      toast.error(res.message || 'کد نامعتبر');
    }
  }

  async function onBuy(plan: CommercePlan) {
    setBuying(plan.id);
    try {
      const res = await purchasePlan({
        planId: plan.id,
        currency,
        coupon: coupon.trim() || undefined,
        ref: refCode || managerId || undefined,
      });
      if (res.ok) {
        toast.success(`${res.message || 'خرید موفق'} · #${res.orderId} · ${res.paid} ${currency}`);
      } else {
        toast.error(res.message || 'خرید ناموفق');
      }
    } catch {
      toast.error('خطای شبکه');
    } finally {
      setBuying(null);
    }
  }

  function priceOf(p: CommercePlan) {
    const base = currency === 'stars' ? p.price_stars : p.price_dai;
    if (couponOk?.pct) {
      return Math.round(base * (1 - couponOk.pct / 100) * 100) / 100;
    }
    return base;
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-display text-lg font-bold">{t('store')}</h1>
        <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
          {manager?.name} — پلن روزانه / هفتگی / ماهانه · کیف پول · کد تخفیف
        </p>
      </div>

      <DashboardBentoLayout>
        <BentoCell span={12}>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[140px]">
              <span className="text-[11px] text-[var(--text-faint)]">کد تخفیف</span>
              <input
                value={coupon}
                onChange={(e) => {
                  setCoupon(e.target.value);
                  setCouponOk(null);
                }}
                placeholder="WELCOME10"
                className="mt-1 w-full rounded-md border border-[var(--stroke)] bg-[var(--surface-2)] px-3 py-2 text-sm font-mono"
              />
            </label>
            <Button size="sm" variant="secondary" onClick={() => void onValidateCoupon()}>
              اعمال
            </Button>
            <div className="flex rounded-md border border-[var(--stroke)] overflow-hidden text-[12px]">
              {(['stars', 'dai'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={`px-3 py-2 ${currency === c ? 'bg-[var(--accent)] text-black font-semibold' : 'bg-[var(--surface-2)]'}`}
                >
                  {c === 'stars' ? 'Stars' : 'DAI'}
                </button>
              ))}
            </div>
          </div>
          {couponOk && (
            <p className="mt-2 text-[12px] text-emerald-400">
              {couponOk.pct}٪ تخفیف · {couponOk.msg}
            </p>
          )}
        </BentoCell>

        {loading && (
          <BentoCell span={12}>
            <p className="text-sm text-[var(--text-muted)]">{t('loading')}</p>
          </BentoCell>
        )}

        {!loading &&
          plans.map((p) => (
            <BentoCell key={p.id} span={6}>
              <p className="font-display font-semibold">{p.name}</p>
              <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                {p.days} روز · {p.traffic_gb} GB
              </p>
              <p className="mt-3 font-mono text-[var(--accent)] text-lg">
                {priceOf(p)} {currency === 'stars' ? '⭐' : 'DAI'}
                {couponOk && (
                  <span className="ms-2 text-[11px] text-[var(--text-faint)] line-through">
                    {currency === 'stars' ? p.price_stars : p.price_dai}
                  </span>
                )}
              </p>
              <Button
                size="sm"
                className="mt-3"
                disabled={buying === p.id}
                onClick={() => void onBuy(p)}
              >
                {buying === p.id ? '…' : 'خرید از کیف پول'}
              </Button>
            </BentoCell>
          ))}

        {!loading && !plans.length && (
          <BentoCell span={12}>
            <p className="text-sm text-[var(--text-muted)]">{t('noData')}</p>
          </BentoCell>
        )}

        <BentoCell span={12}>
          <p className="text-[11px] text-[var(--text-faint)]">
            کمیسیون مدیر این فروشگاه: {manager?.sponsorProfitPct ?? '—'}٪ روی هر خرید موفق · لینک دعوت{' '}
            <code className="font-mono">?ref={managerId}</code>
          </p>
        </BentoCell>
      </DashboardBentoLayout>
    </div>
  );
}
