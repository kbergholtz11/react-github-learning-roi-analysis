/**
 * Hooks Index
 * Central export for all custom hooks
 */

// Unified data fetching (recommended - includes FastAPI backend proxy)
export * from "./use-unified-data";

// Legacy hooks (for backwards compatibility)
// Note: use-queries has overlapping exports with use-unified-data
// Import specific hooks directly from use-queries if needed
export { 
  useDashboardSummary,
  useDashboardRecent,
  useJourneyFunnel,
  useProgressionStats,
  useCopilotMetrics,
  useROIMetrics,
  useCertificationStats,
  useSkillsDistribution,
  useProductAlignment,
  useUpcomingEvents,
  useHealthCheck,
} from "./use-queries";

export * from "./use-synced-queries";
// Note: use-data has duplicate exports, import directly if needed

// URL state management
export * from "./use-url-state";

// UI utilities
export * from "./use-mobile";
export * from "./use-debounce";
