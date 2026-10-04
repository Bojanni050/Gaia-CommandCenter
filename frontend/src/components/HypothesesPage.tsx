import React, { useState, useEffect, useCallback } from 'react';
import {
  Lightbulb,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Database,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Copy,
  Check,
  GitBranch,
  Layers,
} from 'lucide-react';
import { api } from '../services/api';
import { Hypothesis, HypothesisStats } from '../types';

// Cognition is de lifecycle-eigenaar; deze view volgt alleen (read-only).
const STATUS_META: Record<string, { label: string; badge: string; dot: string }> = {
  proposed: { label: 'proposed', badge: 'bg-gold-950/60 border-gold-700/50 text-gold-300', dot: 'bg-gold-400' },
  testing: { label: 'testing', badge: 'bg-ink-800/70 border-ink-600/50 text-ink-200', dot: 'bg-ink-300' },
  corroborated: { label: 'corroborated', badge: 'bg-sage-950/60 border-sage-700/50 text-sage-300', dot: 'bg-sage-400' },
  confirmed: { label: 'confirmed', badge: 'bg-sage-900/70 border-sage-500/60 text-sage-200', dot: 'bg-sage-300' },
  rejected: { label: 'rejected', badge: 'bg-clay-950/60 border-clay-700/50 text-clay-300', dot: 'bg-clay-400' },
};

const KIND_LABELS: Record<string, string> = {
  hypothesis: 'hypothese',
  mental_model: 'mental model',
  relationship: 'relatie',
  open_question: 'open vraag',
};

const STATUS_ORDER = ['proposed', 'testing', 'corroborated', 'confirmed', 'rejected'];
const KIND_ORDER = ['hypothesis', 'mental_model', 'relationship', 'open_question'];

export const HypothesesPage: React.FC = () => {
  const [items, setItems] = useState<Hypothesis[]>([]);
  const [stats, setStats] = useState<HypothesisStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [kind, setKind] = useState<string>('');
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [limit, setLimit] = useState<number>(200);
  const [copied, setCopied] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    const params: Record<string, string | number> = { limit };
    if (status) params.status = status;
    if (kind) params.kind = kind;
    if (filterQuery) params.q = filterQuery;

    api.getHypotheses(params)
      .then((data) => setItems(data))
      .catch((err: Error) => {
        setItems([]);
        setError(err.message || 'Kon de hypothesen niet ophalen.');
      })
      .finally(() => setLoading(false));

    api.getHypothesisStats()
      .then((data) => setStats(data))
      .catch(() => setStats(null));
  }, [status, kind, filterQuery, limit]);

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

  const statusOptions = Array.from(new Set([...STATUS_ORDER, ...(stats?.statuses ?? [])]));
  const kindOptions = Array.from(new Set([...KIND_ORDER, ...(stats?.kinds ?? [])]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 border border-ink-800 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-gold-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-ink-900 border border-gold-400/30 flex items-center justify-center shadow-md">
              <Lightbulb className="w-6 h-6 text-gold-400" />
            </div>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-light text-ink-50">
                Hypothesen <span className="italic text-gold-400 font-normal">Viewer</span>
              </h2>
              <p className="text-xs text-ink-400 mt-0.5 font-sans leading-relaxed">
                Read-only volgen van de afgeleide kennis in <span className="text-ink-300">services/cognition</span> &mdash; wat Logos vormde en beoordeelde, met de lifecycle-status die Cognition administreert
              </p>
            </div>
          </div>
          {/* Stats pills */}
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-ink-900 border border-ink-800 text-ink-300">
              <Database className="w-3.5 h-3.5 text-gold-400" />
              <span>{stats?.total ?? '—'} statements</span>
            </div>
            {(stats?.testing ?? 0) > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-ink-800/70 text-ink-200 border border-ink-600/50">
                <span className="w-2 h-2 rounded-full bg-ink-300" />
                <span>{stats?.testing} in testing</span>
              </div>
            )}
            {(stats?.corroborated ?? 0) > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-950/60 text-sage-300 border border-sage-700/50">
                <FlaskConical className="w-3.5 h-3.5" />
                <span>{stats?.corroborated} corroborated</span>
              </div>
            )}
            {(stats?.confirmed ?? 0) > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-900/70 text-sage-200 border border-sage-500/60" title="Alleen menselijke bevestiging (Absolute Override)">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{stats?.confirmed} bevestigd</span>
              </div>
            )}
            {(stats?.rejected ?? 0) > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-clay-950/70 text-clay-300 border border-clay-700/60">
                <XCircle className="w-3.5 h-3.5" />
                <span>{stats?.rejected} verworpen</span>
              </div>
            )}
            {stats?.avg_confidence != null && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-ink-900 border border-ink-800 text-ink-300">
                <Layers className="w-3.5 h-3.5 text-gold-400" />
                <span>gem. {Math.round(stats.avg_confidence * 100)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Lifecycle legend */}
        <div className="relative z-10 mt-4 pt-4 border-t border-ink-800/70 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono text-ink-500">
          <span className="text-ink-400">Lifecycle:</span>
          <span className="text-gold-300">proposed</span>
          <span>&rarr;</span>
          <span className="text-ink-200">testing</span>
          <span>&rarr;</span>
          <span className="text-sage-300">corroborated</span>
          <span>&rarr;</span>
          <span className="text-sage-200">confirmed</span>
          <span className="text-ink-600">(mens-only)</span>
          <span className="text-ink-600 mx-1">&bull;</span>
          <span className="text-clay-300">rejected</span>
          <span className="text-ink-600">(mens / consolidatie)</span>
        </div>
      </div>

      {error && (
        <div className="glass-panel p-4 border border-clay-700/60 bg-clay-950/40 text-clay-200 text-xs font-mono flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Hypothesen konden niet worden opgehaald</p>
            <p className="text-clay-300/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-panel p-4 border border-ink-800 flex flex-wrap items-center gap-2.5 text-xs font-mono">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-ink-950 border border-ink-800 rounded px-2 py-1 text-xs text-gold-300 focus:outline-none focus:border-gold-400/40 cursor-pointer"
          title="Status"
        >
          <option value="" className="bg-ink-900">Alle statussen</option>
          {statusOptions.map((s) => (
            <option key={s} value={s} className="bg-ink-900">
              {s}{stats?.by_status?.[s] != null ? ` (${stats.by_status[s]})` : ''}
            </option>
          ))}
        </select>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="bg-ink-950 border border-ink-800 rounded px-2 py-1 text-xs text-ink-300 focus:outline-none focus:border-gold-400/40 cursor-pointer"
          title="Soort afgeleid statement"
        >
          <option value="" className="bg-ink-900">Alle soorten</option>
          {kindOptions.map((k) => (
            <option key={k} value={k} className="bg-ink-900">
              {KIND_LABELS[k] || k}{stats?.by_kind?.[k] != null ? ` (${stats.by_kind[k]})` : ''}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1 bg-ink-950 border border-ink-800 rounded px-2 py-1 text-xs text-ink-300">
          <Clock className="w-3 h-3 text-gold-400" />
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-transparent text-gold-300 focus:outline-none cursor-pointer"
            title="Aantal statements"
          >
            <option value={100} className="bg-ink-900">100</option>
            <option value={200} className="bg-ink-900">200</option>
            <option value={500} className="bg-ink-900">500</option>
            <option value={1000} className="bg-ink-900">1000</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5 bg-ink-950 border border-ink-800 rounded px-2 py-1 flex-1 min-w-[10rem]">
          <Search className="w-3 h-3 text-gold-400 flex-shrink-0" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Zoek in statements..."
            className="bg-transparent text-xs text-ink-200 placeholder-ink-600 focus:outline-none w-full"
          />
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="btn-ghost py-1 px-2 text-xs hover:text-gold-300 ml-auto"
          title="Herladen"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-gold-400' : ''}`} />
        </button>
        <button
          onClick={handleCopy}
          className="btn-ghost py-1 px-2 text-xs hover:text-gold-300"
          title="Kopieer statements (JSON)"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-sage-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Statement list */}
      <div className="glass-panel border border-ink-800 overflow-hidden">
        <div className="px-4 py-2.5 bg-ink-900/90 border-b border-ink-800 flex items-center justify-between text-[11px] font-mono text-ink-400">
          <span className="flex items-center gap-2">
            <FlaskConical className="w-3.5 h-3.5 text-gold-400" />
            Afgeleide statements
          </span>
          <span>{items.length} getoond (nieuwste eerst)</span>
        </div>
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-ink-800/60">
          {loading && items.length === 0 ? (
            <div className="p-8 flex items-center justify-center text-ink-500 animate-pulse text-xs font-mono">
              Hypothesen ophalen...
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-ink-500 italic text-xs font-mono">
              {error ? 'Hypothesen niet beschikbaar.' : 'Geen hypotheses gevonden die voldoen aan de filters.'}
            </div>
          ) : (
            items.map((h) => {
              const meta = STATUS_META[h.status] || {
                label: h.status,
                badge: 'bg-ink-900 border-ink-700/60 text-ink-300',
                dot: 'bg-ink-400',
              };
              const isOpen = expanded.has(h.id);
              const confidencePct = Math.round((Number(h.confidence) || 0) * 100);
              return (
                <div key={h.id} className="px-4 py-3 hover:bg-ink-900/40 transition-colors">
                  <div
                    className="flex items-start justify-between gap-3 cursor-pointer"
                    onClick={() => toggleExpand(h.id)}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-ink-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-ink-500 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border font-mono uppercase tracking-wide ${meta.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-ink-800/60 border border-ink-700/40 text-sage-300/90">
                            {KIND_LABELS[h.kind] || h.kind}
                          </span>
                          <span className="text-[10px] font-mono text-ink-500">{h.method}</span>
                          {h.persistence === 'durable' && (
                            <span className="text-[10px] font-mono text-gold-300/80" title="Duurzaam (blijft na herstart)">durable</span>
                          )}
                          {h.verwerp_bron && (
                            <span className="text-[10px] font-mono text-clay-300/90">
                              verworpen: {h.verwerp_bron}
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-1.5 text-ink-200 leading-relaxed">
                          {h.statement}
                        </p>
                        {/* Confidence bar */}
                        <div className="mt-2 flex items-center gap-2 max-w-xs">
                          <div className="h-1.5 flex-1 rounded-full bg-ink-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-gold-600 to-sage-400"
                              style={{ width: `${confidencePct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-ink-400 whitespace-nowrap">
                            {confidencePct}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-ink-500 whitespace-nowrap flex-shrink-0">
                      {formatTime(h.updated_at)}
                    </span>
                  </div>

                  {isOpen && (
                    <div className="mt-3 ml-7 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[11px] font-mono">
                      <Detail label="Id" value={h.id} />
                      <Detail label="Bank" value={h.bank_id} />
                      <Detail label="Aangemaakt" value={formatTime(h.created_at)} />
                      <Detail label="Bijgewerkt" value={formatTime(h.updated_at)} />
                      <Detail label="Getest" value={formatTime(h.tested_at)} />
                      <Detail label="Bevestigd" value={formatTime(h.confirmed_at)} />
                      <Detail label="Verworpen" value={formatTime(h.rejected_at)} />
                      <Detail label="Confidence" value={String(h.confidence)} />
                      {h.sources?.length > 0 && (
                        <div className="sm:col-span-2">
                          <div className="text-ink-500 mb-1">Herkomst (sources)</div>
                          <div className="flex flex-wrap gap-1.5">
                            {h.sources.map((s) => (
                              <span key={s} className="px-1.5 py-0.5 rounded bg-ink-900 border border-ink-700/50 text-sage-300/90">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {h.verification_plan && (
                        <div className="sm:col-span-2">
                          <div className="text-ink-500 mb-1">Verificatieplan</div>
                          <p className="text-ink-300 whitespace-pre-wrap break-words">{h.verification_plan}</p>
                        </div>
                      )}
                      {(h.evidence_for?.length > 0 || h.evidence_against?.length > 0) && (
                        <div className="sm:col-span-2">
                          <div className="text-ink-500 mb-1">Bewijs</div>
                          <div className="text-sage-300/90">voor: {h.evidence_for?.length ?? 0}</div>
                          <div className="text-clay-300/90">tegen: {h.evidence_against?.length ?? 0}</div>
                        </div>
                      )}
                      {(h.supersedes_id || h.superseded_by_id) && (
                        <div className="sm:col-span-2">
                          <div className="text-ink-500 mb-1 flex items-center gap-1.5">
                            <GitBranch className="w-3 h-3" /> Consolidatie
                          </div>
                          {h.supersedes_id && <div className="text-ink-300">vervangt: {h.supersedes_id}</div>}
                          {h.superseded_by_id && <div className="text-ink-300">vervangen door: {h.superseded_by_id}</div>}
                        </div>
                      )}
                      {h.rejection_reason && (
                        <div className="sm:col-span-2">
                          <div className="text-ink-500 mb-1">Reden van verwerping</div>
                          <p className="text-clay-300/90 whitespace-pre-wrap break-words">{h.rejection_reason}</p>
                        </div>
                      )}
                      {h.confirmed_document_id && (
                        <Detail label="Hindsight document" value={h.confirmed_document_id} />
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
