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
    const copilotData = getAggregatedData("copilot-insights.json");
    
    if (!copilotData) {
      return NextResponse.json(
        { 
          error: "Copilot data not available",
          message: "Run 'npm run fetch:copilot' to fetch Copilot metrics from GitHub API",
          instructions: [
            "1. Set GITHUB_TOKEN environment variable",
            "2. Set GITHUB_ORG environment variable",
            "3. Run: npm run fetch:copilot",
            "4. Run: npm run aggregate-data"
          ]
        },
        { status: 404 }
      );
    }

    return NextResponse.json(copilotData);
  } catch (error) {
    console.error("Error fetching copilot data:", error);
    return NextResponse.json(
      { error: "Failed to fetch copilot data" },
      { status: 500 }
    );
  }
}
