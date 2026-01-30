"use client";

/**
 * React Query hooks with URL state synchronization
 * Combines use-url-state with react-query for bookmarkable, shareable filtered views
 */

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  useLearnerFilters,
  useEventsFilters,
  useDateRangeFilter,
  useAnalyticsFilters,
} from "./use-url-state";
import { learnersApi, eventsApi, analyticsApi } from "@/lib/api";
import { queryKeys } from "./use-queries";

// ============================================
// Learners with URL-synced Filters
// ============================================

export function useLearnersWithFilters() {
  const filters = useLearnerFilters();
  
  // Create stable filters object for React Query
  const queryFilters = useMemo(
    () => ({
      search: filters.search || undefined,
      status: filters.status === "all" ? undefined : filters.status,
      page: filters.page,
      pageSize: filters.pageSize,
    }),
    [filters.search, filters.status, filters.page, filters.pageSize]
  );

  const query = useQuery({
    queryKey: queryKeys.learners.list(queryFilters, filters.page),
    queryFn: () => learnersApi.getAll(queryFilters, filters.page, filters.pageSize),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    ...query,
    filters,
    // Convenience methods
    setSearch: (search: string) => {
      filters.setSearch(search);
      filters.setPage(1); // Reset to first page on search
    },
    setStatus: (status: Parameters<typeof filters.setStatus>[0]) => {
      filters.setStatus(status);
      filters.setPage(1); // Reset to first page on filter change
    },
  };
}

// ============================================
// Events with URL-synced Filters
// ============================================

export function useEventsWithFilters() {
  const filters = useEventsFilters();
  
  const query = useQuery({
    queryKey: ["events", "list", filters.search, filters.status, filters.type, filters.page],
    queryFn: () => eventsApi.getAll(filters.page),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    ...query,
    filters,
    setSearch: (search: string) => {
      filters.setSearch(search);
      filters.setPage(1);
    },
  };
}

// ============================================
// Analytics with URL-synced Parameters
// ============================================

export function useAnalyticsWithFilters() {
  const analyticsFilters = useAnalyticsFilters();
  const dateRange = useDateRangeFilter();

  // Convert preset to days
  const days = useMemo(() => {
    switch (dateRange.preset) {
      case "7d":
        return 7;
      case "30d":
        return 30;
      case "90d":
        return 90;
      case "ytd": {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
      }
      default:
        return 30;
    }
  }, [dateRange.preset]);

  const roiQuery = useQuery({
    queryKey: [...queryKeys.analytics.roi, days],
    queryFn: () => analyticsApi.getROIMetrics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const skillsQuery = useQuery({
    queryKey: [...queryKeys.analytics.skills, days],
    queryFn: () => analyticsApi.getSkillsDistribution(),
    staleTime: 5 * 60 * 1000,
  });

  return {
    roi: roiQuery,
    skills: skillsQuery,
    filters: {
      ...analyticsFilters,
      ...dateRange,
      days,
    },
  };
}

// ============================================
// Shareable URL Builder
// ============================================

export function useShareableUrl() {
  return {
    /**
     * Get the current URL with all query params
     */
    getCurrentUrl: () => {
      if (typeof window !== "undefined") {
        return window.location.href;
      }
      return "";
    },

    /**
     * Copy current URL to clipboard
     */
    copyToClipboard: async () => {
      if (typeof window !== "undefined") {
        try {
          await navigator.clipboard.writeText(window.location.href);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    },

    /**
     * Build a shareable URL with specific params
     */
    buildUrl: (params: Record<string, string | number | boolean | undefined>) => {
      if (typeof window === "undefined") return "";
      
      const url = new URL(window.location.href);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, String(value));
        } else {
          url.searchParams.delete(key);
        }
      });
      return url.toString();
    },
  };
}
