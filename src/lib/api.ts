/**
 * API Service Layer
 * Centralized API calls with error handling and caching support
 */

import type {
  Learner,
  LearnerFilters,
  PaginatedResponse,
  DashboardSummary,
  CopilotMetrics,
  ROIMetrics,
  LearningEvent,
  Certification,
  JourneyFunnelStage,
  Alert,
  AlertRule,
} from "@/types";

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// Generic fetch wrapper with error handling
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(
        error.message || `HTTP ${response.status}`,
        response.status.toString(),
        error.details
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Network error", "NETWORK_ERROR");
  }
}

// Custom API Error class
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ============================================
// Dashboard API
// ============================================

export const dashboardApi = {
  getSummary: (): Promise<DashboardSummary> =>
    fetchApi("/dashboard/summary"),

  getRecentActivity: (): Promise<{ events: LearningEvent[]; certifications: Certification[] }> =>
    fetchApi("/dashboard/recent"),
};

// ============================================
// Learners API
// ============================================

export const learnersApi = {
  getAll: (
    filters?: LearnerFilters,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResponse<Learner>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    if (filters?.search) params.set("search", filters.search);
    if (filters?.journey_stage?.length) params.set("journey_stage", filters.journey_stage.join(","));
    if (filters?.is_certified !== undefined) params.set("is_certified", filters.is_certified.toString());

    return fetchApi(`/learners?${params}`);
  },

  getById: (id: string): Promise<Learner> =>
    fetchApi(`/learners/${id}`),

  getJourneyFunnel: (): Promise<JourneyFunnelStage[]> =>
    fetchApi("/learners/funnel"),

  getProgressionStats: (): Promise<{
    inProgress: number;
    recentlyCertified: number;
    medianDaysToCert: number;
    powerUsers: number;
  }> => fetchApi("/learners/progression"),
};

// ============================================
// Analytics API
// ============================================

export const analyticsApi = {
  getCopilotMetrics: (): Promise<CopilotMetrics> =>
    fetchApi("/analytics/copilot"),

  getROIMetrics: (): Promise<ROIMetrics> =>
    fetchApi("/analytics/roi"),

  getCertificationStats: (): Promise<{
    total: number;
    byType: Record<string, number>;
    recentMonths: { month: string; count: number }[];
    passRate: number;
  }> => fetchApi("/analytics/certifications"),

  getSkillsDistribution: (): Promise<{
    product: string;
    beginner: number;
    intermediate: number;
    advanced: number;
    expert: number;
  }[]> => fetchApi("/analytics/skills"),

  getProductAlignment: (): Promise<{
    product: string;
    learners: number;
    adopters: number;
    adoptionRate: number;
  }[]> => fetchApi("/analytics/alignment"),
};

// ============================================
// Events API
// ============================================

export const eventsApi = {
  getAll: (page = 1, pageSize = 20): Promise<PaginatedResponse<LearningEvent>> =>
    fetchApi(`/events?page=${page}&page_size=${pageSize}`),

  getById: (id: string): Promise<LearningEvent> =>
    fetchApi(`/events/${id}`),

  getUpcoming: (limit = 5): Promise<LearningEvent[]> =>
    fetchApi(`/events/upcoming?limit=${limit}`),

  getStats: (): Promise<{
    totalEvents: number;
    totalAttendees: number;
    avgSatisfaction: number;
    upcomingCount: number;
  }> => fetchApi("/events/stats"),
};

// ============================================
// Alerts API
// ============================================

export const alertsApi = {
  getAll: (): Promise<Alert[]> =>
    fetchApi("/alerts"),

  acknowledge: (id: string): Promise<Alert> =>
    fetchApi(`/alerts/${id}/acknowledge`, { method: "POST" }),

  getRules: (): Promise<AlertRule[]> =>
    fetchApi("/alerts/rules"),

  updateRule: (id: string, data: Partial<AlertRule>): Promise<AlertRule> =>
    fetchApi(`/alerts/rules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// ============================================
// Reports API
// ============================================

export const reportsApi = {
  exportData: (config: {
    format: "csv" | "excel" | "pdf";
    filters?: LearnerFilters;
    fields?: string[];
  }): Promise<{ downloadUrl: string }> =>
    fetchApi("/reports/export", {
      method: "POST",
      body: JSON.stringify(config),
    }),

  getExecutiveSummary: (): Promise<{
    metrics: DashboardSummary;
    trends: { metric: string; change: number; direction: "up" | "down" }[];
    highlights: string[];
  }> => fetchApi("/reports/executive-summary"),
};

// ============================================
// Copilot Analytics API (from GH Kusto cluster)
// ============================================

export interface CopilotStats {
  total_users: number;
  active_users: number;
  total_suggestions: number;
  total_completions: number;
  avg_acceptance_rate: number;
}

export interface CopilotLanguageUsage {
  language: string;
  users: number;
  suggestions: number;
  completions: number;
  avg_acceptance: number;
}

export interface CopilotDailyTrend {
  date: string;
  active_users: number;
  completions: number;
  acceptance_rate: number;
}

export interface CopilotLearnerImpact {
  learner_status: string;
  users: number;
  avg_completions: number;
  avg_acceptance: number;
}

export interface CopilotAnalytics {
  stats: CopilotStats;
  by_language: CopilotLanguageUsage[];
  trend: CopilotDailyTrend[];
  by_learner_status: CopilotLearnerImpact[];
}

export const copilotApi = {
  getStats: (): Promise<CopilotStats> =>
    fetchApi("/copilot/stats"),

  getByLanguage: (): Promise<CopilotLanguageUsage[]> =>
    fetchApi("/copilot/by-language"),

  getTrend: (days = 30): Promise<CopilotDailyTrend[]> =>
    fetchApi(`/copilot/trend?days=${days}`),

  getByLearnerStatus: (): Promise<CopilotLearnerImpact[]> =>
    fetchApi("/copilot/by-learner-status"),

  getAll: (): Promise<CopilotAnalytics> =>
    fetchApi("/copilot"),
};

// ============================================
// Health API
// ============================================

export const healthApi = {
  check: (): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    services: { name: string; status: string; latency?: number }[];
    lastSync?: string;
  }> => fetchApi("/health"),

  getPerformanceMetrics: (): Promise<{
    uptime: string;
    totalQueries: number;
    successRate: number;
    cacheHitRate: number;
    slowQueries: { query: string; timeMs: number; timestamp: string }[];
  }> => fetchApi("/health/performance"),
};
