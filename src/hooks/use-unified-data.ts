/**
 * Unified Data Hooks
 * 
 * Consolidated React Query hooks that:
 * 1. Check FastAPI backend first (real Kusto data)
 * 2. Fall back to Next.js API routes (aggregated data)
 * 3. Provide consistent typing and caching
 * 
 * Re-exports from use-queries.ts for backwards compatibility
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { 
  DashboardMetrics, 
  JourneyFunnelData, 
  LearnerStatusBreakdown,
  LearnerFilters,
  CertifiedUser,
  UnifiedUser,
  EnrichedLearner,
} from "@/types/data";

// ============================================================================
// Query Keys (centralized for cache management)
// ============================================================================

export const queryKeys = {
  // Dashboard
  metrics: ["metrics"] as const,
  dashboard: {
    summary: ["dashboard", "summary"] as const,
    recent: ["dashboard", "recent"] as const,
  },
  
  // Learners (enriched)
  learners: {
    all: ["learners"] as const,
    list: (filters?: LearnerFilters, page?: number) => ["learners", "list", filters, page] as const,
    detail: (id: string) => ["learners", id] as const,
    stats: ["learners", "stats"] as const,
  },
  
  // Journey
  journey: {
    all: ["journey"] as const,
    funnel: ["journey", "funnel"] as const,
    skills: ["journey", "skills"] as const,
    progression: ["journey", "progression"] as const,
  },
  
  // Copilot (Kusto: copilot_unified_engagement)
  copilot: {
    all: ["copilot"] as const,
    stats: ["copilot", "stats"] as const,
    byLanguage: ["copilot", "by-language"] as const,
    trend: (days?: number) => ["copilot", "trend", days] as const,
    byLearnerStatus: ["copilot", "by-learner-status"] as const,
  },
  
  // Impact
  impact: {
    all: ["impact"] as const,
    byStage: ["impact", "by-stage"] as const,
    products: ["impact", "products"] as const,
  },
  
  // Analytics
  analytics: {
    roi: ["analytics", "roi"] as const,
    certifications: ["analytics", "certifications"] as const,
    skills: ["analytics", "skills"] as const,
  },
  
  // Health
  health: ["health"] as const,
};

// ============================================================================
// Type Definitions
// ============================================================================

interface MetricsResponse {
  metrics: DashboardMetrics;
  funnel?: JourneyFunnelData[];
  statusBreakdown?: LearnerStatusBreakdown[];
  productAdoption?: {
    copilot: { before: number; after: number };
    actions: { before: number; after: number };
    security: { before: number; after: number };
    totalUsage: { before: number; after: number };
  };
  source?: "kusto" | "aggregated";
}

interface LearnersResponse {
  learners: (CertifiedUser | UnifiedUser)[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
  source?: "kusto" | "aggregated";
}

interface EnrichedLearnersResponse {
  learners: EnrichedLearner[];
  count: number;
  limit: number;
  offset: number;
  source: "duckdb" | "kusto";
}

interface CopilotStats {
  total_users: number;
  active_30d: number;
  active_7d: number;
  total_events: number;
  total_days_tracked: number;
  source?: "kusto" | "aggregated";
}

interface CopilotLanguageUsage {
  language: string;
  users: number;
  events: number;
  active_days?: number;
}

interface CopilotTrend {
  date: string;
  active_users: number;
  total_events?: number;
}

interface JourneyResponse {
  funnel: JourneyFunnelData[];
  avgTimeToCompletion?: number;
  stageVelocity?: Record<string, number>;
  dropOffAnalysis?: Array<{
    stage: string;
    count: number;
    dropOffRate: number;
    nextStage: string | null;
  }>;
  monthlyProgression?: Array<{
    name: string;
    learning: number;
    certified: number;
    multiCert: number;
  }>;
  totalJourneyUsers?: number;
  source?: "kusto" | "aggregated";
}

interface ImpactResponse {
  stageImpact: Array<{
    stage: string;
    learners: number;
    avgUsageIncrease: number;
    platformTimeIncrease: number;
    topProduct: string;
  }>;
  productAdoption: Array<{
    name: string;
    before: number;
    after: number;
  }>;
  correlationData: Array<{
    name: string;
    learningHours: number;
    productUsage: number;
    platformTime: number;
  }>;
  roiBreakdown: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  source?: "kusto" | "aggregated";
}

// ============================================================================
// Dashboard & Metrics Hooks
// ============================================================================

export function useMetrics() {
  return useQuery<MetricsResponse>({
    queryKey: queryKeys.metrics,
    queryFn: async () => {
      const res = await fetch("/api/metrics");
      if (!res.ok) throw new Error("Failed to fetch metrics");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ============================================================================
// Learners Hooks (Enriched Data)
// ============================================================================

export function useLearners(filters: LearnerFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.learnerStatus && filters.learnerStatus !== "all") {
    params.set("status", filters.learnerStatus);
  }
  if (filters.isCertified !== undefined && filters.isCertified !== "all") {
    params.set("certified", String(filters.isCertified));
  }
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));

  return useQuery<LearnersResponse>({
    queryKey: queryKeys.learners.list(filters, filters.page),
    queryFn: async () => {
      const res = await fetch(`/api/learners?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch learners");
      return res.json();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useLearnerStats() {
  return useQuery({
    queryKey: queryKeys.learners.stats,
    queryFn: async () => {
      const res = await fetch("/api/learners/stats");
      if (!res.ok) throw new Error("Failed to fetch learner stats");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Enriched Learners from FastAPI backend (DuckDB/Parquet)
 * Includes full enrichment: company, certifications, Copilot usage, data quality
 */
export function useEnrichedLearners(options: {
  search?: string;
  limit?: number;
  offset?: number;
  minQuality?: number;
} = {}) {
  const params = new URLSearchParams();
  if (options.search) params.set("search", options.search);
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset) params.set("offset", String(options.offset));
  if (options.minQuality) params.set("min_quality", String(options.minQuality));

  return useQuery<EnrichedLearnersResponse>({
    queryKey: ["enriched-learners", options],
    queryFn: async () => {
      // Try FastAPI backend first
      try {
        const res = await fetch(`http://localhost:8000/api/enriched/learners?${params.toString()}`);
        if (res.ok) {
          return res.json();
        }
      } catch {
        // Backend not available, fall through
      }
      
      // Fallback to Next.js proxy
      const res = await fetch(`/api/enriched/learners?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch enriched learners");
      return res.json();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Fetch a single enriched learner by email
 * Used for the learner profile page
 */
export function useEnrichedLearner(email: string) {
  return useQuery<EnrichedLearner | null>({
    queryKey: ["enriched-learner", email],
    queryFn: async () => {
      if (!email) return null;
      
      // Try FastAPI backend first
      try {
        const res = await fetch(`http://localhost:8000/api/enriched/learners?search=${encodeURIComponent(email)}&limit=1`);
        if (res.ok) {
          const data = await res.json();
          return data.learners?.[0] || null;
        }
      } catch {
        // Backend not available, fall through
      }
      
      // Fallback to Next.js proxy
      const res = await fetch(`/api/enriched/learners?search=${encodeURIComponent(email)}&limit=1`);
      if (!res.ok) throw new Error("Failed to fetch enriched learner");
      const data = await res.json();
      return data.learners?.[0] || null;
    },
    enabled: !!email,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Enriched stats from FastAPI backend
 */
export function useEnrichedStats() {
  return useQuery({
    queryKey: ["enriched-stats"],
    queryFn: async () => {
      // Try FastAPI backend first
      try {
        const res = await fetch("http://localhost:8000/api/enriched/stats");
        if (res.ok) {
          return res.json();
        }
      } catch {
        // Backend not available, fall through
      }
      
      // Fallback to Next.js proxy
      const res = await fetch("/api/enriched/stats");
      if (!res.ok) throw new Error("Failed to fetch enriched stats");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================================================
// Journey Hooks
// ============================================================================

export function useJourney() {
  return useQuery<JourneyResponse>({
    queryKey: queryKeys.journey.all,
    queryFn: async () => {
      const res = await fetch("/api/journey");
      if (!res.ok) throw new Error("Failed to fetch journey data");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useJourneyFunnel() {
  return useQuery({
    queryKey: queryKeys.journey.funnel,
    queryFn: async () => {
      const res = await fetch("/api/journey/funnel");
      if (!res.ok) throw new Error("Failed to fetch journey funnel");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================================================
// Copilot Hooks (Real Kusto Data from copilot_unified_engagement)
// ============================================================================

export function useCopilotStats() {
  return useQuery<CopilotStats>({
    queryKey: queryKeys.copilot.stats,
    queryFn: async () => {
      const res = await fetch("/api/copilot/stats");
      if (!res.ok) throw new Error("Failed to fetch copilot stats");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCopilotByLanguage() {
  return useQuery<CopilotLanguageUsage[]>({
    queryKey: queryKeys.copilot.byLanguage,
    queryFn: async () => {
      const res = await fetch("/api/copilot/by-language");
      if (!res.ok) throw new Error("Failed to fetch copilot by language");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCopilotTrend(days = 30) {
  return useQuery<CopilotTrend[]>({
    queryKey: queryKeys.copilot.trend(days),
    queryFn: async () => {
      const res = await fetch(`/api/copilot/trend?days=${days}`);
      if (!res.ok) throw new Error("Failed to fetch copilot trend");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCopilotByLearnerStatus() {
  return useQuery({
    queryKey: queryKeys.copilot.byLearnerStatus,
    queryFn: async () => {
      const res = await fetch("/api/copilot/by-learner-status");
      if (!res.ok) throw new Error("Failed to fetch copilot by learner status");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================================================
// Impact Hooks
// ============================================================================

export function useImpact() {
  return useQuery<ImpactResponse>({
    queryKey: queryKeys.impact.all,
    queryFn: async () => {
      const res = await fetch("/api/impact");
      if (!res.ok) throw new Error("Failed to fetch impact data");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useImpactByStage() {
  return useQuery({
    queryKey: queryKeys.impact.byStage,
    queryFn: async () => {
      const res = await fetch("/api/impact/by-stage");
      if (!res.ok) throw new Error("Failed to fetch impact by stage");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================================================
// Health Check Hook
// ============================================================================

interface HealthResponse {
  status: string;
  timestamp: string;
  backend: {
    available: boolean;
    url: string;
  };
  data: {
    aggregated: boolean;
    enriched: boolean;
  };
  dataSource: "kusto" | "aggregated" | "none";
}

export function useHealth() {
  return useQuery<HealthResponse>({
    queryKey: queryKeys.health,
    queryFn: async () => {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error("Health check failed");
      return res.json();
    },
    staleTime: 1000 * 30, // 30 seconds
    retry: false,
    refetchInterval: 1000 * 60, // Refresh every minute
  });
}

/**
 * Hook to get current data source status
 */
export function useDataSource() {
  const { data: health, isLoading } = useHealth();
  
  return {
    isLoading,
    isBackendAvailable: health?.backend?.available ?? false,
    dataSource: health?.dataSource ?? "aggregated",
    hasEnrichedData: health?.data?.enriched ?? false,
    hasAggregatedData: health?.data?.aggregated ?? false,
  };
}

// ============================================================================
// Re-export for backwards compatibility
// ============================================================================

export { useQueryClient };
