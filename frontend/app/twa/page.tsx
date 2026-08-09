'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useManager } from '@/lib/twa/manager-context';

export default function TwaIndexPage() {
  const router = useRouter();
  const search = useSearchParams();
  const { isLoading, error, managerId } = useManager();

  useEffect(() => {
    if (isLoading) return;
    const qs = search.toString();
    const suffix = qs ? `?${qs}` : managerId ? `?ref=${managerId}` : '';
    if (error) {
      router.replace(`/twa/invalid${suffix}`);
      return;
    }
    router.replace(`/twa/user${suffix}`);
  }, [isLoading, error, managerId, router, search]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-[var(--text-muted)]">
      …
    </div>
  );
}
