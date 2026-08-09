'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, Store, Wallet, UserRound } from 'lucide-react';
import { useTwaI18n } from '@/lib/twa/i18n';

const TABS = [
  { href: '/twa/user', key: 'home', icon: Home },
  { href: '/twa/user/store', key: 'store', icon: Store },
  { href: '/twa/user/wallet', key: 'wallet', icon: Wallet },
  { href: '/twa/user/profile', key: 'profile', icon: UserRound },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const search = useSearchParams();
  const { t } = useTwaI18n();
  const qs = search.toString();
  const suffix = qs ? `?${qs}` : '';

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
      <div className="mx-auto max-w-lg pointer-events-auto flex items-center justify-around gap-1 rounded-2xl border border-[var(--stroke-strong)] bg-[var(--bg-panel)]/95 backdrop-blur-md px-2 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
        {TABS.map(({ href, key, icon: Icon }) => {
          const active =
            href === '/twa/user'
              ? pathname === '/twa/user' || pathname.endsWith('/twa/user/')
              : pathname.includes(href);
          return (
            <Link
              key={href}
              href={`${href}${suffix}`}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] transition-colors ${
                active
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'text-[var(--text-faint)] hover:text-[var(--text)]'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              <span className="font-medium">{t(key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
