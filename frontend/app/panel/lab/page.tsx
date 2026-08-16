'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlaskConical,
  Gauge,
  HeartPulse,
  Moon,
  Sparkles,
  QrCode,
  Split,
  Shield,
  Palette,
  Radio,
  Download,
  Upload,
  Undo2,
  Server,
  Activity,
  Copy,
  Play,
  Globe2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Input, PageHeader } from '@/components';
import { BentoCell, DashboardBentoLayout } from '@/components/layout/dashboard-bento-layout';
import { toast } from 'sonner';
import { getPanelPrefix, secureSubUrl } from '@/lib/paths';

type Overview = {
  users: { total: number; active: number };
  traffic_used: number;
  online_approx: number;
  speed_profile: string;
  profiles: Record<string, { label: string; ports: number[]; countries: string[] }>;
  auto_clean: boolean;
  last_cron: number;
  auto_log: any;
  health_log: any;
  brand: any;
  canary: { hits?: any[]; blocked?: string[] };
  nodes: any[];
  weighted_domains: { host: string; weight: number }[];
  features: { id: string; title: string; group: string }[];
};

const GROUP_META: Record<string, { fa: string; color: string }> = {
  speed: { fa: 'سرعت و پایداری', color: 'var(--accent)' },
  sub: { fa: 'ساب هوشمند', color: '#7dd3fc' },
  ux: { fa: 'پنل و UX', color: '#fbbf24' },
  stealth: { fa: 'ضد فیلتر', color: '#fb7185' },
  ops: { fa: 'اپس و رشد', color: '#a78bfa' },
};

export default function LabPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState('');
  const [guestUrl, setGuestUrl] = useState('');
  const [brand, setBrand] = useState<any>({});
  const [domainsText, setDomainsText] = useState('');
  const [nodesText, setNodesText] = useState('');
  const [versions, setVersions] = useState<any[]>([]);
  const [adminUuid, setAdminUuid] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/lab/overview');
      if (res?.data) {
        setData(res.data);
        setBrand(res.data.brand || {});
        setDomainsText(
          (res.data.weighted_domains || [])
            .map((d: any) => `${d.host}:${d.weight || 1}`)
            .join('\n')
        );
        setNodesText(JSON.stringify(res.data.nodes || [], null, 2));
      }
      const users = await api.get('/api/users');
      const list = Array.isArray(users?.data) ? users.data : users?.users || [];
      const admin = list.find((u: any) => u.role === 'admin') || list[0];
      if (admin?.uuid) setAdminUuid(admin.uuid);
    } catch {
      toast.error('بارگذاری Lab ناموفق');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'خطا');
    }
    setBusy('');
  };

  const fmtBytes = (n: number) => {
    if (!n) return '0 B';
    const u = ['B', 'KB', 'MB', 'GB', 'TB'];
    let v = n;
    let i = 0;
    while (v >= 1024 && i < u.length - 1) {
      v /= 1024;
      i++;
    }
    return `${v.toFixed(i > 1 ? 1 : 0)} ${u[i]}`;
  };

  const splitSub = useMemo(() => {
    if (!adminUuid) return '';
    return `${secureSubUrl(adminUuid, 'singbox-split')}`;
  }, [adminUuid]);

  const profileSub = (p: string) => {
    if (!adminUuid || typeof window === 'undefined') return '';
    const origin = window.location.origin.replace(/\/$/, '');
    const prefix = getPanelPrefix();
    return `${origin}${prefix}/sub/${adminUuid}?profile=${p}`;
  };

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        eyebrow="XRayMOD Lab"
        title="لَب پیشرفته"
        description="سرعت · ساب هوشمند · وایت‌لیبل · استیلث · اپس — همه در یک صفحه"
        actions={
          <Button variant="secondary" onClick={load}>
            <Activity size={14} /> تازه‌سازی
          </Button>
        }
      />

      <section className="relative overflow-hidden rounded-[1.25rem] border border-[rgba(30,200,200,.22)] bg-gradient-to-br from-[#0a1624] via-[#0c1a22] to-[#120b14] p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-[rgba(30,200,200,.12)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-10 h-72 w-72 rounded-full bg-[rgba(255,92,69,.1)] blur-3xl" />
        <div className="relative z-[1] flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(30,200,200,.3)] bg-[rgba(30,200,200,.08)] px-3 py-1 text-[11px] font-semibold tracking-wide text-[var(--accent)]">
              <FlaskConical size={12} /> GEN LAB · EDGE OPS
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
              کنترل‌پلین نسل بعد برای فیلترینگ سخت
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Auto Clean-IP شبانه، health-check، پروفایل سرعت، ساب مهمان با QR، split ایران، failover،
              وایت‌لیبل، canary، backup و rollback — یکجا.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 min-w-[260px]">
            {[
              ['آنلاین ≈', data?.online_approx ?? '—'],
              ['کاربر فعال', data?.users?.active ?? '—'],
              ['ترافیک', fmtBytes(data?.traffic_used || 0)],
            ].map(([k, v]) => (
              <div
                key={String(k)}
                className="rounded-[0.85rem] border border-white/10 bg-black/25 px-3 py-2.5 text-center"
              >
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">{k}</p>
                <p className="mt-1 font-display text-lg font-bold tabular">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DashboardBentoLayout>
        {/* Speed */}
        <BentoCell span={4}>
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-md bg-[var(--accent-soft)] text-[var(--accent)]">
              <Moon size={16} />
            </div>
            <div>
              <p className="font-display font-semibold text-sm">Auto Clean-IP شبانه</p>
              <p className="text-[11px] text-[var(--text-faint)] mt-1">
                Cron 01:15 UTC · Top-N برای هر ISP
              </p>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-3 font-mono">
            آخرین:{' '}
            {data?.last_cron
              ? new Date(data.last_cron).toLocaleString('fa-IR')
              : 'هنوز اجرا نشده'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy === 'auto'}
              onClick={() =>
                run('auto', async () => {
                  const r = await api.post('/api/lab/auto-clean', { topN: 28, enabled: true });
                  toast.success(r?.data?.message || 'استخر به‌روز شد');
                })
              }
            >
              <Play size={13} /> اجرای الان
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy === 'cron'}
              onClick={() =>
                run('cron', async () => {
                  await api.post('/api/lab/cron-run', {});
                  toast.success('Cron دستی اجرا شد');
                })
              }
            >
              Cron کامل
            </Button>
          </div>
        </BentoCell>

        <BentoCell span={4}>
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-md bg-[rgba(251,113,133,.12)] text-[#fb7185]">
              <HeartPulse size={16} />
            </div>
            <div>
              <p className="font-display font-semibold text-sm">Health-check لبه</p>
              <p className="text-[11px] text-[var(--text-faint)] mt-1">
                حذف IP مرده از ساب
              </p>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            {data?.health_log
              ? `چک‌شده ${data.health_log.checked || 0} · حذف ${data.health_log.removed || 0}`
              : 'هنوز لاگ health نیست'}
          </p>
          <Button
            size="sm"
            disabled={busy === 'health'}
            onClick={() =>
              run('health', async () => {
                const r = await api.post('/api/lab/health-check', {});
                toast.success(r?.data?.message || 'تمام');
              })
            }
          >
            <HeartPulse size={13} /> اسکن سلامت
          </Button>
        </BentoCell>

        <BentoCell span={4}>
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-md bg-[rgba(251,191,36,.12)] text-[#fbbf24]">
              <Gauge size={16} />
            </div>
            <div>
              <p className="font-display font-semibold text-sm">پروفایل سرعت</p>
              <p className="text-[11px] text-[var(--text-faint)] mt-1">
                فعلی: {data?.speed_profile || 'stable'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(['gaming', 'youtube', 'stable'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() =>
                  run('prof', async () => {
                    await api.put('/api/lab/profile', { profile: p });
                    toast.success(`پروفایل ${p}`);
                  })
                }
                className={`px-2.5 py-1 rounded-lg text-xs border ${
                  data?.speed_profile === p
                    ? 'border-[var(--accent)]/50 bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--stroke)] text-[var(--text-muted)]'
                }`}
              >
                {data?.profiles?.[p]?.label || p}
              </button>
            ))}
          </div>
          {adminUuid && (
            <button
              type="button"
              className="text-[11px] text-[var(--accent)] hover:underline font-mono"
              onClick={() => {
                const u = profileSub(data?.speed_profile || 'stable');
                navigator.clipboard.writeText(u);
                toast.success('لینک ساب پروفایل کپی شد');
              }}
            >
              کپی ساب این پروفایل
            </button>
          )}
        </BentoCell>

        {/* Smart sub */}
        <BentoCell span={6}>
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-md bg-[rgba(125,211,252,.12)] text-[#7dd3fc]">
              <QrCode size={16} />
            </div>
            <div className="flex-1">
              <p className="font-display font-semibold text-sm">ساب مهمان ۲۴ساعته + QR</p>
              <p className="text-[11px] text-[var(--text-faint)] mt-1">
                لینک موقت برای دوست / تست — خودکار منقضی می‌شود
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            <Button
              size="sm"
              disabled={busy === 'guest'}
              onClick={() =>
                run('guest', async () => {
                  const r = await api.post('/api/lab/guest-link', {
                    hours: 24,
                    profile: data?.speed_profile || 'stable',
                  });
                  const u = r?.data?.url || '';
                  setGuestUrl(u);
                  if (u) {
                    await navigator.clipboard.writeText(u);
                    toast.success('لینک مهمان ساخته و کپی شد');
                  }
                })
              }
            >
              <Sparkles size={13} /> ساخت لینک ۲۴ساعته
            </Button>
            {guestUrl && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(guestUrl);
                  toast.success('کپی شد');
                }}
              >
                <Copy size={13} /> کپی
              </Button>
            )}
          </div>
          {guestUrl && (
            <div className="flex gap-3 items-start">
              <img
                alt="QR"
                className="w-28 h-28 rounded-lg bg-white p-1"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(guestUrl)}`}
              />
              <p className="text-[11px] font-mono text-[var(--text-muted)] break-all leading-relaxed">
                {guestUrl}
              </p>
            </div>
          )}
        </BentoCell>

        <BentoCell span={6}>
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-md bg-[rgba(167,139,250,.12)] text-[#a78bfa]">
              <Split size={16} />
            </div>
            <div>
              <p className="font-display font-semibold text-sm">Split + Failover</p>
              <p className="text-[11px] text-[var(--text-faint)] mt-1">
                ایران DIRECT · خارج تونل · تگ [P1][P2]…
              </p>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            <button
              type="button"
              className="w-full text-start rounded-lg border border-[var(--stroke)] px-3 py-2 hover:border-[var(--accent)]/40 font-mono text-[var(--text-muted)]"
              onClick={() => {
                if (!splitSub) return;
                navigator.clipboard.writeText(splitSub);
                toast.success('sing-box split کپی شد');
              }}
            >
              <Globe2 size={12} className="inline me-1" />
              کپی sing-box با Split ایران
            </button>
            <button
              type="button"
              className="w-full text-start rounded-lg border border-[var(--stroke)] px-3 py-2 hover:border-[var(--accent)]/40 font-mono text-[var(--text-muted)]"
              onClick={() => {
                if (!adminUuid) return;
                const u = `${secureSubUrl(adminUuid, 'clash-meta')}`;
                navigator.clipboard.writeText(u);
                toast.success('Clash Meta split کپی شد');
              }}
            >
              کپی Clash Meta (GEOIP IR → DIRECT)
            </button>
            <p className="text-[11px] text-[var(--text-faint)]">
              نام کانفیگ‌ها با اولویت Failover مثل <code>[P1]</code> Direct و{' '}
              <code>[P2]</code> 🇩🇪 Germany ساخته می‌شوند.
            </p>
          </div>
        </BentoCell>

        {/* Whitelabel */}
        <BentoCell span={6}>
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-md bg-[rgba(251,191,36,.12)] text-[#fbbf24]">
              <Palette size={16} />
            </div>
            <div>
              <p className="font-display font-semibold text-sm">وایت‌لیبل</p>
              <p className="text-[11px] text-[var(--text-faint)] mt-1">
                نام · رنگ · دامنه · متن ساب — برای فروش پنل
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2 mb-3">
            {(
              [
                ['name', 'نام برند'],
                ['accent', 'رنگ اکسنت'],
                ['domain', 'دامنه'],
                ['sub_name', 'نام ساب'],
                ['sub_banner', 'بنر ساب'],
                ['logo_url', 'URL لوگو'],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="text-[11px] text-[var(--text-faint)] space-y-1">
                {label}
                <Input
                  value={brand?.[k] || ''}
                  onChange={(e: any) => setBrand({ ...brand, [k]: e.target.value })}
                  placeholder={label}
                />
              </label>
            ))}
          </div>
          <Button
            size="sm"
            disabled={busy === 'brand'}
            onClick={() =>
              run('brand', async () => {
                await api.put('/api/lab/brand', brand);
                toast.success('وایت‌لیبل ذخیره شد');
              })
            }
          >
            ذخیره برند
          </Button>
        </BentoCell>

        <BentoCell span={6}>
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-md bg-[rgba(251,113,133,.12)] text-[#fb7185]">
              <Shield size={16} />
            </div>
            <div>
              <p className="font-display font-semibold text-sm">Canary حرفه‌ای</p>
              <p className="text-[11px] text-[var(--text-faint)] mt-1">
                {data?.canary?.hits?.length || 0} ضربه · بلاک با یک کلیک
              </p>
            </div>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1.5 mb-3">
            {(data?.canary?.hits || []).slice(0, 8).map((h: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 text-[11px] font-mono rounded-lg border border-[var(--stroke)] px-2 py-1.5"
              >
                <span className="truncate">
                  {h.ip} · {h.country || '??'} · {h.bait}
                </span>
                <button
                  type="button"
                  className="text-[#fb7185] shrink-0"
                  onClick={() =>
                    run('block', async () => {
                      await api.post('/api/lab/canary', { blockIp: h.ip });
                      toast.success(`بلاک ${h.ip}`);
                    })
                  }
                >
                  بلاک
                </button>
              </div>
            ))}
            {!data?.canary?.hits?.length && (
              <p className="text-xs text-[var(--text-muted)]">هنوز ضربه‌ای ثبت نشده</p>
            )}
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              run('canary-clear', async () => {
                await api.post('/api/lab/canary', { clear: true });
                toast.success('پاک شد');
              })
            }
          >
            پاک کردن گزارش
          </Button>
        </BentoCell>

        {/* Presets */}
        <BentoCell span={4}>
          <p className="font-display font-semibold text-sm mb-3">پریست ضد فیلتر</p>
          <div className="flex flex-col gap-2">
            {[
              ['fragment', 'TLS Fragment یک‌کلیک'],
              ['reality-ready', 'Reality-ready hints'],
              ['stealth-max', 'Stealth Max'],
              ['ech', 'فعال‌سازی ECH'],
            ].map(([id, label]) => (
              <Button
                key={id}
                size="sm"
                variant="secondary"
                disabled={busy === id}
                onClick={() =>
                  run(id, async () => {
                    const r = await api.post('/api/lab/presets', { preset: id });
                    toast.success(r.message || label);
                  })
                }
              >
                <Radio size={13} /> {label}
              </Button>
            ))}
          </div>
        </BentoCell>

        <BentoCell span={4}>
          <p className="font-display font-semibold text-sm mb-3">دامنه‌های وزنی</p>
          <textarea
            className="w-full h-28 text-xs font-mono rounded-lg border border-[var(--stroke)] bg-[var(--bg)] p-2 mb-2"
            placeholder={'cdn1.example.com:3\ncdn2.example.com:1'}
            value={domainsText}
            onChange={(e) => setDomainsText(e.target.value)}
          />
          <Button
            size="sm"
            disabled={busy === 'dom'}
            onClick={() =>
              run('dom', async () => {
                const domains = domainsText
                  .split('\n')
                  .map((l) => l.trim())
                  .filter(Boolean)
                  .map((l) => {
                    const [host, w] = l.split(':');
                    return { host: host.trim(), weight: Number(w) || 1 };
                  });
                await api.put('/api/lab/domains', { domains });
                toast.success('دامنه‌ها ذخیره شد');
              })
            }
          >
            ذخیره وزن دامنه
          </Button>
        </BentoCell>

        {/* Ops */}
        <BentoCell span={6}>
          <p className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
            <Download size={14} /> Backup / Restore
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            <Button
              size="sm"
              onClick={async () => {
                const prefix =
                  typeof window !== 'undefined'
                    ? (window as any).__PANEL_PREFIX ||
                      (window.location.pathname.match(
                        /^(\/[0-9a-f-]{36})/i
                      ) || [])[1] ||
                      ''
                    : '';
                const origin = window.location.origin;
                const res = await fetch(`${origin}${prefix}/api/lab/backup`, {
                  credentials: 'include',
                });
                const blob = await blobOrText(res);
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `xraymod-backup-${Date.now()}.json`;
                a.click();
                toast.success('بکاپ دانلود شد');
              }}
            >
              <Download size={13} /> دانلود بکاپ
            </Button>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius)] border border-[var(--stroke)] text-xs cursor-pointer hover:border-[var(--accent)]/40">
              <Upload size={13} /> بازگردانی JSON
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const parsed = JSON.parse(await f.text());
                    const r = await api.post('/api/lab/restore', parsed);
                    toast.success(r.message || 'بازگردانی شد');
                    load();
                  } catch {
                    toast.error('فایل نامعتبر');
                  }
                }}
              />
            </label>
          </div>
          <p className="text-[11px] text-[var(--text-faint)]">
            یک فایل JSON شامل تنظیمات kvstore (بدون session). برای جابجایی پنل عالی است.
          </p>
        </BentoCell>

        <BentoCell span={6}>
          <p className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
            <Undo2 size={14} /> Rollback نسخه‌ها
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            <Button
              size="sm"
              variant="secondary"
              disabled={busy === 'ver'}
              onClick={() =>
                run('ver', async () => {
                  const r = await api.get('/api/lab/versions');
                  if (r.success === false) {
                    toast.error(r.message || 'توکن CF لازم است');
                    return;
                  }
                  setVersions(r?.data?.versions || []);
                  toast.success(`${(r?.data?.versions || []).length} نسخه`);
                })
              }
            >
              لیست نسخه‌ها
            </Button>
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1">
            {versions.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between gap-2 text-[11px] font-mono border border-[var(--stroke)] rounded-lg px-2 py-1.5"
              >
                <span className="truncate">
                  #{v.number || '—'} · {v.id?.slice(0, 8)}…
                </span>
                <button
                  type="button"
                  className="text-[var(--accent)]"
                  onClick={() =>
                    run('rb', async () => {
                      await api.post('/api/lab/rollback', { versionId: v.id });
                      toast.success('Rollback انجام شد — چند ثانیه صبر کن');
                    })
                  }
                >
                  برگشت
                </button>
              </div>
            ))}
            {!versions.length && (
              <p className="text-xs text-[var(--text-muted)]">
                اول توکن CF را در Admin ذخیره کن، بعد لیست را بگیر.
              </p>
            )}
          </div>
        </BentoCell>

        <BentoCell span={12}>
          <p className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
            <Server size={14} /> Multi-node (چند Worker)
          </p>
          <textarea
            className="w-full h-28 text-xs font-mono rounded-lg border border-[var(--stroke)] bg-[var(--bg)] p-2 mb-2"
            value={nodesText}
            onChange={(e) => setNodesText(e.target.value)}
            placeholder='[{"name":"EU","worker":"xraymod-eu","accountId":"…","weight":2}]'
          />
          <Button
            size="sm"
            onClick={() =>
              run('nodes', async () => {
                try {
                  const nodes = JSON.parse(nodesText || '[]');
                  await api.put('/api/lab/nodes', { nodes });
                  toast.success('نودها ذخیره شد');
                } catch {
                  toast.error('JSON نامعتبر');
                }
              })
            }
          >
            ذخیره نودها
          </Button>
        </BentoCell>

        <BentoCell span={12}>
          <p className="font-display font-semibold text-sm mb-3">کاتالوگ قابلیت‌ها</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {(data?.features || []).map((f) => (
              <div
                key={f.id}
                className="rounded-xl border border-[var(--stroke)] px-3 py-2.5 bg-black/20"
              >
                <p
                  className="text-[10px] uppercase tracking-wider mb-1"
                  style={{ color: GROUP_META[f.group]?.color || 'var(--text-faint)' }}
                >
                  {GROUP_META[f.group]?.fa || f.group}
                </p>
                <p className="text-sm font-medium">{f.title}</p>
              </div>
            ))}
          </div>
        </BentoCell>
      </DashboardBentoLayout>
    </div>
  );
}

async function blobOrText(res: Response): Promise<Blob> {
  const buf = await res.arrayBuffer();
  return new Blob([buf], { type: 'application/json' });
}
