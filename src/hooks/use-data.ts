"use client";

/**
 * @deprecated This hook file is deprecated. Use `use-unified-data.ts` instead.
 * The unified hooks provide:
 * - Enriched learner data with data quality scores
 * - Automatic FastAPI backend → Next.js fallback
 * - Better TypeScript types
 * 
 * Migration guide:
 * - useMetrics → useMetrics from use-unified-data.ts (same API)
 * - useLearners → useEnrichedLearners for full enrichment
 * - useCopilotInsights → useCopilotStats for live Kusto data
 */

import { useQuery } from "@tanstack/react-query";
import type { 
  DashboardMetrics, 
  JourneyFunnelData, 
  LearnerStatusBreakdown,
  LearnerFilters,
  CertifiedUser,
  UnifiedUser,
} from "@/types/data";

// Deprecation warning helper
const warnDeprecated = (hookName: string, replacement: string) => {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.warn(
      `[DEPRECATED] ${hookName} is deprecated. Use ${replacement} from '@/hooks/use-unified-data' instead.`
    );
  }
};

// Dashboard metrics hook
interface CertificationPassRate {
  certification: string;
  passed: number;
  failed: number;
  totalAttempts: number;
  passRate: number;
}

interface ExamStatusCounts {
  Passed: number;
  Failed: number;
  "No Show": number;
  Scheduled: number;
  Cancelled: number;
  Registered: number;
}

interface CertificationAnalytics {
  examStatusCounts: ExamStatusCounts;
  certificationPassRates: CertificationPassRate[];
  summary: {
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
  // Retry attempt tracking
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
  // Near-miss segment
  nearMissSegment?: {
    nearMissCount: number;
    nearMissThreshold: string;
    moderateGapCount: number;
    needsPrepCount: number;
    nearMissByCertification: { certification: string; count: number }[];
  };
  // Exam forecasting
  examForecast?: {
    totalScheduledNext3Months: number;
    projectedPassesNext3Months: number;
    monthlyForecast: {
      month: string;
      scheduled: number;
      projectedPasses: number;
      projectedPassRate: number;
      byCertification: { certification: string; scheduled: number }[];
    }[];
  };
}

interface MetricsResponse {
  metrics: DashboardMetrics;
  funnel: JourneyFunnelData[];
  statusBreakdown: LearnerStatusBreakdown[];
  productAdoption: {
    copilot: { before: number; after: number };
    actions: { before: number; after: number };
    security: { before: number; after: number };
    totalUsage: { before: number; after: number };
  };
  certificationAnalytics?: CertificationAnalytics;
}

/**
 * @deprecated Use `useMetrics` from `@/hooks/use-unified-data` instead.
 */
export function useMetrics() {
  warnDeprecated("useMetrics", "useMetrics");
  return useQuery<MetricsResponse>({
    queryKey: ["metrics"],
    queryFn: async () => {
      const res = await fetch("/api/metrics");
      if (!res.ok) throw new Error("Failed to fetch metrics");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Learners list hook
interface LearnersResponse {
  learners: (CertifiedUser | UnifiedUser)[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * @deprecated Use `useEnrichedLearners` from `@/hooks/use-unified-data` for full enrichment.
 */
export function useLearners(filters: LearnerFilters = {}) {
  warnDeprecated("useLearners", "useEnrichedLearners");
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
    queryKey: ["learners", filters],
    queryFn: async () => {
      const res = await fetch(`/api/learners?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch learners");
      return res.json();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Journey data hook
interface JourneyResponse {
  funnel: JourneyFunnelData[];
  legacyFunnel?: JourneyFunnelData[];
  avgTimeToCompletion: number;
  stageVelocity: Record<string, number>;
  progressionAnalysis?: Array<{
    stage: string;
    count: number;
    description?: string;
    conversionRate: number;
    dropOffRate: number;
    nextStage: string | null;
    avgDaysInStage?: number;
  }>;
  dropOffAnalysis: Array<{
    stage: string;
    count: number;
    dropOffRate: number;
    nextStage: string | null;
  }>;
  milestones?: Record<string, number>;
  monthlyProgression: Array<{
    name: string;
    learning?: number;
    certified?: number;
    multiCert?: number;
    discovered?: number;
  }>;
  totalJourneyUsers: number;
  dataSourceCounts?: {
    githubLearn: number;
    githubActivity: number;
    skillsEnrollments: number;
    certifiedUsers: number;
    learnersEnriched?: number;
  };
}

/**
 * @deprecated Use `useJourney` from `@/hooks/use-unified-data` instead.
 */
export function useJourney() {
  warnDeprecated("useJourney", "useJourney");
  return useQuery<JourneyResponse>({
    queryKey: ["journey"],
    queryFn: async () => {
      const res = await fetch("/api/journey");
      if (!res.ok) throw new Error("Failed to fetch journey data");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

// Impact data hook
interface ImpactResponse {
  impactFlow: {
    learningHours: number;
    skillsAcquired: number;
    productAdoption: number;
    timeOnPlatform: number;
  };
  productAdoption: Array<{
    name: string;
    before: number;
    after: number;
    increase?: number;
    learningCount?: number;
    certifiedCount?: number;
  }>;
  stageImpact: Array<{
    stage: string;
    learners: number;
    avgUsageIncrease: number;
    platformTimeIncrease: number;
    topProduct: string;
    adoptionRate?: number;
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
  metrics: {
    activeLearners: number;
    avgUsageIncrease: number;
    featuresAdopted: number;
    timeToValue: number;
  };
}

/**
 * @deprecated Use `useImpact` from `@/hooks/use-unified-data` instead.
 */
export function useImpact() {
  warnDeprecated("useImpact", "useImpact");
  return useQuery<ImpactResponse>({
    queryKey: ["impact"],
    queryFn: async () => {
      const res = await fetch("/api/impact");
      if (!res.ok) throw new Error("Failed to fetch impact data");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

// Skill Journey data hook (new skill-focused model)
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

// Top skilled learners hook
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

// =============================================================================
// Enrichment Data Hooks (Copilot, GitHub Activity, Skills Courses)
// =============================================================================

// Copilot metrics
interface CopilotLanguage {
  language: string;
  users: number;
  suggestions: number;
  acceptances: number;
  acceptanceRate: number;
  linesAccepted: number;
}

interface CopilotByLearnerStatus {
  learner_status: string;
  copilot_users: number;
  total_users: number;
  adoption_rate: number;
}

interface CopilotInsights {
  languages: CopilotLanguage[];
  totals: {
    totalLanguages: number;
    totalSuggestions: number;
    totalAcceptances: number;
    avgAcceptanceRate: number;
  };
  topLanguages: string[];
  generatedAt: string;
  // Extended properties from enriched data source
  source?: "enriched" | "sample";
  stats?: {
    totalLearners: number;
    copilotUsers: number;
    adoptionRate: number;
  };
  byLearnerStatus?: CopilotByLearnerStatus[];
}

export function useCopilotInsights() {
  return useQuery<CopilotInsights>({
    queryKey: ["copilotInsights"],
    queryFn: async () => {
      const res = await fetch("/api/copilot");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to fetch Copilot insights");
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 10,
    retry: false, // Don't retry if data not available
  });
}

// GitHub activity
interface GitHubActivityData {
  totalUsersWithActivity: number;
  totals: {
    commits: number;
    prsOpened: number;
    prsMerged: number;
    issuesOpened: number;
    codeReviews: number;
  };
  averages: {
    commitsPerUser: number;
    prsPerUser: number;
    activityDays: number;
  };
  topContributors: Array<{
    handle: string;
    commits: number;
    prsOpened: number;
    codeReviews: number;
  }>;
  generatedAt: string;
}

export function useGitHubActivity() {
  return useQuery<GitHubActivityData>({
    queryKey: ["githubActivity"],
    queryFn: async () => {
      const res = await fetch("/api/activity");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to fetch GitHub activity");
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 10,
    retry: false,
  });
}

// Skills courses
interface SkillsCourseData {
  // Total stats (all users worldwide)
  totalCourses: number;
  totalEnrollments: number;  // All forks worldwide
  totalUniqueLearners: number;  // Unique users from fetched data
  
  // Known learner stats (users in our system)
  knownEnrollments: number;
  uniqueKnownLearners: number;
  completedCourses: number;
  totalCommits: number;
  completionRate: number;
  knownLearnerRatio: number;  // % of total that are known
  
  byCategory: Array<{
    category: string;
    courses: number;
    totalForks: number;
    totalUsers: number;
    knownLearners: number;
    uniqueKnownUsers: number;
    activeUsers: number;
    completedUsers: number;
    totalCommits: number;
    avgCommitsPerUser: number;
    completionRate: number;
    knownRatio: number;
  }>;
  byDifficulty: Array<{
    difficulty: string;
    courses: number;
    totalForks: number;
    totalEnrollments: number;
    knownEnrollments: number;
    completed: number;
    avgCommits: number;
  }>;
  courseFunnels: Array<{
    name: string;
    category: string;
    difficulty: string;
    repo: string;
    funnel: {
      forked: number;
      fetched: number;
      knownLearners: number;
      active: number;
      completed: number;
    };
    rates: {
      activityRate: number;
      completionRate: number;
      overallCompletionRate: number;
      knownRatio: number;
    };
    avgCommits: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    total: number;
    known?: number;
    completed?: number;
    byCategory: Record<string, number>;
  }>;
  knownMonthlyTrends?: Array<{
    month: string;
    total: number;
    completed: number;
    byCategory: Record<string, number>;
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
    totalCommits: number;
    categories: string[];
    firstEnrollment: string | null;
    lastEnrollment: string | null;
  }>;
  generatedAt: string;
}

export function useSkillsCourses() {
  return useQuery<SkillsCourseData>({
    queryKey: ["skillsCourses"],
    queryFn: async () => {
      const res = await fetch("/api/skills");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to fetch Skills courses");
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 10,
    retry: false,
  });
}

// Combined enrichment data check
interface EnrichmentStatus {
  copilot: CopilotInsights | null;
  githubActivity: GitHubActivityData | null;
  skillsCourses: SkillsCourseData | null;
  availableData: {
    copilot: boolean;
    githubActivity: boolean;
    skillsCourses: boolean;
  };
  message: string;
}

export function useEnrichmentData() {
  return useQuery<EnrichmentStatus>({
    queryKey: ["enrichmentData"],
    queryFn: async () => {
      const res = await fetch("/api/enrichment");
      if (!res.ok) throw new Error("Failed to fetch enrichment data");
      return res.json();
    },
    staleTime: 1000 * 60 * 10,
  });
}

