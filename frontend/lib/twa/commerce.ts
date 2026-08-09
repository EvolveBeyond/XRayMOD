'use client';

import { api } from '@/lib/api';

export type CommercePlan = {
  id: string;
  name: string;
  days: number;
  traffic_gb: number;
  price_stars: number;
  price_dai: number;
};

export type CommerceManager = {
  id: string;
  role: 'owner' | 'sponsor';
  name: string;
  welcome: string;
  commissionPct: number;
  parentId?: string;
};

function tgUserId(): string | null {
  try {
    const id = (
      window as unknown as {
        Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id?: number } } } };
      }
    ).Telegram?.WebApp?.initDataUnsafe?.user?.id;
    if (id) return `tg:${id}`;
  } catch {
    /* ignore */
  }
  return null;
}

/** Stable buyer wallet key for Mini App (Telegram id or local demo). */
export function getBuyerKey(): string {
  if (typeof window === 'undefined') return 'anon:ssr';
  const tg = tgUserId();
  if (tg) {
    localStorage.setItem('twa.buyerKey', tg);
    return tg;
  }
  let local = localStorage.getItem('twa.buyerKey');
  if (!local) {
    local = `web:${crypto.randomUUID().slice(0, 10)}`;
    localStorage.setItem('twa.buyerKey', local);
  }
  return local;
}

function withBuyer(init?: HeadersInit): HeadersInit {
  return { 'X-Buyer-Key': getBuyerKey(), ...init };
}

export async function fetchManager(ref: string) {
  return api.get<{
    ok: boolean;
    manager?: CommerceManager;
    stats?: { clicks: number; conversions: number };
    invitePath?: string;
    error?: string;
  }>(`/api/commerce/manager?ref=${encodeURIComponent(ref)}`);
}

export async function fetchCatalog(managerId: string) {
  return api.get<{
    ok: boolean;
    manager?: CommerceManager;
    plans?: CommercePlan[];
    invitePath?: string;
  }>(`/api/commerce/catalog?manager=${encodeURIComponent(managerId)}`);
}

export async function fetchWallet(managerId?: string) {
  const q = managerId ? `?manager=${encodeURIComponent(managerId)}` : '';
  return requestWithBuyer<{
    ok: boolean;
    buyer?: { stars: number; dai: number; gram: number };
    managerWallet?: { stars: number; dai: number; gram: number };
    transactions?: Array<{
      amount: number;
      currency: string;
      type: string;
      status: string;
      note: string;
      created_at: number;
    }>;
  }>(`/api/commerce/wallet${q}`);
}

async function requestWithBuyer<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { getApiBase } = await import('@/lib/paths');
  const base = getApiBase().replace(/\/$/, '');
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...withBuyer(options.headers as HeadersInit),
    },
  });
  return (await res.json()) as T;
}

export async function topUp(amount: number, currency: 'stars' | 'dai' = 'stars') {
  return requestWithBuyer<{ ok: boolean; wallet?: { stars: number; dai: number; gram: number }; message?: string }>(
    '/api/commerce/topup',
    {
      method: 'POST',
      body: JSON.stringify({ amount, currency, buyerKey: getBuyerKey() }),
    }
  );
}

export async function purchasePlan(opts: {
  planId: string;
  currency: 'stars' | 'dai';
  coupon?: string;
  ref?: string;
}) {
  return requestWithBuyer<{
    ok: boolean;
    message?: string;
    orderId?: string;
    paid?: number;
  }>('/api/commerce/purchase', {
    method: 'POST',
    body: JSON.stringify({ ...opts, buyerKey: getBuyerKey() }),
    headers: opts.ref ? { 'X-Ref': opts.ref } : undefined,
  });
}

export async function validateCoupon(code: string, managerId: string) {
  return api.post<{ ok: boolean; valid?: boolean; pctOff?: number; message?: string }>(
    '/api/commerce/coupon/validate',
    { code, managerId }
  );
}

export async function fetchReseller(managerId: string) {
  return api.get<{
    ok: boolean;
    manager?: CommerceManager & { commissionPct: number };
    wallet?: { stars: number; dai: number; gram: number };
    stats?: { clicks: number; conversions: number };
    commissions?: Array<{
      order_id: string;
      amount: number;
      currency: string;
      pct: number;
      created_at: number;
    }>;
    children?: Array<{ id: string; name: string; role: string; commission_pct: number }>;
    inviteUrl?: string;
    startappUrl?: string;
    refParam?: string;
  }>(`/api/commerce/reseller?manager=${encodeURIComponent(managerId)}`);
}

export async function createReseller(opts: {
  parentId: string;
  name: string;
  commissionPct?: number;
  id?: string;
}) {
  return api.post<{ ok: boolean; id?: string; invitePath?: string; message?: string }>(
    '/api/commerce/reseller/create',
    opts
  );
}
