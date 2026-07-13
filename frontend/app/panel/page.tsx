'use client';

import { useEffect, useState } from 'react';
import { Users, Server, Globe, Activity, Clock, Wifi } from 'lucide-react';
import { api } from '@/lib/api';
import { StatCard, Card, CardHeader, ProgressBar, StatusBadge } from '@/components';

interface SystemStatus {
  uptime: string;
  version: string;
  configured: boolean;
  kv: boolean;
  d1: boolean;
}

interface UsageData {
  today: { up: number; down: number; total: number };
  month: { up: number; down: number; total: number };
}

export default function DashboardPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [users, setUsers] = useState<{ total: number; active: number }>({ total: 0, active: 0 });

  useEffect(() => {
    api.get('/install/status').then(d => setStatus(d)).catch(() => {});
    api.get('/admin/usage-data').then(d => setUsage(d)).catch(() => {});
    api.get('/admin/users.json').then(d => {
      const u = Array.isArray(d) ? d : [];
      setUsers({ total: u.length, active: u.filter((x: any) => x.enabled !== false).length });
    }).catch(() => {});
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black tracking-tight">Dashboard</h1>
        <p className="text-zinc-500 mt-1">System overview and quick actions.</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Users"
          value={String(users.total)}
          subtitle={`${users.active} active`}
          icon={Users}
          color="emerald"
        />
        <StatCard
          title="Status"
          value={status?.configured ? 'Active' : 'Setup'}
          subtitle={status?.version || 'XRayMOD'}
          icon={Wifi}
          color={status?.configured ? 'emerald' : 'amber'}
        />
        <StatCard
          title="Today Traffic"
          value={formatBytes(usage?.today?.total || 0)}
          subtitle={`↑ ${formatBytes(usage?.today?.up || 0)} / ↓ ${formatBytes(usage?.today?.down || 0)}`}
          icon={Activity}
          color="blue"
        />
        <StatCard
          title="Monthly Traffic"
          value={formatBytes(usage?.month?.total || 0)}
          subtitle="Current billing period"
          icon={Globe}
          color="violet"
        />
      </div>

      {/* System Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="System Info" />
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-zinc-800/50">
              <span className="text-sm text-zinc-400">Version</span>
              <span className="text-sm font-mono">{status?.version || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-800/50">
              <span className="text-sm text-zinc-400">Uptime</span>
              <span className="text-sm font-mono">{status?.uptime || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-800/50">
              <span className="text-sm text-zinc-400">Storage</span>
              <div className="flex items-center gap-2">
                <StatusBadge status={status?.d1 ? 'D1' : 'KV'} variant={status?.d1 ? 'success' : 'info'} />
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-zinc-400">Config</span>
              <StatusBadge status={status?.configured ? 'Configured' : 'Not Setup'} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Traffic Breakdown" />
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-zinc-500 mb-2">
                <span>Upload</span>
                <span className="font-mono">{formatBytes(usage?.month?.up || 0)}</span>
              </div>
              <ProgressBar
                value={usage?.month?.up || 0}
                max={(usage?.month?.total || 1)}
                color="emerald"
                size="sm"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs text-zinc-500 mb-2">
                <span>Download</span>
                <span className="font-mono">{formatBytes(usage?.month?.down || 0)}</span>
              </div>
              <ProgressBar
                value={usage?.month?.down || 0}
                max={(usage?.month?.total || 1)}
                color="blue"
                size="sm"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader title="Quick Actions" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <a href="/panel/users" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
            <Users className="w-5 h-5 text-emerald-500" />
            <span className="text-xs font-medium">Manage Users</span>
          </a>
          <a href="/panel/cleanip" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
            <Globe className="w-5 h-5 text-blue-500" />
            <span className="text-xs font-medium">Clean IPs</span>
          </a>
          <a href="/panel/protocols" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
            <Activity className="w-5 h-5 text-violet-500" />
            <span className="text-xs font-medium">Protocols</span>
          </a>
          <a href="/panel/settings" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
            <Clock className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-medium">Settings</span>
          </a>
        </div>
      </Card>
    </div>
  );
}
