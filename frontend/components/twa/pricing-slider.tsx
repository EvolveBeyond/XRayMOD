'use client';

export function PricingSlider({
  value,
  onChange,
  min = 0.5,
  max = 20,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-[var(--text-muted)]">{label}</span>
        <span className="font-mono tabular text-[var(--accent)]">{value.toFixed(1)} DAI</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
    </div>
  );
}
