'use client';

import { useManager } from '@/lib/twa/manager-context';
import { useTwaI18n } from '@/lib/twa/i18n';

export function ManagerBrandingHeader() {
  const { manager } = useManager();
  const { t } = useTwaI18n();
  if (!manager) return null;

  return (
    <header className="mb-4 rounded-[var(--radius-lg)] border border-[var(--stroke)] bg-[var(--surface)]/80 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] font-display text-sm font-bold text-[var(--accent)]">
          {manager.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={manager.logoUrl} alt="" className="h-11 w-11 rounded-xl object-cover" />
          ) : (
            manager.name.slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] font-semibold tracking-tight truncate">
            {manager.name}
          </p>
          <p className="text-[12px] text-[var(--text-muted)] leading-snug line-clamp-2">
            {manager.welcomeText}
          </p>
        </div>
        <span className="chip chip-live shrink-0 uppercase tracking-wide text-[10px]">
          {manager.role}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-[var(--text-faint)]">{t('scopedNote')}</p>
    </header>
  );
}
