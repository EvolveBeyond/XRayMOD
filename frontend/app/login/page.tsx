'use client';

import { useState } from 'react';
import { Shield, Loader2, Eye, EyeOff, Lock, User } from 'lucide-react';
import { api } from '@/lib/api';
import { goPanel } from '@/lib/paths';
import { toast } from 'sonner';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [totp, setTotp] = useState('');
  const [challenge, setChallenge] = useState<string | null>(null);
  const [require2fa, setRequire2fa] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setError('');

    try {
      const data =
        require2fa && challenge
          ? await api.post('/api/login', { challenge, totp })
          : await api.post('/api/login', {
              username: username.trim(),
              password,
              ...(totp ? { totp } : {}),
            });

      if (data?.require2fa && data?.challenge) {
        setRequire2fa(true);
        setChallenge(data.challenge);
        setError('');
        toast.message('کد Authenticator را وارد کنید');
        setLoading(false);
        return;
      }

      if (data?.success) {
        toast.success('ورود موفق');
        if (data.initialConfig) {
          try {
            sessionStorage.setItem('xraymod_initial', JSON.stringify(data.initialConfig));
          } catch {
            /* ignore */
          }
        }
        // Prefer server panel path if provided
        const panelPath =
          typeof data.panelPath === 'string' && data.panelPath
            ? data.panelPath
            : '/panel';
        goPanel(panelPath.startsWith('/') ? panelPath : `/${panelPath}`);
        return;
      }

      setError(data?.message || data?.error || 'نام کاربری یا رمز اشتباه است');
    } catch {
      setError('خطای شبکه — API در دسترس نیست');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-[var(--bg)]">
      <div
        className="absolute inset-0 pointer-events-none opacity-90"
        style={{
          background:
            'radial-gradient(ellipse 55% 40% at 85% -5%, rgba(30,200,200,.14), transparent 55%), radial-gradient(ellipse 40% 35% at -5% 40%, rgba(255,92,69,.06), transparent 50%), linear-gradient(165deg, #08101a 0%, #060b12 100%)',
        }}
      />

      <div className="w-full max-w-[400px] relative">
        <div className="rounded-[1rem] p-7 sm:p-8 border border-[rgba(140,175,210,.16)] bg-[#101b2a] shadow-[inset_0_1px_0_rgba(255,255,255,.03)]">
          <div className="flex flex-col items-center mb-8">
            <div className="brand-mark !w-14 !h-14 mb-5" aria-hidden />
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#e8eef6]">
              Xray<span className="text-[#1ec8c8]">MOD</span>
            </h1>
            <p className="text-[#8fa3b8] text-sm mt-2 text-center leading-relaxed">
              {require2fa ? 'تأیید دو مرحله‌ای' : 'ورود امن به داشبورد'}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            {!require2fa && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-[#5c7188] uppercase tracking-[0.12em]">
                    نام کاربری / ایمیل
                  </label>
                  <div className="relative">
                    <User className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5c7188]" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      dir="ltr"
                      className="w-full ps-10 pe-4 py-3.5 bg-[#0a121c] border border-[rgba(140,175,210,.18)] rounded-[0.65rem] text-sm text-[#e8eef6] focus:border-[rgba(30,200,200,.55)] focus:ring-2 focus:ring-[rgba(30,200,200,.12)] outline-none transition-all placeholder:text-[#5c7188]"
                      placeholder="admin"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-[#5c7188] uppercase tracking-[0.12em]">
                    رمز عبور
                  </label>
                  <div className="relative">
                    <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5c7188]" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      dir="ltr"
                      className="w-full ps-10 pe-12 py-3.5 bg-[#0a121c] border border-[rgba(140,175,210,.18)] rounded-[0.65rem] text-sm text-[#e8eef6] focus:border-[rgba(30,200,200,.55)] focus:ring-2 focus:ring-[rgba(30,200,200,.12)] outline-none transition-all placeholder:text-[#5c7188]"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-[#5c7188] hover:text-[#e8eef6] p-1"
                      tabIndex={-1}
                      aria-label={showPass ? 'مخفی' : 'نمایش'}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {require2fa && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[11px] font-semibold text-[#5c7188] uppercase tracking-[0.12em]">
                  <Shield size={12} className="text-[#1ec8c8]" />
                  کد Authenticator
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={totp}
                  onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoComplete="one-time-code"
                  autoFocus
                  dir="ltr"
                  className="w-full px-4 py-3.5 bg-[#0a121c] border border-[rgba(140,175,210,.18)] rounded-[0.65rem] text-sm text-center tracking-[0.4em] font-mono text-[#e8eef6] focus:border-[rgba(30,200,200,.55)] focus:ring-2 focus:ring-[rgba(30,200,200,.12)] outline-none"
                  placeholder="000000"
                  required
                />
              </div>
            )}

            {error && (
              <div className="p-3.5 bg-[rgba(255,92,69,.1)] border border-[rgba(255,92,69,.28)] rounded-[0.65rem] text-sm text-[#ff5c45] leading-relaxed">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (!require2fa && (!username.trim() || !password))}
              className="w-full py-3.5 bg-[#ff5c45] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:active:scale-100 text-white font-semibold rounded-[0.65rem] transition-all flex items-center justify-center gap-2 shadow-[0_10px_28px_-14px_rgba(255,92,69,0.7)] mt-1"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  در حال ورود…
                </>
              ) : require2fa ? (
                'تأیید و ادامه'
              ) : (
                'ورود به پنل'
              )}
            </button>

            {require2fa && (
              <button
                type="button"
                onClick={() => {
                  setRequire2fa(false);
                  setChallenge(null);
                  setTotp('');
                }}
                className="w-full text-xs text-[#5c7188] hover:text-[#8fa3b8] py-2"
              >
                بازگشت
              </button>
            )}
          </form>
        </div>

        <p className="text-center text-[11px] text-[#5c7188] mt-6 leading-relaxed tracking-wide">
          SECURE PATH · private entry
          <br />
          Unauthorized requests return 404
        </p>
      </div>
    </div>
  );
}
