'use client';

import { Suspense, type ReactNode } from 'react';
import { ManagerProvider } from '@/lib/twa/manager-context';
import { TwaI18nProvider } from '@/lib/twa/i18n';

export default function TwaRootLayout({ children }: { children: ReactNode }) {
  return (
    <TwaI18nProvider>
      <ManagerProvider>
        <Suspense fallback={<div className="p-6 text-sm text-[var(--text-muted)]">…</div>}>
          <div className="min-h-screen max-w-lg mx-auto md:max-w-5xl">{children}</div>
        </Suspense>
      </ManagerProvider>
    </TwaI18nProvider>
  );
}
