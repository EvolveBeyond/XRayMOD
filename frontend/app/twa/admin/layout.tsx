'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useManager } from '@/lib/twa/manager-context';
import { useTwaI18n } from '@/lib/twa/i18n';
import { Button } from '@/components';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { setMode, manager, error, isLoading } = useManager();
  const { t } = useTwaI18n();
  const pathname = usePathname();
  const search = useSearchParams();
  const qs = search.toString() ? `?${search.toString()}` : '';

  if (isLoading) return <div className="p-6 text-sm text-[var(--text-muted)]">{t('loading')}</div>;
  if (error || !manager) {
    return (
      <div className="p-6">
        <Link href="/twa/invalid" className="text-[var(--accent)]">
          {t('invalidInvite')}
        </Link>
      </div>
    );
  }

  const links = [
    { href: '/twa/admin/owner', label: 'Owner' },
    { href: '/twa/admin/sponsor', label: 'Sponsor' },
    { href: '/twa/admin/protocols', label: t('protocols') },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex w-56 shrink-0 flex-col gap-2 border-e border-[var(--stroke)] bg-[var(--bg-panel)] p-4 sticky top-0 h-screen">
        <p className="font-display font-bold text-sm mb-2">{manager.name}</p>
        {links.map((l) => (
          <Link
            key={l.href}
            href={`${l.href}${qs}`}
            className={`rounded-lg px-3 py-2 text-sm ${
              pathname.includes(l.href)
                ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {l.label}
          </Link>
        ))}
        <Button size="sm" variant="secondary" className="mt-auto" onClick={() => setMode('user')}>
          {t('userMode')}
        </Button>
      </aside>
      <main className="flex-1 px-3 py-4 pb-20 md:px-6 md:pb-6">{children}</main>
    </div>
  );
}
