import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  RefreshCw,
  Search,
  Database,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Copy,
  Check,
  Layers,
  Radio,
  Link2,
} from 'lucide-react';
import { api } from '../services/api';
import { KairosEpisode, KairosStats } from '../types';

// Kairos synthetiseert narratieve episodes uit de rauwe Foundation-observaties;
// Cognition bezit ze. Deze view volgt ze read-only — elke episode is een
// interpretatie met `sources` terug naar de observaties.

const EPISTEMIC_BADGE = 'bg-sage-950/60 border-sage-700/50 text-sage-300';

export const KairosPage: React.FC = () => {
  const [items, setItems] = useState<KairosEpisode[]>([]);
  const [stats, setStats] = useState<KairosStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [primaryApp, setPrimaryApp] = useState<string>('');
  const [since, setSince] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    const params: Record<string, string | number> = {};
    if (filterQuery) params.q = filterQuery;
    if (primaryApp) params.primary_app = primaryApp;
    if (since) params.since = since;

    api.getKairosEpisodes(params)
      .then((data) => setItems(data))
      .catch((err: Error) => {
        setItems([]);
        setError(err.message || 'Kon de Kairos-episodes niet ophalen.');
      })
      .finally(() => setLoading(false));

    api.getKairosStats()
      .then((data) => setStats(data))
      .catch(() => setStats(null));
  }, [filterQuery, primaryApp, since]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(items, null, 2));
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

  const formatTime = (ts?: string | null) => {
    if (!ts) return '—';
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
              <Clock className="w-6 h-6 text-sage-400" />
            </div>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-light text-ink-50">
                Kairos <span className="italic text-sage-400 font-normal">Episodes</span>
              </h2>
              <p className="text-xs text-ink-400 mt-0.5 font-sans leading-relaxed">
                Read-only volgen van de narratieve episodes die de Kairos-worker uit de rauwe Foundation-observaties synthetiseerde &mdash; elke episode een <span className="text-sage-300">interpretatie</span> met <code className="font-mono">sources</code> terug naar de observaties
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-ink-900 border border-ink-800 text-ink-300">
              <Database className="w-3.5 h-3.5 text-sage-400" />
              <span>{stats?.total ?? '—'} episodes</span>
            </div>
            {stats && stats.total > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-950/60 text-sage-300 border border-sage-700/50">
                <Link2 className="w-3.5 h-3.5" />
                <span>{stats.with_sources} met bron</span>
              </div>
            )}
          </div>
        </div>

        {stats && stats.total > 0 && (
          <div className="relative z-10 mt-4 pt-4 border-t border-ink-800/70 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-ink-500">
            <span className="text-ink-400">Venster (start_time):</span>
            <span className="text-ink-300">{formatTime(stats.earliest)}</span>
            <span>&rarr;</span>
            <span className="text-ink-300">{formatTime(stats.latest)}</span>
            <span className="text-ink-600 mx-1">&bull;</span>
            {Object.entries(stats.by_primary_app).map(([app, n]) => (
              <span key={app} className="px-1.5 py-0.5 rounded bg-ink-800/60 border border-ink-700/40 text-sage-300/90">
                {app}: {n}
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="glass-panel p-4 border border-clay-700/60 bg-clay-950/40 text-clay-200 text-xs font-mono flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Kairos-episodes konden niet worden opgehaald</p>
            <p className="text-clay-300/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-panel p-4 border border-ink-800 flex flex-wrap items-center gap-2.5 text-xs font-mono">
        <select
          value={primaryApp}
          onChange={(e) => setPrimaryApp(e.target.value)}
          className="bg-ink-950 border border-ink-800 rounded px-2 py-1 text-xs text-sage-300 focus:outline-none focus:border-sage-400/40 cursor-pointer"
          title="Primaire app"
        >
          <option value="" className="bg-ink-900">Alle apps</option>
          {(stats?.apps ?? []).map((a) => (
            <option key={a} value={a} className="bg-ink-900">
              {a}{stats?.by_primary_app?.[a] != null ? ` (${stats.by_primary_app[a]})` : ''}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1 bg-ink-950 border border-ink-800 rounded px-2 py-1 text-xs text-ink-300">
          <Clock className="w-3 h-3 text-sage-400" />
          <input
            type="datetime-local"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            className="bg-transparent text-xs text-ink-300 focus:outline-none"
            title="Vanaf start_time"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-ink-950 border border-ink-800 rounded px-2 py-1 flex-1 min-w-[10rem]">
          <Search className="w-3 h-3 text-sage-400 flex-shrink-0" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Zoek in samenvatting, apps of bronnen..."
            className="bg-transparent text-xs text-ink-200 placeholder-ink-600 focus:outline-none w-full"
          />
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="btn-ghost py-1 px-2 text-xs hover:text-sage-300 ml-auto"
          title="Herladen"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sage-400' : ''}`} />
        </button>
        <button
          onClick={handleCopy}
          className="btn-ghost py-1 px-2 text-xs hover:text-sage-300"
          title="Kopieer episodes (JSON)"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-sage-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Episode list */}
      <div className="glass-panel border border-ink-800 overflow-hidden">
        <div className="px-4 py-2.5 bg-ink-900/90 border-b border-ink-800 flex items-center justify-between text-[11px] font-mono text-ink-400">
          <span className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-sage-400" />
            Episodes
          </span>
          <span>{items.length} getoond (nieuwste eerst)</span>
        </div>
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-ink-800/60">
          {loading && items.length === 0 ? (
            <div className="p-8 flex items-center justify-center text-ink-500 animate-pulse text-xs font-mono">
              Episodes ophalen...
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-ink-500 italic text-xs font-mono">
              <p>Geen episodes gevonden{filterQuery || primaryApp || since ? ' die voldoen aan de filters' : ''}.</p>
              {!filterQuery && !primaryApp && !since && (
                <p className="mt-2 text-ink-600">
                  De Kairos-worker staat standaard uit (<code className="font-mono">GAIA_KAIROS_ENABLED=true</code> op de VPS om episodes te laten ontstaan).
                </p>
              )}
            </div>
          ) : (
            items.map((e) => {
              const isOpen = expanded.has(e.id);
              return (
                <div key={e.id} className="px-4 py-3 hover:bg-ink-900/40 transition-colors">
                  <div
                    className="flex items-start justify-between gap-3 cursor-pointer"
                    onClick={() => toggleExpand(e.id)}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-ink-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-ink-500 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border font-mono uppercase tracking-wide ${EPISTEMIC_BADGE}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-sage-400" />
                            {e.epistemic_status || 'interpretation'}
                          </span>
                          {e.primary_app && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-ink-800/60 border border-ink-700/40 text-gold-300/90">
                              {e.primary_app}
                            </span>
                          )}
                          {(e.involved_apps?.length ?? 0) > 1 && (
                            <span className="text-[10px] font-mono text-ink-500" title={e.involved_apps.join(', ')}>
                              +{e.involved_apps.length - 1} apps
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-1.5 text-ink-200 leading-relaxed">
                          {e.summary}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono text-ink-500">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(e.start_time)} &rarr; {formatTime(e.end_time)}</span>
                        </div>
                      </div>
                    </div>
                    {e.sources?.length > 0 && (
                      <span className="text-[10px] font-mono text-ink-500 whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                        <Layers className="w-3 h-3" /> {e.sources.length}
                      </span>
                    )}
                  </div>

                  {isOpen && (
                    <div className="mt-3 ml-7 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[11px] font-mono">
                      <Detail label="Id" value={e.id} />
                      <Detail label="Bank" value={e.bank_id} />
                      <Detail label="Eerste observatie" value={formatTime(e.start_time)} />
                      <Detail label="Laatste observatie" value={formatTime(e.end_time)} />
                      <Detail label="Aangemaakt" value={formatTime(e.created_at)} />
                      <Detail label="Bijgewerkt" value={formatTime(e.updated_at)} />
                      {e.involved_apps?.length > 0 && (
                        <div className="sm:col-span-2">
                          <div className="text-ink-500 mb-1">Betrokken apps</div>
                          <div className="flex flex-wrap gap-1.5">
                            {e.involved_apps.map((a) => (
                              <span key={a} className="px-1.5 py-0.5 rounded bg-ink-900 border border-ink-700/50 text-gold-300/90">
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {e.sources?.length > 0 && (
                        <div className="sm:col-span-2">
                          <div className="text-ink-500 mb-1 flex items-center gap-1.5">
                            <Link2 className="w-3 h-3" /> Herkomst (sources)
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {e.sources.map((s) => (
                              <span key={s} className="px-1.5 py-0.5 rounded bg-ink-900 border border-ink-700/50 text-sage-300/90">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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

const Detail: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div>
    <div className="text-ink-500">{label}</div>
    <div className="text-ink-300 break-all">{value ?? '—'}</div>
  </div>
);
