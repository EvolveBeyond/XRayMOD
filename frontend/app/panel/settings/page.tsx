'use client';

import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, Download, Upload, Trash2, Info, Shield, Key, Copy, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardHeader, Button, Input, Toggle, StatusBadge } from '@/components';

interface SystemInfo {
  version: string;
  uptime: string;
  configured: boolean;
  kv: boolean;
  d1: boolean;
  store: string;
}

interface SecuritySettings {
  password: string;
  passwordSource: string;
  twoFA: boolean;
}

export default function SettingsPage() {
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [security, setSecurity] = useState<SecuritySettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password change
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // 2FA
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFAOtpauth, setTwoFAOtpauth] = useState('');
  const [twoFACode, setTwoFACode] = useState('');

  useEffect(() => {
    api.get('/api/health').then((d) => {
      setSystem({
        version: d.version || '1.9.12',
        uptime: d.uptime || 'n/a',
        configured: !!d.configured,
        kv: d.kv !== false,
        d1: !!d.d1,
        store: d.d1 ? 'D1' : 'KV',
      });
    }).catch(() => {});
    api.get('/api/settings').then((res) => {
      const d = res?.data || {};
      setTwoFAEnabled(d['panel.2fa_enabled'] === 'true');
      setSecurity({
        password: '********',
        passwordSource: 'panel',
        twoFA: d['panel.2fa_enabled'] === 'true',
      });
    }).catch(() => {});
  }, []);

  const changePassword = async () => {
    setPassError('');
    setPassSuccess('');
    if (newPass !== confirmPass) {
      setPassError('Passwords do not match');
      return;
    }
    if (newPass.length < 6) {
      setPassError('Password must be at least 6 characters');
      return;
    }
    try {
      const res = await api.put('/api/settings', {
        currentPassword: currentPass,
        newPassword: newPass,
      });
      if (res.success !== false) {
        setPassSuccess('Password changed successfully');
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
      } else {
        setPassError(res.message || res.error || 'Failed to change password');
      }
    } catch {
      setPassError('Network error');
    }
  };

  const setup2FA = async () => {
    try {
      const res = await api.post('/api/settings', { action: '2fa-setup' });
      if (res.secret) {
        setTwoFASecret(res.secret);
        setTwoFAOtpauth(res.otpauth || '');
      }
    } catch { /* ignore */ }
  };

  const enable2FA = async () => {
    try {
      const res = await api.post('/api/settings', {
        action: '2fa-enable',
        code: twoFACode,
        secret: twoFASecret,
      });
      if (res.success !== false) {
        setTwoFAEnabled(true);
        setTwoFASecret('');
        setTwoFAOtpauth('');
        setTwoFACode('');
      } else {
        setPassError(res.message || 'Invalid code');
      }
    } catch { /* ignore */ }
  };

  const disable2FA = async () => {
    const code = prompt('Enter 2FA code to disable (optional if locked out leave blank):') || '';
    try {
      const res = await api.post('/api/settings', { action: '2fa-disable', code });
      if (res.success !== false) {
        setTwoFAEnabled(false);
      }
    } catch { /* ignore */ }
  };

  const selfUpdate = async () => {
    alert('Self-update is only available via the installer (re-run install.sh / WebUI deploy).');
  };

  const exportConfig = async () => {
    try {
      // Prefer full backup API (settings + users + configs, no secrets)
      const full = await api.get('/api/tools/backup');
      const payload = full?.data || full;
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xraymod-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      try {
        const settings = await api.get('/api/settings');
        const blob = new Blob([JSON.stringify({ settings: settings?.data || settings }, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `xraymod-settings-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } catch { /* ignore */ }
    }
  };

  const importConfig = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.settings || data.version) {
          const res = await api.post('/api/tools/restore', data);
          if (res.success === false) {
            alert(res.message || 'Restore failed');
            return;
          }
        } else {
          const flat = data.config || data;
          if (flat && typeof flat === 'object') {
            await api.put('/api/settings', flat);
          }
        }
        alert('Config imported successfully');
        window.location.reload();
      } catch {
        alert('Invalid config file');
      }
    };
    input.click();
  };

  const resetConfig = async () => {
    if (!confirm('Reset panel flags to defaults? This cannot be undone.')) return;
    if (!confirm('Are you really sure?')) return;
    try {
      await api.put('/api/settings', {
        'panel.paused': 'false',
        'protocol.mixed_mode': 'false',
        'ech.enabled': 'false',
        'tls_fragment.enabled': 'false',
      });
      alert('Config reset. Reloading...');
      window.location.reload();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black">Settings</h1>
        <p className="text-zinc-500 text-sm mt-1">System info, security and maintenance</p>
      </div>

      {/* System Info */}
      <Card>
        <CardHeader title="System info" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-zinc-800/50">
              <span className="text-sm text-zinc-400">Version</span>
              <span className="text-sm font-mono font-bold">{system?.version || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-800/50">
              <span className="text-sm text-zinc-400">Uptime</span>
              <span className="text-sm font-mono">{system?.uptime || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-800/50">
              <span className="text-sm text-zinc-400">Storage</span>
              <StatusBadge status={system?.store?.toUpperCase() || 'N/A'} />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-zinc-400">Configured</span>
              <StatusBadge status={system?.configured ? 'Yes' : 'No'} variant={system?.configured ? 'success' : 'warning'} />
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="text-center p-6 bg-zinc-800/30 rounded-xl">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Info className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-sm text-zinc-400">XRayMOD Panel</p>
              <p className="text-xs text-zinc-600 mt-1">Powered by Cloudflare Workers</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Security */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Change password */}
        <Card>
          <CardHeader title="Change password" />
          <div className="space-y-3">
            <div className="relative">
              <Input
                label="Current password"
                type={showPass ? 'text' : 'password'}
                value={currentPass}
                onChange={e => setCurrentPass(e.target.value)}
                placeholder="Enter current password"
              />
              <button
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-9 text-zinc-500 hover:text-zinc-300"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Input
              label="New password"
              type={showPass ? 'text' : 'password'}
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              placeholder="Minimum 6 characters"
            />
            <Input
              label="Confirm password"
              type={showPass ? 'text' : 'password'}
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
              placeholder="Confirm new password"
            />
            {passError && <p className="text-xs text-rose-500">{passError}</p>}
            {passSuccess && <p className="text-xs text-emerald-500">{passSuccess}</p>}
            <Button onClick={changePassword} size="sm">Change password</Button>
          </div>
        </Card>

        {/* 2FA */}
        <Card>
          <CardHeader title="Two-factor authentication" />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">2FA status</p>
                <p className="text-xs text-zinc-500">{twoFAEnabled ? 'Enabled' : 'Disabled'}</p>
              </div>
              <StatusBadge status={twoFAEnabled ? 'Enabled' : 'Disabled'} variant={twoFAEnabled ? 'success' : 'default'} />
            </div>
            {!twoFAEnabled && !twoFASecret && (
              <Button variant="secondary" onClick={setup2FA} size="sm">Set up 2FA</Button>
            )}
            {twoFASecret && (
              <div className="p-3 bg-zinc-800/50 rounded-xl space-y-2">
                <p className="text-xs text-zinc-400">Add this secret in Google Authenticator / Aegis:</p>
                <code className="block text-xs font-mono text-emerald-400 break-all select-all">{twoFASecret}</code>
                {twoFAOtpauth && (
                  <p className="text-[10px] text-zinc-600 break-all">{twoFAOtpauth}</p>
                )}
                <Input
                  label="Verification Code"
                  value={twoFACode}
                  onChange={e => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit code"
                />
                <Button onClick={enable2FA} size="sm">Enable 2FA</Button>
              </div>
            )}
            {twoFAEnabled && (
              <Button variant="danger" onClick={disable2FA} size="sm">Disable 2FA</Button>
            )}
          </div>
        </Card>
      </div>

      {/* Backup and restore */}
      <Card>
        <CardHeader title="Backup and restore" />
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={exportConfig}>
            <Download size={14} /> Export settings
          </Button>
          <Button variant="secondary" onClick={importConfig}>
            <Upload size={14} /> Import settings
          </Button>
          <Button variant="danger" onClick={resetConfig}>
            <Trash2 size={14} /> Reset to defaults
          </Button>
        </div>
      </Card>

      {/* Update */}
      <Card>
        <CardHeader title="Update" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Update the worker to the latest version</p>
            <p className="text-xs text-zinc-500 mt-0.5">This will restart the service briefly</p>
          </div>
          <Button variant="secondary" onClick={selfUpdate}>
            <RefreshCw size={14} /> Check & update
          </Button>
        </div>
      </Card>
    </div>
  );
}
