import { NextResponse } from "next/server";
import { isBackendAvailable, getBackendUrl } from "@/lib/backend-proxy";

export async function GET() {
  try {
    const backendAvailable = await isBackendAvailable();
    const backendUrl = getBackendUrl();

    // Check if we have aggregated data
    const { existsSync } = await import("fs");
    const { join } = await import("path");
    
    const hasAggregatedData = existsSync(join(process.cwd(), "data", "aggregated", "metrics.json"));
    const hasEnrichedData = existsSync(join(process.cwd(), "data", "learners_enriched.csv"));

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      backend: {
        available: backendAvailable,
        url: backendUrl,
      },
      data: {
        aggregated: hasAggregatedData,
        enriched: hasEnrichedData,
      },
      dataSource: backendAvailable ? "kusto" : hasAggregatedData ? "aggregated" : "none",
    });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
