/**
 * React Query hooks for data fetching
 * These hooks wrap the API service with caching and state management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  dashboardApi,
  learnersApi,
  analyticsApi,
  eventsApi,
  alertsApi,
  reportsApi,
  healthApi,
} from "@/lib/api";
import type { LearnerFilters } from "@/types";

// Query keys for cache management
export const queryKeys = {
  dashboard: {
    summary: ["dashboard", "summary"] as const,
    recent: ["dashboard", "recent"] as const,
  },
  learners: {
    all: ["learners"] as const,
    list: (filters?: LearnerFilters, page?: number) => ["learners", "list", filters, page] as const,
    detail: (id: string) => ["learners", id] as const,
    funnel: ["learners", "funnel"] as const,
    progression: ["learners", "progression"] as const,
  },
  analytics: {
    copilot: ["analytics", "copilot"] as const,
    roi: ["analytics", "roi"] as const,
    certifications: ["analytics", "certifications"] as const,
    skills: ["analytics", "skills"] as const,
    alignment: ["analytics", "alignment"] as const,
  },
  events: {
    all: ["events"] as const,
    list: (page?: number) => ["events", "list", page] as const,
    detail: (id: string) => ["events", id] as const,
    upcoming: ["events", "upcoming"] as const,
    stats: ["events", "stats"] as const,
  },
  alerts: {
    all: ["alerts"] as const,
    rules: ["alerts", "rules"] as const,
  },
  health: {
    check: ["health"] as const,
    performance: ["health", "performance"] as const,
  },
};

// ============================================
// Dashboard Hooks
// ============================================

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: dashboardApi.getSummary,
  });
}

export function useDashboardRecent() {
  return useQuery({
    queryKey: queryKeys.dashboard.recent,
    queryFn: dashboardApi.getRecentActivity,
  });
}

// ============================================
// Learners Hooks
// ============================================

export function useLearners(filters?: LearnerFilters, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: queryKeys.learners.list(filters, page),
    queryFn: () => learnersApi.getAll(filters, page, pageSize),
  });
}

export function useLearner(id: string) {
  return useQuery({
    queryKey: queryKeys.learners.detail(id),
    queryFn: () => learnersApi.getById(id),
    enabled: !!id,
  });
}

export function useJourneyFunnel() {
  return useQuery({
    queryKey: queryKeys.learners.funnel,
    queryFn: learnersApi.getJourneyFunnel,
  });
}

export function useProgressionStats() {
  return useQuery({
    queryKey: queryKeys.learners.progression,
    queryFn: learnersApi.getProgressionStats,
  });
}

// ============================================
// Analytics Hooks
// ============================================

export function useCopilotMetrics() {
  return useQuery({
    queryKey: queryKeys.analytics.copilot,
    queryFn: analyticsApi.getCopilotMetrics,
  });
}

export function useROIMetrics() {
  return useQuery({
    queryKey: queryKeys.analytics.roi,
    queryFn: analyticsApi.getROIMetrics,
  });
}

export function useCertificationStats() {
  return useQuery({
    queryKey: queryKeys.analytics.certifications,
    queryFn: analyticsApi.getCertificationStats,
  });
}

export function useSkillsDistribution() {
  return useQuery({
    queryKey: queryKeys.analytics.skills,
    queryFn: analyticsApi.getSkillsDistribution,
  });
}

export function useProductAlignment() {
  return useQuery({
    queryKey: queryKeys.analytics.alignment,
    queryFn: analyticsApi.getProductAlignment,
  });
}

// ============================================
// Events Hooks
// ============================================

export function useEvents(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: queryKeys.events.list(page),
    queryFn: () => eventsApi.getAll(page, pageSize),
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: queryKeys.events.detail(id),
    queryFn: () => eventsApi.getById(id),
    enabled: !!id,
  });
}

export function useUpcomingEvents(limit = 5) {
  return useQuery({
    queryKey: queryKeys.events.upcoming,
    queryFn: () => eventsApi.getUpcoming(limit),
  });
}

export function useEventStats() {
  return useQuery({
    queryKey: queryKeys.events.stats,
    queryFn: eventsApi.getStats,
  });
}

// ============================================
// Alerts Hooks
// ============================================

export function useAlerts() {
  return useQuery({
    queryKey: queryKeys.alerts.all,
    queryFn: alertsApi.getAll,
  });
}

export function useAlertRules() {
  return useQuery({
    queryKey: queryKeys.alerts.rules,
    queryFn: alertsApi.getRules,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: alertsApi.acknowledge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
    },
  });
}

export function useUpdateAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof alertsApi.updateRule>[1] }) =>
      alertsApi.updateRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.rules });
    },
  });
}

// ============================================
// Reports Hooks
// ============================================

export function useExportData() {
  return useMutation({
    mutationFn: reportsApi.exportData,
  });
}

export function useExecutiveSummary() {
  return useQuery({
    queryKey: ["reports", "executive-summary"],
    queryFn: reportsApi.getExecutiveSummary,
  });
}

// ============================================
// Health Hooks
// ============================================

export function useHealthCheck() {
  return useQuery({
    queryKey: queryKeys.health.check,
    queryFn: healthApi.check,
    refetchInterval: 60000, // Refetch every minute
  });
}

export function usePerformanceMetrics() {
  return useQuery({
    queryKey: queryKeys.health.performance,
    queryFn: healthApi.getPerformanceMetrics,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
