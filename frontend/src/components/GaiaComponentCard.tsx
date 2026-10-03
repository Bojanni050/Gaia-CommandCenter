import React from 'react';
import { ExternalLink, Terminal, Cpu, Activity, Box } from 'lucide-react';
import { GaiaComponent } from '../types';
import { EPISTEMIC_LABELS } from '../layers';

interface GaiaComponentCardProps {
  component: GaiaComponent;
  onSelect: (comp: GaiaComponent) => void;
  onOpenLogs?: (containerName: string) => void;
}

export const GaiaComponentCard: React.FC<GaiaComponentCardProps> = ({
  component,
  onSelect,
  onOpenLogs,
}) => {
  const {
    name,
    category,
    description,
    container,
    epistemic,
    lifecycle,
    repo,
    composite_status,
    container_stats,
    health_check,
    has_ui,
    ui_url,
    ui_label,
  } = component;

  const isPlanned = lifecycle === 'planned';

  // Status mapping
  const getStatusBadge = () => {
    switch (composite_status) {
      case 'running':
      case 'ok':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sage-950/60 border border-sage-700/50 text-sage-300 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full status-orb-running" />
            <span>Actief</span>
          </div>
        );
      case 'unhealthy':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-clay-950/60 border border-clay-700/50 text-clay-300 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full status-orb-unhealthy" />
            <span>Fout</span>
          </div>
        );
      case 'starting':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold-950/60 border border-gold-700/50 text-gold-300 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full status-orb-starting" />
            <span>Starten</span>
          </div>
        );
      case 'stopped':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-ink-900 border border-ink-800 text-ink-400 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full status-orb-stopped" />
            <span>Gestopt</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-ink-900 border border-ink-800 text-ink-400 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-ink-500" />
            <span>Onbekend</span>
          </div>
        );
    }
  };

  // Category styling matching Gaia taxonomy (V3)
  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'core':
        return 'text-gold-300 bg-gold-500/10 border-gold-400/25';
      case 'logos':
        return 'text-gold-200 bg-gold-600/15 border-gold-400/30';
      case 'reasoning':
        return 'text-sage-300 bg-sage-500/10 border-sage-400/25';
      case 'memory':
        return 'text-clay-300 bg-clay-500/10 border-clay-400/25';
      case 'knowledge':
        return 'text-ink-200 bg-ink-800/80 border-ink-700/60';
      case 'cognition':
        return 'text-gold-200 bg-gold-600/10 border-gold-500/20';
      case 'capture':
        return 'text-sage-300 bg-sage-600/10 border-sage-500/25';
      case 'integration':
        return 'text-ink-200 bg-ink-800/60 border-gold-400/20';
      case 'interface':
        return 'text-sage-200 bg-sage-600/10 border-sage-500/20';
      default:
        return 'text-ink-300 bg-ink-800/60 border-ink-700/40';
    }
  };

  const handleOpenUi = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (ui_url) {
      window.open(ui_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleLogsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (container && onOpenLogs) {
      onOpenLogs(container);
    }
  };

  return (
    <div
      onClick={() => onSelect(component)}
      className="glass-card p-5 cursor-pointer flex flex-col justify-between group"
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase tracking-wider font-semibold ${getCategoryColor(category)}`}>
                {category}
              </span>
              {epistemic && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-ink-700/60 bg-ink-900/70 text-ink-300 lowercase tracking-wide" title="Epistemische rol in de V3-geheugenpijp">
                  {EPISTEMIC_LABELS[epistemic] || epistemic}
                </span>
              )}
              {lifecycle && lifecycle !== 'active' && (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase tracking-wide font-semibold ${isPlanned ? 'text-ink-400 bg-ink-900 border-ink-700/60' : 'text-gold-300 bg-gold-500/10 border-gold-400/25'}`} title={repo || undefined}>
                  {isPlanned ? 'Gepland' : 'Interim'}
                </span>
              )}
              {container && (
                <span className="text-[11px] font-mono text-ink-400 flex items-center gap-1">
                  <Box className="w-3 h-3 text-ink-500" />
                  {container}
                </span>
              )}
            </div>
            <h3 className="font-serif text-lg font-medium text-ink-100 group-hover:text-gold-300 transition-colors">
              {name}
            </h3>
          </div>
          <div>{getStatusBadge()}</div>
        </div>

        {/* Description */}
        <p className="text-xs text-ink-400 mb-4 line-clamp-2 leading-relaxed font-sans">
          {description}
        </p>

        {/* Realtime Metrics & Health */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-ink-950/70 p-2.5 rounded-lg border border-ink-800/60 mb-4">
          <div className="flex items-center gap-2 text-ink-400">
            <Cpu className="w-3.5 h-3.5 text-gold-500/70" />
            <span>
              CPU:{' '}
              <strong className="text-ink-200">
                {container_stats ? `${container_stats.cpu_percent}%` : '0.0%'}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-ink-400">
            <Activity className="w-3.5 h-3.5 text-sage-500/70" />
            <span>
              RAM:{' '}
              <strong className="text-ink-200">
                {container_stats
                  ? `${(container_stats.memory_usage / (1024 * 1024)).toFixed(0)} MB`
                  : 'N/A'}
              </strong>
            </span>
          </div>

          {health_check && (
            <div className="col-span-2 flex items-center justify-between text-[11px] text-ink-400 pt-1.5 border-t border-ink-800/40">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    health_check.status === 'ok' ? 'bg-sage-400' : health_check.status === 'auth' ? 'bg-gold-400' : 'bg-clay-400'
                  }`}
                />
                Health:{' '}
                <span className="text-ink-300">
                  {health_check.status === 'ok' ? 'OK' : health_check.status === 'auth' ? 'Auth vereist' : health_check.status === 'degraded' ? 'Degraded' : 'Down'}
                </span>
              </span>
              <span className="text-ink-500">{health_check.latency_ms}ms</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-ink-800/50 mt-auto">
        <span className="text-[11px] font-mono text-ink-500 group-hover:text-gold-300/80 transition-colors">
          Details bekijken &rarr;
        </span>

        <div className="flex items-center gap-2">
          {container && (
            <button
              onClick={handleLogsClick}
              className="p-1.5 rounded-md bg-ink-800/60 hover:bg-ink-800 text-ink-400 hover:text-ink-200 border border-ink-700/40 transition-all"
              title="Bekijk logs"
            >
              <Terminal className="w-3.5 h-3.5" />
            </button>
          )}

          {has_ui && ui_url && (
            <button
              onClick={handleOpenUi}
              className="btn-gaia text-xs py-1 px-2.5 font-medium"
              title={ui_label || 'Open UI'}
            >
              <span>{ui_label || 'Open UI'}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
