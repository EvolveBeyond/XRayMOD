'use client';

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Manager, Protocol, ProxyItem, ServerNode, Transaction } from './types';
import {
  MOCK_MANAGERS,
  MOCK_PROTOCOLS,
  MOCK_PROXIES,
  MOCK_SERVERS,
  MOCK_TX,
} from './mock';
import { fetchManager } from './commerce';

type Mode = 'user' | 'admin';

type ManagerContextValue = {
  managerId: string | null;
  manager: Manager | null;
  isLoading: boolean;
  error: 'missing' | 'invalid' | null;
  mode: Mode;
  setMode: (m: Mode) => void;
  protocols: Protocol[];
  proxies: ProxyItem[];
  servers: ServerNode[];
  transactions: Transaction[];
  inviteUrl: string;
  refCode: string | null;
  refreshFromUrl: () => void;
};

const ManagerContext = createContext<ManagerContextValue | null>(null);

function parseManagerId(): string | null {
  if (typeof window === 'undefined') return null;

  const qs = new URLSearchParams(window.location.search);
  const fromQuery = qs.get('ref') || qs.get('managerId') || qs.get('startapp');
  if (fromQuery) return fromQuery.trim();

  try {
    const tg = (
      window as unknown as {
        Telegram?: { WebApp?: { initDataUnsafe?: { start_param?: string } } };
      }
    ).Telegram?.WebApp?.initDataUnsafe?.start_param;
    if (tg) return String(tg).trim();
  } catch {
    /* ignore */
  }

  const hash = window.location.hash.replace(/^#/, '');
  if (hash.startsWith('ref=')) return hash.slice(4).trim();

  // Persist last successful ref for return visits
  const saved = sessionStorage.getItem('twa.ref');
  if (saved) return saved;

  if (process.env.NODE_ENV === 'development' && window.location.pathname.includes('/twa')) {
    return 'owner_demo';
  }

  return null;
}

function expandTelegram() {
  try {
    const wa = (
      window as unknown as {
        Telegram?: { WebApp?: { ready?: () => void; expand?: () => void } };
      }
    ).Telegram?.WebApp;
    wa?.ready?.();
    wa?.expand?.();
  } catch {
    /* browser preview */
  }
}

export function ManagerProvider({ children }: { children: ReactNode }) {
  const [managerId, setManagerId] = useState<string | null>(null);
  const [manager, setManager] = useState<Manager | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<'missing' | 'invalid' | null>(null);
  const [mode, setMode] = useState<Mode>('user');

  const refreshFromUrl = useCallback(() => {
    const id = parseManagerId();
    setManagerId(id);
    if (!id) {
      setManager(null);
      setError('missing');
      setLoading(false);
      return;
    }

    setLoading(true);
    void (async () => {
      try {
        const res = await fetchManager(id);
        if (res.ok && res.manager) {
          const m: Manager = {
            id: res.manager.id,
            role: res.manager.role,
            name: res.manager.name,
            welcomeText: res.manager.welcome,
            invitePath: res.invitePath || `?ref=${res.manager.id}`,
            sponsorProfitPct: res.manager.commissionPct,
          };
          setManager(m);
          setError(null);
          sessionStorage.setItem('twa.ref', id);
          return;
        }
      } catch {
        /* fall through to mock */
      }

      const mock = MOCK_MANAGERS[id];
      if (mock) {
        setManager(mock);
        setError(null);
        sessionStorage.setItem('twa.ref', id);
      } else {
        setManager(null);
        setError('invalid');
      }
    })().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    expandTelegram();
    refreshFromUrl();
  }, [refreshFromUrl]);

  const scoped = useMemo(() => {
    if (!managerId) {
      return { protocols: [], proxies: [], servers: [], transactions: [] };
    }
    return {
      protocols: MOCK_PROTOCOLS.filter((p) => p.managerId === managerId),
      proxies: MOCK_PROXIES.filter((p) => p.managerId === managerId),
      servers: MOCK_SERVERS.filter((s) => s.managerId === managerId),
      transactions: MOCK_TX.filter((t) => t.managerId === managerId),
    };
  }, [managerId]);

  const inviteUrl = useMemo(() => {
    if (typeof window === 'undefined' || !manager) return '';
    const base = `${window.location.origin}${window.location.pathname.split('/twa')[0]}/twa/user`;
    return `${base}${manager.invitePath.startsWith('?') ? manager.invitePath : `?ref=${manager.id}`}`;
  }, [manager]);

  const value = useMemo<ManagerContextValue>(
    () => ({
      managerId,
      manager,
      isLoading,
      error,
      mode,
      setMode,
      ...scoped,
      inviteUrl,
      refCode: managerId,
      refreshFromUrl,
    }),
    [managerId, manager, isLoading, error, mode, scoped, inviteUrl, refreshFromUrl]
  );

  return createElement(ManagerContext.Provider, { value }, children);
}

export function useManager() {
  const ctx = useContext(ManagerContext);
  if (!ctx) throw new Error('useManager must be used within ManagerProvider');
  return ctx;
}
