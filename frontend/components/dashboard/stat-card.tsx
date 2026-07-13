import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'emerald' | 'blue' | 'amber' | 'rose' | 'violet';
  trend?: { value: string; positive: boolean };
}

const colorMap = {
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-500', light: 'bg-emerald-500/10' },
  blue: { bg: 'bg-blue-500', text: 'text-blue-500', light: 'bg-blue-500/10' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-500', light: 'bg-amber-500/10' },
  rose: { bg: 'bg-rose-500', text: 'text-rose-500', light: 'bg-rose-500/10' },
  violet: { bg: 'bg-violet-500', text: 'text-violet-500', light: 'bg-violet-500/10' },
};

export function StatCard({ title, value, subtitle, icon: Icon, color = 'emerald', trend }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${c.bg}`} />
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-zinc-400">{title}</span>
        <Icon className={`w-4 h-4 ${c.text}`} />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="flex items-center gap-2 mt-1">
        {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
        {trend && (
          <span className={`text-[10px] font-bold ${trend.positive ? 'text-emerald-500' : 'text-rose-500'}`}>
            {trend.positive ? '+' : ''}{trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
