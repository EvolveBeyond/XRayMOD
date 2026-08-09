'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Link2, ShoppingCart } from 'lucide-react';
import { BentoCell, DashboardBentoLayout } from '@/components/twa/dashboard-bento-layout';
import { useCloudflareCheck, useCurrencyHint } from '@/lib/twa/hooks';
import { MOCK_USER_SUB } from '@/lib/twa/mock';
import { useTwaI18n } from '@/lib/twa/i18n';
import { Button } from '@/components';

export default function UserDashboardPage() {
  const { t } = useTwaI18n();
  const search = useSearchParams();
  const qs = search.toString() ? `?${search.toString()}` : '';
  const sub = MOCK_USER_SUB;
  const pct = Math.round((sub.remainingGb / sub.totalGb) * 100);
  const { ip, isClean, isLoading } = useCloudflareCheck();
  const { label } = useCurrencyHint();

  return (
    <div className="space-y-3">
      <DashboardBentoLayout>
        <BentoCell span={3}>
          <p className="text-[11px] text-[var(--text-faint)] uppercase tracking-wide">
            {t('remainingVolume')}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div
              className="relative h-16 w-16 rounded-full"
              style={{
                background: `conic-gradient(var(--accent) ${pct}%, rgba(140,175,210,0.12) 0)`,
              }}
            >
              <div className="absolute inset-1.5 flex items-center justify-center rounded-full bg-[var(--surface)] text-[12px] font-mono font-semibold">
                {pct}%
              </div>
            </div>
            <div>
              <p className="font-display text-xl font-bold tabular">
                {sub.remainingGb}
                <span className="text-sm text-[var(--text-muted)]"> GB</span>
              </p>
              <p className="text-[11px] text-[var(--text-faint)]">/ {sub.totalGb} GB</p>
            </div>
          </div>
        </BentoCell>

        <BentoCell span={3}>
          <p className="text-[11px] text-[var(--text-faint)] uppercase tracking-wide">
            {t('expiry')}
          </p>
          <p className="mt-4 font-display text-2xl font-bold tabular">{sub.expiresAt}</p>
        </BentoCell>

        <BentoCell span={6}>
          <p className="text-[11px] text-[var(--text-faint)] uppercase tracking-wide mb-3">
            {t('quickActions')}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/twa/user/proxies${qs}`}>
              <Button size="sm">
                <Link2 size={14} /> {t('generateSub')}
              </Button>
            </Link>
            <Link href={`/twa/user/store${qs}`}>
              <Button size="sm" variant="secondary">
                <ShoppingCart size={14} /> {t('buyServer')}
              </Button>
            </Link>
          </div>
          <p className="mt-3 text-[11px] text-[var(--text-faint)]">{label}</p>
        </BentoCell>

        <BentoCell span={12}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display font-semibold text-[15px]">{t('cleanIp')}</p>
              <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                cloudflare.com/cdn-cgi/trace
              </p>
            </div>
            <span
              className={
                isLoading
                  ? 'chip chip-warn'
                  : isClean
                    ? 'chip chip-live'
                    : 'chip chip-warn'
              }
            >
              {isLoading ? t('checking') : isClean ? t('cleanFound') : '—'}
            </span>
          </div>
          <p className="mt-4 font-mono text-sm">
            {t('externalIp')}: <span className="text-[var(--accent)]">{ip || '—'}</span>
          </p>
        </BentoCell>
      </DashboardBentoLayout>
    </div>
  );
}
