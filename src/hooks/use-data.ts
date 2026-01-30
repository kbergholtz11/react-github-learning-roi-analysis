"use client";

import { useQuery } from "@tanstack/react-query";
import type { 
  DashboardMetrics, 
  JourneyFunnelData, 
  LearnerStatusBreakdown,
  LearnerFilters,
  CertifiedUser,
  UnifiedUser,
} from "@/types/data";

// Dashboard metrics hook
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
}

export function useMetrics() {
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
  avgTimeToCompletion: number;
  stageVelocity: Record<string, number>;
  dropOffAnalysis: Array<{
    stage: string;
    count: number;
    dropOffRate: number;
    nextStage: string | null;
  }>;
  monthlyProgression: Array<{
    name: string;
    learning: number;
    certified: number;
    multiCert: number;
  }>;
  totalJourneyUsers: number;
}

export function useJourney() {
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
  }>;
  stageImpact: Array<{
    stage: string;
    learners: number;
    avgUsageIncrease: number;
    platformTimeIncrease: number;
    topProduct: string;
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

export function useImpact() {
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
  totalCourses: number;
  totalEnrollments: number;
  uniqueLearners: number;
  completedCourses: number;
  completionRate: number;
  byCategory: Array<{
    category: string;
    courses: number;
    totalForks: number;
    knownLearners: number;
  }>;
  popularCourses: Array<{
    name: string;
    category: string;
    difficulty: string;
    totalForks: number;
    knownLearners: number;
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

