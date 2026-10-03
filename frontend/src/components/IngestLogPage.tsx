import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Copy, Check, Radio, Clock, AlertTriangle, Database, Inbox, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { IngestEvent, IngestLogStats } from '../types';

const STATUS_STYLES: Record<string, string> = {
  ok: 'bg-sage-950/60 border-sage-700/50 text-sage-300',
  failed: 'bg-clay-950/60 border-clay-700/50 text-clay-300',
  rejected: 'bg-clay-950/60 border-clay-700/50 text-clay-300',
  error: 'bg-clay-950/60 border-clay-700/50 text-clay-300',
  pending: 'bg-gold-950/60 border-gold-700/50 text-gold-300',
};

const LEVEL_STYLES: Record<string, string> = {
  info: 'text-ink-300',
  warning: 'text-gold-300',
  error: 'text-clay-300',
  debug: 'text-ink-500',
};

export const IngestLogPage: React.FC = () => {
  const [events, setEvents] = useState<IngestEvent[]>([]);
  const [stats, setStats] = useState<IngestLogStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [source, setSource] = useState<string>('');
  const [event, setEvent] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [sinceHours, setSinceHours] = useState<number>(24);
  const [limit, setLimit] = useState<number>(200);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchEvents = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { limit, since_hours: sinceHours };
    if (source) params.source = source;
    if (event) params.event = event;
    if (status) params.status = status;
    if (filterQuery) params.q = filterQuery;
    api.getIngestLogs(params)
      .then((data) => setEvents(data))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
    api.getIngestLogStats()
      .then((data) => setStats(data))
      .catch(() => setStats(null));
  }, [source, event, status, sinceHours, limit, filterQuery]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    const interval = setInterval(fetchEvents, 15000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(events, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleString('nl-NL');
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 border border-ink-800 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-sage-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-ink-900 border border-sage-400/30 flex items-center justify-center shadow-md">
              <Inbox className="w-6 h-6 text-sage-400" />
            </div>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-light text-ink-50">
                Ingestie <span className="italic text-sage-400 font-normal">Viewer</span>
              </h2>
              <p className="text-xs text-ink-400 mt-0.5 font-sans leading-relaxed">
                Logging van de ingestiepijp: capture-rs &rarr; Ingestie Gateway (Foundation/Chronicle)
              </p>
            </div>
          </div>
          {/* Stats pills */}
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-ink-900 border border-ink-800 text-ink-300">
              <Database className="w-3.5 h-3.5 text-gold-400" />
              <span>{stats?.total_events ?? '—'} events totaal</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-950/70 text-sage-300 border border-sage-700/60">
              <span className="w-2 h-2 rounded-full status-orb-running" />
              <span>{stats?.events_last_24h ?? '—'} in 24u</span>
            </div>
            {(stats?.failed_events ?? 0) > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-clay-950/70 text-clay-300 border border-clay-700/60">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{stats?.failed_events} mislukt ({stats?.error_rate}%)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 border border-ink-800 flex flex-wrap items-center gap-2.5 text-xs font-mono">
        <div className="flex items-center gap-1.5 text-ink-400">
          <Radio className="w-3.5 h-3.5 text-gold-400" />
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="bg-ink-950 border border-ink-800 rounded px-2 py-1 text-xs text-gold-300 focus:outline-none focus:border-gold-400/40 cursor-pointer"
            title="Bron (client)"
          >
            <option value="" className="bg-ink-900">Alle bronnen</option>
            {(stats?.sources ?? []).map((s) => (
              <option key={s} value={s} className="bg-ink-900">{s}</option>
            ))}
          </select>
        </div>
        <select
          value={event}
          onChange={(e) => setEvent(e.target.value)}
          className="bg-ink-950 border border-ink-800 rounded px-2 py-1 text-xs text-ink-300 focus:outline-none focus:border-gold-400/40 cursor-pointer"
          title="Eventtype"
        >
          <option value="" className="bg-ink-900">Alle events</option>
          {(stats?.events ?? []).map((s) => (
            <option key={s} value={s} className="bg-ink-900">{s}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-ink-950 border border-ink-800 rounded px-2 py-1 text-xs text-ink-300 focus:outline-none focus:border-gold-400/40 cursor-pointer"
          title="Status"
        >
          <option value="" className="bg-ink-900">Alle statussen</option>
          <option value="ok" className="bg-ink-900">ok</option>
          <option value="pending" className="bg-ink-900">pending</option>
          <option value="failed" className="bg-ink-900">failed</option>
          <option value="rejected" className="bg-ink-900">rejected</option>
        </select>
        <div className="flex items-center gap-1 bg-ink-950 border border-ink-800 rounded px-2 py-1 text-xs text-ink-300">
          <Clock className="w-3 h-3 text-gold-400" />
          <select
            value={sinceHours}
            onChange={(e) => setSinceHours(Number(e.target.value))}
            className="bg-transparent text-gold-300 focus:outline-none cursor-pointer"
            title="Periode"
          >
            <option value={1} className="bg-ink-900">1 uur</option>
            <option value={6} className="bg-ink-900">6 uur</option>
            <option value={24} className="bg-ink-900">24 uur</option>
            <option value={72} className="bg-ink-900">3 dagen</option>
            <option value={168} className="bg-ink-900">7 dagen</option>
            <option value={0} className="bg-ink-900">Alles</option>
          </select>
        </div>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="bg-ink-950 border border-ink-800 rounded px-2 py-1 text-xs text-ink-300 focus:outline-none focus:border-gold-400/40 cursor-pointer"
          title="Aantal events"
        >
          <option value={100} className="bg-ink-900">100 events</option>
          <option value={200} className="bg-ink-900">200 events</option>
          <option value={500} className="bg-ink-900">500 events</option>
          <option value={1000} className="bg-ink-900">1000 events</option>
        </select>
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Zoek in events..."
          className="bg-ink-950 border border-ink-800 rounded px-2.5 py-1 text-xs text-ink-200 placeholder-ink-600 focus:outline-none focus:border-gold-400/40 w-36 sm:w-52 flex-1"
        />
        <button
          onClick={fetchEvents}
          disabled={loading}
          className="btn-ghost py-1 px-2 text-xs hover:text-gold-300 ml-auto"
          title="Herladen"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-gold-400' : ''}`} />
        </button>
        <button
          onClick={handleCopy}
          className="btn-ghost py-1 px-2 text-xs hover:text-gold-300"
          title="Kopieer events (JSON)"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-sage-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Event list */}
      <div className="glass-panel border border-ink-800 overflow-hidden">
        <div className="px-4 py-2.5 bg-ink-900/90 border-b border-ink-800 flex items-center justify-between text-[11px] font-mono text-ink-400">
          <span className="flex items-center gap-2">
            <Inbox className="w-3.5 h-3.5 text-gold-400" />
            Ingestie-events
          </span>
          <span>{events.length} events getoond (nieuwste eerst)</span>
        </div>
        <div className="max-h-[55vh] overflow-y-auto divide-y divide-ink-800/60">
          {loading && events.length === 0 ? (
            <div className="p-8 flex items-center justify-center text-ink-500 animate-pulse text-xs font-mono">
              Ingestie-events ophalen...
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-ink-500 italic text-xs font-mono">
              Geen ingestie-events gevonden die voldoen aan de filters.
            </div>
          ) : (
            events.map((e) => {
              const isOpen = expanded.has(e.id);
              const hasPayload = e.payload && Object.keys(e.payload).length > 0;
              return (
                <div key={e.id} className="px-4 py-3 hover:bg-ink-900/40 transition-colors">
                  <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={() => toggleExpand(e.id)}>
                    <div className="flex items-start gap-3 min-w-0">
                      {hasPayload ? (
                        isOpen ? <ChevronDown className="w-4 h-4 text-ink-500 mt-0.5 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-ink-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <span className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono uppercase tracking-wide ${STATUS_STYLES[e.status] || 'bg-ink-900 border-ink-700/60 text-ink-300'}`}>
                            {e.status}
                          </span>
                          <span className="text-xs font-mono text-ink-100">{e.event}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-ink-800/60 border border-ink-700/40 text-sage-300/90">
                            {e.source}
                          </span>
                          {e.client && (
                            <span className="text-[10px] font-mono text-ink-500">{e.client}</span>
                          )}
                          {e.level && e.level !== 'info' && (
                            <span className={`text-[10px] font-mono uppercase ${LEVEL_STYLES[e.level] || 'text-ink-400'}`}>
                              {e.level}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-1 truncate ${e.summary ? 'text-ink-400' : 'text-ink-600 italic'}`}>
                          {e.summary || 'Geen samenvatting'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-ink-500 whitespace-nowrap flex-shrink-0">
                      {formatTime(e.timestamp)}
                    </span>
                  </div>
                  {isOpen && hasPayload && (
                    <pre className="mt-2.5 ml-7 p-3 bg-ink-950 border border-ink-800 rounded-lg text-[11px] font-mono text-ink-300 whitespace-pre-wrap break-all overflow-x-auto">
                      {JSON.stringify(e.payload, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
