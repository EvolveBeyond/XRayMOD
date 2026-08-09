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
  refreshFromUrl: () => void;
};

const ManagerContext = createContext<ManagerContextValue | null>(null);

function parseManagerId(): string | null {
  if (typeof window === 'undefined') return null;

  const qs = new URLSearchParams(window.location.search);
  const fromQuery = qs.get('ref') || qs.get('managerId') || qs.get('startapp');
  if (fromQuery) return fromQuery.trim();

  // Telegram Mini App start_param / startapp
  try {
    const tg = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { start_param?: string } } } })
      .Telegram?.WebApp?.initDataUnsafe?.start_param;
    if (tg) return String(tg).trim();
  } catch {
    /* ignore */
  }

  // Hash deep link: #ref=owner_demo
  const hash = window.location.hash.replace(/^#/, '');
  if (hash.startsWith('ref=')) return hash.slice(4).trim();

  // Dev convenience: allow demo without query when on /twa paths
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
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<'missing' | 'invalid' | null>(null);
  const [mode, setMode] = useState<Mode>('user');

  const refreshFromUrl = useCallback(() => {
    setLoading(true);
    const id = parseManagerId();
    setManagerId(id);
    if (!id) {
      setError('missing');
    } else if (!MOCK_MANAGERS[id]) {
      setError('invalid');
    } else {
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    expandTelegram();
    refreshFromUrl();
  }, [refreshFromUrl]);

  const manager = managerId ? MOCK_MANAGERS[managerId] || null : null;

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
    return `${base}${manager.invitePath}`;
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
