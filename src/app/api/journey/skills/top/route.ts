import { NextRequest, NextResponse } from "next/server";
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    
    // Try backend first for real-time data
    const backendData = await proxyToBackend<{ learners: unknown[]; total: number }>(
      `/api/journey/skills/top?limit=${limit}`
    );
    
    if (backendData && backendData.learners) {
      return NextResponse.json({
        learners: backendData.learners,
        total: backendData.total,
        source: "backend",
      });
    }
    
    // Fall back to pre-aggregated JSON
    const skillData = getAggregatedData("top-skilled-learners.json");
    
    if (!skillData) {
      return NextResponse.json(
        { error: "Top skilled learners data not found. Run 'npm run aggregate-data' first." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      learners: skillData.learners.slice(0, limit),
      total: skillData.total,
      source: "aggregated",
    });
  } catch (error) {
    console.error("Error fetching top skilled learners:", error);
    return NextResponse.json(
      { error: "Failed to fetch top skilled learners" },
      { status: 500 }
    );
  }
}
