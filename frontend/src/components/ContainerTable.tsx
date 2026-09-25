import React, { useState } from 'react';
import { Search, Terminal, Box, Layers } from 'lucide-react';
import { ContainerInfo } from '../types';

interface ContainerTableProps {
  containers: ContainerInfo[];
  onOpenLogs: (name: string) => void;
  onSelectContainer: (container: ContainerInfo) => void;
}

export const ContainerTable: React.FC<ContainerTableProps> = ({
  containers,
  onOpenLogs,
  onSelectContainer,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'gaia' | 'infra' | 'running' | 'stopped'>('all');

  const filteredContainers = containers.filter((c) => {
    // Search match
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.image.toLowerCase().includes(search.toLowerCase()) ||
      (c.gaia_meta?.component_name && c.gaia_meta.component_name.toLowerCase().includes(search.toLowerCase()));

    if (!matchSearch) return false;

    // Filter match
    if (filter === 'gaia') return c.gaia_meta?.is_gaia;
    if (filter === 'infra') return c.gaia_meta?.is_infrastructure;
    if (filter === 'running') return c.raw_status === 'running';
    if (filter === 'stopped') return c.raw_status !== 'running';
    return true;
  });

  return (
    <div className="glass-panel overflow-hidden border border-white/10">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#090e1a]/60">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              filter === 'all'
                ? 'bg-[#18233c] text-[#ffd166] font-semibold border border-[#ffd166]/30'
                : 'text-slate-400 hover:text-slate-200 bg-white/5'
            }`}
          >
            Alle ({containers.length})
          </button>
          <button
            onClick={() => setFilter('gaia')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
              filter === 'gaia'
                ? 'bg-[#18233c] text-[#ffd166] font-semibold border border-[#ffd166]/30'
                : 'text-slate-400 hover:text-slate-200 bg-white/5'
            }`}
          >
            <Layers className="w-3 h-3 text-[#e6b450]" />
            Gaia ({containers.filter((c) => c.gaia_meta?.is_gaia).length})
          </button>
          <button
            onClick={() => setFilter('infra')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
              filter === 'infra'
                ? 'bg-[#18233c] text-blue-300 font-semibold border border-blue-400/30'
                : 'text-slate-400 hover:text-slate-200 bg-white/5'
            }`}
          >
            <Box className="w-3 h-3 text-blue-400" />
            Infra ({containers.filter((c) => c.gaia_meta?.is_infrastructure).length})
          </button>
          <button
            onClick={() => setFilter('running')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              filter === 'running'
                ? 'bg-[#18233c] text-emerald-400 font-semibold border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 bg-white/5'
            }`}
          >
            Running ({containers.filter((c) => c.raw_status === 'running').length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek container of image..."
            className="w-full bg-[#070b12] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#e6b450]/50 font-mono"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 bg-white/[0.02]">
              <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[11px]">Container & Gaia Rol</th>
              <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[11px]">Status</th>
              <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[11px]">Docker Image</th>
              <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[11px]">CPU</th>
              <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[11px]">RAM</th>
              <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[11px]">Poorten</th>
              <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[11px] text-right">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredContainers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  Geen containers gevonden die voldoen aan de zoekcriteria.
                </td>
              </tr>
            ) : (
              filteredContainers.map((c) => {
                const isRunning = c.raw_status === 'running';
                const isGaia = c.gaia_meta?.is_gaia;
                const isInfra = c.gaia_meta?.is_infrastructure;

                return (
                  <tr
                    key={c.id}
                    onClick={() => onSelectContainer(c)}
                    className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                  >
                    {/* Name & Gaia Tag */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 group-hover:text-[#ffd166] transition-colors">
                          {c.name}
                        </span>
                        {isGaia ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#e6b450]/15 text-[#ffd166] border border-[#e6b450]/30 font-semibold">
                            GAIA
                          </span>
                        ) : isInfra ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                            INFRA
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>ID: {c.id}</span>
                        {c.gaia_meta?.component_name && (
                          <span className="text-slate-400">({c.gaia_meta.component_name})</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isRunning ? 'status-orb-running' : 'status-orb-stopped'
                          }`}
                        />
                        <span className={isRunning ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                          {c.status}
                        </span>
                      </div>
                    </td>

                    {/* Image */}
                    <td className="py-3 px-4 text-slate-400 max-w-[200px] truncate" title={c.image}>
                      {c.image}
                    </td>

                    {/* CPU */}
                    <td className="py-3 px-4">
                      {c.stats ? (
                        <span className="text-slate-300 font-semibold">{c.stats.cpu_percent}%</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* RAM */}
                    <td className="py-3 px-4">
                      {c.stats && c.stats.memory_usage > 0 ? (
                        <span className="text-slate-300">
                          {(c.stats.memory_usage / (1024 * 1024)).toFixed(0)} MB
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Ports */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {c.ports && c.ports.length > 0 ? (
                          c.ports.slice(0, 2).map((p, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-slate-300 border border-white/5 truncate">
                              {p}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-600 text-[10px]">Geen</span>
                        )}
                        {c.ports && c.ports.length > 2 && (
                          <span className="text-[10px] text-slate-500">+{c.ports.length - 2}</span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenLogs(c.name);
                        }}
                        className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-[#ffd166] transition-all inline-flex items-center gap-1 text-[11px]"
                        title="Bekijk logs"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Logs</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
