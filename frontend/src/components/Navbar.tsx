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
    <header className="sticky top-0 z-40 w-full border-b border-ink-800/80 bg-ink-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onTabChange('overview')}
          >
            {/* Gaia Orb Emblem */}
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gold-600 to-gold-300 flex items-center justify-center shadow-md shadow-gold-500/20 group-hover:scale-105 transition-transform">
                <div className="w-3.5 h-3.5 rounded-full bg-ink-950 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-sage-400 status-orb-running" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-xl tracking-tight text-ink-100">
                  <span className="italic font-normal text-gold-400">Gaia</span>{' '}
                  <span className="font-light text-ink-200">Control</span>
                </span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-gold-400/10 text-gold-300 border border-gold-400/20 font-mono tracking-wider">
                  NODE
                </span>
              </div>
              <p className="text-[10px] text-ink-400 font-sans tracking-tight">
                Server Command &amp; Cognitie
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-ink-900/90 p-1 rounded-lg border border-ink-800">
            <button
              onClick={() => onTabChange('overview')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-ink-800 text-gold-300 shadow-sm border border-gold-400/20'
                  : 'text-ink-400 hover:text-ink-200 hover:bg-ink-800/50'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Overzicht
            </button>
            <button
              onClick={() => onTabChange('components')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'components'
                  ? 'bg-ink-800 text-gold-300 shadow-sm border border-gold-400/20'
                  : 'text-ink-400 hover:text-ink-200 hover:bg-ink-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Gaia Componenten
            </button>
            <button
              onClick={() => onTabChange('containers')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'containers'
                  ? 'bg-ink-800 text-gold-300 shadow-sm border border-gold-400/20'
                  : 'text-ink-400 hover:text-ink-200 hover:bg-ink-800/50'
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
            <div className="hidden lg:flex items-center gap-3 text-xs font-mono text-ink-300 bg-ink-900/80 px-3 py-1.5 rounded-lg border border-ink-800">
              <div className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-sage-400" />
                <span className="text-ink-200">{systemMetrics.host.hostname}</span>
              </div>
              <span className="text-ink-700">|</span>
              <span className="text-ink-400">up {systemMetrics.uptime.formatted}</span>
            </div>
          )}

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-ink-900/80 border border-ink-800 text-ink-300 hover:text-gold-300 hover:border-gold-400/30 transition-all disabled:opacity-50"
            title="Vernieuwen"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-gold-400' : ''}`} />
          </button>

          {authStatus?.authenticated && (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-ink-900 border border-ink-800 text-xs font-mono text-ink-300">
                <Shield className="w-3 h-3 text-gold-400" />
                <span>{authStatus.username}</span>
              </div>
              <button
                onClick={onLogout}
                className="p-2 rounded-lg bg-clay-950/40 border border-clay-700/40 text-clay-400 hover:bg-clay-900/60 hover:text-clay-300 transition-all text-xs"
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
