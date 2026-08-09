'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useManager } from '@/lib/twa/manager-context';
import { TWA_LANG_OPTIONS, useTwaI18n } from '@/lib/twa/i18n';
import { Button } from '@/components';
import { BentoCell, DashboardBentoLayout } from '@/components/twa/dashboard-bento-layout';

export default function UserProfilePage() {
  const { setMode, inviteUrl, manager } = useManager();
  const { t, lang, setLang } = useTwaI18n();
  const search = useSearchParams();
  const qs = search.toString() ? `?${search.toString()}` : '';

  return (
    <div className="space-y-3">
      <h1 className="font-display text-lg font-bold">{t('profile')}</h1>
      <DashboardBentoLayout>
        <BentoCell span={12}>
          <p className="text-[11px] text-[var(--text-faint)] mb-2">{t('language')}</p>
          <select
            className="w-full rounded-lg border border-[var(--stroke-strong)] bg-[var(--bg)] px-3 py-2 text-sm"
            value={lang}
            onChange={(e) => setLang(e.target.value as typeof lang)}
          >
            {TWA_LANG_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </BentoCell>

        <BentoCell span={12}>
          <p className="font-display font-semibold mb-2">{t('inviteLinks')}</p>
          <p className="font-mono text-[11px] break-all text-[var(--text-muted)] mb-3">
            {inviteUrl || manager?.invitePath}
          </p>
          <Button
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(inviteUrl || `?ref=${manager?.id}`);
              toast.success(t('copyInvite'));
            }}
          >
            {t('copyInvite')}
          </Button>
        </BentoCell>

        <BentoCell span={6}>
          <Button className="w-full" onClick={() => setMode('admin')}>
            {t('adminMode')}
          </Button>
        </BentoCell>
        <BentoCell span={6}>
          <Link href={`/twa/admin/protocols${qs}`}>
            <Button className="w-full" variant="secondary">
              {t('protocols')}
            </Button>
          </Link>
        </BentoCell>
      </DashboardBentoLayout>
    </div>
  );
}
