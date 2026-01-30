/**
 * FastAPI Backend Client
 * 
 * This client can be used to call the FastAPI backend for:
 * - Live Kusto queries (real-time data)
 * - Complex filtering that pre-aggregation can't handle
 * - User-specific data
 * - Custom queries
 * 
 * When NEXT_PUBLIC_API_URL is set, calls go to FastAPI.
 * Otherwise, falls back to Next.js API routes.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Check if FastAPI backend is available
 */
export function isBackendEnabled(): boolean {
  return !!API_URL;
}

/**
 * Get the API base URL
 */
export function getApiUrl(): string {
  return API_URL;
}

/**
 * Make a request to the FastAPI backend
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// Metrics
// =============================================================================

export interface BackendMetrics {
  metrics: {
    total_learners: number;
    active_learners: number;
    certified_users: number;
    learning_users: number;
    prospect_users: number;
    avg_usage_increase: number;
    avg_products_adopted: number;
    avg_learning_hours: number;
    impact_score: number;
    retention_rate: number;
    total_learning_hours: number;
    total_certs_earned: number;
  };
  status_breakdown: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  funnel: Array<{
    stage: string;
    count: number;
    percentage: number;
    color: string;
  }>;
}

export async function fetchMetrics(): Promise<BackendMetrics> {
  return fetchApi<BackendMetrics>('/api/metrics');
}

export async function fetchRealtimeMetrics(): Promise<unknown> {
  return fetchApi('/api/metrics/realtime');
}

// =============================================================================
// Learners
// =============================================================================

export interface LearnerFilters {
  search?: string;
  status?: string;
  certified?: boolean;
  minCerts?: number;
  maxCerts?: number;
  page?: number;
  pageSize?: number;
}

export interface LearnersResponse {
  learners: Array<{
    email: string;
    user_handle: string;
    learner_status: string;
    journey_stage?: string;
    total_certs?: number;
  }>;
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
}

export async function fetchLearners(filters: LearnerFilters = {}): Promise<LearnersResponse> {
  const params = new URLSearchParams();
  
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.certified !== undefined) params.set('certified', String(filters.certified));
  if (filters.minCerts !== undefined) params.set('min_certs', String(filters.minCerts));
  if (filters.maxCerts !== undefined) params.set('max_certs', String(filters.maxCerts));
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('page_size', String(filters.pageSize));

  return fetchApi<LearnersResponse>(`/api/learners?${params.toString()}`);
}

export async function searchLearners(query: string, limit = 20): Promise<{
  results: Array<{ email: string; user_handle: string; learner_status: string }>;
  count: number;
}> {
  return fetchApi(`/api/learners/search?q=${encodeURIComponent(query)}&limit=${limit}`);
}

export interface UserProfile {
  email: string;
  user_handle: string;
  learner_status: string;
  journey_stage?: string;
  certifications: string[];
  total_certs: number;
  first_cert_date?: string;
  latest_cert_date?: string;
  learning_hours: number;
  product_usage_hours: number;
  events_attended: number;
  top_products: string[];
  activity_trend: Array<{ date: string; value: number }>;
}

export async function fetchLearnerProfile(email: string): Promise<UserProfile> {
  return fetchApi<UserProfile>(`/api/learners/${encodeURIComponent(email)}`);
}

export async function fetchLearnersByStatus(
  status: string,
  limit = 100
): Promise<{
  learners: Array<{ email: string; user_handle: string; total_certs: number }>;
  count: number;
}> {
  return fetchApi(`/api/learners/status/${status}?limit=${limit}`);
}

export async function fetchRecentCertifications(days = 30, limit = 50): Promise<{
  learners: Array<{
    email: string;
    user_handle: string;
    cert_date: string;
    total_certs: number;
    cert_titles: string[];
  }>;
  count: number;
}> {
  return fetchApi(`/api/learners/certified/recent?days=${days}&limit=${limit}`);
}

// =============================================================================
// Journey
// =============================================================================

export interface JourneyResponse {
  funnel: Array<{
    stage: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  avg_time_to_completion: number;
  stage_velocity: Record<string, number>;
  drop_off_analysis: Array<{
    stage: string;
    count: number;
    drop_off_rate: number;
    next_stage: string | null;
  }>;
  monthly_progression: Array<{
    name: string;
    learning: number;
    certified: number;
    multi_cert: number;
  }>;
  total_journey_users: number;
}

export async function fetchJourney(): Promise<JourneyResponse> {
  return fetchApi<JourneyResponse>('/api/journey');
}

export async function fetchJourneyFunnel(): Promise<{
  funnel: JourneyResponse['funnel'];
  total: number;
}> {
  return fetchApi('/api/journey/funnel');
}

export async function fetchJourneyProgression(months = 6): Promise<{
  progression: JourneyResponse['monthly_progression'];
  months: number;
}> {
  return fetchApi(`/api/journey/progression?months=${months}`);
}

// =============================================================================
// Impact
// =============================================================================

export interface ImpactResponse {
  stage_impact: Array<{
    stage: string;
    learners: number;
    avg_usage_increase: number;
    platform_time_increase: number;
    top_product: string;
  }>;
  product_adoption: Array<{
    name: string;
    before: number;
    after: number;
  }>;
  correlation_data: Array<{
    name: string;
    learning_hours: number;
    product_usage: number;
    platform_time: number;
  }>;
  roi_breakdown: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export async function fetchImpact(): Promise<ImpactResponse> {
  return fetchApi<ImpactResponse>('/api/impact');
}

export async function fetchImpactByStage(): Promise<{
  stages: ImpactResponse['stage_impact'];
}> {
  return fetchApi('/api/impact/by-stage');
}

export async function fetchROI(): Promise<{
  total_roi: number;
  breakdown: {
    productivity_gain: number;
    time_savings: number;
    quality_improvement: number;
  };
  per_learner: number;
  impact_score: number;
}> {
  return fetchApi('/api/impact/roi');
}

// =============================================================================
// Custom Queries
// =============================================================================

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
  execution_time_ms: number;
}

export async function executeQuery(
  query: string,
  parameters?: Record<string, unknown>
): Promise<QueryResult> {
  return fetchApi<QueryResult>('/api/query', {
    method: 'POST',
    body: JSON.stringify({ query, parameters }),
  });
}

export async function getQueryTables(): Promise<{
  tables: string[];
  description: string;
}> {
  return fetchApi('/api/query/tables');
}

export async function getQueryExamples(): Promise<{
  examples: Array<{
    name: string;
    description: string;
    query: string;
  }>;
}> {
  return fetchApi('/api/query/examples');
}

// =============================================================================
// Health
// =============================================================================

export async function checkHealth(): Promise<{
  status: string;
  version: string;
  kusto_enabled: boolean;
  kusto_connected: boolean;
  data_path_exists: boolean;
}> {
  return fetchApi('/health');
}
