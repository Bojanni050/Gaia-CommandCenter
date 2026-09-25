import React, { useState, useEffect } from 'react';
import {
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  ExternalLink,
  Search,
  RefreshCw,
  Sliders,
  X,
} from 'lucide-react';
import { GaiaComponent, ContainerInfo } from '../types';
import { api } from '../services/api';

interface SettingsPageProps {
  components: GaiaComponent[];
  containers: ContainerInfo[];
  onRefreshComponents: () => void;
}

interface ComponentFormData {
  name: string;
  category: string;
  description: string;
  container: string;
  health_endpoint: string;
  ui_url: string;
  ui_label: string;
  config_source: string;
  configurable: boolean;
}

interface TestResult {
  loading: boolean;
  status?: string;
  status_code?: number;
  latency_ms?: number;
  error?: string;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  components,
  containers,
  onRefreshComponents,
}) => {
  const [formDataMap, setFormDataMap] = useState<Record<string, ComponentFormData>>({});
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New component modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newComponentData, setNewComponentData] = useState<ComponentFormData & { id: string }>({
    id: '',
    name: '',
    category: 'core',
    description: '',
    container: '',
    health_endpoint: '',
    ui_url: '',
    ui_label: '',
    config_source: '',
    configurable: false,
  });
  const [isCreating, setIsCreating] = useState(false);

  // Initialize form state when components change
  useEffect(() => {
    const initialMap: Record<string, ComponentFormData> = {};
    components.forEach((c) => {
      initialMap[c.id] = {
        name: c.name || '',
        category: c.category || 'core',
        description: c.description || '',
        container: c.container || '',
        health_endpoint: c.health_endpoint || '',
        ui_url: c.ui_url || '',
        ui_label: c.ui_label || '',
        config_source: c.config_source || '',
        configurable: !!c.configurable,
      };
    });
    setFormDataMap(initialMap);
    setDirtyMap({});
  }, [components]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleFieldChange = (
    compId: string,
    field: keyof ComponentFormData,
    value: any
  ) => {
    setFormDataMap((prev) => ({
      ...prev,
      [compId]: {
        ...prev[compId],
        [field]: value,
      },
    }));

    setDirtyMap((prev) => ({
      ...prev,
      [compId]: true,
    }));
  };

  const handleReset = (compId: string) => {
    const orig = components.find((c) => c.id === compId);
    if (!orig) return;

    setFormDataMap((prev) => ({
      ...prev,
      [compId]: {
        name: orig.name || '',
        category: orig.category || 'core',
        description: orig.description || '',
        container: orig.container || '',
        health_endpoint: orig.health_endpoint || '',
        ui_url: orig.ui_url || '',
        ui_label: orig.ui_label || '',
        config_source: orig.config_source || '',
        configurable: !!orig.configurable,
      },
    }));

    setDirtyMap((prev) => ({
      ...prev,
      [compId]: false,
    }));
  };

  const handleSave = async (compId: string) => {
    const form = formDataMap[compId];
    if (!form) return;

    setSavingMap((prev) => ({ ...prev, [compId]: true }));
    try {
      await api.updateComponent(compId, form);
      setDirtyMap((prev) => ({ ...prev, [compId]: false }));
      showToast(`Instellingen voor ${form.name} succesvol opgeslagen!`);
      onRefreshComponents();
    } catch (err: any) {
      showToast(`Fout bij opslaan: ${err.message}`, 'error');
    } finally {
      setSavingMap((prev) => ({ ...prev, [compId]: false }));
    }
  };

  const handleTestEndpoint = async (compId: string, endpoint: string) => {
    if (!endpoint) return;

    setTestResults((prev) => ({
      ...prev,
      [compId]: { loading: true },
    }));

    try {
      const res = await api.testEndpoint(endpoint);
      setTestResults((prev) => ({
        ...prev,
        [compId]: {
          loading: false,
          status: res.status,
          status_code: res.status_code,
          latency_ms: res.latency_ms,
          error: res.error,
        },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [compId]: {
          loading: false,
          status: 'down',
          error: err.message,
        },
      }));
    }
  };

  const handleDelete = async (compId: string, name: string) => {
    if (!window.confirm(`Weet je zeker dat je component '${name}' wilt verwijderen uit het Control Center?`)) {
      return;
    }

    try {
      await api.deleteComponent(compId);
      showToast(`Component '${name}' verwijderd`);
      onRefreshComponents();
    } catch (err: any) {
      showToast(`Fout bij verwijderen: ${err.message}`, 'error');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComponentData.name.trim()) return;

    setIsCreating(true);
    try {
      await api.createComponent(newComponentData);
      showToast(`Component '${newComponentData.name}' succesvol geregistreerd!`);
      setIsAddModalOpen(false);
      setNewComponentData({
        id: '',
        name: '',
        category: 'core',
        description: '',
        container: '',
        health_endpoint: '',
        ui_url: '',
        ui_label: '',
        config_source: '',
        configurable: false,
      });
      onRefreshComponents();
    } catch (err: any) {
      showToast(`Fout bij aanmaken: ${err.message}`, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Filter components by search and category
  const filteredComponents = components.filter((c) => {
    const form = formDataMap[c.id] || c;
    const matchSearch =
      form.name.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      form.container.toLowerCase().includes(search.toLowerCase()) ||
      form.description.toLowerCase().includes(search.toLowerCase()) ||
      form.health_endpoint.toLowerCase().includes(search.toLowerCase());

    const matchCategory =
      selectedCategory === 'all' || form.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchSearch && matchCategory;
  });

  const categories = Array.from(new Set(components.map((c) => c.category || 'core')));

  // Available container options from Docker
  const containerNames = Array.from(new Set(containers.map((c) => c.name))).sort();

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-sans border backdrop-blur-xl ${
              toastMessage.type === 'success'
                ? 'bg-ink-900/95 border-sage-500/50 text-sage-200 shadow-sage-950/40'
                : 'bg-ink-900/95 border-clay-500/50 text-clay-200 shadow-clay-950/40'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-sage-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-clay-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="glass-panel p-6 border border-ink-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-gold-400" />
            <h2 className="font-serif text-2xl font-light text-ink-50">
              Gaia Componenten <span className="italic text-gold-400 font-normal">Instellingen</span>
            </h2>
          </div>
          <p className="text-xs text-ink-400 font-sans leading-relaxed max-w-2xl">
            Beheer en wijzig de configuratie, endpoints, containers en webinterfaces van alle Gaia onderdelen vanaf één overzichtelijke centrale pagina.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => onRefreshComponents()}
            className="btn-ghost text-xs py-2 px-3 hover:text-gold-300 flex items-center gap-1.5"
            title="Herlaad componenten uit registry"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Herladen</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-gaia text-xs py-2 px-3.5 font-medium flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nieuw Component</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-ink-900/60 p-3 rounded-xl border border-ink-800">
        {/* Categories */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
              selectedCategory === 'all'
                ? 'bg-ink-800 text-gold-300 font-medium border border-gold-400/30'
                : 'text-ink-400 hover:text-ink-200 bg-ink-950/60 border border-ink-800/60'
            }`}
          >
            Alle ({components.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono uppercase transition-all ${
                selectedCategory === cat
                  ? 'bg-gold-500/15 text-gold-300 font-medium border border-gold-400/30'
                  : 'text-ink-400 hover:text-ink-200 bg-ink-950/60 border border-ink-800/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek instellingen..."
            className="w-full bg-ink-950/80 border border-ink-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-ink-100 placeholder-ink-600 focus:outline-none focus:border-gold-400/50 font-mono"
          />
        </div>
      </div>

      {/* Unified Components Editor Grid */}
      <div className="space-y-5">
        {filteredComponents.length === 0 ? (
          <div className="glass-panel p-10 text-center text-ink-500 font-sans border border-ink-800">
            Geen componenten gevonden die overeenkomen met de filtercriteria.
          </div>
        ) : (
          filteredComponents.map((comp) => {
            const form = formDataMap[comp.id] || {
              name: comp.name,
              category: comp.category,
              description: comp.description,
              container: comp.container || '',
              health_endpoint: comp.health_endpoint || '',
              ui_url: comp.ui_url || '',
              ui_label: comp.ui_label || '',
              config_source: comp.config_source || '',
              configurable: !!comp.configurable,
            };

            const isDirty = dirtyMap[comp.id] || false;
            const isSaving = savingMap[comp.id] || false;
            const testResult = testResults[comp.id];

            return (
              <div
                key={comp.id}
                className={`glass-panel p-6 border transition-all rounded-xl relative ${
                  isDirty
                    ? 'border-gold-400/40 bg-ink-900/80 shadow-lg shadow-black/40'
                    : 'border-ink-800/80 bg-ink-900/60'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-ink-800/70">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        comp.composite_status === 'running' || comp.composite_status === 'ok'
                          ? 'status-orb-running'
                          : comp.composite_status === 'unhealthy'
                          ? 'status-orb-unhealthy'
                          : 'status-orb-stopped'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-lg font-medium text-ink-100">
                          {form.name}
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gold-400/10 text-gold-300 border border-gold-400/20 uppercase font-semibold">
                          {form.category}
                        </span>
                        {isDirty && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-300 border border-gold-500/30">
                            Niet opgeslagen
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-ink-500 mt-0.5">
                        ID: <span className="text-ink-400">{comp.id}</span>
                        {form.container && (
                          <span className="ml-3 text-ink-500">
                            Container: <span className="text-ink-300">{form.container}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top card actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {form.ui_url && (
                      <a
                        href={form.ui_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost py-1 px-2.5 text-xs text-ink-300 hover:text-gold-300 flex items-center gap-1"
                        title="Open UI"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="hidden md:inline">Open UI</span>
                      </a>
                    )}

                    {isDirty && (
                      <button
                        onClick={() => handleReset(comp.id)}
                        className="btn-ghost py-1 px-2.5 text-xs text-ink-400 hover:text-ink-200 flex items-center gap-1"
                        title="Herstel oorspronkelijke waarden"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Herstel</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleSave(comp.id)}
                      disabled={!isDirty || isSaving}
                      className="btn-gaia py-1.5 px-3.5 text-xs font-medium disabled:opacity-40 flex items-center gap-1.5"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-3 h-3 border-2 border-ink-950/30 border-t-ink-950 rounded-full animate-spin" />
                          <span>Opslaan...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Opslaan</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleDelete(comp.id, form.name)}
                      className="p-1.5 rounded-lg text-ink-600 hover:text-clay-400 hover:bg-clay-950/40 transition-colors ml-1"
                      title="Verwijder component uit registry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Form fields layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-sans">
                  {/* Name */}
                  <div>
                    <label className="block text-[11px] font-mono text-ink-400 mb-1 font-medium">
                      Component Naam
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => handleFieldChange(comp.id, 'name', e.target.value)}
                      className="w-full bg-ink-950/80 border border-ink-800 rounded-lg px-3 py-1.5 text-xs text-ink-100 placeholder-ink-600 focus:outline-none focus:border-gold-400/50 font-sans"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-[11px] font-mono text-ink-400 mb-1 font-medium">
                      Architectuur Categorie
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => handleFieldChange(comp.id, 'category', e.target.value)}
                      className="w-full bg-ink-950/80 border border-ink-800 rounded-lg px-3 py-1.5 text-xs text-ink-100 focus:outline-none focus:border-gold-400/50 font-mono"
                    >
                      <option value="core">core (Centraal zenuwstelsel)</option>
                      <option value="reasoning">reasoning (Nous/Hermes redeneerlaag)</option>
                      <option value="memory">memory (Hindsight episodisch geheugen)</option>
                      <option value="knowledge">knowledge (Chronicle epistemisch geheugen)</option>
                      <option value="cognition">cognition (ReasonIQ hypothese-lifecycle)</option>
                      <option value="intent">intent (IntentIQ classificatie)</option>
                      <option value="interface">interface (Web UI / presence)</option>
                      <option value="integration">integration (MCP / gateway)</option>
                    </select>
                  </div>

                  {/* Container Picker */}
                  <div>
                    <label className="block text-[11px] font-mono text-ink-400 mb-1 font-medium">
                      Gekoppelde Docker Container
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={form.container}
                        onChange={(e) => handleFieldChange(comp.id, 'container', e.target.value)}
                        className="w-full bg-ink-950/80 border border-ink-800 rounded-lg px-2.5 py-1.5 text-xs text-ink-100 focus:outline-none focus:border-gold-400/50 font-mono"
                      >
                        <option value="">-- Geen container (Host/Geïntegreerd) --</option>
                        {containerNames.map((cName) => (
                          <option key={cName} value={cName}>
                            {cName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Health Check Endpoint & Test button */}
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-mono text-ink-400 font-medium">
                        Health Check Endpoint URL
                      </label>
                      {testResult && (
                        <span className="text-[10px] font-mono">
                          {testResult.loading ? (
                            <span className="text-gold-400 animate-pulse">Testen...</span>
                          ) : testResult.status === 'ok' ? (
                            <span className="text-sage-300 bg-sage-950/80 px-2 py-0.2 rounded border border-sage-700/50">
                              HTTP {testResult.status_code || 200} OK ({testResult.latency_ms}ms)
                            </span>
                          ) : (
                            <span className="text-clay-300 bg-clay-950/80 px-2 py-0.2 rounded border border-clay-700/50" title={testResult.error}>
                              Fout: {testResult.error || 'Niet bereikbaar'}
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={form.health_endpoint}
                        onChange={(e) => handleFieldChange(comp.id, 'health_endpoint', e.target.value)}
                        placeholder="bijv. http://100.65.0.15:8891/health"
                        className="flex-1 bg-ink-950/80 border border-ink-800 rounded-lg px-3 py-1.5 text-xs text-ink-100 placeholder-ink-600 focus:outline-none focus:border-gold-400/50 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleTestEndpoint(comp.id, form.health_endpoint)}
                        disabled={!form.health_endpoint || testResult?.loading}
                        className="btn-ghost py-1 px-3 text-xs text-gold-300 border-gold-400/25 hover:bg-gold-500/10 disabled:opacity-40"
                      >
                        {testResult?.loading ? 'Testen...' : 'Test Verbinding'}
                      </button>
                    </div>
                  </div>

                  {/* Config Source Path */}
                  <div>
                    <label className="block text-[11px] font-mono text-ink-400 mb-1 font-medium">
                      Configuratiebron Pad op Server
                    </label>
                    <input
                      type="text"
                      value={form.config_source}
                      onChange={(e) => handleFieldChange(comp.id, 'config_source', e.target.value)}
                      placeholder="/root/gaia/services/.../.env"
                      className="w-full bg-ink-950/80 border border-ink-800 rounded-lg px-3 py-1.5 text-xs text-ink-100 placeholder-ink-600 focus:outline-none focus:border-gold-400/50 font-mono"
                    />
                  </div>

                  {/* UI URL */}
                  <div>
                    <label className="block text-[11px] font-mono text-ink-400 mb-1 font-medium">
                      Web Interface URL
                    </label>
                    <input
                      type="text"
                      value={form.ui_url}
                      onChange={(e) => handleFieldChange(comp.id, 'ui_url', e.target.value)}
                      placeholder="bijv. http://100.65.0.15:8891/admin"
                      className="w-full bg-ink-950/80 border border-ink-800 rounded-lg px-3 py-1.5 text-xs text-ink-100 placeholder-ink-600 focus:outline-none focus:border-gold-400/50 font-mono"
                    />
                  </div>

                  {/* UI Label */}
                  <div>
                    <label className="block text-[11px] font-mono text-ink-400 mb-1 font-medium">
                      Web Interface Knop Label
                    </label>
                    <input
                      type="text"
                      value={form.ui_label}
                      onChange={(e) => handleFieldChange(comp.id, 'ui_label', e.target.value)}
                      placeholder="bijv. Open Gaia Admin"
                      className="w-full bg-ink-950/80 border border-ink-800 rounded-lg px-3 py-1.5 text-xs text-ink-100 placeholder-ink-600 focus:outline-none focus:border-gold-400/50 font-sans"
                    />
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2 lg:col-span-2">
                    <label className="block text-[11px] font-mono text-ink-400 mb-1 font-medium">
                      Omschrijving / Rol in Gaia
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => handleFieldChange(comp.id, 'description', e.target.value)}
                      rows={2}
                      className="w-full bg-ink-950/80 border border-ink-800 rounded-lg px-3 py-1.5 text-xs text-ink-100 placeholder-ink-600 focus:outline-none focus:border-gold-400/50 font-sans resize-none"
                    />
                  </div>

                  {/* Configurable toggle */}
                  <div className="flex items-center gap-2 pt-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-ink-300 font-mono select-none">
                      <input
                        type="checkbox"
                        checked={form.configurable}
                        onChange={(e) => handleFieldChange(comp.id, 'configurable', e.target.checked)}
                        className="rounded bg-ink-950 border-ink-700 text-gold-500 focus:ring-0 cursor-pointer"
                      />
                      <span>Heeft runtime config surface</span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Nieuw Component Toevoegen */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="w-full max-w-2xl bg-ink-900 border border-ink-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-ink-800 flex items-center justify-between bg-ink-950/80">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-gold-400" />
                <h3 className="font-serif text-xl font-light text-ink-100">
                  Nieuw Gaia Component <span className="italic text-gold-400 font-normal">Registreren</span>
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-ink-400 hover:text-ink-100 hover:bg-ink-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-ink-400 mb-1 font-medium">
                    Unieke ID (optioneel, bv: my-agent)
                  </label>
                  <input
                    type="text"
                    value={newComponentData.id}
                    onChange={(e) => setNewComponentData({ ...newComponentData, id: e.target.value })}
                    placeholder="automatisch gegenereerd indien leeg"
                    className="w-full bg-ink-950/80 border border-ink-800 rounded-lg px-3 py-2 text-xs text-ink-100 placeholder-ink-600 focus:outline-none focus:border-gold-400/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-ink-400 mb-1 font-medium">
                    Component Naam *
                  </label>
                  <input
                    type="text"
                    value={newComponentData.name}
                    onChange={(e) => setNewComponentData({ ...newComponentData, name: e.target.value })}
                    placeholder="bijv. Gaia Reasoning Node"
                    required
                    className="w-full bg-ink-950/80 border border-ink-800 rounded-lg px-3 py-2 text-xs text-ink-100 placeholder-ink-600 focus:outline-none focus:border-gold-400/50 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-ink-400 mb-1 font-medium">
                    Categorie
                  </label>
                  <select
                    value={newComponentData.category}
                    onChange={(e) => setNewComponentData({ ...newComponentData, category: e.target.value })}
                    className="w-full bg-ink-950/80 border border-ink-800 rounded-lg px-3 py-2 text-xs text-ink-100 focus:outline-none focus:border-gold-400/50 font-mono"
                  >
                    <option value="core">core</option>
                    <option value="reasoning">reasoning</option>
                    <option value="memory">memory</option>
                    <option value="knowledge">knowledge</option>
                    <option value="cognition">cognition</option>
                    <option value="intent">intent</option>
                    <option value="interface">interface</option>
                    <option value="integration">integration</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-ink-400 mb-1 font-medium">
                    Gekoppelde Container
                  </label>
                  <select
                    value={newComponentData.container}
                    onChange={(e) => setNewComponentData({ ...newComponentData, container: e.target.value })}
                    className="w-full bg-ink-950/80 border border-ink-800 rounded-lg px-3 py-2 text-xs text-ink-100 focus:outline-none focus:border-gold-400/50 font-mono"
                  >
                    <option value="">-- Geen container gekoppeld --</option>
                    {containerNames.map((cName) => (
                      <option key={cName} value={cName}>
                        {cName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-mono text-ink-400 mb-1 font-medium">
                    Health Check Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={newComponentData.health_endpoint}
                    onChange={(e) => setNewComponentData({ ...newComponentData, health_endpoint: e.target.value })}
                    placeholder="bijv. http://100.65.0.15:8000/health"
                    className="w-full bg-ink-950/80 border border-ink-800 rounded-lg px-3 py-2 text-xs text-ink-100 placeholder-ink-600 focus:outline-none focus:border-gold-400/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-ink-400 mb-1 font-medium">
                    Web UI URL (optioneel)
                  </label>
                  <input
                    type="text"
                    value={newComponentData.ui_url}
                    onChange={(e) => setNewComponentData({ ...newComponentData, ui_url: e.target.value })}
                    placeholder="http://100.65.0.15:..."
                    className="w-full bg-ink-950/80 border border-ink-800 rounded-lg px-3 py-2 text-xs text-ink-100 placeholder-ink-600 focus:outline-none focus:border-gold-400/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-ink-400 mb-1 font-medium">
                    UI Knop Label
                  </label>
                  <input
                    type="text"
                    value={newComponentData.ui_label}
                    onChange={(e) => setNewComponentData({ ...newComponentData, ui_label: e.target.value })}
                    placeholder="Open Dashboard"
                    className="w-full bg-ink-950/80 border border-ink-800 rounded-lg px-3 py-2 text-xs text-ink-100 placeholder-ink-600 focus:outline-none focus:border-gold-400/50 font-sans"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-mono text-ink-400 mb-1 font-medium">
                    Omschrijving &amp; Rol
                  </label>
                  <textarea
                    value={newComponentData.description}
                    onChange={(e) => setNewComponentData({ ...newComponentData, description: e.target.value })}
                    rows={2}
                    placeholder="Korte omschrijving van de taak van dit component binnen Gaia..."
                    className="w-full bg-ink-950/80 border border-ink-800 rounded-lg px-3 py-2 text-xs text-ink-100 placeholder-ink-600 focus:outline-none focus:border-gold-400/50 font-sans resize-none"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-ink-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-ghost py-2 px-3 text-xs"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newComponentData.name.trim()}
                  className="btn-gaia py-2 px-4 text-xs font-medium disabled:opacity-40"
                >
                  {isCreating ? 'Aanmaken...' : 'Component Registreren'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
