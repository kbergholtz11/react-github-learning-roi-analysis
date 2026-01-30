import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

function getAggregatedData(filename: string) {
  const filepath = join(process.cwd(), "data", "aggregated", filename);
  if (!existsSync(filepath)) {
    return null;
  }
  return JSON.parse(readFileSync(filepath, "utf-8"));
}

export async function GET() {
  try {
    const activityData = getAggregatedData("github-activity.json");
    
    if (!activityData) {
      return NextResponse.json(
        { 
          error: "GitHub activity data not available",
          message: "Run 'npm run fetch:activity' to fetch developer activity from GitHub",
          instructions: [
            "1. Set GITHUB_TOKEN environment variable",
            "2. Run: npm run fetch:activity",
            "3. Run: npm run aggregate-data"
          ]
        },
        { status: 404 }
      );
    }

    return NextResponse.json(activityData);
  } catch (error) {
    console.error("Error fetching activity data:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity data" },
      { status: 500 }
    );
  }
}
