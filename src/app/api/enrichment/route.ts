import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Read pre-aggregated JSON (instant load)
function getAggregatedData(filename: string) {
  const filepath = join(process.cwd(), "data", "aggregated", filename);
  if (!existsSync(filepath)) {
    return null;
  }
  return JSON.parse(readFileSync(filepath, "utf-8"));
}

export async function GET() {
  try {
    // Try to load enrichment data
    const copilotData = getAggregatedData("copilot-insights.json");
    const activityData = getAggregatedData("github-activity.json");
    const skillsData = getAggregatedData("skills-learning.json");

    // Return available enrichment data
    return NextResponse.json({
      copilot: copilotData || null,
      githubActivity: activityData || null,
      skillsCourses: skillsData || null,
      availableData: {
        copilot: !!copilotData,
        githubActivity: !!activityData,
        skillsCourses: !!skillsData,
      },
      message: !copilotData && !activityData && !skillsData
        ? "No enrichment data available. Run 'npm run fetch:all' to fetch data from GitHub APIs."
        : "Enrichment data loaded successfully",
    });
  } catch (error) {
    console.error("Error fetching enrichment data:", error);
    return NextResponse.json(
      { error: "Failed to fetch enrichment data" },
      { status: 500 }
    );
  }
}
