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
    // Try FastAPI backend first - use /api/metrics which includes statusBreakdown
    const backendData = await proxyToBackend<Record<string, unknown>>(backendEndpoints.metrics);
    if (backendData) {
      // Backend /api/metrics returns the full response with metrics, status_breakdown, funnel
      const metrics = backendData.metrics as Record<string, unknown> || {};
      const statusBreakdown = backendData.status_breakdown as Array<{status: string; count: number; percentage: number}> || [];
      const funnel = backendData.funnel as Array<Record<string, unknown>> || [];
      
      return NextResponse.json({
        metrics: {
          totalLearners: metrics.total_learners || metrics.totalLearners || 0,
          certifiedLearners: metrics.certified_users || metrics.certifiedUsers || 0,
          totalCertifications: metrics.total_certifications || metrics.totalCertifications || 0,
          copilotUsers: metrics.copilot_users || 0,
          actionsUsers: metrics.actions_users || 0,
          securityUsers: metrics.security_users || 0,
          avgUsageIncrease: metrics.avg_usage_increase || metrics.avgUsageIncrease || 25,
          avgProductsAdopted: metrics.avg_products_adopted || metrics.avgProductsAdopted || 3,
          impactScore: metrics.impact_score || metrics.impactScore || 75,
          learningUsers: metrics.learning_users || metrics.learningUsers || 0,
          avgLearningHours: metrics.avg_learning_hours || metrics.avgLearningHours || 12,
          retentionRate: metrics.retention_rate || metrics.retentionRate || 85,
        },
        statusBreakdown: statusBreakdown.map(s => ({
          status: s.status,
          count: s.count,
          percentage: s.percentage,
        })),
        funnel: funnel,
        source: "backend",
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
