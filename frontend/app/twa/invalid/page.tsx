'use client';

import Link from 'next/link';
import { useTwaI18n } from '@/lib/twa/i18n';

export default function InvalidInvitePage() {
  const { t } = useTwaI18n();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-2xl font-bold">404</p>
      <h1 className="font-display text-lg font-semibold">{t('invalidInvite')}</h1>
      <p className="max-w-sm text-sm text-[var(--text-muted)] leading-relaxed">
        {t('invalidInviteDesc')}
      </p>
      <div className="flex flex-wrap justify-center gap-2 text-[12px]">
        <Link
          className="rounded-lg border border-[var(--stroke)] px-3 py-2 text-[var(--accent)]"
          href="/twa/user?ref=owner_demo"
        >
          Demo owner
        </Link>
        <Link
          className="rounded-lg border border-[var(--stroke)] px-3 py-2 text-[var(--accent)]"
          href="/twa/user?ref=sponsor_demo"
        >
          Demo sponsor
        </Link>
      </div>
    </div>
  );
}
