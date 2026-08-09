'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useManager } from '@/lib/twa/manager-context';
import { useTwaI18n } from '@/lib/twa/i18n';
import { Button, Input } from '@/components';
import { BentoCell, DashboardBentoLayout } from '@/components/twa/dashboard-bento-layout';

export default function UserProxiesPage() {
  const { proxies, managerId } = useManager();
  const { t } = useTwaI18n();
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return proxies.filter(
      (p) =>
        !needle ||
        p.name.toLowerCase().includes(needle) ||
        p.location.toLowerCase().includes(needle)
    );
  }, [proxies, q]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const generateSub = () => {
    if (!selected.length) {
      toast.error(t('noData'));
      return;
    }
    const url = `https://sub.example.com/${managerId}?nodes=${selected.join(',')}`;
    void navigator.clipboard.writeText(url);
    toast.success(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
        <h1 className="font-display text-lg font-bold">{t('proxies')}</h1>
        <Input
          className="sm:max-w-xs"
          placeholder={t('search')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <p className="text-[11px] text-[var(--text-faint)] font-mono">
        GET /api/proxies?managerId={managerId}
      </p>

      <DashboardBentoLayout>
        {filtered.map((p) => (
          <BentoCell key={p.id} span={6}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display font-semibold">{p.name}</p>
                <p className="text-[12px] text-[var(--text-muted)]">
                  {p.location} · {p.protocol}:{p.port}
                </p>
                <p className="mt-1 font-mono text-[11px] text-[var(--text-faint)]">{p.host}</p>
              </div>
              <span className="chip">{p.pingMs ?? '—'} ms</span>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant={selected.includes(p.id) ? 'primary' : 'secondary'}
                onClick={() => toggle(p.id)}
              >
                {selected.includes(p.id) ? '✓' : '+'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => toast.message(`${t('testPing')}: ${p.pingMs ?? '—'} ms`)}
              >
                {t('testPing')}
              </Button>
            </div>
          </BentoCell>
        ))}
        {!filtered.length && (
          <BentoCell span={12}>
            <p className="text-sm text-[var(--text-muted)]">{t('noData')}</p>
          </BentoCell>
        )}
      </DashboardBentoLayout>

      <Button className="w-full" onClick={generateSub}>
        {t('generateSub')} ({selected.length})
      </Button>
    </div>
  );
}
