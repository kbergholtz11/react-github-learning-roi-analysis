import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

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
    // Read from pre-aggregated JSON files (instant response)
    const journeyData = getAggregatedData("journey.json");
    
    if (!journeyData) {
      return NextResponse.json(
        { error: "Aggregated data not found. Run 'npm run aggregate-data' first." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      funnel: journeyData.funnel,
      avgTimeToCompletion: journeyData.avgTimeToCompletion,
      stageVelocity: journeyData.stageVelocity,
      dropOffAnalysis: journeyData.dropOffAnalysis,
      monthlyProgression: journeyData.monthlyProgression,
      totalJourneyUsers: journeyData.totalJourneyUsers,
      generatedAt: journeyData.generatedAt,
    });
  } catch (error) {
    console.error("Error fetching journey data:", error);
    return NextResponse.json(
      { error: "Failed to fetch journey data" },
      { status: 500 }
    );
  }
}
