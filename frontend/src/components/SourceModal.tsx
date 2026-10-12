import React, { useState, useEffect } from 'react';
import { X, Link2, FileText, ExternalLink, Copy, Check, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { IngestObject } from '../types';

interface SourceModalProps {
  sourceRef: string | null;
  onClose: () => void;
}

// De rauwe Foundation-observatie achter een Kairos-episode: `foundation:<uuid>`
// → GET /api/ingest-logs/<uuid>. Read-only; laat zien waar de synthese op rust.
export const SourceModal: React.FC<SourceModalProps> = ({ sourceRef, onClose }) => {
  const [obj, setObj] = useState<IngestObject | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchObject = () => {
    if (!sourceRef) return;
    setLoading(true);
    setError(null);
    api.getIngestObject(sourceRef)
      .then((data) => setObj(data))
      .catch((err: Error) => {
        setObj(null);
        setError(err.message || 'Kon de bron niet ophalen.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setObj(null);
    fetchObject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceRef]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!sourceRef) return null;

  const handleCopy = () => {
    if (obj) {
      navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTime = (ts?: string) => {
    if (!ts) return '—';
    try { return new Date(ts).toLocaleString('nl-NL'); } catch { return ts; }
  };

  const turns = Array.isArray(obj?.turns) ? obj!.turns : [];
  const content = typeof obj?.content === 'string' ? obj!.content : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div
        className="w-full max-w-4xl h-[85vh] bg-ink-950 border border-ink-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-ink-800 flex items-center justify-between gap-4 bg-ink-900/90">
          <div className="flex items-center gap-2 text-xs font-mono min-w-0">
            <Link2 className="w-4 h-4 text-sage-400 flex-shrink-0" />
            <span className="text-ink-400">Bron &bull;</span>
            <strong className="text-ink-100 truncate">{sourceRef}</strong>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={fetchObject} disabled={loading} className="btn-ghost py-1 px-2 text-xs hover:text-sage-300" title="Herladen">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sage-400' : ''}`} />
            </button>
            <button onClick={handleCopy} disabled={!obj} className="btn-ghost py-1 px-2 text-xs hover:text-sage-300 disabled:opacity-40" title="Kopieer JSON">
              {copied ? <Check className="w-3.5 h-3.5 text-sage-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button onClick={onClose} className="btn-ghost py-1 px-2 text-xs hover:text-ink-100" title="Sluiten">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Meta */}
        {obj && (
          <div className="px-4 py-3 border-b border-ink-800/70 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-[11px] font-mono bg-ink-900/40">
            <Meta label="object_type" value={obj.object_type} />
            <Meta label="source" value={obj.source} />
            <Meta label="provider" value={obj.source_provider} />
            <Meta label="occurred_at" value={formatTime(obj.occurred_at)} />
            <Meta label="ingested_at" value={formatTime(obj.ingested_at)} />
            <Meta label="content_length" value={obj.content_length != null ? String(obj.content_length) : undefined} />
            {obj.title && (
              <div className="col-span-2 sm:col-span-4">
                <div className="text-ink-500">title</div>
                <div className="text-ink-200">{obj.title}</div>
              </div>
            )}
            {obj.url && (
              <div className="col-span-2 sm:col-span-4">
                <div className="text-ink-500">url</div>
                <a href={obj.url} target="_blank" rel="noopener noreferrer" className="text-gold-300 hover:text-gold-200 inline-flex items-center gap-1 break-all">
                  {obj.url} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
            )}
            {Array.isArray(obj.tags) && obj.tags.length > 0 && (
              <div className="col-span-2 sm:col-span-4">
                <div className="text-ink-500">tags</div>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {obj.tags.map((t) => (
                    <span key={t} className="px-1.5 py-0.5 rounded bg-ink-900 border border-ink-700/50 text-sage-300/90">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-ink-950">
          {loading && !obj ? (
            <div className="h-full flex items-center justify-center text-ink-500 animate-pulse text-xs font-mono">Bron ophalen...</div>
          ) : error ? (
            <div className="text-clay-300 text-xs font-mono">{error}</div>
          ) : turns.length > 0 ? (
            <div className="space-y-3">
              {turns.map((t, i) => {
                const isUser = (t.role || '').toLowerCase() === 'user';
                return (
                  <div key={i} className={`text-xs leading-relaxed rounded-xl px-3 py-2 border whitespace-pre-wrap ${
                    isUser
                      ? 'bg-gold-950/20 border-gold-700/30 text-gold-100/90'
                      : 'bg-ink-900/60 border-ink-800 text-ink-200'
                  }`}>
                    <div className="text-[10px] font-mono uppercase tracking-wide mb-1 opacity-70">{isUser ? 'User' : (t.role || 'assistant')}</div>
                    {t.text}
                  </div>
                );
              })}
            </div>
          ) : content ? (
            <pre className="text-xs font-mono text-ink-200 whitespace-pre-wrap leading-relaxed">{content}</pre>
          ) : obj ? (
            <div className="text-ink-500 italic text-xs font-mono flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" /> Geen tekstinhoud; bekijk de ruwe velden hierboven.
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-ink-900/90 border-t border-ink-800 text-[11px] font-mono text-ink-500">
          Rauwe Foundation-observatie (read-only) — de bron achter deze Kairos-episode.
        </div>
      </div>
    </div>
  );
};

const Meta: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div>
    <div className="text-ink-500">{label}</div>
    <div className="text-ink-300 break-words">{value || '—'}</div>
  </div>
);
