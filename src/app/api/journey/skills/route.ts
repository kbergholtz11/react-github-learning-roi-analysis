import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { proxyToBackend } from "@/lib/backend-proxy";

// Read pre-aggregated JSON (instant load, ~<10ms)
function getAggregatedData(filename: string) {
  const filepath = join(process.cwd(), "data", "aggregated", filename);
  if (!existsSync(filepath)) {
    return null;
  }
  return JSON.parse(readFileSync(filepath, "utf-8"));
}

export async function GET() {
  try {
    // Try FastAPI backend first for real-time data
    const backendData = await proxyToBackend<Record<string, unknown>>("/api/journey/skills");
    
    if (backendData) {
      // Get metrics and growth stats to ensure consistent data
      const metricsData = await proxyToBackend<Record<string, unknown>>("/api/metrics");
      const growthData = await proxyToBackend<Record<string, unknown>>("/api/enriched/stats/growth");
      
      const metrics = metricsData?.metrics as Record<string, unknown> | undefined;
      const totalLearners = metrics?.total_learners || backendData.totalLearners;
      
      // Override growthMetrics with accurate data from enriched stats
      const correctedGrowthMetrics = growthData ? {
        growing_learners: growthData.active_learners,
        growing_percentage: growthData.active_percentage,
        active_30_days: growthData.active_learners,
        active_percentage: growthData.active_percentage,
        with_certifications: growthData.with_certifications,
        cert_percentage: growthData.cert_percentage,
      } : backendData.growthMetrics;
      
      return NextResponse.json({
        ...backendData,
        totalLearners: totalLearners,
        growthMetrics: correctedGrowthMetrics,
      });
    }

    // Fall back to pre-aggregated JSON
    const skillData = getAggregatedData("skill-journey.json");
    
    if (!skillData) {
      return NextResponse.json(
        { error: "Skill journey data not found. Run 'npm run aggregate-data' first." },
        { status: 500 }
      );
    }

    return NextResponse.json(skillData);
  } catch (error) {
    console.error("Error fetching skill journey:", error);
    return NextResponse.json(
      { error: "Failed to fetch skill journey data" },
      { status: 500 }
    );
  }
}
