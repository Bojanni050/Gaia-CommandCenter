import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Terminal, Box, Activity, Copy, Check } from 'lucide-react';
import { GaiaComponent } from '../types';
import { api } from '../services/api';

interface ComponentDetailModalProps {
  component: GaiaComponent | null;
  onClose: () => void;
  onOpenFullLogs: (containerName: string) => void;
}

export const ComponentDetailModal: React.FC<ComponentDetailModalProps> = ({
  component,
  onClose,
  onOpenFullLogs,
}) => {
  const [logs, setLogs] = useState<string>('');
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'details' | 'logs'>('details');
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);

  useEffect(() => {
    if (!component?.container) {
      setLogs('');
      return;
    }

    setLoadingLogs(true);
    api.getLogs(component.container, 60, true)
      .then((data) => setLogs(data.logs))
      .catch((err) => setLogs(`Kon logs niet ophalen: ${err.message}`))
      .finally(() => setLoadingLogs(false));
  }, [component]);

  if (!component) return null;

  const {
    name,
    category,
    description,
    container,
    auxiliary_containers,
    runtime,
    container_info,
    container_stats,
    health_check,
    has_ui,
    ui_url,
    ui_label,
    config_source,
    configurable,
  } = component;

  const handleCopyPayload = () => {
    if (health_check?.response) {
      navigator.clipboard.writeText(JSON.stringify(health_check.response, null, 2));
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[90vh] glass-panel bg-[#0d1322] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-start justify-between bg-[#090e1a]/80">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#e6b450]/15 text-[#ffd166] border border-[#e6b450]/30 uppercase font-semibold">
                {category}
              </span>
              <span className="text-xs font-mono text-slate-400">
                ID: {component.id}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
              {name}
              {has_ui && ui_url && (
                <button
                  onClick={() => window.open(ui_url, '_blank')}
                  className="btn-gaia text-xs py-1 px-3"
                >
                  <span>{ui_label || 'Open UI'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-white/5 flex gap-4 bg-[#090e1a]/40">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 text-xs font-mono font-medium transition-all border-b-2 ${
              activeTab === 'details'
                ? 'text-[#ffd166] border-[#ffd166]'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Specificaties & Status
          </button>
          {container && (
            <button
              onClick={() => setActiveTab('logs')}
              className={`pb-3 text-xs font-mono font-medium transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'text-[#ffd166] border-[#ffd166]'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Recente Logs
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'details' ? (
            <>
              {/* Gaia Role & Function */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">Gaia Functie & Rol</h4>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-sm text-slate-200 leading-relaxed">{description}</p>
                </div>
              </div>

              {/* Status & Health Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Health Check */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      Health Endpoint
                    </h4>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                      health_check?.status === 'ok' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {health_check?.status ? health_check.status.toUpperCase() : 'N/A'}
                    </span>
                  </div>

                  {health_check ? (
                    <div className="space-y-2 text-xs font-mono">
                      <div className="text-slate-300 break-all bg-black/30 p-2 rounded">
                        {health_check.endpoint}
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Latency: <strong className="text-slate-200">{health_check.latency_ms} ms</strong></span>
                        <span>HTTP Code: <strong className="text-slate-200">{health_check.status_code || 'N/A'}</strong></span>
                      </div>
                      {health_check.response && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                            <span>Response Payload:</span>
                            <button
                              onClick={handleCopyPayload}
                              className="flex items-center gap-1 text-[10px] text-[#ffd166] hover:underline"
                            >
                              {copiedPayload ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedPayload ? 'Gekopieerd' : 'Kopieer JSON'}</span>
                            </button>
                          </div>
                          <pre className="p-2.5 rounded bg-black/50 text-[11px] text-emerald-300 overflow-x-auto max-h-32 border border-white/5">
                            {typeof health_check.response === 'object'
                              ? JSON.stringify(health_check.response, null, 2)
                              : String(health_check.response)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 font-mono">Geen health endpoint geconfigureerd.</p>
                  )}
                </div>

                {/* Container & Hardware Stats */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5 text-blue-400" />
                      Infrastructuur
                    </h4>
                    <span className="text-xs font-mono text-slate-300">
                      {container ? `Container: ${container}` : runtime ? `Runtime: ${runtime}` : 'Geïntegreerd'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    {container_stats ? (
                      <>
                        <div className="flex justify-between text-slate-300">
                          <span>CPU Verbruik:</span>
                          <span className="font-semibold text-[#ffd166]">{container_stats.cpu_percent}%</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>RAM Verbruik:</span>
                          <span className="font-semibold text-emerald-400">
                            {(container_stats.memory_usage / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        </div>
                        {container_stats.net_rx_bytes !== undefined && (
                          <div className="flex justify-between text-slate-400 text-[11px]">
                            <span>Netwerk I/O:</span>
                            <span>
                              &darr; {(container_stats.net_rx_bytes / 1024).toFixed(0)} KB / &uarr; {((container_stats.net_tx_bytes || 0) / 1024).toFixed(0)} KB
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-slate-500">Live containerstatistieken niet beschikbaar.</p>
                    )}

                    {auxiliary_containers && auxiliary_containers.length > 0 && (
                      <div className="pt-2 border-t border-white/5">
                        <span className="text-slate-400 text-[11px]">Ondersteunende containers:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {auxiliary_containers.map((aux) => (
                            <span key={aux} className="px-2 py-0.5 rounded bg-white/5 text-[11px] text-slate-300 border border-white/5">
                              {aux}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Container Details & Ports */}
              {container_info && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                  <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">Docker Container Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                    <div>
                      <span className="text-slate-500">Docker Image:</span>
                      <p className="text-slate-200 break-all">{container_info.image}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Restart Policy:</span>
                      <p className="text-slate-200">{container_info.restart_policy || 'N/A'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-500">Gekoppelde Poorten:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {container_info.ports && container_info.ports.length > 0 ? (
                          container_info.ports.map((p, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                              {p}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500">Geen publieke poorten (intern netwerk)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Configuration Section */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">Configuratiebeheer</h4>
                <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                  <span>Configuratiebron:</span>
                  <span className="text-slate-400">{config_source || 'Geen bestand'}</span>
                </div>
                <div className="mt-2 text-xs text-slate-400 bg-black/20 p-2.5 rounded border border-white/5">
                  {configurable ? (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">
                        Deze service beschikt over een officiële runtime API / admin surface.
                      </span>
                      {ui_url && (
                        <button
                          onClick={() => window.open(ui_url, '_blank')}
                          className="text-[#ffd166] hover:underline flex items-center gap-1"
                        >
                          <span>Open configuratie</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="italic text-slate-500">
                      Configuratie is extern beheerd (via Docker Compose / .env). Wijzigingen worden beschermd en verlopen via het server-reproductieproces.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Logs Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">
                  Laatste 60 regels van {container}:
                </span>
                <button
                  onClick={() => onOpenFullLogs(container!)}
                  className="btn-ghost text-xs py-1"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Open Volledige Logs Viewer</span>
                </button>
              </div>

              <div className="bg-[#05080f] p-4 rounded-xl border border-white/10 font-mono text-xs text-slate-300 overflow-x-auto max-h-[50vh] whitespace-pre-wrap leading-relaxed">
                {loadingLogs ? (
                  <div className="flex items-center justify-center p-8 text-slate-500 animate-pulse">
                    Logs laden...
                  </div>
                ) : logs ? (
                  logs
                ) : (
                  <span className="text-slate-600">Geen logs beschikbaar voor deze container.</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#090e1a]/80 flex items-center justify-between">
          <button onClick={onClose} className="btn-ghost text-xs">
            Sluiten
          </button>

          {container && (
            <button
              onClick={() => onOpenFullLogs(container)}
              className="btn-ghost text-xs text-[#ffd166] border-[#e6b450]/30 hover:bg-[#e6b450]/10"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Inspecteer Container Logs</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
