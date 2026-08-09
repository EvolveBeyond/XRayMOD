import type { ReactNode } from 'react';

type Span = 3 | 4 | 6 | 12;

const SPAN: Record<Span, string> = {
  3: 'col-span-12 sm:col-span-6 lg:col-span-3',
  4: 'col-span-12 sm:col-span-6 lg:col-span-4',
  6: 'col-span-12 lg:col-span-6',
  12: 'col-span-12',
};

export function DashboardBentoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-12 gap-3 auto-rows-min">{children}</div>
  );
}

export function BentoCell({
  span = 6,
  children,
  className = '',
}: {
  span?: Span;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${SPAN[span]} ${className}`}>
      <div className="surface h-full rounded-[var(--radius-lg)] p-4 md:p-5">{children}</div>
    </div>
  );
}
