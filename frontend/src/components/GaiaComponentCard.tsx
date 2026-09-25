import React from 'react';
import { ExternalLink, Terminal, Cpu, Activity, Box } from 'lucide-react';
import { GaiaComponent } from '../types';

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
    composite_status,
    container_stats,
    health_check,
    has_ui,
    ui_url,
    ui_label,
  } = component;

  // Status mapping
  const getStatusBadge = () => {
    switch (composite_status) {
      case 'running':
      case 'ok':
        return (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full status-orb-running" />
            <span className="font-medium">Running</span>
          </div>
        );
      case 'unhealthy':
        return (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full status-orb-unhealthy" />
            <span className="font-medium">Unhealthy</span>
          </div>
        );
      case 'starting':
        return (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full status-orb-starting" />
            <span className="font-medium">Starting</span>
          </div>
        );
      case 'stopped':
        return (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full status-orb-stopped" />
            <span className="font-medium">Stopped</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="font-medium">Unknown</span>
          </div>
        );
    }
  };

  // Category Color
  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'core':
        return 'text-[#ffd166] bg-[#e6b450]/10 border-[#e6b450]/20';
      case 'reasoning':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'memory':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'knowledge':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'cognition':
        return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
      case 'interface':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
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
      className="glass-card p-5 cursor-pointer hover:border-[#e6b450]/40 transition-all flex flex-col justify-between group"
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider font-semibold ${getCategoryColor(category)}`}>
                {category}
              </span>
              {container && (
                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  <Box className="w-3 h-3 text-slate-500" />
                  {container}
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-slate-100 group-hover:text-[#ffd166] transition-colors">
              {name}
            </h3>
          </div>
          <div>{getStatusBadge()}</div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">
          {description}
        </p>

        {/* Realtime Metrics & Health */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-black/25 p-2.5 rounded-lg border border-white/5 mb-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-slate-500" />
            <span>
              CPU:{' '}
              <strong className="text-slate-200">
                {container_stats ? `${container_stats.cpu_percent}%` : '0.0%'}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <Activity className="w-3.5 h-3.5 text-slate-500" />
            <span>
              RAM:{' '}
              <strong className="text-slate-200">
                {container_stats
                  ? `${(container_stats.memory_usage / (1024 * 1024)).toFixed(0)} MB`
                  : 'N/A'}
              </strong>
            </span>
          </div>

          {health_check && (
            <div className="col-span-2 flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-white/5">
              <span className="flex items-center gap-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    health_check.status === 'ok' ? 'bg-emerald-400' : 'bg-red-400'
                  }`}
                />
                Health: {health_check.status === 'ok' ? 'OK' : 'Degraded'}
              </span>
              <span className="text-slate-500">{health_check.latency_ms}ms</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-auto">
        <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-400 transition-colors">
          Klik voor details &rarr;
        </span>

        <div className="flex items-center gap-2">
          {container && (
            <button
              onClick={handleLogsClick}
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all"
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
