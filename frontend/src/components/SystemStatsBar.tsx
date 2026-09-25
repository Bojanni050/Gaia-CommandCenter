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
          <div key={i} className="h-28 rounded-xl bg-[#0e1424] border border-white/5" />
        ))}
      </div>
    );
  }

  const { cpu, memory, disk, docker } = metrics;
  const memUsedGb = (memory.used / (1024 ** 3)).toFixed(1);
  const memTotalGb = (memory.total / (1024 ** 3)).toFixed(1);
  const diskUsedGb = (disk.used / (1024 ** 3)).toFixed(0);
  const diskTotalGb = (disk.total / (1024 ** 3)).toFixed(0);

  // Status helper for progress colors
  const getProgressColor = (percent: number) => {
    if (percent > 85) return 'bg-red-500';
    if (percent > 65) return 'bg-amber-500';
    return 'bg-[#e6b450]';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* CPU Card */}
      <div className="glass-card p-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-slate-300">
            <Cpu className="w-4 h-4 text-[#ffd166]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">CPU Belasting</span>
          </div>
          <span className="text-lg font-bold font-mono text-slate-100">{cpu.percent}%</span>
        </div>

        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full transition-all duration-500 ${getProgressColor(cpu.percent)}`}
            style={{ width: `${Math.min(100, Math.max(0, cpu.percent))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>{cpu.core_count} Cores</span>
          <span>Load: {cpu.load_average.join(', ')}</span>
        </div>
      </div>

      {/* Memory Card */}
      <div className="glass-card p-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-slate-300">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">RAM Geheugen</span>
          </div>
          <span className="text-lg font-bold font-mono text-slate-100">{memory.percent}%</span>
        </div>

        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full transition-all duration-500 ${getProgressColor(memory.percent)}`}
            style={{ width: `${Math.min(100, Math.max(0, memory.percent))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>{memUsedGb} GB / {memTotalGb} GB</span>
          <span>Vrij: {((memory.available / (1024 ** 3))).toFixed(1)} GB</span>
        </div>
      </div>

      {/* Disk Card */}
      <div className="glass-card p-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-slate-300">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">Opslag (SSD)</span>
          </div>
          <span className="text-lg font-bold font-mono text-slate-100">{disk.percent}%</span>
        </div>

        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full transition-all duration-500 ${getProgressColor(disk.percent)}`}
            style={{ width: `${Math.min(100, Math.max(0, disk.percent))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>{diskUsedGb} GB / {diskTotalGb} GB</span>
          <span>{((disk.free / (1024 ** 3))).toFixed(0)} GB over</span>
        </div>
      </div>

      {/* Docker Engine Card */}
      <div className="glass-card p-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-slate-300">
            <Database className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">Docker Engine</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${docker.available ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-red-400'}`} />
            <span className="text-xs font-mono text-slate-300">{docker.available ? 'OK' : 'Offline'}</span>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono mt-1 mb-3">
          Versie: <span className="text-slate-200">{docker.server_version}</span>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-white/5">
          <span className="text-emerald-400 font-medium">{docker.containers_running} Draaiend</span>
          <span className={docker.containers_stopped > 0 ? 'text-amber-400' : 'text-slate-500'}>
            {docker.containers_stopped} Gestopt
          </span>
          <span>{docker.containers_total} Totaal</span>
        </div>
      </div>
    </div>
  );
};
