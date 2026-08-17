'use client';

import { useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Shield,
  Settings,
  Radar,
  LogOut,
  Menu,
  X,
  Wifi,
  Server,
  Layers,
  LifeBuoy,
  Ghost,
  ShieldCheck,
  FlaskConical,
  Wand2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { goPanel, getPanelPrefix } from '@/lib/paths';
import { PanelLink } from '@/components/panel-link';
import { LangToggle, useI18n, type DictKey } from '@/lib/i18n';

type NavItem = { href: string; key: DictKey; icon: typeof LayoutDashboard };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'overview',
    items: [
      { href: '/panel', key: 'dashboard', icon: LayoutDashboard },
      { href: '/panel/lab', key: 'lab', icon: FlaskConical },
      { href: '/panel/admin', key: 'admin', icon: ShieldCheck },
      { href: '/panel/wizard', key: 'wizard', icon: Wand2 },
      { href: '/panel/users', key: 'users', icon: Users },
    ],
  },
  {
    label: 'edge',
    items: [
      { href: '/panel/config', key: 'config', icon: Shield },
      { href: '/panel/stealth', key: 'stealth', icon: Ghost },
      { href: '/panel/protocols', key: 'protocols', icon: Layers },
      { href: '/panel/nodes', key: 'nodes', icon: Server },
    ],
  },
  {
    label: 'network',
    items: [
      { href: '/panel/cleanip', key: 'cleanip', icon: Radar },
      { href: '/panel/network', key: 'network', icon: Wifi },
    ],
  },
  {
    label: 'system',
    items: [
      { href: '/panel/settings', key: 'settings', icon: Settings },
      { href: '/panel/support', key: 'support', icon: LifeBuoy },
    ],
  },
];

const GROUP_LABEL: Record<string, { fa: string; en: string }> = {
  overview: { fa: 'نمای کلی', en: 'Overview' },
  edge: { fa: 'لبه', en: 'Edge' },
  network: { fa: 'شبکه', en: 'Network' },
  system: { fa: 'سیستم', en: 'System' },
};

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const prefix = useMemo(() => getPanelPrefix(), [pathname]);
  const { t, lang } = useI18n();

  const logicalPath = useMemo(() => {
    if (prefix && pathname.startsWith(prefix)) {
      return pathname.slice(prefix.length) || '/';
    }
    const segs = pathname.split('/').filter(Boolean);
    if (segs.length >= 2 && segs[0].includes('-')) {
      return '/' + segs.slice(1).join('/');
    }
    return pathname;
  }, [pathname, prefix]);

  const handleLogout = async () => {
    try {
      await api.post('/api/logout');
    } catch {
      /* ignore */
    }
    goPanel('/login');
  };

  const isActive = (href: string) =>
    logicalPath === href || (href !== '/panel' && logicalPath.startsWith(href));

  const NavBlocks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="space-y-1">
          <p className="nav-group-label">{GROUP_LABEL[group.label]?.[lang] || group.label}</p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <PanelLink
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`nav-item ${active ? 'is-active' : ''}`}
                >
                  <item.icon size={15} strokeWidth={1.9} />
                  <span>{t(item.key)}</span>
                </PanelLink>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="shell">
      <aside className="nav-rail hidden md:flex flex-col p-4 sticky top-0 h-screen">
        <PanelLink href="/panel" className="flex items-center gap-3 px-1.5 py-2 mb-6 group">
          <div className="brand-mark" aria-hidden />
          <div className="leading-tight min-w-0">
            <p className="font-display text-[15px] font-bold tracking-tight">
              Xray<span className="text-[var(--accent)]">MOD</span>
            </p>
            <p className="text-[10px] text-[var(--text-faint)] tracking-[0.08em] uppercase font-display">
              Panel · v1.9.12
            </p>
          </div>
        </PanelLink>

        <nav className="flex-1 space-y-4 overflow-y-auto pe-1">
          <NavBlocks />
        </nav>

        <div className="pt-4 mt-2 border-t border-[var(--stroke)] space-y-3">
          <div className="px-1.5">
            <LangToggle />
          </div>
          {prefix && (
            <p
              className="px-2 text-[10px] text-[var(--text-faint)] font-mono truncate"
              title={prefix}
            >
              PATH {prefix.slice(0, 14)}…
            </p>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="nav-item w-full text-[var(--text-faint)] hover:text-[var(--coral)] hover:bg-[var(--coral-soft)]"
          >
            <LogOut size={15} />
            {t('logout')}
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 inset-inline-0 z-50 border-b border-[var(--stroke)] bg-[rgba(6,11,18,0.92)] backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <PanelLink href="/panel" className="flex items-center gap-2.5">
            <div className="brand-mark !w-8 !h-8" aria-hidden />
            <span className="font-display font-bold tracking-tight text-sm">
              Xray<span className="text-[var(--accent)]">MOD</span>
            </span>
          </PanelLink>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-[var(--text-muted)] p-2 rounded-[var(--radius)] hover:bg-white/[0.04]"
            aria-label="Menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {mobileOpen && (
          <nav className="px-3 pb-5 space-y-3 max-h-[78vh] overflow-y-auto border-t border-[var(--stroke)]">
            <NavBlocks onNavigate={() => setMobileOpen(false)} />
            <div className="px-2 pt-1">
              <LangToggle />
            </div>
            <button type="button" onClick={handleLogout} className="nav-item w-full">
              <LogOut size={15} />
              {t('logout')}
            </button>
          </nav>
        )}
      </div>

      <main className="min-w-0 overflow-y-auto pt-14 md:pt-0">
        <div className="aperture-grid min-h-full">
          <div className="p-4 sm:p-6 md:p-8 lg:px-10 lg:py-9 max-w-6xl mx-auto pb-24 md:pb-14">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
