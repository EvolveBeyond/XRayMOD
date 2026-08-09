'use client';

import { useCallback, useState } from 'react';
import { Button, Input } from '@/components';

export function ProtocolTestDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [url, setUrl] = useState('https://www.cloudflare.com/cdn-cgi/trace');
  const [data, setData] = useState<{ ok: boolean; ms: number } | null>(null);
  const [isLoading, setLoading] = useState(false);

  const run = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setData(null);
    const start = performance.now();
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      await fetch(url, { method: 'GET', mode: 'no-cors', signal: ctrl.signal });
      clearTimeout(timer);
      setData({ ok: true, ms: Math.round(performance.now() - start) });
    } catch {
      setData({ ok: false, ms: Math.round(performance.now() - start) });
    } finally {
      setLoading(false);
    }
  }, [url]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 p-3">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--stroke)] bg-[var(--bg-panel)] p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display font-semibold text-[15px]">Test site</h3>
          <button type="button" className="text-[var(--text-faint)] text-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="space-y-3">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border-0"
            onClick={() => void run()}
            disabled={isLoading || !url}
          >
            {isLoading ? 'Checking…' : 'Run test'}
          </Button>
          <div className="rounded-lg bg-[var(--surface-2)] p-3 font-mono text-[12px] min-h-[72px] text-[var(--text-muted)]">
            {!data && !isLoading && '—'}
            {isLoading && 'Checking…'}
            {data && (
              <pre className="whitespace-pre-wrap">
                {data.ok
                  ? `200 OK / no-cors ok\nLatency: ${data.ms} ms`
                  : `Timeout / failed\nElapsed: ${data.ms} ms`}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
