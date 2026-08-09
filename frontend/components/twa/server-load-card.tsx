'use client';

export function ServerLoadCard({
  label,
  value,
}: {
  label: string;
  /** 0–1 */
  value: number;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="flex items-center gap-4">
      <svg width="104" height="104" viewBox="0 0 104 104" className="-rotate-90">
        <circle cx="52" cy="52" r={r} fill="none" stroke="rgba(140,175,210,0.12)" strokeWidth="8" />
        <circle
          cx="52"
          cy="52"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div>
        <p className="text-[12px] text-[var(--text-muted)]">{label}</p>
        <p className="font-display text-2xl font-bold tabular">{pct}%</p>
      </div>
    </div>
  );
}
