import React, { useState, useEffect } from 'react';
import {
  SearchCode,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  RefreshCw,
  Terminal,
  Search,
  Box,
  Layers,
  Sparkles,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import { LogAnalysisReport, ContainerInfo } from '../types';
import { api } from '../services/api';

interface LogAnalyzerPageProps {
  containers: ContainerInfo[];
  onOpenLogsModal: (containerName: string) => void;
}

export const LogAnalyzerPage: React.FC<LogAnalyzerPageProps> = ({
  containers,
  onOpenLogsModal,
}) => {
  const [report, setReport] = useState<LogAnalysisReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tail, setTail] = useState<number>(250);
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'critical' | 'warning'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedContainer, setSelectedContainer] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.analyzeLogs(tail);
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Fout bij analyseren van container logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, [tail]);

  const issues = report?.issues || [];

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    const matchSeverity =
      selectedSeverity === 'all' || issue.severity === selectedSeverity;

    const matchCategory =
      selectedCategory === 'all' || issue.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchContainer =
      selectedContainer === 'all' || issue.container === selectedContainer;

    const matchSearch =
      !searchQuery.trim() ||
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.container.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.suggestion.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.snippet.toLowerCase().includes(searchQuery.toLowerCase());

    return matchSeverity && matchCategory && matchContainer && matchSearch;
  });

  const uniqueCategories = Array.from(new Set(issues.map((i) => i.category))).filter(Boolean);
  const uniqueContainers = Array.from(new Set(issues.map((i) => i.container))).filter(Boolean);

  const healthScore = report?.summary.health_score ?? 100;
  const criticalCount = report?.summary.critical_count ?? 0;
  const warningCount = report?.summary.warning_count ?? 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 border border-ink-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
        {/* Ambient lighting */}
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-gold-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-sage-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-ink-900 border border-gold-400/30 flex items-center justify-center shadow-md">
              <SearchCode className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-light text-ink-50">
                Log Analyzer &amp; <span className="italic text-gold-400 font-normal">Diagnostiek</span>
              </h2>
              <p className="text-xs text-ink-400 font-sans leading-relaxed">
                Geautomatiseerde patroonherkenning in containerlogs voor het detecteren van crashes, databasefouten en resource-knelpunten.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto relative z-10">
          <div className="flex items-center gap-1.5 bg-ink-900 border border-ink-800 rounded-lg px-2.5 py-1.5 text-xs text-ink-300 font-mono">
            <span>Diepte:</span>
            <select
              value={tail}
              onChange={(e) => setTail(Number(e.target.value))}
              className="bg-transparent text-gold-300 font-mono focus:outline-none cursor-pointer"
            >
              <option value={100} className="bg-ink-900">100 regels</option>
              <option value={250} className="bg-ink-900">250 regels</option>
              <option value={500} className="bg-ink-900">500 regels</option>
              <option value={1000} className="bg-ink-900">1000 regels</option>
            </select>
          </div>

          <button
            onClick={runAnalysis}
            disabled={loading}
            className="btn-gaia text-xs py-2 px-3.5 font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Analyseren...' : 'Scan Uitvoeren'}</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-clay-950/60 border border-clay-700/50 text-clay-300 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-clay-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={runAnalysis} className="underline text-gold-300 hover:text-ink-100">
            Opnieuw proberen
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Health Score */}
        <div className="glass-card p-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-ink-400">
              Log Gezondheidsscore
            </span>
            <Sparkles className="w-4 h-4 text-gold-400" />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span
              className={`text-2xl font-mono font-bold ${
                healthScore >= 85
                  ? 'text-sage-400'
                  : healthScore >= 60
                  ? 'text-gold-400'
                  : 'text-clay-400'
              }`}
            >
              {healthScore}%
            </span>
            <span className="text-xs text-ink-400 font-sans">
              {healthScore >= 85 ? 'Stabiel' : healthScore >= 60 ? 'Aandacht nodig' : 'Kritiek'}
            </span>
          </div>
          <div className="w-full bg-ink-950/80 h-1.5 rounded-full overflow-hidden border border-ink-800/40">
            <div
              className={`h-full transition-all duration-500 ${
                healthScore >= 85
                  ? 'bg-gradient-to-r from-sage-600 to-sage-400'
                  : healthScore >= 60
                  ? 'bg-gradient-to-r from-gold-600 to-gold-400'
                  : 'bg-gradient-to-r from-clay-600 to-clay-400'
              }`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>

        {/* Critical Issues */}
        <div className="glass-card p-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-ink-400">
              Kritieke Problemen
            </span>
            <AlertOctagon className="w-4 h-4 text-clay-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-clay-300">
              {criticalCount}
            </span>
            <span className="text-xs text-ink-400 font-sans">
              {criticalCount === 0 ? 'Geen crashes' : 'Directe actie vereist'}
            </span>
          </div>
          <p className="text-[11px] font-mono text-ink-500 mt-2">
            Crashes, stacktraces, DB drops
          </p>
        </div>

        {/* Warnings */}
        <div className="glass-card p-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-ink-400">
              Waarschuwingen
            </span>
            <AlertTriangle className="w-4 h-4 text-gold-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-gold-300">
              {warningCount}
            </span>
            <span className="text-xs text-ink-400 font-sans">
              Potentiële knelpunten
            </span>
          </div>
          <p className="text-[11px] font-mono text-ink-500 mt-2">
            Timeouts, 429 rate limits, HTTP 500
          </p>
        </div>

        {/* Scanned Containers */}
        <div className="glass-card p-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-ink-400">
              Geanalyseerde Containers
            </span>
            <Box className="w-4 h-4 text-ink-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-ink-100">
              {report?.summary.scanned_containers_count ?? containers.length}
            </span>
            <span className="text-xs text-ink-400 font-sans">
              Draaiend op VPS
            </span>
          </div>
          <p className="text-[11px] font-mono text-ink-500 mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>
              {report?.summary.timestamp
                ? new Date(report.summary.timestamp).toLocaleTimeString('nl-NL')
                : 'Zojuist'}
            </span>
          </p>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-ink-900/60 p-3 rounded-xl border border-ink-800">
        {/* Severity & Category filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Severity selector */}
          <div className="flex items-center gap-1 bg-ink-950/80 p-1 rounded-lg border border-ink-800">
            <button
              onClick={() => setSelectedSeverity('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
                selectedSeverity === 'all'
                  ? 'bg-ink-800 text-gold-300 border border-gold-400/20'
                  : 'text-ink-400 hover:text-ink-200'
              }`}
            >
              Alle ({issues.length})
            </button>
            <button
              onClick={() => setSelectedSeverity('critical')}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1 ${
                selectedSeverity === 'critical'
                  ? 'bg-clay-950/80 text-clay-300 border border-clay-700/50'
                  : 'text-ink-400 hover:text-clay-300'
              }`}
            >
              <AlertOctagon className="w-3 h-3" />
              <span>Kritiek ({criticalCount})</span>
            </button>
            <button
              onClick={() => setSelectedSeverity('warning')}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1 ${
                selectedSeverity === 'warning'
                  ? 'bg-gold-950/80 text-gold-300 border border-gold-700/50'
                  : 'text-ink-400 hover:text-gold-300'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Waarschuwing ({warningCount})</span>
            </button>
          </div>

          {/* Container filter */}
          <select
            value={selectedContainer}
            onChange={(e) => setSelectedContainer(e.target.value)}
            className="bg-ink-950/80 border border-ink-800 rounded-lg px-2.5 py-1.5 text-xs text-ink-300 font-mono focus:outline-none focus:border-gold-400/50"
          >
            <option value="all">Alle containers</option>
            {uniqueContainers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          {/* Category filter */}
          {uniqueCategories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-ink-950/80 border border-ink-800 rounded-lg px-2.5 py-1.5 text-xs text-ink-300 font-mono focus:outline-none focus:border-gold-400/50 uppercase"
            >
              <option value="all">Alle categorieën</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek in logs of diagnose..."
            className="w-full bg-ink-950/80 border border-ink-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-ink-100 placeholder-ink-600 focus:outline-none focus:border-gold-400/50 font-mono"
          />
        </div>
      </div>

      {/* Issues Display */}
      <div className="space-y-4">
        {loading && !report ? (
          <div className="glass-panel p-12 text-center text-ink-400 border border-ink-800 space-y-3">
            <div className="w-8 h-8 border-2 border-gold-400/20 border-t-gold-400 rounded-full animate-spin mx-auto" />
            <p className="font-mono text-xs">Containerlogs scannen en diagnosticeren...</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="glass-panel p-10 text-center border border-ink-800 rounded-xl space-y-2.5">
            <CheckCircle2 className="w-8 h-8 text-sage-400 mx-auto" />
            <h3 className="font-serif text-lg font-light text-ink-100">
              Geen afwijkingen gedetecteerd
            </h3>
            <p className="text-xs text-ink-400 font-sans max-w-md mx-auto leading-relaxed">
              {issues.length === 0
                ? 'Er zijn geen bekende foutpatronen, crashes of databasefouten aangetroffen in de geanalyseerde logs. Alle containers draaien stabiel.'
                : 'Er zijn geen problemen gevonden die voldoen aan het huidige filter.'}
            </p>
          </div>
        ) : (
          filteredIssues.map((issue, idx) => {
            const isCritical = issue.severity === 'critical';

            return (
              <div
                key={`${issue.container}-${issue.line_number}-${idx}`}
                className={`glass-panel p-5 border rounded-xl space-y-3.5 transition-all ${
                  isCritical
                    ? 'border-clay-700/50 bg-ink-900/75 hover:border-clay-500/60'
                    : 'border-gold-700/40 bg-ink-900/60 hover:border-gold-500/50'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-ink-800/60">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Severity pill */}
                    <span
                      className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full uppercase font-bold border flex items-center gap-1 ${
                        isCritical
                          ? 'bg-clay-950/80 text-clay-300 border-clay-700/60'
                          : 'bg-gold-950/80 text-gold-300 border-gold-700/60'
                      }`}
                    >
                      {isCritical ? (
                        <AlertOctagon className="w-3 h-3 text-clay-400" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-gold-400" />
                      )}
                      <span>{isCritical ? 'Kritiek' : 'Waarschuwing'}</span>
                    </span>

                    {/* Container Tag */}
                    <span className="text-xs font-mono text-ink-200 bg-ink-950 px-2 py-0.5 rounded border border-ink-800 flex items-center gap-1">
                      <Box className="w-3 h-3 text-ink-400" />
                      <strong>{issue.container}</strong>
                    </span>

                    {/* Mapped Component */}
                    {issue.component_name && (
                      <span className="text-[11px] font-mono text-gold-300/90 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-gold-400" />
                        <span>({issue.component_name})</span>
                      </span>
                    )}

                    {/* Category */}
                    <span className="text-[10px] font-mono uppercase px-2 py-0.2 rounded bg-ink-800 text-ink-400 border border-ink-700/60">
                      {issue.category}
                    </span>

                    {/* Occurrence count */}
                    {issue.count > 1 && (
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-ink-800 text-ink-300 border border-ink-700">
                        {issue.count}x voorgekomen
                      </span>
                    )}
                  </div>

                  {/* Actions & Timestamp */}
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="text-[11px] font-mono text-ink-500">
                      Regel #{issue.line_number}
                      {issue.timestamp && ` &bull; ${issue.timestamp.slice(11, 19)}`}
                    </span>

                    <button
                      onClick={() => onOpenLogsModal(issue.container)}
                      className="btn-ghost py-1 px-2.5 text-xs text-ink-300 hover:text-gold-300 flex items-center gap-1"
                      title="Open volledige container logs"
                    >
                      <Terminal className="w-3 h-3" />
                      <span className="hidden sm:inline">Logs</span>
                    </button>
                  </div>
                </div>

                {/* Issue Title & Diagnostic Recommendation */}
                <div>
                  <h4 className="font-serif text-base font-medium text-ink-100 mb-1">
                    {issue.title}
                  </h4>
                  <div className="p-3 rounded-lg bg-ink-950/70 border border-ink-800/80 text-xs font-sans text-ink-300 flex items-start gap-2.5">
                    <ShieldAlert
                      className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                        isCritical ? 'text-clay-400' : 'text-gold-400'
                      }`}
                    />
                    <div className="space-y-0.5">
                      <span className="font-medium text-ink-200">
                        Diagnostisch Advies:
                      </span>{' '}
                      <span>{issue.suggestion}</span>
                    </div>
                  </div>
                </div>

                {/* Log snippet context */}
                <div>
                  <div className="text-[10px] font-mono text-ink-500 mb-1 flex items-center justify-between">
                    <span>Relevante logcontext:</span>
                  </div>
                  <pre className="p-3 rounded-lg bg-ink-950 text-[11px] font-mono text-ink-300 overflow-x-auto border border-ink-800/80 leading-relaxed whitespace-pre-wrap selection:bg-gold-500/25 selection:text-gold-100">
                    {issue.snippet}
                  </pre>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
