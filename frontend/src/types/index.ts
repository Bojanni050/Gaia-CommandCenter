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
  status: 'ok' | 'degraded' | 'down' | 'unknown';
  status_code?: number | null;
  latency_ms: number;
  response?: any;
  error?: string | null;
  last_checked: string;
}

export interface GaiaComponent {
  id: string;
  name: string;
  category: 'core' | 'reasoning' | 'memory' | 'knowledge' | 'cognition' | 'intent' | 'integration' | 'interface' | string;
  description: string;
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

export interface LogAnalysisReport {
  summary: {
    health_score: number;
    total_issues: number;
    critical_count: number;
    warning_count: number;
    scanned_containers_count: number;
    timestamp: string;
  };
  scanned_containers: string[];
  issues: LogIssue[];
}

