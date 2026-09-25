import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { SystemStatsBar } from './components/SystemStatsBar';
import { GaiaComponentCard } from './components/GaiaComponentCard';
import { ComponentDetailModal } from './components/ComponentDetailModal';
import { ContainerTable } from './components/ContainerTable';
import { LogsModal } from './components/LogsModal';
import { LoginPage } from './components/LoginPage';
import { SettingsPage } from './components/SettingsPage';
import { api } from './services/api';
import { SystemMetrics, GaiaComponent, ContainerInfo, AuthStatus } from './types';
import { ExternalLink, Layers, Box, Activity, AlertCircle, Compass } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'components' | 'containers' | 'settings'>('overview');
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [components, setComponents] = useState<GaiaComponent[]>([]);
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [selectedComponent, setSelectedComponent] = useState<GaiaComponent | null>(null);
  const [logContainer, setLogContainer] = useState<string | null>(null);

  // Fetch all data
  const fetchData = useCallback(async (isManual: boolean = false) => {
    if (isManual) setIsRefreshing(true);
    setError(null);

    try {
      // 1. Check auth first
      const auth = await api.getAuthStatus();
      setAuthStatus(auth);

      if (auth.auth_enabled && !auth.authenticated) {
        if (isManual) setIsRefreshing(false);
        return;
      }

      // 2. Fetch system, components and containers independently with Promise.allSettled
      const [sysRes, compsRes, contsRes] = await Promise.allSettled([
        api.getSystemMetrics(),
        api.getComponents(),
        api.getContainers(),
      ]);

      if (sysRes.status === 'fulfilled') {
        setSystemMetrics(sysRes.value);
      } else if (sysRes.reason?.message === 'UNAUTHORIZED') {
        setAuthStatus({ authenticated: false, username: null, auth_enabled: true });
        return;
      }

      if (compsRes.status === 'fulfilled') {
        setComponents(compsRes.value);
        if (selectedComponent) {
          const updated = compsRes.value.find((c) => c.id === selectedComponent.id);
          if (updated) setSelectedComponent(updated);
        }
      }

      if (contsRes.status === 'fulfilled') {
        setContainers(contsRes.value);
      }

      // If all failed, show error
      if (sysRes.status === 'rejected' && compsRes.status === 'rejected' && contsRes.status === 'rejected') {
        setError('Kon gegevens niet ophalen van Gaia backend.');
      }
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        setAuthStatus({ authenticated: false, username: null, auth_enabled: true });
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
    fetchData(true);
  };

  const handleLogout = async () => {
    await api.logout();
    setAuthStatus({ authenticated: false, username: null, auth_enabled: true });
  };

  if (authStatus === null) {
    return (
      <div className="min-h-screen w-full bg-ink-950 flex flex-col items-center justify-center font-sans select-none grain">
        <div className="relative mb-5 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-gold-600/30 to-sage-400/30 blur-md animate-breathe pointer-events-none" />
          <div className="absolute w-12 h-12 rounded-full bg-ink-900 border border-gold-400/40 flex items-center justify-center shadow-lg">
            <div className="w-4 h-4 rounded-full bg-gold-400/80 status-orb-running" />
          </div>
        </div>
        <h2 className="font-serif text-xl font-light text-ink-100 tracking-wide mb-1">
          <span className="italic text-gold-400">Gaia</span> Control Center
        </h2>
        <p className="text-xs text-ink-500 font-mono tracking-widest uppercase">
          Verbinden met cognitieve kern...
        </p>
      </div>
    );
  }

  if (authStatus.auth_enabled && !authStatus.authenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const runningComponentsCount = components.filter(
    (c) => c.composite_status === 'running' || c.composite_status === 'ok'
  ).length;

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100 flex flex-col font-sans selection:bg-gold-500/25 selection:text-gold-200 grain">
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-clay-950/60 border border-clay-700/50 text-clay-300 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-clay-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchData(true)}
              className="text-xs text-gold-300 underline hover:text-ink-100"
            >
              Opnieuw proberen
            </button>
          </div>
        )}

        {/* System Stats Bar */}
        <SystemStatsBar metrics={systemMetrics} />

        {/* TAB 1: OVERVIEW DASHBOARD */}
        {activeTab === 'overview' && (
          <div className="space-y-7">
            {/* Editorial Quick Status Bar */}
            <div className="glass-panel p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border border-ink-800 relative overflow-hidden">
              {/* Subtle ambient lighting */}
              <div className="absolute -top-20 -left-20 w-60 h-60 bg-gold-500/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-sage-500/10 rounded-full blur-[80px] pointer-events-none" />

              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-ink-900 border border-gold-400/30 flex items-center justify-center shadow-md">
                  <Activity className="w-6 h-6 text-gold-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-xl sm:text-2xl font-light text-ink-50">
                      Gaia Status &amp; <span className="italic text-gold-400 font-normal">Cognitie</span>
                    </h2>
                  </div>
                  <p className="text-xs text-ink-400 mt-0.5 font-sans leading-relaxed">
                    {runningComponentsCount} van de {components.length} autonome Gaia componenten zijn operationeel
                  </p>
                </div>
              </div>

              {/* Status Pills */}
              <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs relative z-10">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-950/70 text-sage-300 border border-sage-700/60 shadow-sm">
                  <span className="w-2 h-2 rounded-full status-orb-running" />
                  <span>{runningComponentsCount} Actief</span>
                </div>
                {components.length - runningComponentsCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-clay-950/70 text-clay-300 border border-clay-700/60 shadow-sm">
                    <span className="w-2 h-2 rounded-full status-orb-unhealthy" />
                    <span>{components.length - runningComponentsCount} Aandacht</span>
                  </div>
                )}
              </div>
            </div>

            {/* Gaia Components Section */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gold-400" />
                  <h3 className="font-serif text-xl font-normal text-ink-100">
                    Gaia Componenten
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('components')}
                  className="text-xs text-gold-400 hover:text-gold-300 hover:underline font-mono"
                >
                  Alle {components.length} bekijken &rarr;
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
            <div className="glass-panel p-6 border border-ink-800">
              <h3 className="font-serif text-base font-medium text-ink-200 mb-4 flex items-center gap-2">
                <Compass className="w-4 h-4 text-gold-400" />
                <span>Directe Toegang tot Bestaande Webinterfaces</span>
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
                      className="p-3.5 rounded-xl bg-ink-900/60 hover:bg-ink-850 border border-ink-800 hover:border-gold-400/40 transition-all flex items-center justify-between group shadow-sm"
                    >
                      <div>
                        <div className="text-xs font-semibold text-ink-200 group-hover:text-gold-300 transition-colors font-mono">
                          {comp.ui_label || comp.name}
                        </div>
                        <div className="text-[11px] text-ink-500 font-mono mt-0.5 truncate max-w-[180px]">
                          {comp.ui_url}
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-ink-500 group-hover:text-gold-400 transition-colors" />
                    </a>
                  ))}
              </div>
            </div>

            {/* Recent Containers Snapshot */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-ink-400" />
                  <h3 className="font-serif text-xl font-normal text-ink-100">
                    Docker Containers Snapshot
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('containers')}
                  className="text-xs text-gold-400 hover:text-gold-300 hover:underline font-mono"
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
            <div className="glass-panel p-5 flex items-center justify-between border border-ink-800">
              <div>
                <h2 className="font-serif text-2xl font-light text-ink-100">
                  <span className="italic text-gold-400">Gaia</span> Component Registry
                </h2>
                <p className="text-xs text-ink-400 mt-1 font-sans">
                  Conceptuele architectuur van Gaia. Containers en processen fungeren als onderliggend zenuwstelsel.
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
            <div className="glass-panel p-5 flex items-center justify-between border border-ink-800">
              <div>
                <h2 className="font-serif text-2xl font-light text-ink-100">
                  Infrastructuur &amp; <span className="italic text-gold-400">Docker</span>
                </h2>
                <p className="text-xs text-ink-400 mt-1 font-sans">
                  Alle containers op de VPS, inclusief geheugengebruik, cpu belasting en gekoppelde netwerkpoorten.
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

        {/* TAB 4: SETTINGS PAGE */}
        {activeTab === 'settings' && (
          <SettingsPage
            components={components}
            containers={containers}
            onRefreshComponents={() => fetchData(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-ink-800/80 py-6 text-center text-xs text-ink-500 font-mono bg-ink-950/90 mt-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-ink-400">
            Gaia Server Control Center &bull; Ubuntu VPS (Tailscale: 100.65.0.15)
          </span>
          <span className="text-ink-600">
            Inspiratie: intro.higaia.nl &bull; Docker Engine API v1.55
          </span>
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
    </div>
  );
};
