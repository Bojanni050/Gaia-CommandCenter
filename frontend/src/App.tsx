import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { SystemStatsBar } from './components/SystemStatsBar';
import { GaiaComponentCard } from './components/GaiaComponentCard';
import { ComponentDetailModal } from './components/ComponentDetailModal';
import { ContainerTable } from './components/ContainerTable';
import { LogsModal } from './components/LogsModal';
import { LoginModal } from './components/LoginModal';
import { api } from './services/api';
import { SystemMetrics, GaiaComponent, ContainerInfo, AuthStatus } from './types';
import { ExternalLink, Layers, Box, Activity, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'components' | 'containers'>('overview');
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [components, setComponents] = useState<GaiaComponent[]>([]);
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [selectedComponent, setSelectedComponent] = useState<GaiaComponent | null>(null);
  const [logContainer, setLogContainer] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  // Fetch all data
  const fetchData = useCallback(async (isManual: boolean = false) => {
    if (isManual) setIsRefreshing(true);
    setError(null);

    try {
      // 1. Check auth first
      const auth = await api.getAuthStatus();
      setAuthStatus(auth);

      if (auth.auth_enabled && !auth.authenticated) {
        setShowLoginModal(true);
        if (isManual) setIsRefreshing(false);
        return;
      }
      setShowLoginModal(false);

      // 2. Fetch system, components and containers in parallel
      const [sys, comps, conts] = await Promise.all([
        api.getSystemMetrics(),
        api.getComponents(),
        api.getContainers(),
      ]);

      setSystemMetrics(sys);
      setComponents(comps);
      setContainers(conts);

      // Update selected component if modal is open
      if (selectedComponent) {
        const updated = comps.find((c) => c.id === selectedComponent.id);
        if (updated) setSelectedComponent(updated);
      }
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        setShowLoginModal(true);
      } else {
        setError(err.message || 'Fout bij communicatie met Gaia Control Center backend');
      }
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  }, [selectedComponent]);

  useEffect(() => {
    fetchData(true);
    // Background polling every 12 seconds
    const interval = setInterval(() => {
      fetchData(false);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    fetchData(true);
  };

  const handleLogout = async () => {
    await api.logout();
    setAuthStatus({ authenticated: false, username: null, auth_enabled: true });
    setShowLoginModal(true);
  };

  const runningComponentsCount = components.filter(
    (c) => c.composite_status === 'running' || c.composite_status === 'ok'
  ).length;

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans selection:bg-[#e6b450]/30 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        systemMetrics={systemMetrics}
        authStatus={authStatus}
        onRefresh={() => fetchData(true)}
        isRefreshing={isRefreshing}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchData(true)}
              className="text-xs text-red-300 underline hover:text-white"
            >
              Opnieuw proberen
            </button>
          </div>
        )}

        {/* System Stats Bar */}
        <SystemStatsBar metrics={systemMetrics} />

        {/* TAB 1: OVERVIEW DASHBOARD */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Status Bar */}
            <div className="glass-panel p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#e6b450]/10 border border-[#e6b450]/20 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-[#ffd166]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-100 font-mono">GAIA SERVER STATUS</h2>
                  <p className="text-xs text-slate-400">
                    {runningComponentsCount} van de {components.length} Gaia componenten zijn operationeel
                  </p>
                </div>
              </div>

              {/* Status Pills */}
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full status-orb-running" />
                  <span>{runningComponentsCount} OK</span>
                </div>
                {components.length - runningComponentsCount > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>{components.length - runningComponentsCount} Aandacht</span>
                  </div>
                )}
              </div>
            </div>

            {/* Gaia Components Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#ffd166]" />
                  <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
                    Gaia Componenten Overzicht
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('components')}
                  className="text-xs text-[#ffd166] hover:underline font-mono"
                >
                  Alle bekijken &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {components.map((comp) => (
                  <GaiaComponentCard
                    key={comp.id}
                    component={comp}
                    onSelect={setSelectedComponent}
                    onOpenLogs={setLogContainer}
                  />
                ))}
              </div>
            </div>

            {/* Quick Web Interfaces Links */}
            <div className="glass-panel p-5 border border-white/10">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5 text-[#ffd166]" />
                Directe Toegang tot Bestaande Webinterfaces
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {components
                  .filter((c) => c.has_ui && c.ui_url)
                  .map((comp) => (
                    <a
                      key={comp.id}
                      href={comp.ui_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#e6b450]/30 transition-all flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-200 group-hover:text-[#ffd166] transition-colors font-mono">
                          {comp.ui_label || comp.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate max-w-[180px]">
                          {comp.ui_url}
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#ffd166] transition-colors" />
                    </a>
                  ))}
              </div>
            </div>

            {/* Recent Containers Snapshot */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
                    Docker Containers Snapshot
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('containers')}
                  className="text-xs text-[#ffd166] hover:underline font-mono"
                >
                  Volledige tabel &rarr;
                </button>
              </div>

              <ContainerTable
                containers={containers.slice(0, 6)}
                onOpenLogs={setLogContainer}
                onSelectContainer={(c) => {
                  const matchedComp = components.find((comp) => comp.container === c.name);
                  if (matchedComp) setSelectedComponent(matchedComp);
                }}
              />
            </div>
          </div>
        )}

        {/* TAB 2: GAIA COMPONENTS */}
        {activeTab === 'components' && (
          <div className="space-y-4">
            <div className="glass-panel p-4 flex items-center justify-between border border-white/10">
              <div>
                <h2 className="text-base font-bold text-slate-100 font-mono">GAIA COMPONENT REGISTRY</h2>
                <p className="text-xs text-slate-400">
                  Conceptuele architectuur van Gaia. Containers fungeren als onderliggende infrastructuur.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {components.map((comp) => (
                <GaiaComponentCard
                  key={comp.id}
                  component={comp}
                  onSelect={setSelectedComponent}
                  onOpenLogs={setLogContainer}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CONTAINERS / INFRASTRUCTURE */}
        {activeTab === 'containers' && (
          <div className="space-y-4">
            <div className="glass-panel p-4 flex items-center justify-between border border-white/10">
              <div>
                <h2 className="text-base font-bold text-slate-100 font-mono">INFRASTRUCTUUR & DOCKER</h2>
                <p className="text-xs text-slate-400">
                  Alle draaiende Docker containers, poortmappings, images en geheugenbelasting op de VPS.
                </p>
              </div>
            </div>

            <ContainerTable
              containers={containers}
              onOpenLogs={setLogContainer}
              onSelectContainer={(c) => {
                const matchedComp = components.find((comp) => comp.container === c.name);
                if (matchedComp) setSelectedComponent(matchedComp);
              }}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500 font-mono bg-[#070b12]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Gaia Server Control Center &bull; Ubuntu VPS (Tailscale: 100.65.0.15)</span>
          <span className="text-slate-600">Docker Engine API v1.55 &bull; Gaia Cloud Architecture</span>
        </div>
      </footer>

      {/* Component Detail Modal */}
      <ComponentDetailModal
        component={selectedComponent}
        onClose={() => setSelectedComponent(null)}
        onOpenFullLogs={(cName) => {
          setSelectedComponent(null);
          setLogContainer(cName);
        }}
      />

      {/* Logs Modal */}
      <LogsModal
        containerName={logContainer}
        onClose={() => setLogContainer(null)}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
};
