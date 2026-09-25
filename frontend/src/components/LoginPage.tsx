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
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';

interface LoginPageProps {
  onLoginSuccess: (username: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState(() => localStorage.getItem('gaia_last_user') || 'Bojan');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

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
      localStorage.setItem('gaia_last_user', username);
      onLoginSuccess(res.username);
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        setError('Onjuist beheerderswachtwoord of gebruikersnaam');
      } else {
        setError(err.message || 'Inloggen mislukt. Controleer verbinding met de server.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-ink-950 text-ink-100 flex flex-col justify-between relative overflow-hidden select-none grain font-sans">
      {/* Ambient background glows matching intro.higaia.nl */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-gold-500/15 via-sage-600/10 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 right-10 w-[500px] h-[400px] bg-gold-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/3 -left-32 w-80 h-80 bg-sage-500/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Top status bar */}
      <header className="relative z-10 w-full px-6 py-6 max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-gold-400 shadow-sm shadow-gold-400/50" />
          <span className="font-serif italic text-sm text-ink-300">
            Gaia Cloud Architecture
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-ink-300 bg-ink-900/60 border border-ink-800/90 px-3.5 py-1.5 rounded-full backdrop-blur-md">
          <span
            className={`w-2 h-2 rounded-full ${
              serverOnline === true
                ? 'bg-sage-400 status-orb-running'
                : serverOnline === false
                ? 'bg-clay-400'
                : 'bg-gold-400'
            }`}
          />
          <span>{serverOnline ? 'VPS Online (100.65.0.15)' : 'Server Control Node'}</span>
        </div>
      </header>

      {/* Center login card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[440px] bg-ink-900/75 backdrop-blur-2xl border border-ink-800/80 hover:border-ink-700/80 transition-colors rounded-2xl p-8 sm:p-10 shadow-2xl shadow-black/80 relative">
          {/* Subtle top gold accent line */}
          <div className="absolute top-0 left-16 right-16 h-[1px] bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />

          {/* Organic Gaia Breathing Orb */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-4 flex items-center justify-center">
              {/* Outer soft aura */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-gold-600/30 via-gold-400/20 to-sage-400/20 blur-md animate-breathe pointer-events-none" />
              
              {/* Inner core orb */}
              <div className="absolute w-14 h-14 rounded-full bg-gradient-to-tr from-ink-900 via-ink-800 to-ink-900 border border-gold-400/40 flex items-center justify-center shadow-lg shadow-black/60">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-gold-500 to-gold-300 flex items-center justify-center shadow-sm">
                  <div className="w-2.5 h-2.5 rounded-full bg-ink-950 status-orb-running" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <h1 className="font-serif text-3xl font-light text-ink-50 tracking-wide flex items-center justify-center gap-2">
                <span className="italic font-normal text-gold-400">Gaia</span>
                <span className="text-ink-200">Control Center</span>
              </h1>
              <p className="text-xs text-ink-400 font-sans tracking-wide">
                Centraal zenuwstelsel &amp; serverbeheer
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-clay-950/60 border border-clay-500/30 text-clay-300 text-xs flex items-center gap-2.5 font-sans animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-clay-400" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-mono text-ink-300 mb-1.5 font-medium">
                Gebruikersnaam
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-ink-950/70 border border-ink-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-ink-100 placeholder-ink-600 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/20 font-mono transition-all"
                  required
                />
                <User className="w-4 h-4 text-ink-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono text-ink-300 font-medium">
                  Beheerderswachtwoord
                </label>
                {capsLockActive && (
                  <span className="text-[10px] font-mono text-gold-400">
                    CAPS LOCK AAN
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
                  className="w-full bg-ink-950/70 border border-ink-800 rounded-lg pl-10 pr-11 py-2.5 text-sm text-ink-100 placeholder-ink-600 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/20 font-mono transition-all tracking-wider"
                  required
                />
                <Lock className="w-4 h-4 text-ink-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300 transition-colors"
                  tabIndex={-1}
                  title={showPassword ? 'Verberg wachtwoord' : 'Toon wachtwoord'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs font-mono text-ink-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-ink-950 border border-ink-700 text-gold-500 focus:ring-0 cursor-pointer"
                />
                <span className="group-hover:text-ink-200 transition-colors">Onthoud sessie</span>
              </label>

              <span className="text-[11px] text-ink-500">JWT Sessie &bull; 7 dagen</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full btn-gaia justify-center py-2.5 rounded-lg text-sm font-sans tracking-wide disabled:opacity-50 mt-2 group"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-ink-950/30 border-t-ink-950 rounded-full animate-spin" />
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

          {/* Security details inside card */}
          <div className="mt-8 pt-4 border-t border-ink-800/60 flex items-center justify-between text-[11px] font-mono text-ink-400">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-gold-400" />
              <span>Host Node</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-sage-400" />
              <span>Docker API Guard</span>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom status footer */}
      <footer className="relative z-10 w-full px-6 py-5 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-ink-500">
        <div className="flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-ink-600" />
          <span>Ubuntu VPS &bull; Docker Engine v29.7.2</span>
        </div>
        <div className="text-ink-500">
          Gaia Server Control Center &bull; Private Tailnet
        </div>
      </footer>
    </div>
  );
};
