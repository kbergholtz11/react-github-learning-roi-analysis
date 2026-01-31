import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { proxyToBackend, backendEndpoints } from "@/lib/backend-proxy";

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
    // Try FastAPI backend first (real enriched data)
    const backendData = await proxyToBackend<Record<string, unknown>>(backendEndpoints.learnerStats);
    if (backendData) {
      // Transform enriched stats to metrics format
      return NextResponse.json({
        metrics: {
          totalLearners: backendData.total_learners || 0,
          certifiedLearners: backendData.certified_learners || 0,
          totalCertifications: backendData.total_certifications || 0,
          copilotUsers: backendData.copilot_users || 0,
          actionsUsers: backendData.actions_users || 0,
          securityUsers: backendData.security_users || 0,
          uniqueCompanies: backendData.unique_companies || 0,
          uniqueCountries: backendData.unique_countries || 0,
        },
        source: "kusto",
      });
    }

    // Fall back to pre-aggregated JSON files
    const metricsData = getAggregatedData("metrics.json");
    
    if (!metricsData) {
      return NextResponse.json(
        { error: "Aggregated data not found. Start FastAPI backend or run 'npm run aggregate-data'." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      metrics: metricsData.metrics,
      funnel: metricsData.funnel,
      statusBreakdown: metricsData.statusBreakdown,
      productAdoption: metricsData.productAdoption,
      generatedAt: metricsData.generatedAt,
      source: "aggregated",
    });
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard metrics" },
      { status: 500 }
    );
  }
}
