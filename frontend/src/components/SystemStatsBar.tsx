import React from 'react';
import { Cpu, HardDrive, Database, Activity } from 'lucide-react';
import { SystemMetrics } from '../types';

interface SystemStatsBarProps {
  metrics: SystemMetrics | null;
}

export const SystemStatsBar: React.FC<SystemStatsBarProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-ink-900/60 border border-ink-800/60" />
        ))}
      </div>
    );
  }

  const { cpu, memory, disk, docker } = metrics;
  const memUsedGb = (memory.used / (1024 ** 3)).toFixed(1);
  const memTotalGb = (memory.total / (1024 ** 3)).toFixed(1);
  const diskUsedGb = (disk.used / (1024 ** 3)).toFixed(0);
  const diskTotalGb = (disk.total / (1024 ** 3)).toFixed(0);

  const getMeterGradient = (percent: number, baseType: 'gold' | 'sage' | 'clay') => {
    if (percent > 90) return 'bg-gradient-to-r from-clay-600 to-clay-400';
    if (percent > 75) return 'bg-gradient-to-r from-gold-600 to-gold-400';
    if (baseType === 'sage') return 'bg-gradient-to-r from-sage-600 to-sage-400';
    if (baseType === 'gold') return 'bg-gradient-to-r from-gold-600 to-gold-400';
    return 'bg-gradient-to-r from-clay-600 to-clay-400';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* CPU Card */}
      <div className="glass-card p-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-gold-400" />
            <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-ink-400">
              CPU Belasting
            </span>
          </div>
          <span className="text-lg font-mono font-medium text-ink-100">{cpu.percent}%</span>
        </div>

        <div className="w-full bg-ink-950/80 h-1.5 rounded-full overflow-hidden mb-3 border border-ink-800/40">
          <div
            className={`h-full transition-all duration-500 ${getMeterGradient(cpu.percent, 'gold')}`}
            style={{ width: `${Math.min(100, Math.max(0, cpu.percent))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-ink-400">
          <span>{cpu.core_count} Cores</span>
          <span>Load: {cpu.load_average.join(', ')}</span>
        </div>
      </div>

      {/* Memory Card */}
      <div className="glass-card p-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sage-400" />
            <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-ink-400">
              RAM Geheugen
            </span>
          </div>
          <span className="text-lg font-mono font-medium text-ink-100">{memory.percent}%</span>
        </div>

        <div className="w-full bg-ink-950/80 h-1.5 rounded-full overflow-hidden mb-3 border border-ink-800/40">
          <div
            className={`h-full transition-all duration-500 ${getMeterGradient(memory.percent, 'sage')}`}
            style={{ width: `${Math.min(100, Math.max(0, memory.percent))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-ink-400">
          <span>{memUsedGb} / {memTotalGb} GB</span>
          <span>Vrij: {((memory.available / (1024 ** 3))).toFixed(1)} GB</span>
        </div>
      </div>

      {/* Disk Card */}
      <div className="glass-card p-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-clay-400" />
            <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-ink-400">
              Opslag (SSD)
            </span>
          </div>
          <span className="text-lg font-mono font-medium text-ink-100">{disk.percent}%</span>
        </div>

        <div className="w-full bg-ink-950/80 h-1.5 rounded-full overflow-hidden mb-3 border border-ink-800/40">
          <div
            className={`h-full transition-all duration-500 ${getMeterGradient(disk.percent, 'clay')}`}
            style={{ width: `${Math.min(100, Math.max(0, disk.percent))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-ink-400">
          <span>{diskUsedGb} / {diskTotalGb} GB</span>
          <span>{((disk.free / (1024 ** 3))).toFixed(0)} GB vrij</span>
        </div>
      </div>

      {/* Docker Engine Card */}
      <div className="glass-card p-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-ink-300" />
            <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-ink-400">
              Docker Engine
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${docker.available ? 'bg-sage-400 status-orb-running' : 'bg-clay-400'}`} />
            <span className="text-xs font-mono text-ink-200">{docker.available ? 'Actief' : 'Offline'}</span>
          </div>
        </div>

        <div className="text-xs text-ink-400 font-mono mt-1 mb-3">
          Versie: <span className="text-ink-200">{docker.server_version}</span>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-ink-400 pt-1 border-t border-ink-800/50">
          <span className="text-sage-400 font-medium">{docker.containers_running} Draaiend</span>
          <span className={docker.containers_stopped > 0 ? 'text-gold-400' : 'text-ink-500'}>
            {docker.containers_stopped} Gestopt
          </span>
          <span>{docker.containers_total} Totaal</span>
        </div>
      </div>
    </div>
  );
};
