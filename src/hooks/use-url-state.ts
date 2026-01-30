"use client";

/**
 * URL State Hooks
 * Sync filter state with URL query parameters for bookmarking and sharing
 */

import {
  useQueryState,
  parseAsString,
  parseAsInteger,
  parseAsBoolean,
  parseAsArrayOf,
  parseAsStringEnum,
} from "nuqs";

// ============================================
// Learner Explorer Filters
// ============================================

export type LearnerStatus =
  | "all"
  | "active"
  | "inactive"
  | "certified"
  | "in-progress";

export function useLearnerFilters() {
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("")
  );

  const [status, setStatus] = useQueryState(
    "status",
    parseAsStringEnum<LearnerStatus>([
      "all",
      "active",
      "inactive",
      "certified",
      "in-progress",
    ]).withDefault("all")
  );

  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1)
  );

  const [pageSize, setPageSize] = useQueryState(
    "pageSize",
    parseAsInteger.withDefault(20)
  );

  const [sortBy, setSortBy] = useQueryState(
    "sortBy",
    parseAsString.withDefault("name")
  );

  const [sortOrder, setSortOrder] = useQueryState(
    "sortOrder",
    parseAsStringEnum(["asc", "desc"] as const).withDefault("asc")
  );

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setPage(1);
    setSortBy("name");
    setSortOrder("asc");
  };

  const hasActiveFilters = search !== "" || status !== "all";

  return {
    // Values
    search,
    status,
    page,
    pageSize,
    sortBy,
    sortOrder,
    // Setters
    setSearch,
    setStatus,
    setPage,
    setPageSize,
    setSortBy,
    setSortOrder,
    // Helpers
    clearFilters,
    hasActiveFilters,
  };
}

// ============================================
// Date Range Filter
// ============================================

export function useDateRangeFilter() {
  const [startDate, setStartDate] = useQueryState(
    "from",
    parseAsString.withDefault("")
  );

  const [endDate, setEndDate] = useQueryState(
    "to",
    parseAsString.withDefault("")
  );

  const [preset, setPreset] = useQueryState(
    "range",
    parseAsStringEnum([
      "7d",
      "30d",
      "90d",
      "ytd",
      "all",
      "custom",
    ] as const).withDefault("30d")
  );

  const clearDateRange = () => {
    setStartDate("");
    setEndDate("");
    setPreset("30d");
  };

  return {
    startDate,
    endDate,
    preset,
    setStartDate,
    setEndDate,
    setPreset,
    clearDateRange,
  };
}

// ============================================
// Events Filter
// ============================================

export type EventStatus = "all" | "upcoming" | "past" | "ongoing";
export type EventType = "all" | "workshop" | "webinar" | "hackathon" | "training";

export function useEventsFilters() {
  const [search, setSearch] = useQueryState(
    "q",
    parseAsString.withDefault("")
  );

  const [status, setStatus] = useQueryState(
    "status",
    parseAsStringEnum<EventStatus>([
      "all",
      "upcoming",
      "past",
      "ongoing",
    ]).withDefault("all")
  );

  const [type, setType] = useQueryState(
    "type",
    parseAsStringEnum<EventType>([
      "all",
      "workshop",
      "webinar",
      "hackathon",
      "training",
    ]).withDefault("all")
  );

  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1)
  );

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setType("all");
    setPage(1);
  };

  return {
    search,
    status,
    type,
    page,
    setSearch,
    setStatus,
    setType,
    setPage,
    clearFilters,
    hasActiveFilters: search !== "" || status !== "all" || type !== "all",
  };
}

// ============================================
// Analytics Filters
// ============================================

export function useAnalyticsFilters() {
  const [metric, setMetric] = useQueryState(
    "metric",
    parseAsString.withDefault("completions")
  );

  const [groupBy, setGroupBy] = useQueryState(
    "groupBy",
    parseAsStringEnum(["day", "week", "month"] as const).withDefault("week")
  );

  const [comparison, setComparison] = useQueryState(
    "compare",
    parseAsBoolean.withDefault(false)
  );

  return {
    metric,
    groupBy,
    comparison,
    setMetric,
    setGroupBy,
    setComparison,
  };
}

// ============================================
// Tab State
// ============================================

export function useTabState(defaultTab: string = "overview") {
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsString.withDefault(defaultTab)
  );

  return { tab, setTab };
}

// ============================================
// View Mode
// ============================================

export type ViewMode = "table" | "grid" | "chart";

export function useViewMode(defaultMode: ViewMode = "table") {
  const [viewMode, setViewMode] = useQueryState(
    "view",
    parseAsStringEnum<ViewMode>(["table", "grid", "chart"]).withDefault(defaultMode)
  );

  return { viewMode, setViewMode };
}

// ============================================
// Multi-Select Tags
// ============================================

export function useTagsFilter(paramName: string = "tags") {
  const [tags, setTags] = useQueryState(
    paramName,
    parseAsArrayOf(parseAsString).withDefault([])
  );

  const addTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const clearTags = () => {
    setTags([]);
  };

  return {
    tags,
    setTags,
    addTag,
    removeTag,
    clearTags,
    hasTags: tags.length > 0,
  };
}
