import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Gauge, RefreshCw, AlertTriangle, Clock, Database } from 'lucide-react';
import { api } from '../services/api';
import { RecallLatency } from '../types';

// Hindsight meet elke recall in een Prometheus-histogram; deze view toont de
// verdeling (de *staart*, niet alleen het gemiddelde) uit dat histogram.
// Read-only; de reeks is cumulatief sinds de laatste Hindsight-start.

export const RecallLatencyPage: React.FC = () => {
  const [data, setData] = useState<RecallLatency | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback((force: boolean = false) => {
    setLoading(true);
    setError(null);
    api.getRecallLatency(force)
      .then((d) => setData(d))
      .catch((err: Error) => {
        setError(err.message || 'Kon de recall-latency niet ophalen.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(false), 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const ms = (v?: number | null) => (v == null ? '—' : `${v} ms`);
  const buckets = data?.buckets ?? [];
  const maxCount = buckets.reduce((m, b) => Math.max(m, b.count), 0) || 1;

  const tailClass = (pct?: number) => ((pct ?? 0) > 0 ? 'clay' : 'sage');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 border border-ink-800 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-sage-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-ink-900 border border-sage-400/30 flex items-center justify-center shadow-md">
              <Gauge className="w-6 h-6 text-sage-400" />
            </div>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-light text-ink-50">
                Recall-<span className="italic text-sage-400 font-normal">latency</span>
              </h2>
              <p className="text-xs text-ink-400 mt-0.5 font-sans leading-relaxed">
                De verdeling van Hindsight's recall-tijd uit zijn Prometheus-histogram
                {' '}<span className="text-ink-300">(<code className="font-mono">/metrics</code>, endpoint <code className="font-mono">memories/recall</code>)</span> &mdash; de staart, niet alleen het gemiddelde
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-ink-900 border border-ink-800 text-ink-300">
              <Database className="w-3.5 h-3.5 text-sage-400" />
              <span>{data?.count ?? '—'} recalls</span>
            </div>
            <button
              onClick={() => fetchData(true)}
              disabled={loading}
              className="btn-ghost py-1.5 px-2.5 text-xs hover:text-sage-300"
              title="Herladen"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sage-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="glass-panel p-4 border border-clay-700/60 bg-clay-950/40 text-clay-200 text-xs font-mono flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Recall-latency kon niet worden gelezen</p>
            <p className="text-clay-300/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {data && !data.available ? (
        <div className="glass-panel p-8 border border-ink-800 text-center text-ink-500 italic text-xs font-mono">
          {data.note || 'Nog geen recall-metingen sinds de laatste Hindsight-start.'}
        </div>
      ) : (
        <>
          {/* Percentiles + gemiddelde */}
          <div className="glass-panel p-5 border border-ink-800">
            <div className="flex items-center gap-2 mb-3 text-xs font-mono text-ink-400">
              <Activity className="w-3.5 h-3.5 text-sage-400" />
              <span>Percentielen (bovengrens van de bucket)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <Stat label="gemiddelde" value={ms(data?.mean_ms)} accent="text-ink-200" />
              <Stat label="p50" value={ms(data?.percentiles_ms?.p50)} accent="text-sage-300" />
              <Stat label="p90" value={ms(data?.percentiles_ms?.p90)} accent="text-sage-300" />
              <Stat label="p95" value={ms(data?.percentiles_ms?.p95)} accent="text-gold-300" />
              <Stat label="p99" value={ms(data?.percentiles_ms?.p99)} accent="text-clay-300" />
              <Stat label="recalls" value={String(data?.count ?? '—')} accent="text-ink-200" />
              <Stat
                label="mislukt"
                value={`${data?.failed?.count ?? 0} (${data?.failed?.percent ?? 0}%)`}
                accent={(data?.failed?.count ?? 0) > 0 ? 'text-clay-300' : 'text-sage-300'}
              />
            </div>
          </div>

          {/* Drempels — de staart */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(data?.thresholds ?? {}).map(([label, t]) => {
              const cls = tailClass(t.percent);
              return (
                <div key={label} className={`glass-panel p-4 border flex items-center justify-between ${
                  cls === 'clay' ? 'border-clay-700/50 bg-clay-950/20' : 'border-sage-700/40 bg-sage-950/20'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <Clock className={`w-4 h-4 ${cls === 'clay' ? 'text-clay-300' : 'text-sage-400'}`} />
                    <span className="text-xs font-mono text-ink-300">boven {label}</span>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono text-lg ${cls === 'clay' ? 'text-clay-300' : 'text-sage-300'}`}>{t.count}</div>
                    <div className="text-[10px] font-mono text-ink-500">{t.percent}%</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bucket-verdeling */}
          <div className="glass-panel border border-ink-800 overflow-hidden">
            <div className="px-4 py-2.5 bg-ink-900/90 border-b border-ink-800 flex items-center justify-between text-[11px] font-mono text-ink-400">
              <span className="flex items-center gap-2">
                <Gauge className="w-3.5 h-3.5 text-sage-400" />
                Verdeling per latency-bucket
              </span>
              <span>{buckets.length} buckets</span>
            </div>
            <div className="p-4 space-y-2">
              {buckets.map((b) => {
                const isTail = b.le_seconds == null || b.le_seconds > 4;
                const width = Math.max(2, Math.round((b.count / maxCount) * 100));
                return (
                  <div key={b.le_label} className="flex items-center gap-3 text-xs font-mono">
                    <div className="w-20 text-right text-ink-400 whitespace-nowrap">
                      {b.le_seconds == null ? '> ' + (buckets[buckets.length - 2]?.le_label ?? '?') + 's' : `≤ ${b.le_label}s`}
                    </div>
                    <div className="flex-1 h-4 rounded bg-ink-900/70 overflow-hidden">
                      <div
                        className={`h-full rounded ${isTail ? 'bg-gradient-to-r from-clay-700 to-clay-400' : 'bg-gradient-to-r from-gold-600 to-sage-400'}`}
                        style={{ width: `${width}%` }}
                        title={`${b.count} recalls`}
                      />
                    </div>
                    <div className="w-14 text-right text-ink-300">{b.count}</div>
                    <div className="w-16 text-right text-ink-500">{b.cumulative} cum.</div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] font-mono text-ink-500">
            Cumulatief sinds de laatste Hindsight-start &mdash; een herstart zet de reeks op nul.
            {data?.scraped_at ? ` Laatst gelezen: ${data.scraped_at}.` : ''}
            {' '}Buckets zijn Hindsight's eigen grenzen; percentielen zijn de bovengrens van de bucket.
            {' '}De latency-statistiek gaat over de geslaagde recalls (2xx), dus óók een trage die pas
            na 5 s slaagt telt mee; mislukte pogingen komen uit dezelfde reeks. Hindsight's
            {' '}<code className="font-mono">hindsight.call_failed</code>-logregel in gaia-api toont alleen
            wélke call faalde en waarom &mdash; niet de verdeling.
          </p>
        </>
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; accent: string }> = ({ label, value, accent }) => (
  <div className="rounded-xl bg-ink-900/60 border border-ink-800 px-3 py-2.5">
    <div className="text-[10px] font-mono text-ink-500 uppercase tracking-wide">{label}</div>
    <div className={`font-mono text-base mt-0.5 ${accent}`}>{value}</div>
  </div>
);
