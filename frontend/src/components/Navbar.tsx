import React from 'react';
import { Activity, RefreshCw, LogOut, Server, Layers, Box, Shield } from 'lucide-react';
import { AuthStatus, SystemMetrics } from '../types';

interface NavbarProps {
  activeTab: 'overview' | 'components' | 'containers';
  onTabChange: (tab: 'overview' | 'components' | 'containers') => void;
  systemMetrics: SystemMetrics | null;
  authStatus: AuthStatus | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  systemMetrics,
  authStatus,
  onRefresh,
  isRefreshing,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#070b12]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange('overview')}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#c49536] to-[#ffd166] flex items-center justify-center shadow-lg shadow-[#e6b450]/20">
              <div className="w-3.5 h-3.5 rounded-full bg-[#070b12] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ffd166] animate-ping" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg tracking-wider text-slate-100 font-mono">GAIA</span>
                <span className="text-xs px-2 py-0.5 rounded bg-[#e6b450]/15 text-[#ffd166] font-mono border border-[#e6b450]/30 font-medium">CONTROL</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-tight">SERVER COMMAND CENTER v0.1</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-[#0d1322] p-1 rounded-lg border border-white/5">
            <button
              onClick={() => onTabChange('overview')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-[#18233c] text-[#ffd166] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Dashboard
            </button>
            <button
              onClick={() => onTabChange('components')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'components'
                  ? 'bg-[#18233c] text-[#ffd166] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Gaia Components
            </button>
            <button
              onClick={() => onTabChange('containers')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'containers'
                  ? 'bg-[#18233c] text-[#ffd166] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              Infrastructuur
            </button>
          </nav>
        </div>

        {/* Server & Actions */}
        <div className="flex items-center gap-3">
          {systemMetrics && (
            <div className="hidden lg:flex items-center gap-3 text-xs font-mono text-slate-400 bg-[#0d1322] px-3 py-1.5 rounded-lg border border-white/5">
              <div className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300">{systemMetrics.host.hostname}</span>
              </div>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">up {systemMetrics.uptime.formatted}</span>
            </div>
          )}

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-[#0d1322] border border-white/10 text-slate-300 hover:text-[#ffd166] hover:bg-[#151f36] transition-all disabled:opacity-50"
            title="Vernieuwen"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#ffd166]' : ''}`} />
          </button>

          {authStatus?.authenticated && (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-slate-300">
                <Shield className="w-3 h-3 text-[#e6b450]" />
                <span>{authStatus.username}</span>
              </div>
              <button
                onClick={onLogout}
                className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-xs"
                title="Uitloggen"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
