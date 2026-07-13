interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

const variants = {
  default: 'bg-zinc-800 text-zinc-400',
  success: 'bg-emerald-500/10 text-emerald-500',
  warning: 'bg-amber-500/10 text-amber-500',
  error: 'bg-rose-500/10 text-rose-500',
  info: 'bg-blue-500/10 text-blue-500',
};

function getVariant(status: string): keyof typeof variants {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'online' || s === 'connected') return 'success';
  if (s === 'expired' || s === 'offline' || s === 'disconnected') return 'error';
  if (s === 'pending' || s === 'warning') return 'warning';
  if (s === 'disabled' || s === 'paused') return 'default';
  return 'info';
}

export function StatusBadge({ status, variant }: StatusBadgeProps) {
  const v = variant || getVariant(status);
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${variants[v]}`}>
      {status}
    </span>
  );
}
