import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Copy, Check, Terminal, ArrowDown } from 'lucide-react';
import { api } from '../services/api';

interface LogsModalProps {
  containerName: string | null;
  onClose: () => void;
}

export const LogsModal: React.FC<LogsModalProps> = ({ containerName, onClose }) => {
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [tail, setTail] = useState<number>(150);
  const [timestamps, setTimestamps] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [filterQuery, setFilterQuery] = useState<string>('');

  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = () => {
    if (!containerName) return;
    setLoading(true);
    api.getLogs(containerName, tail, timestamps)
      .then((data) => {
        setLogs(data.logs);
      })
      .catch((err) => {
        setLogs(`Fout bij ophalen logs: ${err.message}`);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, [containerName, tail, timestamps]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  if (!containerName) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter logs if filterQuery is set
  const displayedLogs = filterQuery
    ? logs
        .split('\n')
        .filter((line) => line.toLowerCase().includes(filterQuery.toLowerCase()))
        .join('\n')
    : logs;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-5xl h-[85vh] glass-panel bg-[#070b13] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Header */}
        <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 bg-[#090e1a]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80 cursor-pointer" onClick={onClose} />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>

            <div className="flex items-center gap-2 text-xs font-mono ml-2">
              <Terminal className="w-4 h-4 text-[#ffd166]" />
              <span className="text-slate-400">LOGS &bull;</span>
              <strong className="text-slate-200">{containerName}</strong>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Filter */}
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter regels..."
              className="bg-[#05080f] border border-white/10 rounded px-2.5 py-1 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[#e6b450]/40 font-mono w-36 sm:w-48"
            />

            {/* Tail lines selector */}
            <select
              value={tail}
              onChange={(e) => setTail(Number(e.target.value))}
              className="bg-[#05080f] border border-white/10 rounded px-2 py-1 text-xs text-slate-300 font-mono focus:outline-none"
            >
              <option value={50}>50 regels</option>
              <option value={150}>150 regels</option>
              <option value={300}>300 regels</option>
              <option value={500}>500 regels</option>
              <option value={1000}>1000 regels</option>
            </select>

            {/* Timestamps toggle */}
            <label className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={timestamps}
                onChange={(e) => setTimestamps(e.target.checked)}
                className="rounded bg-black/50 border-white/20 text-[#e6b450]"
              />
              <span>Tijdstippen</span>
            </label>

            {/* Refresh */}
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-[#ffd166] transition-all disabled:opacity-50"
              title="Herladen"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#ffd166]' : ''}`} />
            </button>

            {/* Copy */}
            <button
              onClick={handleCopy}
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-[#ffd166] transition-all"
              title="Kopieer logs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="flex-1 p-4 bg-[#05080f] overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed selection:bg-[#e6b450]/30 selection:text-white">
          {loading && !logs ? (
            <div className="flex items-center justify-center h-full text-slate-500 animate-pulse">
              Logs ophalen via Docker socket...
            </div>
          ) : displayedLogs ? (
            <>
              {displayedLogs}
              <div ref={logsEndRef} />
            </>
          ) : (
            <div className="text-slate-600 italic">
              {filterQuery ? 'Geen regels die voldoen aan het filter.' : 'Geen log-output geregistreerd voor deze container.'}
            </div>
          )}
        </div>

        {/* Terminal Footer */}
        <div className="px-4 py-2 bg-[#090e1a] border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <span>Container: {containerName}</span>
            <span>&bull;</span>
            <span>Getoond: {displayedLogs.split('\n').filter(Boolean).length} regels</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition-all ${
                autoScroll
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-white/5 text-slate-400 border-white/5'
              }`}
            >
              <ArrowDown className="w-3 h-3" />
              <span>Auto-scroll: {autoScroll ? 'Aan' : 'Uit'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
