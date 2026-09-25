import React, { useState } from 'react';
import { Shield, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (username: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('admin');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.login(password, username);
      onLoginSuccess(res.username);
    } catch (err: any) {
      setError(err.message === 'UNAUTHORIZED' ? 'Onjuist wachtwoord' : err.message || 'Inloggen mislukt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#070b12]/95 backdrop-blur-md">
      <div className="w-full max-w-md glass-panel bg-[#0d1322] border border-[#e6b450]/20 rounded-2xl p-8 shadow-2xl shadow-black/80 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#e6b450]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#c49536] to-[#ffd166] flex items-center justify-center shadow-lg shadow-[#e6b450]/30 mb-4">
            <Shield className="w-6 h-6 text-[#070b12]" />
          </div>
          <h1 className="text-xl font-bold tracking-wider text-slate-100 font-mono">GAIA CONTROL CENTER</h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">Voer het beheerderswachtwoord in om toegang te krijgen</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">Gebruikersnaam</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#070b12] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#e6b450]/50 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">Wachtwoord</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoFocus
                className="w-full bg-[#070b12] border border-white/10 rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#e6b450]/50 font-mono"
                required
              />
              <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full btn-gaia justify-center py-2.5 mt-2 font-mono text-sm tracking-wide disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticeren...</span>
            ) : (
              <>
                <span>Inloggen</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-[11px] font-mono text-slate-500">
          Beveiligde beheerlaag &bull; Gaia Server Environment
        </div>
      </div>
    </div>
  );
};
