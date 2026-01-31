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

// Transform snake_case to camelCase for stage impact data
interface BackendStageImpact {
  stage: string;
  learners: number;
  avg_usage_increase: number;
  platform_time_increase: number;
  top_product: string;
  adoption_rate?: number;
}

interface BackendCorrelationData {
  name: string;
  learning_hours: number;
  product_usage: number;
  platform_time: number;
}

export async function GET() {
  try {
    // Try FastAPI backend first (real Kusto data with product usage)
    const backendData = await proxyToBackend<Record<string, unknown>>(backendEndpoints.impact);
    if (backendData) {
      // Transform snake_case backend response to camelCase for frontend
      const stageImpact = (backendData.stage_impact as BackendStageImpact[] || []).map(s => ({
        stage: s.stage,
        learners: s.learners,
        avgUsageIncrease: s.avg_usage_increase,
        platformTimeIncrease: s.platform_time_increase,
        topProduct: s.top_product,
        adoptionRate: s.adoption_rate,
      }));
      
      const correlationData = (backendData.correlation_data as BackendCorrelationData[] || []).map(c => ({
        name: c.name,
        learningHours: c.learning_hours,
        productUsage: c.product_usage,
        platformTime: c.platform_time,
      }));
      
      return NextResponse.json({
        stageImpact,
        productAdoption: backendData.product_adoption,
        correlationData,
        roiBreakdown: backendData.roi_breakdown,
        source: "kusto",
      });
    }

    // Fall back to pre-aggregated JSON files
    const impactData = getAggregatedData("impact.json");
    
    if (!impactData) {
      return NextResponse.json(
        { error: "Aggregated data not found. Run 'npm run aggregate-data' first." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      impactFlow: impactData.impactFlow,
      productAdoption: impactData.productAdoption,
      stageImpact: impactData.stageImpact,
      correlationData: impactData.correlationData,
      roiBreakdown: impactData.roiBreakdown,
      metrics: impactData.metrics,
      generatedAt: impactData.generatedAt,
      source: "aggregated",
    });
  } catch (error) {
    console.error("Error fetching impact data:", error);
    return NextResponse.json(
      { error: "Failed to fetch impact data" },
      { status: 500 }
    );
  }
}
