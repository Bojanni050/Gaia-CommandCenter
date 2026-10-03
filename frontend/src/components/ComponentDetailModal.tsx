import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Terminal, Box, Activity, Copy, Check } from 'lucide-react';
import { GaiaComponent } from '../types';
import { EPISTEMIC_LABELS, LAYER_META } from '../layers';
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
    layer,
    epistemic,
    lifecycle,
    repo,
    v3_note,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-ink-900 border border-ink-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-ink-800 flex items-start justify-between bg-ink-950/80">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-gold-400/10 text-gold-300 border border-gold-400/25 uppercase font-semibold">
                {category}
              </span>
              <span className="text-xs font-mono text-ink-400">
                ID: {component.id}
              </span>
            </div>
            <h2 className="font-serif text-2xl font-light text-ink-50 flex items-center gap-3">
              <span>{name}</span>
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
            className="p-2 rounded-lg bg-ink-800/60 hover:bg-ink-800 text-ink-400 hover:text-ink-200 border border-ink-700/50 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-ink-800/80 flex gap-4 bg-ink-950/40">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 text-xs font-mono font-medium transition-all border-b-2 ${
              activeTab === 'details'
                ? 'text-gold-300 border-gold-400'
                : 'text-ink-400 border-transparent hover:text-ink-200'
            }`}
          >
            Specificaties &amp; Status
          </button>
          {container && (
            <button
              onClick={() => setActiveTab('logs')}
              className={`pb-3 text-xs font-mono font-medium transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'text-gold-300 border-gold-400'
                  : 'text-ink-400 border-transparent hover:text-ink-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Recente Logs
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'details' ? (
            <>
              {/* Gaia Role & Function */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono text-ink-400 uppercase tracking-wider">Gaia Functie &amp; Rol</h4>
                <div className="p-4 rounded-xl bg-ink-950/60 border border-ink-800/80">
                  <p className="text-sm text-ink-200 leading-relaxed font-sans">{description}</p>
                </div>
              </div>

              {/* V3 Architecture context */}
              {(layer || epistemic || lifecycle || repo || v3_note) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-mono text-ink-400 uppercase tracking-wider">V3 Architectuur</h4>
                  <div className="p-4 rounded-xl bg-ink-950/60 border border-ink-800/80 space-y-2 text-xs font-mono">
                    <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-ink-300">
                      {layer && (
                        <span><span className="text-ink-500">Laag:</span> {(LAYER_META[layer] && LAYER_META[layer].title) || layer}</span>
                      )}
                      {epistemic && (
                        <span><span className="text-ink-500">Epistemiek:</span> {EPISTEMIC_LABELS[epistemic] || epistemic}</span>
                      )}
                      {lifecycle && (
                        <span><span className="text-ink-500">Status:</span> {lifecycle}</span>
                      )}
                      {repo && (
                        <span className="break-all"><span className="text-ink-500">Repo:</span> {repo}</span>
                      )}
                    </div>
                    {v3_note && (
                      <p className="text-[11px] text-ink-400 leading-relaxed font-sans border-t border-ink-800/60 pt-2">{v3_note}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Status & Health Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Health Check */}
                <div className="p-4 rounded-xl bg-ink-950/60 border border-ink-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono text-ink-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-sage-400" />
                      Health Endpoint
                    </h4>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                      health_check?.status === 'ok' ? 'bg-sage-950/80 text-sage-300 border border-sage-700/50' : 'bg-clay-950/80 text-clay-300 border border-clay-700/50'
                    }`}>
                      {health_check?.status ? health_check.status.toUpperCase() : 'N/A'}
                    </span>
                  </div>

                  {health_check ? (
                    <div className="space-y-2 text-xs font-mono">
                      <div className="text-ink-300 break-all bg-ink-900 p-2 rounded border border-ink-800">
                        {health_check.endpoint}
                      </div>
                      <div className="flex justify-between text-ink-400">
                        <span>Latency: <strong className="text-ink-200">{health_check.latency_ms} ms</strong></span>
                        <span>HTTP Code: <strong className="text-ink-200">{health_check.status_code || 'N/A'}</strong></span>
                      </div>
                      {health_check.response && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[11px] text-ink-400 mb-1">
                            <span>Response Payload:</span>
                            <button
                              onClick={handleCopyPayload}
                              className="flex items-center gap-1 text-[10px] text-gold-300 hover:underline"
                            >
                              {copiedPayload ? <Check className="w-3 h-3 text-sage-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedPayload ? 'Gekopieerd' : 'Kopieer JSON'}</span>
                            </button>
                          </div>
                          <pre className="p-2.5 rounded bg-ink-950 text-[11px] text-sage-300 overflow-x-auto max-h-32 border border-ink-800">
                            {typeof health_check.response === 'object'
                              ? JSON.stringify(health_check.response, null, 2)
                              : String(health_check.response)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-ink-500 font-mono">Geen health endpoint geconfigureerd.</p>
                  )}
                </div>

                {/* Container & Hardware Stats */}
                <div className="p-4 rounded-xl bg-ink-950/60 border border-ink-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono text-ink-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5 text-gold-400" />
                      Infrastructuur
                    </h4>
                    <span className="text-xs font-mono text-ink-300">
                      {container ? `Container: ${container}` : runtime ? `Runtime: ${runtime}` : 'Geïntegreerd'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    {container_stats ? (
                      <>
                        <div className="flex justify-between text-ink-300">
                          <span>CPU Verbruik:</span>
                          <span className="font-semibold text-gold-400">{container_stats.cpu_percent}%</span>
                        </div>
                        <div className="flex justify-between text-ink-300">
                          <span>RAM Verbruik:</span>
                          <span className="font-semibold text-sage-400">
                            {(container_stats.memory_usage / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        </div>
                        {container_stats.net_rx_bytes !== undefined && (
                          <div className="flex justify-between text-ink-400 text-[11px]">
                            <span>Netwerk I/O:</span>
                            <span>
                              &darr; {(container_stats.net_rx_bytes / 1024).toFixed(0)} KB / &uarr; {((container_stats.net_tx_bytes || 0) / 1024).toFixed(0)} KB
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-ink-500">Live containerstatistieken niet beschikbaar.</p>
                    )}

                    {auxiliary_containers && auxiliary_containers.length > 0 && (
                      <div className="pt-2 border-t border-ink-800">
                        <span className="text-ink-400 text-[11px]">Ondersteunende containers:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {auxiliary_containers.map((aux) => (
                            <span key={aux} className="px-2 py-0.5 rounded bg-ink-900 text-[11px] text-ink-300 border border-ink-800">
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
                <div className="p-4 rounded-xl bg-ink-950/60 border border-ink-800/80 space-y-3">
                  <h4 className="text-xs font-mono text-ink-400 uppercase tracking-wider">Docker Container Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                    <div>
                      <span className="text-ink-500">Docker Image:</span>
                      <p className="text-ink-200 break-all">{container_info.image}</p>
                    </div>
                    <div>
                      <span className="text-ink-500">Restart Policy:</span>
                      <p className="text-ink-200">{container_info.restart_policy || 'N/A'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-ink-500">Gekoppelde Poorten:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {container_info.ports && container_info.ports.length > 0 ? (
                          container_info.ports.map((p, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-ink-900 text-gold-300 border border-gold-400/20">
                              {p}
                            </span>
                          ))
                        ) : (
                          <span className="text-ink-500">Geen publieke poorten (intern netwerk)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Configuration Section */}
              <div className="p-4 rounded-xl bg-ink-950/60 border border-ink-800/80 space-y-2">
                <h4 className="text-xs font-mono text-ink-400 uppercase tracking-wider">Configuratiebeheer</h4>
                <div className="flex items-center justify-between text-xs font-mono text-ink-300">
                  <span>Configuratiebron:</span>
                  <span className="text-ink-400">{config_source || 'Geen bestand'}</span>
                </div>
                <div className="mt-2 text-xs text-ink-400 bg-ink-900 p-2.5 rounded border border-ink-800">
                  {configurable ? (
                    <div className="flex items-center justify-between">
                      <span className="text-ink-300 font-sans">
                        Deze service beschikt over een officiële runtime API / admin surface.
                      </span>
                      {ui_url && (
                        <button
                          onClick={() => window.open(ui_url, '_blank')}
                          className="text-gold-300 hover:underline flex items-center gap-1 font-mono text-xs"
                        >
                          <span>Open configuratie</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="italic text-ink-500 font-sans">
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
                <span className="text-xs font-mono text-ink-400">
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

              <div className="bg-ink-950 p-4 rounded-xl border border-ink-800 font-mono text-xs text-ink-300 overflow-x-auto max-h-[50vh] whitespace-pre-wrap leading-relaxed">
                {loadingLogs ? (
                  <div className="flex items-center justify-center p-8 text-ink-500 animate-pulse">
                    Logs laden...
                  </div>
                ) : logs ? (
                  logs
                ) : (
                  <span className="text-ink-600">Geen logs beschikbaar voor deze container.</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-ink-800 bg-ink-950/80 flex items-center justify-between">
          <button onClick={onClose} className="btn-ghost text-xs">
            Sluiten
          </button>

          {container && (
            <button
              onClick={() => onOpenFullLogs(container)}
              className="btn-ghost text-xs text-gold-300 border-gold-400/30 hover:bg-gold-500/10"
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
