/**
 * Backend Proxy - Routes requests to FastAPI backend when available
 * Falls back to Next.js local data when backend is unavailable
 */

// FastAPI backend URL (configurable via environment)
const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

// Check if FastAPI backend is available (cached for 30 seconds)
let backendAvailable: boolean | null = null;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

export async function isBackendAvailable(): Promise<boolean> {
  const now = Date.now();
  
  // Use cached result if recent
  if (backendAvailable !== null && now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return backendAvailable;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${FASTAPI_URL}/health`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    backendAvailable = response.ok;
    lastHealthCheck = now;
    return backendAvailable;
  } catch {
    backendAvailable = false;
    lastHealthCheck = now;
    return false;
  }
}

/**
 * Proxy a request to FastAPI backend
 * Returns null if backend unavailable (caller should use fallback)
 */
export async function proxyToBackend<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T | null> {
  const available = await isBackendAvailable();
  if (!available) {
    return null;
  }

  try {
    const url = `${FASTAPI_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      console.warn(`FastAPI returned ${response.status} for ${endpoint}`);
      return null;
    }

    return response.json();
  } catch (error) {
    console.warn(`FastAPI proxy error for ${endpoint}:`, error);
    return null;
  }
}

/**
 * Endpoint mapping: Next.js route -> FastAPI route
 */
export const backendEndpoints = {
  // Dashboard
  metrics: "/api/metrics",
  dashboardSummary: "/api/dashboard/summary",
  
  // Learners (enriched data)
  learners: "/api/enriched/learners",
  learnerStats: "/api/enriched/stats",
  learnerCompanies: "/api/enriched/companies",
  learnerCountries: "/api/enriched/countries",
  
  // Journey
  journey: "/api/journey",
  journeyFunnel: "/api/journey/funnel",
  
  // Copilot (real Kusto data)
  copilotStats: "/api/copilot/stats",
  copilotByLanguage: "/api/copilot/by-language",
  copilotTrend: "/api/copilot/trend",
  copilotByLearnerStatus: "/api/copilot/by-learner-status",
  
  // Impact
  impact: "/api/impact",
  impactByStage: "/api/impact/by-stage",
  impactProducts: "/api/impact/products",
};

export function getBackendUrl(): string {
  return FASTAPI_URL;
}
