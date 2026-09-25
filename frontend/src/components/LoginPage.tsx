import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Server,
  KeyRound,
} from 'lucide-react';
import { api } from '../services/api';

interface LoginPageProps {
  onLoginSuccess: (username: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  // Probe server health on load to show a live green dot
  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? setServerOnline(true) : setServerOnline(false)))
      .catch(() => setServerOnline(false));
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockActive(e.getModifierState('CapsLock'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.login(password, username);
      onLoginSuccess(res.username);
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        setError('Onjuist wachtwoord of gebruikersnaam');
      } else {
        setError(err.message || 'Inloggen mislukt. Controleer verbinding met de server.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#060911] text-slate-100 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#e6b450]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-[#e6b450]/5 to-blue-500/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Subtle background tech grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Top status bar */}
      <header className="relative z-10 w-full px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-[#ffd166] to-[#c49536] shadow-sm shadow-[#e6b450]/40" />
          <span className="font-mono text-xs tracking-wider text-slate-400 font-medium">
            GAIA CLOUD ARCHITECTURE
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-white/[0.03] border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
          <span
            className={`w-2 h-2 rounded-full ${
              serverOnline === true
                ? 'bg-emerald-400 status-orb-running'
                : serverOnline === false
                ? 'bg-red-400'
                : 'bg-amber-400'
            }`}
          />
          <span>{serverOnline ? 'VPS Online (100.65.0.15)' : 'Server Control Node'}</span>
        </div>
      </header>

      {/* Center login card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[440px] bg-[#0c1221]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/90 relative">
          {/* Subtle top border accent */}
          <div className="absolute top-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-[#ffd166]/60 to-transparent" />

          {/* Gaia Emblem & Orb */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-5">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#997321] via-[#e6b450] to-[#ffe28a] flex items-center justify-center shadow-xl shadow-[#e6b450]/25">
                <div className="w-8 h-8 rounded-full bg-[#080d19] flex items-center justify-center border border-white/10">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#ffd166] status-orb-running" />
                </div>
              </div>
              <div className="absolute -inset-1 rounded-full border border-[#ffd166]/30 animate-pulse pointer-events-none" />
            </div>

            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-widest text-slate-100 font-mono">
                GAIA
              </h1>
              <span className="text-xs px-2 py-0.5 rounded bg-[#e6b450]/15 text-[#ffd166] font-mono border border-[#e6b450]/30 font-semibold tracking-wider">
                CONTROL
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2 font-mono leading-relaxed">
              Centrale command- &amp; monitorinterface
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs flex items-center gap-2.5 font-mono animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-2 font-medium">
                Gebruikersnaam
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#070b14] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#ffd166]/50 focus:ring-1 focus:ring-[#ffd166]/30 font-mono transition-all"
                  required
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono text-slate-400 font-medium">
                  Beheerderswachtwoord
                </label>
                {capsLockActive && (
                  <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
                    <span>CAPS LOCK AAN</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyDown}
                  placeholder="••••••••••••"
                  autoFocus
                  className="w-full bg-[#070b14] border border-white/10 rounded-xl pl-10 pr-11 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#ffd166]/50 focus:ring-1 focus:ring-[#ffd166]/30 font-mono transition-all tracking-wider"
                  required
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                  title={showPassword ? 'Verberg wachtwoord' : 'Toon wachtwoord'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-black/40 border border-white/20 text-[#e6b450] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="group-hover:text-slate-300 transition-colors">Onthoud sessie</span>
              </label>

              <span className="text-[11px] text-slate-600">JWT Sessie &bull; 7 dagen</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full btn-gaia justify-center py-3 rounded-xl font-mono text-sm tracking-wide disabled:opacity-50 mt-3 group"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Verifiëren...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Inloggen op Control Center</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </button>
          </form>

          {/* Security details footer inside card */}
          <div className="mt-8 pt-5 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <div className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#e6b450]" />
              <span>Host Auth</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Docker Socket Guard</span>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom status footer */}
      <footer className="relative z-10 w-full px-6 py-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-slate-500">
        <div className="flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-slate-600" />
          <span>Ubuntu VPS &bull; Docker Engine v29.7.2</span>
        </div>
        <div className="text-slate-600">
          Gaia Server Control Center v0.1.0 &bull; Private Tailnet
        </div>
      </footer>
    </div>
  );
};
