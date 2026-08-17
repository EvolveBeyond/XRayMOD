'use client';

import { useEffect, useState } from 'react';
import {
  Shield,
  Save,
  RefreshCw,
  Download,
  Upload,
  AlertTriangle,
  Ghost,
  Activity,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardHeader, Button, Input, Toggle, StatusBadge } from '@/components';

const SKINS = [
  { id: '404', label: 'Silent 404 (recommended)', desc: 'بدون برند پنل — پاسخ عمومی خطا' },
  { id: '1101', label: 'CF Error 1101', desc: 'صفحه خطای کلاسیک Cloudflare' },
  { id: 'nginx', label: 'Nginx Welcome', desc: 'صفحه پیش‌فرض nginx' },
  { id: 'github', label: 'GitHub 404', desc: 'صفحه not found گیت‌هاب' },
  { id: 'wordpress', label: 'WordPress Error', desc: 'خطای critical وردپرس' },
  { id: '1020', label: 'CF Access Denied', desc: 'Access denied 1020' },
  { id: 'blank', label: 'Blank', desc: 'صفحه خالی سفید' },
];

type AuditRow = {
  t: number;
  action: string;
  detail?: string;
  ip?: string;
  actor?: string;
};

export default function StealthPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState('');

  const [enabled, setEnabled] = useState(false);
  const [fallback, setFallback] = useState('1101');
  const [adminPath, setAdminPath] = useState('');
  const [loginPath, setLoginPath] = useState('');
  const [subPath, setSubPath] = useState('');
  const [canary, setCanary] = useState(
    'wp-admin,phpmyadmin,.env,xmlrpc.php,actuator,admin.php,wp-login.php'
  );
  const [paused, setPaused] = useState(false);
  const [monthlyCap, setMonthlyCap] = useState('0');
  const [mixed, setMixed] = useState(false);
  const [ispAware, setIspAware] = useState(true);

  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [canaryHits, setCanaryHits] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/settings');
      const d = res?.data || {};
      setEnabled(d['disguise.enabled'] !== 'false');
      setFallback(d['disguise.fallback_page'] || '404');
      setAdminPath(d['disguise.admin_path'] || '');
      setLoginPath(d['disguise.login_path'] || '');
      setSubPath(d['disguise.sub_path'] || '');
      setCanary(
        d['disguise.canary_paths'] ||
          'wp-admin,phpmyadmin,.env,xmlrpc.php,actuator,admin.php,wp-login.php'
      );
      setPaused(d['panel.paused'] === 'true');
      setMonthlyCap(d['panel.monthly_cap_gb'] || '0');
      setMixed(d['protocol.mixed_mode'] === 'true');
      setIspAware(d['panel.isp_aware_sub'] !== 'false');

      const a = await api.get('/api/tools/audit?limit=40');
      setAudit(Array.isArray(a?.data) ? a.data : []);

      const c = await api.get('/api/tools/canary');
      setCanaryHits(c?.data?.total || 0);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const res = await api.put('/api/settings', {
        'disguise.enabled': String(enabled),
        'disguise.fallback_page': fallback,
        'disguise.admin_path': adminPath.trim().toLowerCase().replace(/^\/+|\/+$/g, ''),
        'disguise.login_path': loginPath.trim().toLowerCase().replace(/^\/+|\/+$/g, ''),
        'disguise.sub_path': subPath.trim().toLowerCase().replace(/^\/+|\/+$/g, ''),
        'disguise.canary_paths': canary,
        'panel.paused': String(paused),
        'panel.monthly_cap_gb': String(Number(monthlyCap) || 0),
        'protocol.mixed_mode': String(mixed),
        'panel.isp_aware_sub': String(ispAware),
      });
      if (res.success === false) {
        setMsg(res.message || 'خطا در ذخیره');
      } else {
        setSaved(true);
        setMsg('ذخیره شد');
        setTimeout(() => setSaved(false), 2000);
        load();
      }
    } catch {
      setMsg('خطای شبکه');
    }
    setSaving(false);
  };

  const exportFull = async () => {
    try {
      const res = await api.get('/api/tools/backup');
      const blob = new Blob([JSON.stringify(res?.data || res, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xraymod-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMsg('خروجی ناموفق');
    }
  };

  const importFull = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const res = await api.post('/api/tools/restore', data);
        if (res.success === false) {
          setMsg(res.message || 'ورود ناموفق');
        } else {
          setMsg(res.message || 'بازیابی شد');
          load();
        }
      } catch {
        setMsg('فایل نامعتبر');
      }
    };
    input.click();
  };

  const fmtTime = (t: number) => {
    try {
      return new Date(t).toLocaleString('fa-IR');
    } catch {
      return String(t);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-500 text-sm">
        <RefreshCw className="animate-spin mr-2" size={16} /> در حال بارگذاری...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2">
            <Ghost className="text-emerald-400" size={28} /> حفاظت مبدأ
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            مسیر پنل را از اسکنر پنهان می‌کند. این استتار ترافیک VPN نیست.
          </p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? 'ذخیره شد!' : 'ذخیره'}
        </Button>
      </div>

      {msg && (
        <div className="text-sm px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          {msg}
        </div>
      )}

      {/* Service guards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="کنترل سرویس" description="بدون قطع پنل — فقط ترافیک پروکسی" />
          <div className="space-y-1">
            <Toggle
              label="توقف سرویس (Kill Switch)"
              description="همه کانکشن‌های پروکسی → 503"
              checked={paused}
              onChange={setPaused}
            />
            <Toggle
              label="پروتکل ترکیبی"
              description="چرخش VLESS / Trojan / SS در ساب"
              checked={mixed}
              onChange={setMixed}
            />
            <Toggle
              label="ساب ISP-aware"
              description="اولویت endpoint لبه بر اساس ASN/ISP بازدیدکننده"
              checked={ispAware}
              onChange={setIspAware}
            />
            <div className="pt-2">
              <Input
                label="سقف ماهانه کل پنل (GB)"
                type="number"
                value={monthlyCap}
                onChange={(e) => setMonthlyCap(e.target.value)}
                placeholder="0 = بدون سقف"
              />
              <p className="text-[11px] text-zinc-600 mt-1">۰ یعنی نامحدود. بعد از پر شدن → 503</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="پوستهٔ عمومی (حفاظت مبدأ)"
            description="وقتی مسیر اشتباه بزنند چه ببینند — اثر انگشت پنل را کم می‌کند، ترافیک را پنهان نمی‌کند"
          />
          <div className="grid grid-cols-2 gap-2">
            {SKINS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setFallback(s.id)}
                className={`text-right p-3 rounded-xl border transition-all ${
                  fallback === s.id
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                }`}
              >
                <div className="text-sm font-bold">{s.label}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">{s.desc}</div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Secret paths */}
      <Card>
        <CardHeader title="مسیرهای مخفی" description="مسیر واقعی پنل را عوض کن — مسیرهای لو رفته decoy می‌شوند" />
        <div className="space-y-1 mb-4">
          <Toggle
            label="فعال‌سازی حفاظت مبدأ"
            description="مسیرهای secret remap می‌شوند؛ مسیرهای لو رفته پاسخ عمومی می‌گیرند"
            checked={enabled}
            onChange={setEnabled}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="مسیر ادمین (بدون /)"
            value={adminPath}
            onChange={(e) => setAdminPath(e.target.value)}
            placeholder="مثلا x-panel"
          />
          <Input
            label="مسیر لاگین"
            value={loginPath}
            onChange={(e) => setLoginPath(e.target.value)}
            placeholder="مثلا gate"
          />
          <Input
            label="مسیر ساب"
            value={subPath}
            onChange={(e) => setSubPath(e.target.value)}
            placeholder="مثلا get"
          />
        </div>
        <p className="text-[11px] text-amber-500/80 mt-3 flex items-start gap-1.5">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          بعد از ذخیره، URL پنل را یادداشت کن. مسیرهای قدیمی /admin و /login صفحه جعلی می‌دهند.
        </p>
      </Card>

      {/* Canary */}
      <Card>
        <CardHeader
          title="Canary (طعمه اسکنر)"
          description="اگر کسی این مسیرها را زد، لاگ می‌شود و decoy می‌بیند"
          action={<StatusBadge status={`${canaryHits} hit`} variant={canaryHits > 0 ? 'warning' : 'default'} />}
        />
        <Input
          label="مسیرهای طعمه (با کاما)"
          value={canary}
          onChange={(e) => setCanary(e.target.value)}
          placeholder="wp-admin,phpmyadmin,.env"
        />
        <p className="text-[11px] text-zinc-600 mt-2">
          رایگان · فقط در D1 لاگ می‌شود · پنل را لو نمی‌دهد
        </p>
      </Card>

      {/* Backup */}
      <Card>
        <CardHeader title="پشتیبان کامل" description="تنظیمات + کاربران (بدون هش رمز) + کانفیگ‌ها" />
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={exportFull}>
            <Download size={14} /> خروجی کامل
          </Button>
          <Button variant="secondary" onClick={importFull}>
            <Upload size={14} /> بازیابی تنظیمات
          </Button>
          <Button variant="secondary" onClick={load}>
            <RefreshCw size={14} /> تازه‌سازی لاگ
          </Button>
        </div>
      </Card>

      {/* Audit */}
      <Card>
        <CardHeader
          title="Audit Log"
          description="آخرین عملیات ادمین و canary hits"
          action={
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Activity size={12} /> {audit.length}
            </span>
          }
        />
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {audit.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-6">هنوز رویدادی نیست</p>
          ) : (
            audit.map((row, i) => (
              <div
                key={`${row.t}-${i}`}
                className="flex items-start justify-between gap-3 py-2.5 px-3 rounded-xl bg-zinc-900/50 border border-zinc-800/60"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-emerald-400 font-mono">{row.action}</span>
                    {row.actor && (
                      <span className="text-[10px] text-zinc-600">{row.actor}</span>
                    )}
                  </div>
                  {row.detail && (
                    <p className="text-[11px] text-zinc-500 mt-0.5 break-all">{row.detail}</p>
                  )}
                </div>
                <div className="text-left shrink-0">
                  <div className="text-[10px] text-zinc-600">{fmtTime(row.t)}</div>
                  {row.ip && <div className="text-[10px] font-mono text-zinc-700">{row.ip}</div>}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <div className="flex items-center gap-2 text-xs text-zinc-600">
        <Shield size={12} />
        همه این قابلیت‌ها رایگان‌اند و روی Worker + D1 اجرا می‌شوند — بدون سرویس خارجی پولی.
      </div>
    </div>
  );
}
