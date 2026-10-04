import { SystemMetrics, GaiaComponent, ContainerInfo, AuthStatus, LogIssue, LogAnalysisReport, IngestEvent, IngestLogStats } from '../types';

const API_BASE = '/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('gaia_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('gaia_token', token);
    } else {
      localStorage.removeItem('gaia_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // for cookies
    });

    if (response.status === 401) {
      // Clear token on unauthorized
      this.setToken(null);
      throw new Error('UNAUTHORIZED');
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.detail || `HTTP Error ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async getAuthStatus(): Promise<AuthStatus> {
    return this.request<AuthStatus>('/auth/status');
  }

  async login(password: string, username: string = 'admin'): Promise<{ access_token: string; username: string }> {
    const data = await this.request<{ access_token: string; username: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  // System
  async getSystemMetrics(): Promise<SystemMetrics> {
    return this.request<SystemMetrics>('/system');
  }

  // Components
  async getComponents(): Promise<GaiaComponent[]> {
    return this.request<GaiaComponent[]>('/components');
  }

  async getComponent(id: string): Promise<GaiaComponent> {
    return this.request<GaiaComponent>(`/components/${id}`);
  }

  async updateComponent(id: string, data: Partial<GaiaComponent>): Promise<GaiaComponent> {
    return this.request<GaiaComponent>(`/components/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async createComponent(data: any): Promise<GaiaComponent> {
    return this.request<GaiaComponent>('/components', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteComponent(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/components/${id}`, {
      method: 'DELETE',
    });
  }

  async testEndpoint(endpoint: string): Promise<{
    endpoint: string;
    status: string;
    status_code?: number;
    latency_ms: number;
    response?: any;
    error?: string;
  }> {
    return this.request('/components/test-endpoint', {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    });
  }

  async reloadRegistry(): Promise<void> {
    await this.request('/components/reload', { method: 'POST' });
  }

  // Containers
  async getContainers(): Promise<ContainerInfo[]> {
    return this.request<ContainerInfo[]>('/containers');
  }

  async getContainer(nameOrId: string): Promise<ContainerInfo> {
    return this.request<ContainerInfo>(`/containers/${nameOrId}`);
  }

  // Logs & Analyzer
  async getLogs(
    nameOrId: string,
    tail: number = 20,
    timestamps: boolean = true,
    sinceHours: number = 25
  ): Promise<{ container: string; tail: number; since_hours?: number; logs: string }> {
    return this.request(
      `/logs/${encodeURIComponent(nameOrId)}?tail=${tail}&timestamps=${timestamps}&since_hours=${sinceHours}`
    );
  }

  async analyzeLogs(tail: number = 20, sinceHours: number = 25): Promise<LogAnalysisReport> {
    return this.request<LogAnalysisReport>(`/logs/analyze?tail=${tail}&since_hours=${sinceHours}`);
  }

  async analyzeContainerLogs(nameOrId: string, tail: number = 20, sinceHours: number = 25): Promise<LogIssue[]> {
    return this.request<LogIssue[]>(`/logs/analyze/${encodeURIComponent(nameOrId)}?tail=${tail}&since_hours=${sinceHours}`);
  }

  // Ingestie-log (capture-rs)
  async getIngestLogs(params: {
    source?: string;
    event?: string;
    status?: string;
    q?: string;
    since_hours?: number;
    limit?: number;
  }): Promise<IngestEvent[]> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    return this.request<IngestEvent[]>(`/ingest-logs?${qs.toString()}`);
  }

  async getIngestLogStats(): Promise<IngestLogStats> {
    return this.request<IngestLogStats>('/ingest-logs/stats');
  }
}

export const api = new ApiService();
