'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Radar,
  Play,
  Square,
  Copy,
  Check,
  Sparkles,
  Wifi,
  Globe,
  Trophy,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardHeader, Button, ProgressBar, EmptyState, PageHeader } from '@/components';
import { toast } from 'sonner';

interface ScanResult {
  ip: string;
  port: number;
  latency: number;
  jitter: number;
  loss: number;
  score: number;
  samples: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  country?: string;
}

interface CleanIP {
  ip: string;
  port: number;
  label: string;
  country?: string;
}

interface NetworkHint {
  asn: number;
  isp: string;
  country: string;
  carrier: string;
}

const PORTS = [443, 8443, 2053, 2083, 2087, 2096];
const COUNTRIES = ['DE', 'NL', 'FI', 'SE', 'TR', 'GB', 'FR', 'US'] as const;

function gradeLatency(ms: number): ScanResult['grade'] {
  if (ms < 80) return 'S';
  if (ms < 140) return 'A';
  if (ms < 220) return 'B';
  if (ms < 350) return 'C';
  return 'D';
}

function gradeColor(g: ScanResult['grade']) {
  if (g === 'S' || g === 'A') return 'text-[var(--accent)]';
  if (g === 'B') return 'text-[var(--info)]';
  if (g === 'C') return 'text-[var(--warn)]';
  return 'text-[var(--coral)]';
}

/** Probe one IP from the visitor's own network path (browser → IP). */
async function probeFromClient(ip: string, port: number, rounds = 3): Promise<ScanResult | null> {
  const samples: number[] = [];
  let fails = 0;

  for (let i = 0; i < rounds; i++) {
    const ms = await new Promise<number | null>((resolve) => {
      const img = new Image();
      const t0 = performance.now();
      const timer = window.setTimeout(() => {
        img.src = '';
        resolve(null);
      }, 2200);
      const done = () => {
        window.clearTimeout(timer);
        resolve(Math.max(1, Math.round(performance.now() - t0)));
      };
      img.onload = done;
      img.onerror = done;
      // Hits CF edge from the user's ISP path; cert mismatch still fires onerror with RTT.
      img.src = `https://${ip}:${port}/cdn-cgi/trace?_=${Date.now()}-${i}`;
    });
    if (ms == null) fails += 1;
    else samples.push(ms);
    await new Promise((r) => setTimeout(r, 40));
  }

  if (!samples.length) return null;

  const latency = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
  const jitter = Math.round(
    samples.reduce((a, b) => a + Math.abs(b - latency), 0) / samples.length
  );
  const loss = Math.round((fails / rounds) * 100);
  const score = Math.round(latency + jitter * 1.4 + loss * 8);
  return {
    ip,
    port,
    latency,
    jitter,
    loss,
    score,
    samples: samples.length,
    grade: gradeLatency(latency),
  };
}

export default function CleanIPPage() {
  const [cleanIPs, setCleanIPs] = useState<CleanIP[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [selectedPort, setSelectedPort] = useState(443);
  const [scanCount, setScanCount] = useState(64);
  const [countries, setCountries] = useState<string[]>(['DE', 'NL', 'FI', 'SE', 'TR']);
  const [network, setNetwork] = useState<NetworkHint | null>(null);
  const [statusLine, setStatusLine] = useState('آمادهٔ اسکن از شبکهٔ شما');
  const [recommendBusy, setRecommendBusy] = useState(false);
  const [recommendSub, setRecommendSub] = useState('');
  const abortRef = useRef(false);
  const countryByIp = useRef<Record<string, string>>({});

  const loadCleanIPs = useCallback(async () => {
    try {
      const data = await api.get('/api/cleanip/list');
      const raw = data?.data?.ips || data?.data || data?.ips || [];
      const list = Array.isArray(raw) ? raw : [];
      setCleanIPs(
        list
          .map((item: string | CleanIP) => {
            if (typeof item === 'string') {
              const [ipPort, tag] = item.split('#');
              const [ip, port] = (ipPort || '').split(':');
              const country = tag?.trim().toUpperCase() || '';
              return {
                ip: ip || '',
                port: Number(port) || 443,
                label: country,
                country,
              };
            }
            return {
              ip: item.ip || '',
              port: item.port || 443,
              label: item.label || item.country || '',
              country: item.country || item.label || '',
            };
          })
          .filter((x: CleanIP) => x.ip)
      );
    } catch {
      setCleanIPs([]);
    }
  }, []);

  useEffect(() => {
    loadCleanIPs();
    api
      .get('/api/cleanip')
      .then((d) => {
        const isp = d?.data?.isp || d?.isp;
        if (isp) setNetwork(isp);
      })
      .catch(() => {});
  }, [loadCleanIPs]);

  const scanIPs = async () => {
    setScanning(true);
    setScanResults([]);
    setScanProgress(0);
    abortRef.current = false;
    setStatusLine('دریافت لیست IP کشورهای خوب (DE/NL/FI/…)…');
    countryByIp.current = {};

    let targets: { ip: string; port: number; country?: string }[] = [];
    try {
      const qs = new URLSearchParams({
        count: String(scanCount),
        port: String(selectedPort),
        countries: countries.join(','),
      });
      const data = await api.get(`/api/cleanip/scan?${qs}`);
      const isp = data?.data?.isp || data?.isp;
      if (isp) setNetwork(isp);
      const raw: string[] = data?.data?.ips || data?.ips || [];
      targets = raw
        .map((s) => {
          const [hostPort, tag] = String(s).split('#');
          const [ip, port] = (hostPort || '').split(':');
          const country = tag?.trim().toUpperCase() || 'CF';
          if (ip) countryByIp.current[ip] = country;
          return { ip, port: Number(port) || selectedPort, country };
        })
        .filter((t) => t.ip);
    } catch {
      /* fallback below */
    }

    if (!targets.length) {
      // Fallback CF ranges if API unavailable
      const ranges = [
        [104, 16],
        [104, 17],
        [172, 64],
        [172, 67],
        [162, 159],
      ];
      targets = Array.from({ length: scanCount }, () => {
        const [a, b] = ranges[Math.floor(Math.random() * ranges.length)];
        return {
          ip: `${a}.${b}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
          port: selectedPort,
        };
      });
    }

    setStatusLine(
      `در حال تست ${targets.length} آی‌پی از مسیر اینترنت شما (${network?.isp || network?.carrier || 'شبکه فعلی'})…`
    );

    const results: ScanResult[] = [];
    const batchSize = 8;

    for (let i = 0; i < targets.length; i += batchSize) {
      if (abortRef.current) break;
      const batch = targets.slice(i, i + batchSize);
      const settled = await Promise.allSettled(
        batch.map(async (t) => {
          const r = await probeFromClient(t.ip, t.port, 3);
          if (!r) return null;
          return { ...r, country: t.country || countryByIp.current[t.ip] || 'CF' };
        })
      );
      for (const r of settled) {
        if (r.status === 'fulfilled' && r.value) {
          results.push(r.value);
          // Prefer lower score, then preferred countries
          const rank = (c?: string) =>
            ['DE', 'NL', 'FI', 'SE', 'TR'].indexOf(c || '') === -1
              ? 9
              : ['DE', 'NL', 'FI', 'SE', 'TR'].indexOf(c || '');
          results.sort((a, b) => a.score - b.score || rank(a.country) - rank(b.country));
          setScanResults([...results]);
        }
      }
      setScanProgress(Math.min(((i + batchSize) / targets.length) * 100, 100));
      setStatusLine(
        `پیدا شده: ${results.length} · پیشرفت ${Math.min(100, Math.round(((i + batchSize) / targets.length) * 100))}%`
      );
    }

    setScanning(false);
    if (results.length) {
      setStatusLine(
        `بهترین: ${results[0].ip}:${results[0].port} · ${results[0].latency}ms · Grade ${results[0].grade}`
      );
      toast.success(`${results.length} آی‌پی پاسخ‌گو از شبکهٔ شما`);
    } else {
      setStatusLine('هیچ آی‌پی پاسخ‌گویی پیدا نشد — VPN/فیلتر را چک کنید و دوباره بزنید');
      toast.error('نتیجه‌ای نبود');
    }
  };

  const stopScan = () => {
    abortRef.current = true;
    setScanning(false);
    setStatusLine('اسکن متوقف شد');
  };

  const applyIPs = async (list: ScanResult[]) => {
    if (!list.length) return;
    try {
      const existing = cleanIPs.map(
        (c) => `${c.ip}:${c.port}${c.country ? `#${c.country}` : ''}`
      );
      const next = [
        ...new Set([
          ...list.map(
            (r) => `${r.ip}:${r.port}#${r.country || countryByIp.current[r.ip] || 'CF'}`
          ),
          ...existing,
        ]),
      ].slice(0, 80);
      await api.post('/api/cleanip/apply', { ips: next });
      await loadCleanIPs();
      toast.success(`${list.length} آی‌پی ذخیره شد`);
    } catch {
      toast.error('ذخیره ناموفق');
    }
  };

  const toggleCountry = (cc: string) => {
    setCountries((prev) =>
      prev.includes(cc) ? prev.filter((x) => x !== cc) : [...prev, cc]
    );
  };

  const buildRecommendedSub = async () => {
    setRecommendBusy(true);
    try {
      // Apply fastest scanned IPs first if available
      if (scanResults.length) {
        await applyIPs(scanResults.slice(0, 20));
      }
      const res = await api.post('/api/cleanip/recommend', {
        count: 48,
        countries,
        apply: true,
      });
      if (res.success === false) {
        toast.error(res.message || 'ساخت ساب پیشنهادی ناموفق');
        return;
      }
      const sub = res?.data?.subscriptionUrl || '';
      setRecommendSub(sub);
      await loadCleanIPs();
      toast.success(res?.data?.message || 'ساب پیشنهادی آماده شد');
      if (sub) {
        try {
          await navigator.clipboard.writeText(sub);
          toast.message('لینک ساب کپی شد');
        } catch {
          /* ignore */
        }
      }
    } catch {
      toast.error('خطا در ساخت ساب پیشنهادی');
    }
    setRecommendBusy(false);
  };

  const removeCleanIP = async (ip: string) => {
    try {
      const next = cleanIPs.filter((c) => c.ip !== ip).map((c) => `${c.ip}:${c.port}`);
      await api.post('/api/cleanip/apply', { ips: next });
      await loadCleanIPs();
    } catch {
      /* ignore */
    }
  };

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('کپی شد');
  };

  const top = scanResults.slice(0, 5);
  const best = top[0] || null;

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        eyebrow="Network probe"
        title="آی‌پی تمیز"
        description="اسکن واقعی از اینترنت شما — بهترین edge برای همین مسیر"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={buildRecommendedSub}
              disabled={recommendBusy || scanning}
            >
              <Sparkles size={14} />
              {recommendBusy ? 'در حال ساخت…' : 'ساب پیشنهادی'}
            </Button>
            {scanning ? (
              <Button variant="danger" onClick={stopScan}>
                <Square size={14} /> توقف
              </Button>
            ) : (
              <Button onClick={scanIPs}>
                <Play size={14} /> شروع اسکن شبکه
              </Button>
            )}
          </>
        }
      />

      <section className="hero-band">
        <div className="relative z-[1] grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <span className="chip chip-live">
                <Wifi size={11} /> Client-path scan
              </span>
              {network?.carrier && network.carrier !== 'all' && (
                <span className="chip">{network.carrier.toUpperCase()}</span>
              )}
              {network?.country && <span className="chip">{network.country}</span>}
            </div>
            <h2 className="font-display text-xl font-bold tracking-tight">
              تست از همان شبکه‌ای که الان پنل را باز کرده‌اید
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-xl">
              استخر بزرگ از کشورهای سریع (آلمان، هلند، فنلاند، ترکیه، …) + تست واقعی از اینترنت شما.
              بعد با «ساب پیشنهادی» بهترین‌ها داخل ساب می‌آیند.
            </p>
            <p className="text-xs font-mono text-[var(--text-faint)]">{statusLine}</p>
            {recommendSub && (
              <p className="text-xs font-mono text-[var(--accent)] break-all">{recommendSub}</p>
            )}
          </div>
          <div className="surface rounded-[var(--radius)] p-4 border border-[var(--stroke)] space-y-2">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-faint)] font-display font-semibold">
              شبکهٔ فعلی
            </p>
            <p className="text-sm font-semibold truncate">{network?.isp || 'در حال تشخیص…'}</p>
            <p className="text-xs text-[var(--text-muted)] font-mono">
              ASN {network?.asn || '—'} · Carrier {network?.carrier || '—'}
            </p>
            {best && (
              <div className="pt-2 border-t border-[var(--stroke)]">
                <p className="text-[11px] text-[var(--accent)] font-semibold mb-1">پیشنهاد اول</p>
                <p className="font-mono text-sm font-bold">
                  {best.ip}:{best.port}
                </p>
                <p className="text-[11px] text-[var(--text-faint)] mt-1">
                  {best.latency}ms · jitter {best.jitter}ms · grade {best.grade}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <Card>
        <CardHeader
          title="تنظیمات اسکن"
          description="پورت و تعداد هدف — هرچه بیشتر، دقیق‌تر و کندتر"
        />
        <div className="space-y-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[var(--text-faint)]">کشورها</span>
            {COUNTRIES.map((cc) => (
              <button
                key={cc}
                type="button"
                onClick={() => toggleCountry(cc)}
                className={`px-2.5 py-1 rounded-[var(--radius)] text-xs font-mono border transition-colors ${
                  countries.includes(cc)
                    ? 'border-[var(--accent)]/50 bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--stroke)] text-[var(--text-muted)]'
                }`}
              >
                {cc}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-[var(--text-faint)]">Port</span>
            <div className="flex flex-wrap gap-1.5">
              {PORTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPort(p)}
                  className={`px-2.5 py-1 rounded-[var(--radius)] text-xs font-mono border transition-colors ${
                    selectedPort === p
                      ? 'border-[var(--accent)]/50 bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'border-[var(--stroke)] text-[var(--text-muted)] hover:border-[var(--stroke-strong)]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <label className="ms-auto flex items-center gap-2 text-xs text-[var(--text-muted)]">
              تعداد
              <select
                value={scanCount}
                onChange={(e) => setScanCount(Number(e.target.value))}
                className="bg-[var(--bg)] border border-[var(--stroke-strong)] rounded-[var(--radius)] px-2 py-1 text-xs"
              >
                {[40, 64, 80, 100, 120].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {scanning && (
          <div className="mb-4">
            <div className="flex justify-between text-[11px] text-[var(--text-faint)] mb-1.5">
              <span>Scanning your path…</span>
              <span>{scanResults.length} live</span>
            </div>
            <ProgressBar value={scanProgress} size="sm" />
          </div>
        )}

        {best && (
          <div className="p-4 mb-4 rounded-[var(--radius)] border border-[var(--accent)]/25 bg-[var(--accent-soft)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] flex items-center gap-1.5">
                  <Trophy size={12} /> Best for your network
                </p>
                <p className="font-mono text-lg font-bold mt-1">
                  {best.ip}:{best.port}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {best.latency}ms · jitter {best.jitter}ms · loss {best.loss}% · score {best.score} ·{' '}
                  <span className={gradeColor(best.grade)}>Grade {best.grade}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => applyIPs([best])}>
                  <Check size={14} /> اعمال بهترین
                </Button>
                <Button size="sm" variant="secondary" onClick={() => applyIPs(top)}>
                  <Sparkles size={14} /> Top {Math.min(5, top.length)}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => copyText(`${best.ip}:${best.port}`)}
                >
                  <Copy size={14} /> کپی
                </Button>
              </div>
            </div>
          </div>
        )}

        {scanResults.length > 0 ? (
          <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-[var(--radius)] border border-[var(--stroke)]">
            <table className="w-full">
              <thead className="sticky top-0 bg-[var(--bg-panel)]">
                <tr className="border-b border-[var(--stroke)]">
                  {['#', 'IP:Port', 'CC', 'Latency', 'Jitter', 'Loss', 'Grade', 'Score', ''].map((h) => (
                    <th
                      key={h || 'a'}
                      className="text-start px-3 py-2 text-[10px] font-display font-semibold text-[var(--text-faint)] uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scanResults.slice(0, 30).map((r, i) => (
                  <tr
                    key={`${r.ip}:${r.port}:${i}`}
                    className={`border-b border-[var(--stroke)]/60 ${
                      i === 0 ? 'bg-[var(--accent-soft)]' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <td className="px-3 py-2 text-xs text-[var(--text-faint)]">{i + 1}</td>
                    <td className="px-3 py-2 text-xs font-mono">
                      {r.ip}:{r.port}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono text-[var(--accent)]">
                      {r.country || 'CF'}
                    </td>
                    <td className={`px-3 py-2 text-xs font-mono ${gradeColor(r.grade)}`}>
                      {r.latency}ms
                    </td>
                    <td className="px-3 py-2 text-xs font-mono text-[var(--text-muted)]">
                      {r.jitter}ms
                    </td>
                    <td className="px-3 py-2 text-xs font-mono text-[var(--text-muted)]">
                      {r.loss}%
                    </td>
                    <td className={`px-3 py-2 text-xs font-bold ${gradeColor(r.grade)}`}>
                      {r.grade}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono font-semibold">{r.score}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-[var(--text-faint)] hover:text-[var(--accent)] p-1"
                        onClick={() => applyIPs([r])}
                        title="Apply"
                      >
                        <Check size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !scanning && (
            <p className="text-sm text-[var(--text-muted)] text-center py-6">
              «شروع اسکن شبکه» را بزنید تا از مسیر اینترنت خودتان بهترین سرورها پیدا شوند.
            </p>
          )
        )}
      </Card>

      <Card>
        <CardHeader title="استخر آی‌پی" description={`${cleanIPs.length} آی‌پی ذخیره‌شده برای ساب`} />
        {cleanIPs.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="خالی است"
            description="اسکن کنید و بهترین‌ها را اعمال کنید تا در کانفیگ/ساب استفاده شوند."
          />
        ) : (
          <div className="space-y-2">
            {cleanIPs.map((ip) => (
              <div
                key={`${ip.ip}:${ip.port}`}
                className="flex items-center justify-between py-2.5 px-3 rounded-[var(--radius)] border border-[var(--stroke)] bg-[var(--bg-panel)]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Radar size={14} className="text-[var(--accent)] shrink-0" />
                  <span className="text-sm font-mono truncate">
                    {ip.ip}:{ip.port}
                  </span>
                  {ip.label && (
                    <span className="text-[10px] text-[var(--text-faint)] truncate">{ip.label}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => copyText(`${ip.ip}:${ip.port}`)}
                    className="p-1.5 rounded-[var(--radius)] text-[var(--text-faint)] hover:text-[var(--accent)]"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCleanIP(ip.ip)}
                    className="p-1.5 rounded-[var(--radius)] text-[var(--text-faint)] hover:text-[var(--coral)]"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
