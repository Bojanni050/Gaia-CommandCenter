export type CompositeStatus = 'running' | 'stopped' | 'unhealthy' | 'starting' | 'unknown' | 'ok';

export interface ContainerStats {
  cpu_percent: number;
  memory_usage: number;
  memory_limit: number;
  memory_percent: number;
  net_rx_bytes?: number;
  net_tx_bytes?: number;
  error?: string;
}

export interface ContainerInfo {
  id: string;
  full_id: string;
  name: string;
  image: string;
  status: string;
  raw_status: string;
  health?: string | null;
  created: string;
  started_at?: string;
  ports: string[];
  restart_policy?: string;
  gaia_meta?: {
    component_id?: string | null;
    component_name?: string | null;
    is_gaia: boolean;
    is_auxiliary: boolean;
    is_infrastructure?: boolean;
  };
  stats?: ContainerStats | null;
}

export interface HealthCheckResult {
  endpoint: string;
  status: 'ok' | 'degraded' | 'down' | 'unknown' | 'auth';
  status_code?: number | null;
  latency_ms: number;
  response?: any;
  error?: string | null;
  last_checked: string;
}

export type GaiaLayer = 'harnas' | 'geheugenpijp' | 'capabilities' | 'clients' | string;
export type GaiaEpistemic = 'agency' | 'observation' | 'interpretation' | 'hypothesis' | 'execution' | 'presence' | string;
export type GaiaLifecycle = 'active' | 'interim' | 'planned' | string;

export interface GaiaComponent {
  id: string;
  name: string;
  category: 'core' | 'logos' | 'reasoning' | 'memory' | 'knowledge' | 'cognition' | 'capture' | 'intent' | 'integration' | 'interface' | string;
  description: string;
  layer?: GaiaLayer;
  epistemic?: GaiaEpistemic;
  lifecycle?: GaiaLifecycle;
  repo?: string;
  v3_note?: string;
  health_auth_env?: string;
  container?: string;
  auxiliary_containers?: string[];
  runtime?: string;
  process_name?: string;
  host_component?: string;
  health_endpoint?: string;
  ui_url?: string;
  ui_label?: string;
  config_source?: string;
  configurable?: boolean;
  composite_status: CompositeStatus;
  container_info?: ContainerInfo | null;
  container_stats?: ContainerStats | null;
  health_check?: HealthCheckResult | null;
  has_ui: boolean;
  recent_logs?: string;
}

export interface SystemMetrics {
  cpu: {
    percent: number;
    per_cpu: number[];
    core_count: number;
    physical_core_count: number;
    load_average: number[];
  };
  memory: {
    total: number;
    used: number;
    available: number;
    percent: number;
    swap_total: number;
    swap_used: number;
    swap_percent: number;
  };
  disk: {
    path: string;
    total: number;
    used: number;
    free: number;
    percent: number;
  };
  uptime: {
    uptime_seconds: number;
    formatted: string;
    boot_time: string;
  };
  host: {
    hostname: string;
    os: string;
    release: string;
    architecture: string;
  };
  docker: {
    available: boolean;
    server_version: string;
    api_version?: string;
    containers_total: number;
    containers_running: number;
    containers_paused: number;
    containers_stopped: number;
    images_count: number;
    error?: string;
  };
}

export interface AuthStatus {
  authenticated: boolean;
  username: string | null;
  auth_enabled: boolean;
}

export interface LogIssue {
  container: string;
  component_id?: string | null;
  component_name?: string | null;
  is_gaia: boolean;
  severity: 'critical' | 'warning' | 'info';
  category: 'database' | 'runtime_crash' | 'llm_quota' | 'memory' | 'timeout' | 'security' | 'http_error' | string;
  title: string;
  suggestion: string;
  snippet: string;
  matched_line: string;
  line_number: number;
  timestamp: string;
  count: number;
  last_seen?: string;
}

export interface IngestEvent {
  id: string;
  timestamp: string;
  source: string;
  event: string;
  status: 'ok' | 'pending' | 'failed' | 'rejected' | string;
  level: 'info' | 'warning' | 'error' | 'debug' | string;
  summary: string;
  client?: string | null;
  payload?: Record<string, any>;
}

export interface IngestLogStats {
  total_events: number;
  events_last_24h: number;
  failed_events: number;
  pending_events: number;
  error_rate: number;
  by_status: Record<string, number>;
  by_source: Record<string, number>;
  by_event: Record<string, number>;
  by_level: Record<string, number>;
  last_event: IngestEvent | null;
  sources: string[];
  events: string[];
}

// Hypothesen / afgeleide statements — Cognition (lifecycle-eigenaar, read-only)
export type HypothesisStatus = 'proposed' | 'testing' | 'corroborated' | 'confirmed' | 'rejected' | string;
export type HypothesisKind = 'hypothesis' | 'mental_model' | 'relationship' | 'open_question' | string;

export interface Hypothesis {
  id: string;
  bank_id: string;
  kind: HypothesisKind;
  statement: string;
  confidence: number;
  status: HypothesisStatus;
  verification_plan: string;
  evidence_memory_ids: string[];
  evidence_for: string[];
  evidence_against: string[];
  persistence: 'ephemeral' | 'durable' | string;
  method: 'asserted' | 'derived' | 'tested' | string;
  sources: string[];
  supersedes_id?: string | null;
  superseded_by_id?: string | null;
  confirmed_document_id?: string | null;
  rejection_reason?: string | null;
  verwerp_bron?: 'mens' | 'consolidatie' | string | null;
  tested_at?: string | null;
  confirmed_at?: string | null;
  rejected_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HypothesisStats {
  total: number;
  by_status: Record<string, number>;
  by_kind: Record<string, number>;
  by_verwerp_bron: Record<string, number>;
  avg_confidence: number | null;
  proposed: number;
  testing: number;
  corroborated: number;
  confirmed: number;
  rejected: number;
  statuses: string[];
  kinds: string[];
}

export interface LogAnalysisReport {
  summary: {
    health_score: number;
    total_issues: number;
    critical_count: number;
    warning_count: number;
    scanned_containers_count: number;
    tail?: number;
    since_hours?: number;
    timestamp: string;
  };
  scanned_containers: string[];
  issues: LogIssue[];
}

