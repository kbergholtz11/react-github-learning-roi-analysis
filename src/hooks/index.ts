/**
 * Hooks Index
 * Central export for all custom hooks
 */

// Unified data fetching (recommended - includes FastAPI backend proxy)
export * from "./use-unified-data";

// Legacy hooks (for backwards compatibility)
export * from "./use-queries";
export * from "./use-synced-queries";
// Note: use-data has duplicate exports, import directly if needed

// URL state management
export * from "./use-url-state";

// UI utilities
export * from "./use-mobile";
