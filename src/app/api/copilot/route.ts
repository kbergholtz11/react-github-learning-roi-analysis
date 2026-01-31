import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { proxyToBackend, backendEndpoints } from "@/lib/backend-proxy";

function getAggregatedData(filename: string) {
  const filepath = join(process.cwd(), "data", "aggregated", filename);
  if (!existsSync(filepath)) {
    return null;
  }
  return JSON.parse(readFileSync(filepath, "utf-8"));
}

export async function GET() {
  try {
    // Try FastAPI backend first (real Kusto data from copilot_unified_engagement)
    const backendData = await proxyToBackend(backendEndpoints.copilotStats);
    if (backendData) {
      return NextResponse.json({
        ...backendData,
        source: "kusto",
      });
    }

    // Fall back to aggregated JSON
    const copilotData = getAggregatedData("copilot-insights.json");
    
    if (!copilotData) {
      return NextResponse.json(
        { 
          error: "Copilot data not available",
          message: "Start FastAPI backend or run 'npm run aggregate-data'",
          instructions: [
            "Option 1: Start FastAPI backend: cd backend && uvicorn app.main:app --reload",
            "Option 2: Run: npm run aggregate-data"
          ]
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...copilotData,
      source: "aggregated",
    });
  } catch (error) {
    console.error("Error fetching copilot data:", error);
    return NextResponse.json(
      { error: "Failed to fetch copilot data" },
      { status: 500 }
    );
  }
}
