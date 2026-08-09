'use client';

import { type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useManager } from '@/lib/twa/manager-context';
import { ManagerBrandingHeader } from '@/components/twa/manager-branding-header';
import { BottomNav } from '@/components/twa/bottom-nav';
import { useTwaI18n } from '@/lib/twa/i18n';

export default function UserLayout({ children }: { children: ReactNode }) {
  const { isLoading, error, mode } = useManager();
  const router = useRouter();
  const search = useSearchParams();
  const { t } = useTwaI18n();

  useEffect(() => {
    if (isLoading) return;
    if (error) {
      const qs = search.toString();
      router.replace(`/twa/invalid${qs ? `?${qs}` : ''}`);
      return;
    }
    if (mode === 'admin') {
      const qs = search.toString();
      router.replace(`/twa/admin/owner${qs ? `?${qs}` : ''}`);
    }
  }, [isLoading, error, mode, router, search]);

  if (isLoading || error) {
    return (
      <div className="p-6 text-sm text-[var(--text-muted)]">{t('loading')}</div>
    );
  }

  return (
    <div className="px-3 pt-3 pb-28 md:pb-8">
      <ManagerBrandingHeader />
      {children}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
