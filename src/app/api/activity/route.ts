import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Read pre-aggregated JSON
function getAggregatedData(filename: string) {
  const filepath = join(process.cwd(), "data", "aggregated", filename);
  if (!existsSync(filepath)) {
    return null;
  }
  return JSON.parse(readFileSync(filepath, "utf-8"));
}

export async function GET() {
  try {
    // Load GitHub activity aggregated data
    const activityData = getAggregatedData("github-activity.json");
    
    if (!activityData) {
      return NextResponse.json(
        { error: "Activity data not found. Run aggregation script first." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...activityData,
      source: "aggregated",
    });
  } catch (error) {
    console.error("Error loading activity data:", error);
    return NextResponse.json(
      { error: "Failed to load activity data" },
      { status: 500 }
    );
  }
}
