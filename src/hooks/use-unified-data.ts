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

// Backend URL - uses env var in production, falls back to localhost in development
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

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

interface CertificationAnalytics {
  examStatusCounts?: Record<string, number>;
  certificationPassRates?: Array<{
    certification: string;
    passed: number;
    failed: number;
    totalAttempts: number;
    passRate: number;
  }>;
  summary?: {
    totalExamAttempts: number;
    totalPassed: number;
    totalFailed: number;
    totalNoShows: number;
    totalScheduled: number;
    totalCancelled: number;
    overallPassRate: number;
    totalUsersWithAttempts: number;
    totalUsersRegisteredOnly: number;
    avgPassedScore: number;
    avgFailedScore: number;
  };
  retryAnalytics?: {
    uniqueCertAttempts: number;
    firstTimePasses: number;
    firstTimePassRate: number;
    failedFirstTimeCount: number;
    retriedAndPassed: number;
    retrySuccessRate: number;
    avgAttemptsToPass: number;
    attemptDistribution: {
      firstTry: number;
      secondTry: number;
      thirdTry: number;
      fourPlusTries: number;
    };
  };
  nearMissSegment?: {
    nearMissCount: number;
    nearMissThreshold: string;
    moderateGapCount: number;
    needsPrepCount: number;
    nearMissByCertification: { certification: string; count: number }[];
  };
  examForecast?: {
    totalScheduledNext3Months: number;
    projectedAttemptsNext3Months?: number;
    projectedPassesNext3Months: number;
    avgMonthlyGrowthRate?: number;
    forecastMethod?: string;
    historicalTrend?: {
      month: string;
      actual: number;
      passed: number;
      failed: number;
      noShows: number;
      passRate: number;
    }[];
    monthlyForecast?: {
      month: string;
      scheduled: number;
      projectedAttempts?: number;
      projectedPasses: number;
      projectedPassRate: number;
      confidence?: number;
      forecastMethod?: string;
      byCertification: { certification: string; scheduled: number }[];
    }[];
  };
  geographicBreakdown?: {
    regionBreakdown?: Array<{ region: string; certifiedUsers: number; totalCerts: number; percentage: number }>;
    topCountries?: Array<{ country: string; region: string; certifiedUsers: number; totalCerts: number; percentage: number }>;
    countriesByRegion?: Record<string, Array<{ country: string; certifiedUsers: number; totalCerts: number; percentage: number }>>;
    topCompanies?: Array<{ company: string; certifiedUsers: number; totalCerts: number; percentage: number }>;
    totalCertified?: number;
  };
}

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
  certificationAnalytics?: CertificationAnalytics;
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
  total_count: number;
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
  legacyFunnel?: JourneyFunnelData[];
  avgTimeToCompletion?: number;
  stageVelocity?: Record<string, number>;
  progressionAnalysis?: Array<{
    stage: string;
    count: number;
    description?: string;
    conversionRate: number;
    dropOffRate: number;
    nextStage: string | null;
    avgDaysInStage?: number;
  }>;
  dropOffAnalysis?: Array<{
    stage: string;
    count: number;
    dropOffRate: number;
    nextStage: string | null;
  }>;
  milestones?: Record<string, number>;
  monthlyProgression?: Array<{
    name: string;
    learning?: number;
    certified?: number;
    multiCert?: number;
    discovered?: number;
  }>;
  totalJourneyUsers?: number;
  dataSourceCounts?: {
    githubLearn: number;
    githubActivity: number;
    skillsEnrollments: number;
    certifiedUsers: number;
    learnersEnriched?: number;
  };
  source?: "kusto" | "aggregated";
}

interface ImpactResponse {
  impactFlow?: {
    learningHours: number;
    skillsAcquired: number;
    productAdoption: number;
    timeOnPlatform: number;
  };
  metrics?: {
    avgUsageIncrease: number;
    featuresAdopted: number;
    activeLearners: number;
    timeToValue: number;
  };
  stageImpact: Array<{
    stage: string;
    learners: number;
    avgUsageIncrease: number;
    platformTimeIncrease: number;
    topProduct: string;
    adoptionRate?: number;
  }>;
  productAdoption: Array<{
    name: string;
    before: number;
    after: number;
    increase?: number;
    learningCount?: number;
    certifiedCount?: number;
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
// Placeholder Data (for instant loading while fetching fresh data)
// ============================================================================

const PLACEHOLDER_METRICS: MetricsResponse = {
  metrics: {
    totalLearners: 0,
    activeLearners: 0,
    certifiedUsers: 0,
    learningUsers: 0,
    prospectUsers: 0,
    avgUsageIncrease: 0,
    avgProductsAdopted: 0,
    impactScore: 0,
    avgLearningHours: 0,
    retentionRate: 0,
    totalLearningHours: 0,
    totalCertsEarned: 0,
  },
  funnel: [],
  statusBreakdown: [],
  source: "aggregated",
};

const PLACEHOLDER_SEGMENTS: SegmentCounts = {
  all: 0,
  at_risk: 0,
  rising_stars: 0,
  ready_to_advance: 0,
  inactive: 0,
  high_value: 0,
};

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
    placeholderData: PLACEHOLDER_METRICS,
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
    placeholderData: (previousData) => previousData, // Keep stale data while fetching
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
 * Segment counts for Talent Intelligence dashboard
 * Returns accurate counts across all 367K learners
 */
export interface SegmentCounts {
  all: number;
  at_risk: number;
  rising_stars: number;
  ready_to_advance: number;
  inactive: number;
  high_value: number;
}

export function useSegmentCounts() {
  return useQuery<SegmentCounts>({
    queryKey: ["segment-counts"],
    placeholderData: PLACEHOLDER_SEGMENTS,
    queryFn: async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/enriched/stats/segments`);
        if (res.ok) {
          return res.json();
        }
      } catch {
        // Backend not available
      }
      // Return zeros as fallback
      return { all: 0, at_risk: 0, rising_stars: 0, ready_to_advance: 0, inactive: 0, high_value: 0 };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - segments don't change often
  });
}

/**
 * Enriched Learners from FastAPI backend (DuckDB/Parquet)
 * Includes full enrichment: company, certifications, Copilot usage, data quality
 */
export function useEnrichedLearners(options: {
  search?: string;
  segment?: string;
  limit?: number;
  offset?: number;
  minQuality?: number;
} = {}) {
  const params = new URLSearchParams();
  if (options.search) params.set("search", options.search);
  if (options.segment && options.segment !== "all") params.set("segment", options.segment);
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset) params.set("offset", String(options.offset));
  if (options.minQuality) params.set("min_quality", String(options.minQuality));

  return useQuery<EnrichedLearnersResponse>({
    queryKey: ["enriched-learners", options],
    queryFn: async () => {
      // Try FastAPI backend first
      try {
        const res = await fetch(`${BACKEND_URL}/api/enriched/learners?${params.toString()}`);
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
        const res = await fetch(`${BACKEND_URL}/api/enriched/learners?search=${encodeURIComponent(email)}&limit=1`);
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
        const res = await fetch(`${BACKEND_URL}/api/enriched/stats`);
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

/**
 * Skill maturity distribution from FastAPI backend
 * Returns aggregated counts for all learners, not a paginated sample
 */
export interface SkillMaturityDistribution {
  distribution: Array<{
    level: string;
    count: number;
    percentage: number;
    avgScore: number;
    copilot_pct: number;
    actions_pct: number;
    security_pct: number;
    avg_products: number;
    avg_certs: number;
  }>;
  total: number;
  avgScore: number;
}

export function useSkillMaturityStats() {
  return useQuery<SkillMaturityDistribution>({
    queryKey: ["enriched-skill-maturity"],
    queryFn: async () => {
      // Try FastAPI backend first
      try {
        const res = await fetch(`${BACKEND_URL}/api/enriched/stats/skill-maturity`);
        if (res.ok) {
          return res.json();
        }
      } catch {
        // Backend not available, fall through
      }
      
      // Fallback to Next.js proxy
      const res = await fetch("/api/enriched/stats/skill-maturity");
      if (!res.ok) throw new Error("Failed to fetch skill maturity stats");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Product adoption stats from FastAPI backend
 * Returns aggregated adoption rates for all learners
 */
export interface ProductAdoptionStats {
  products: Array<{
    key: string;
    name: string;
    users90d: number;
    usersEver: number;
    rate90d: number;
    rateEver: number;
  }>;
  total_learners: number;
  avg_products: number;
}

export function useProductAdoptionStats() {
  return useQuery<ProductAdoptionStats>({
    queryKey: ["enriched-product-adoption"],
    queryFn: async () => {
      // Try FastAPI backend first
      try {
        const res = await fetch(`${BACKEND_URL}/api/enriched/stats/product-adoption`);
        if (res.ok) {
          return res.json();
        }
      } catch {
        // Backend not available, fall through
      }
      
      // Fallback to Next.js proxy
      const res = await fetch("/api/enriched/stats/product-adoption");
      if (!res.ok) throw new Error("Failed to fetch product adoption stats");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Product adoption before/after certification comparison
 * Compares Learning status (pre-cert) vs Certified+ (post-cert) for all 10 products
 */
export interface ProductAdoptionByCertification {
  products: Array<{
    name: string;
    key: string;
    category: string;
    before?: number;       // 90-day rate before cert (only for copilot, actions, security)
    after?: number;        // 90-day rate after cert
    before_ever: number;   // 365-day rate before cert
    after_ever: number;    // 365-day rate after cert
    change: number;        // after - before (uses 90d if available, else 365d)
    change_pct: number;    // percentage change
  }>;
  learning_count: number;
  certified_count: number;
  methodology: string;
  note: string;
}

export function useProductAdoptionByCertification() {
  return useQuery<ProductAdoptionByCertification>({
    queryKey: ["enriched-product-adoption-by-certification"],
    queryFn: async () => {
      // Try FastAPI backend first
      try {
        const res = await fetch(`${BACKEND_URL}/api/enriched/stats/product-adoption-by-certification`);
        if (res.ok) {
          return res.json();
        }
      } catch {
        // Backend not available, fall through
      }
      
      // Fallback to Next.js proxy
      const res = await fetch("/api/enriched/stats/product-adoption-by-certification");
      if (!res.ok) throw new Error("Failed to fetch product adoption by certification");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Certified learner adoption by tenure (time since certification)
 * Shows the FULL certification journey: pre-cert → recent → established → veteran
 */
export interface CertifiedAdoptionByTenure {
  tenure_groups: Array<{
    tenure: string;
    label: string;
    description?: string;
    count: number;
    avg_days_since_cert: number | null;
    avg_certs: number;
    avg_skills?: number;
    avg_learn_views?: number;
    products: {
      copilot: { rate_90d: number; rate_ever: number; avg_days: number };
      actions: { rate_90d: number; rate_ever: number; avg_days: number };
      security: { rate_90d: number; rate_ever: number };
      pr: { rate_ever: number };
      issues: { rate_ever: number };
      code_search: { rate_ever: number };
      packages: { rate_ever: number };
      projects: { rate_ever: number };
      discussions: { rate_ever: number };
      pages: { rate_ever: number };
    };
    avg_active_days: number;
    avg_products: number;
  }>;
  total_certified: number;
  total_pre_cert?: number;
  methodology: string;
  note: string;
}

export function useCertifiedAdoptionByTenure() {
  return useQuery<CertifiedAdoptionByTenure>({
    queryKey: ["certified-adoption-by-tenure"],
    queryFn: async () => {
      // Try FastAPI backend first
      try {
        const res = await fetch(`${BACKEND_URL}/api/enriched/stats/certified-adoption-by-tenure`);
        if (res.ok) {
          return res.json();
        }
      } catch {
        // Backend not available, fall through
      }
      
      // Fallback to Next.js proxy
      const res = await fetch("/api/enriched/stats/certified-adoption-by-tenure");
      if (!res.ok) throw new Error("Failed to fetch certified adoption by tenure");
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
// Skill Journey Hooks
// ============================================================================

interface SkillFunnelStage {
  level: string;
  count: number;
  percentage: number;
  avgScore: number;
  color: string;
  description: string;
}

interface SkillJourneyResponse {
  funnel: SkillFunnelStage[];
  totalLearners: number;
  avgSkillScore: number;
  skillDistribution: Record<string, number>;
  dimensionAverages: Record<string, number>;
  growthMetrics: {
    growing_learners: number;
    growing_percentage: number;
    active_30_days: number;
    active_percentage: number;
    with_certifications: number;
    cert_percentage: number;
  };
  weights: Record<string, number>;
}

export function useSkillJourney() {
  return useQuery<SkillJourneyResponse>({
    queryKey: ["skillJourney"],
    queryFn: async () => {
      const res = await fetch("/api/journey/skills");
      if (!res.ok) throw new Error("Failed to fetch skill journey data");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

interface SkillLearner {
  handle: string;
  dotcomId: number;
  skillScore: number;
  skillLevel: string;
  dimensions: Record<string, { raw: number; weighted: number }>;
  learningHours: number;
  productUsageHours: number;
  totalCerts: number;
  isGrowing: boolean;
}

interface TopSkillLearnersResponse {
  learners: SkillLearner[];
  total: number;
}

export function useTopSkilledLearners(limit = 10) {
  return useQuery<TopSkillLearnersResponse>({
    queryKey: ["topSkilledLearners", limit],
    queryFn: async () => {
      const res = await fetch(`/api/journey/skills/top?limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch top skilled learners");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================================================
// Skills Courses Hook
// ============================================================================

interface SkillsCourseData {
  totalCourses: number;
  totalEnrollments: number;
  totalUniqueLearners: number;
  knownEnrollments: number;
  uniqueKnownLearners: number;
  completedCourses: number;
  totalCommits: number;
  completionRate: number;
  knownLearnerRatio: number;
  byCategory: Array<{
    category: string;
    courses: number;
    totalForks: number;
    knownLearners: number;
    completionRate: number;
  }>;
  popularCourses: Array<{
    name: string;
    category: string;
    difficulty: string;
    totalForks: number;
    knownLearners: number;
    completionRate: number;
  }>;
  topSkillLearners: Array<{
    handle: string;
    coursesStarted: number;
    coursesCompleted: number;
    categories: string[];
  }>;
  generatedAt: string;
}

export function useSkillsCourses() {
  return useQuery<SkillsCourseData>({
    queryKey: ["skillsCourses"],
    queryFn: async () => {
      const res = await fetch("/api/skills");
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to fetch Skills courses");
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 10,
    retry: false,
  });
}

// ============================================================================
// Re-export for backwards compatibility
// ============================================================================

export { useQueryClient };
