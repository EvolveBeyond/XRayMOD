'use client';

import { useCallback, useEffect, useState } from 'react';
import { DAI_TO_STARS } from './mock';

export function usePingCheck(url: string | null) {
  const [data, setData] = useState<{ ok: boolean; ms: number; status?: number } | null>(null);
  const [isLoading, setLoading] = useState(false);

  const run = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setData(null);
    const start = performance.now();
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { method: 'GET', mode: 'no-cors', signal: ctrl.signal });
      clearTimeout(timer);
      const ms = Math.round(performance.now() - start);
      setData({ ok: true, ms, status: res.status || 200 });
    } catch {
      const ms = Math.round(performance.now() - start);
      setData({ ok: false, ms });
    } finally {
      setLoading(false);
    }
  }, [url]);

  return { data, isLoading, run };
}

export function useCloudflareCheck() {
  const [ip, setIp] = useState<string | null>(null);
  const [isClean, setClean] = useState<boolean | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('https://cloudflare.com/cdn-cgi/trace', { cache: 'no-store' });
        const text = await res.text();
        const map = Object.fromEntries(
          text
            .trim()
            .split('\n')
            .map((line) => {
              const i = line.indexOf('=');
              return [line.slice(0, i), line.slice(i + 1)];
            })
        );
        if (!cancelled) {
          setIp(map.ip || null);
          // Heuristic placeholder: colo present ⇒ CF edge path "clean-ish"
          setClean(Boolean(map.colo && map.ip));
        }
      } catch {
        if (!cancelled) {
          setIp(null);
          setClean(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ip, isClean, isLoading };
}

export function useCurrencyHint() {
  return { daiToStars: DAI_TO_STARS, label: `1 DAI ≈ ${DAI_TO_STARS} Stars` };
}
