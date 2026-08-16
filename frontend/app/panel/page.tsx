'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  Globe,
  Wifi,
  ArrowUpRight,
  Shield,
  Radar,
  Copy,
  Crosshair,
  Sparkles,
} from 'lucide-react';
import { api, asList } from '@/lib/api';
import { CardHeader, ProgressBar, Button, PageHeader } from '@/components';
import { PanelLink } from '@/components/panel-link';
import { useI18n } from '@/lib/i18n';
import { getPanelPrefix, secureSubUrl } from '@/lib/paths';
import { toast } from 'sonner';
import { BentoCell, DashboardBentoLayout } from '@/components/layout/dashboard-bento-layout';

interface SystemStatus {
  uptime: string;
  version: string;
  configured: boolean;
  kv: boolean;
  d1: boolean;
  traffic?: {
    today: { up: number; down: number; total: number };
    month: { up: number; down: number; total: number };
  };
}

export default function DashboardPage() {
  const { t } = useI18n();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [users, setUsers] = useState<{ total: number; active: number }>({ total: 0, active: 0 });
  const [subHint, setSubHint] = useState('');
  const [recommendBusy, setRecommendBusy] = useState(false);

  useEffect(() => {
    api.get('/api/health').then((d) => setStatus(d)).catch(() => {});
    api
      .get('/api/users')
      .then((d) => {
        const list = asList<any>(d);
        setUsers({
          total: list.length,
          active: list.filter((x) => x.status === 'active' || x.enable !== false).length,
        });
        const admin = list.find((x) => x.role === 'admin') || list[0];
        const id = admin?.uuid || admin?.sub_id;
        if (id) {
          const url = secureSubUrl(id) || `${window.location.origin}${getPanelPrefix()}/sub/${id}`;
          setSubHint(url);
        }
      })
      .catch(() => {});
  }, []);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const today = status?.traffic?.today;
  const month = status?.traffic?.month;
  const activePct = users.total ? Math.round((users.active / users.total) * 100) : 0;

  const buildRecommendedSub = async () => {
    setRecommendBusy(true);
    try {
      const res = await api.post('/api/cleanip/recommend', {
        count: 48,
        countries: ['DE', 'NL', 'FI', 'SE', 'TR'],
        apply: true,
      });
      if (res.success === false) {
        toast.error(res.message || 'ساخت ساب پیشنهادی ناموفق');
        return;
      }
      const sub = res?.data?.subscriptionUrl || '';
      if (sub) {
        setSubHint(sub);
        try {
          await navigator.clipboard.writeText(sub);
        } catch {
          /* ignore */
        }
        toast.success('ساب پیشنهادی آماده و کپی شد');
      } else {
        toast.success(res?.data?.message || 'استخر Clean IP به‌روز شد');
      }
    } catch {
      toast.error('خطا در ساخت ساب پیشنهادی');
    }
    setRecommendBusy(false);
  };

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        eyebrow="XRayMOD"
        title={t('dashboard')}
        description={t('overview')}
        actions={
          <>
            <PanelLink href="/panel/users">
              <Button size="sm" variant="secondary">
                <Users size={14} /> {t('manageUsers')}
              </Button>
            </PanelLink>
            <PanelLink href="/panel/admin">
              <Button size="sm" variant="secondary">
                <Crosshair size={14} /> Admin
              </Button>
            </PanelLink>
            <Button size="sm" variant="secondary" onClick={buildRecommendedSub} disabled={recommendBusy}>
              <Sparkles size={14} />
              {recommendBusy ? '…' : 'ساب پیشنهادی'}
            </Button>
            <PanelLink href="/panel/lab">
              <Button size="sm" variant="secondary">
                Lab
              </Button>
            </PanelLink>
            <PanelLink href="/panel/cleanip">
              <Button size="sm">
                <Radar size={14} /> {t('scanClean')}
              </Button>
            </PanelLink>
          </>
        }
      />

      <DashboardBentoLayout>
        <BentoCell span={12}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip chip-live">v{status?.version || '1.9.12'}</span>
                <span className={status?.configured ? 'chip chip-live' : 'chip chip-warn'}>
                  {status?.configured ? t('active') : 'Setup pending'}
                </span>
              </div>
              <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">
                XrayMOD control plane
              </h2>
              <p className="text-sm text-[var(--text-muted)] max-w-md">
                SECURE PATH · silent 404 · Admin Dashboard
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <PanelLink href="/panel/stealth">
                <Button size="sm" variant="secondary">
                  <Shield size={14} /> {t('stealth')}
                </Button>
              </PanelLink>
              <PanelLink href="/panel/config">
                <Button size="sm" variant="secondary">
                  {t('config')} <ArrowUpRight size={14} />
                </Button>
              </PanelLink>
            </div>
          </div>
        </BentoCell>

        <BentoCell span={3}>
          <p className="text-[11px] text-[var(--text-faint)] uppercase tracking-wide">{t('users')}</p>
          <p className="mt-2 font-display text-3xl font-bold tabular">{users.total}</p>
          <p className="text-[12px] text-[var(--text-muted)] mt-1">
            {users.active} {t('active')} · {activePct}%
          </p>
        </BentoCell>
        <BentoCell span={3}>
          <p className="text-[11px] text-[var(--text-faint)] uppercase tracking-wide">{t('status')}</p>
          <p className="mt-2 font-display text-2xl font-bold">
            {status?.configured ? t('active') : 'Setup'}
          </p>
          <p className="text-[12px] text-[var(--text-muted)] mt-1 font-mono">
            {status?.version || '1.9.12'}
          </p>
        </BentoCell>
        <BentoCell span={3}>
          <p className="text-[11px] text-[var(--text-faint)] uppercase tracking-wide">
            {t('todayTraffic')}
          </p>
          <p className="mt-2 font-display text-2xl font-bold tabular">
            {formatBytes(today?.total || 0)}
          </p>
          <p className="text-[11px] text-[var(--text-faint)] mt-1 font-mono">
            ↑ {formatBytes(today?.up || 0)} / ↓ {formatBytes(today?.down || 0)}
          </p>
        </BentoCell>
        <BentoCell span={3}>
          <p className="text-[11px] text-[var(--text-faint)] uppercase tracking-wide">
            {t('monthTraffic')}
          </p>
          <p className="mt-2 font-display text-2xl font-bold tabular">
            {formatBytes(month?.total || 0)}
          </p>
          <p className="text-[11px] text-[var(--text-faint)] mt-1">{t('total')}</p>
        </BentoCell>

        <BentoCell span={6}>
          <CardHeader title={t('systemInfo')} description="Runtime health snapshot" />
          <div className="space-y-0.5">
            {[
              [t('version'), status?.version || 'N/A'],
              [t('uptime'), status?.uptime || 'N/A'],
              [t('storage'), status?.d1 ? 'D1' : 'KV'],
              [t('configured'), status?.configured ? t('yes') : t('no')],
            ].map(([k, v]) => (
              <div
                key={String(k)}
                className="flex items-center justify-between py-2.5 border-b border-[var(--stroke)] last:border-0"
              >
                <span className="text-sm text-[var(--text-muted)]">{k}</span>
                <span className="text-sm font-mono tabular text-[var(--text)]">{v}</span>
              </div>
            ))}
          </div>
        </BentoCell>

        <BentoCell span={6}>
          <CardHeader title={t('traffic')} description="Upload / download this month" />
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-[11px] text-[var(--text-faint)] mb-2">
                <span>Upload</span>
                <span className="font-mono tabular">{formatBytes(month?.up || 0)}</span>
              </div>
              <ProgressBar value={month?.up || 0} max={Math.max(month?.total || 1, 1)} color="emerald" />
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-[var(--text-faint)] mb-2">
                <span>Download</span>
                <span className="font-mono tabular">{formatBytes(month?.down || 0)}</span>
              </div>
              <ProgressBar value={month?.down || 0} max={Math.max(month?.total || 1, 1)} color="blue" />
            </div>
          </div>
        </BentoCell>

        <BentoCell span={4}>
          <PanelLink href="/panel/config" className="group block h-full">
            <div className="flex items-start gap-3 h-full">
              <div className="p-2 rounded-md bg-[var(--accent-soft)] text-[var(--accent)]">
                <Shield size={16} strokeWidth={1.9} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-sm">{t('config')}</p>
                <p className="text-[11px] text-[var(--text-faint)] mt-1">{t('recommended')}</p>
              </div>
              <ArrowUpRight size={15} className="text-[var(--text-faint)] group-hover:text-[var(--accent)]" />
            </div>
          </PanelLink>
        </BentoCell>
        <BentoCell span={4}>
          <PanelLink href="/panel/network" className="group block h-full">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-[rgba(94,176,255,0.12)] text-[var(--info)]">
                <Wifi size={16} strokeWidth={1.9} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-sm">{t('network')}</p>
                <p className="text-[11px] text-[var(--text-faint)] mt-1">DNS · WARP · IPv6</p>
              </div>
              <ArrowUpRight size={15} className="text-[var(--text-faint)] group-hover:text-[var(--info)]" />
            </div>
          </PanelLink>
        </BentoCell>
        <BentoCell span={4}>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-[var(--coral-soft)] text-[var(--coral)]">
              <Globe size={16} strokeWidth={1.9} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-semibold text-sm">{t('subLink')}</p>
              <p className="text-[11px] text-[var(--text-faint)] mt-1 font-mono truncate">
                {subHint || '—'}
              </p>
            </div>
            {subHint && (
              <button
                type="button"
                className="text-[var(--text-faint)] hover:text-[var(--accent)] p-1"
                onClick={() => {
                  navigator.clipboard.writeText(subHint);
                  toast.success(t('copied'));
                }}
              >
                <Copy size={15} />
              </button>
            )}
          </div>
        </BentoCell>
      </DashboardBentoLayout>
    </div>
  );
}
