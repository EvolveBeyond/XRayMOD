interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'emerald' | 'blue' | 'amber' | 'rose';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const colorMap = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
};

const sizeMap = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

export function ProgressBar({ value, max = 100, color = 'emerald', size = 'sm', showLabel }: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const barColor = percentage > 90 ? 'bg-rose-500' : percentage > 70 ? 'bg-amber-500' : colorMap[color];

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between text-[10px] font-mono text-zinc-500 mb-1">
          <span>{value}</span>
          <span>{max}</span>
        </div>
      )}
      <div className={`w-full bg-zinc-800 rounded-full overflow-hidden ${sizeMap[size]}`}>
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
