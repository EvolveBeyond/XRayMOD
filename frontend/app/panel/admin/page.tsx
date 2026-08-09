'use client';

import { useEffect, useState } from 'react';
import {
  RefreshCw,
  Globe,
  Mail,
  Key,
  Pause,
  Play,
  Download,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardHeader, Button, Input, PageHeader } from '@/components';
import { toast } from 'sonner';

type Dash = {
  version: string;
  paused: boolean;
  users: number;
  traffic_used: number;
  monthly_cap_gb: number;
  usage_percent: number;
  warn_80: boolean;
  custom_domains: string[];
  cf_email: string;
  secure_path: string;
  panel_entry: string;
};

export default function AdminPage() {
  const [dash, setDash] = useState<Dash | null>(null);
  const [update, setUpdate] = useState<any>(null);
  const [domains, setDomains] = useState('');
  const [cfEmail, setCfEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [remoteCookie, setRemoteCookie] = useState('');
  const [loading, setLoading] = useState(true);
  const [cfToken, setCfToken] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateJob, setUpdateJob] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/dashboard');
      if (res?.data) {
        setDash(res.data);
        setDomains((res.data.custom_domains || []).join(', '));
        setCfEmail(res.data.cf_email || '');
      }
      const u = await api.get('/api/admin/update-check');
      setUpdate(u);
      const st = await api.get('/api/admin/update-status');
      if (st?.job) setUpdateJob(st.job);
    } catch {
      toast.error('Failed to load admin dashboard');
    }
    setLoading(false);
  };

  const saveCfToken = async () => {
    if (cfToken.trim().length < 20) {
      toast.error('توکن Cloudflare را کامل وارد کنید');
      return;
    }
    const res = await api.put('/api/admin/cf-token', { token: cfToken.trim() });
    if (res.success === false) {
      toast.error(res.message || 'ذخیره توکن ناموفق');
      return;
    }
    setCfToken('');
    toast.success('توکن برای بروزرسانی ذخیره شد');
    load();
  };

  const runSelfUpdate = async () => {
    setUpdating(true);
    setUpdateJob(null);
    try {
      const res = await api.post('/api/admin/self-update', {
        token: cfToken.trim() || undefined,
        force: true,
      });
      if (res.success === false && !res.job) {
        toast.error(res.message || 'شروع بروزرسانی ناموفق');
        setUpdating(false);
        return;
      }
      setUpdateJob(res.job);
      // Poll live steps
      const started = Date.now();
      while (Date.now() - started < 12 * 60 * 1000) {
        await new Promise((r) => setTimeout(r, 900));
        const st = await api.get('/api/admin/update-status');
        if (st?.job) {
          setUpdateJob(st.job);
          if (st.job.status === 'done') {
            toast.success('بروزرسانی تمام شد — صفحه را رفرش کنید');
            break;
          }
          if (st.job.status === 'error') {
            toast.error(st.job.error || 'بروزرسانی ناموفق');
            break;
          }
        }
      }
      load();
    } catch (e: any) {
      toast.error(e?.message || 'خطا در بروزرسانی');
    }
    setUpdating(false);
  };

  useEffect(() => {
    load();
  }, []);

  const saveDomains = async () => {
    const res = await api.put('/api/admin/domains', { domains });
    if (res.success === false) {
      toast.error(res.message || 'Failed');
      return;
    }
    toast.success('Custom domains saved — D-tagged configs in subs');
    load();
  };

  const saveEmail = async () => {
    const res = await api.put('/api/admin/cf-email', { email: cfEmail, enforce: true });
    if (res.success === false) {
      toast.error(res.message || 'Failed');
      return;
    }
    toast.success('Cloudflare email bound as login username');
    load();
  };

  const resetPass = async () => {
    if (newPass.length < 8) {
      toast.error('Min 8 characters');
      return;
    }
    const res = await api.post('/api/admin/reset-password', { password: newPass });
    if (res.success === false) {
      toast.error(res.message || 'Failed');
      return;
    }
    setNewPass('');
    toast.success('Password reset');
  };

  const togglePause = async () => {
    const res = await api.post('/api/admin/pause', { paused: !dash?.paused });
    if (res.success === false) {
      toast.error(res.message || 'Failed');
      return;
    }
    toast.success(res.paused ? 'Proxy paused (kill switch)' : 'Proxy resumed');
    load();
  };

  const remoteSync = async () => {
    const res = await api.post('/api/admin/remote-sync', {
      url: remoteUrl,
      cookie: remoteCookie || undefined,
    });
    if (res.success === false) {
      toast.error(res.message || 'Sync failed');
      return;
    }
    toast.success(res.message || `Imported ${res.imported} keys`);
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
    return `${v.toFixed(i > 1 ? 2 : 0)} ${u[i]}`;
  };

  if (loading && !dash) {
    return <div className="p-8 text-[var(--text-muted)]">Loading admin…</div>;
  }

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Admin Dashboard"
        description="SECURE PATH · update · domains · CF email · kill switch"
        actions={
          <Button variant="secondary" onClick={load}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        }
      />

      {dash?.warn_80 && (
        <div className="flex items-start gap-3 rounded-[1rem] border border-[rgba(230,180,80,0.25)] bg-[rgba(230,180,80,0.08)] p-4 text-[var(--warn)] text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          Usage over 80% of monthly cap ({dash.usage_percent}%). Consider raising the cap or pausing proxy.
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-3.5">
        <Card>
          <CardHeader title="Version" />
          <p className="font-display text-2xl font-bold text-[var(--accent)] tabular">{dash?.version || '—'}</p>
        </Card>
        <Card>
          <CardHeader title="Users" />
          <p className="font-display text-2xl font-bold tabular">{dash?.users ?? '—'}</p>
        </Card>
        <Card>
          <CardHeader title="Traffic" />
          <p className="font-display text-2xl font-bold tabular">{fmtBytes(dash?.traffic_used || 0)}</p>
        </Card>
        <Card>
          <CardHeader title="Proxy" />
          <p className="font-display text-2xl font-bold">{dash?.paused ? 'PAUSED' : 'ON'}</p>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="بروزرسانی پنل"
          description="آخرین نسخه از GitHub روی همین Worker دیپلوی می‌شود — دیتابیس کاربران پاک نمی‌شود"
        />
        <div className="space-y-3 text-sm text-zinc-400">
          <p>
            نسخه فعلی: <code className="text-emerald-400">{update?.current || dash?.version}</code>
            {update?.latest ? (
              <>
                {' '}
                · آخرین ریلیز: <code className="text-emerald-400">{update.latest}</code>
              </>
            ) : null}
          </p>
          {update?.main_sha && (
            <p className="text-xs text-zinc-500 font-mono">
              GitHub main: {update.main_sha}
              {update.main_message ? ` — ${update.main_message}` : ''}
              {update.last_applied_commit
                ? ` · آخرین اعمال‌شده: ${update.last_applied_commit}`
                : ''}
            </p>
          )}
          {update?.update_available ? (
            <p className="text-amber-300 text-sm">نسخه جدیدتر در GitHub موجود است.</p>
          ) : (
            <p className="text-zinc-500 text-sm">از نظر ریلیز/کامیت، به‌روز به نظر می‌رسید (یا هنوز توکن ذخیره نشده).</p>
          )}
          <p className="text-xs text-zinc-500">{update?.how}</p>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs text-zinc-500">
            توکن Cloudflare (Edit Workers + D1) — یک‌بار ذخیره کنید
            {update?.has_token ? (
              <span className="text-emerald-400"> · ذخیره شده ✓</span>
            ) : (
              <span className="text-amber-300"> · هنوز ذخیره نشده</span>
            )}
          </p>
          <Input
            type="password"
            value={cfToken}
            onChange={(e: any) => setCfToken(e.target.value)}
            placeholder="cfut_… یا API Token"
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={saveCfToken} disabled={!cfToken.trim()}>
              <Key className="w-4 h-4 mr-2" />
              ذخیره توکن
            </Button>
            <Button
              variant="secondary"
              onClick={() => api.get('/api/admin/update-check').then(setUpdate)}
            >
              <Download className="w-4 h-4 mr-2" />
              بررسی مجدد
            </Button>
            <Button onClick={runSelfUpdate} disabled={updating}>
              <RefreshCw className={`w-4 h-4 mr-2 ${updating ? 'animate-spin' : ''}`} />
              {updating ? 'در حال بروزرسانی…' : 'بروزرسانی الان'}
            </Button>
            {update?.release_url && (
              <a
                href={update.release_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:underline px-2"
              >
                <ExternalLink className="w-4 h-4" /> ریلیز
              </a>
            )}
          </div>
        </div>

        {(updateJob?.steps?.length || updating) && (
          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 max-h-64 overflow-y-auto">
            <p className="text-xs text-zinc-500 mb-2 font-display">
              وضعیت:{' '}
              <span
                className={
                  updateJob?.status === 'done'
                    ? 'text-emerald-400'
                    : updateJob?.status === 'error'
                      ? 'text-red-400'
                      : 'text-amber-300'
                }
              >
                {updateJob?.status || 'running'}
              </span>
            </p>
            <ol className="space-y-1.5 text-[12px] font-mono">
              {(updateJob?.steps || []).map((s: any) => (
                <li key={s.id} className="flex gap-2 text-zinc-300">
                  <span className="text-zinc-600 shrink-0">{s.id}.</span>
                  <span
                    className={
                      s.ok === false
                        ? 'text-red-400'
                        : s.ok === true
                          ? 'text-emerald-400'
                          : 'text-zinc-300'
                    }
                  >
                    {s.text}
                  </span>
                </li>
              ))}
              {updating && updateJob?.status === 'running' && (
                <li className="text-zinc-500">…</li>
              )}
            </ol>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="SECURE PATH entry" />
        <p className="text-xs text-zinc-500 mb-2">Never share this. Root URLs return 404.</p>
        <code className="block text-sm break-all bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-emerald-300">
          {dash?.panel_entry || '—'}
        </code>
      </Card>

      <Card>
        <CardHeader title="Custom domains (D tag)" />
        <p className="text-xs text-zinc-500 mb-3">
          Domains you already pointed to this Worker. Merged into subscriptions with · D · tag.
        </p>
        <Input
          value={domains}
          onChange={(e: any) => setDomains(e.target.value)}
          placeholder="cdn.example.com, panel.example.com"
        />
        <div className="mt-3 flex gap-2">
          <Button onClick={saveDomains}>
            <Globe className="w-4 h-4 mr-2" />
            Save domains
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Cloudflare email login" />
        <p className="text-xs text-zinc-500 mb-3">
          Login username must match this email (BPB-style hardening).
        </p>
        <Input
          value={cfEmail}
          onChange={(e: any) => setCfEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <div className="mt-3">
          <Button onClick={saveEmail}>
            <Mail className="w-4 h-4 mr-2" />
            Bind email
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Reset password" />
        <Input
          type="password"
          value={newPass}
          onChange={(e: any) => setNewPass(e.target.value)}
          placeholder="New password (min 8)"
        />
        <div className="mt-3">
          <Button onClick={resetPass}>
            <Key className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Kill switch" />
        <p className="text-xs text-zinc-500 mb-3">
          Pause all proxy traffic to reduce Cloudflare ToS/abuse risk while keeping the panel up.
        </p>
        <Button variant={dash?.paused ? 'primary' : 'secondary'} onClick={togglePause}>
          {dash?.paused ? (
            <>
              <Play className="w-4 h-4 mr-2" /> Resume proxy
            </>
          ) : (
            <>
              <Pause className="w-4 h-4 mr-2" /> Pause proxy
            </>
          )}
        </Button>
      </Card>

      <Card>
        <CardHeader title="Remote settings sync" />
        <p className="text-xs text-zinc-500 mb-3">
          Pull settings from another XRayMOD panel. SECURE PATH, UUID, domains and secrets are excluded.
        </p>
        <div className="space-y-2">
          <Input
            value={remoteUrl}
            onChange={(e: any) => setRemoteUrl(e.target.value)}
            placeholder="https://xxx.workers.dev/SECURE_PATH"
          />
          <Input
            value={remoteCookie}
            onChange={(e: any) => setRemoteCookie(e.target.value)}
            placeholder="session=… (optional Cookie header)"
          />
        </div>
        <div className="mt-3">
          <Button variant="secondary" onClick={remoteSync}>
            Sync now
          </Button>
        </div>
      </Card>
    </div>
  );
}
