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
    // Try FastAPI backend first (real Kusto data with product usage)
    const backendData = await proxyToBackend(backendEndpoints.impact);
    if (backendData) {
      return NextResponse.json({
        ...backendData,
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
