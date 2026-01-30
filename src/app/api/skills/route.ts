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
    const skillsData = getAggregatedData("skills-learning.json");
    
    if (!skillsData) {
      return NextResponse.json(
        { 
          error: "Skills course data not available",
          message: "Run 'npm run fetch:skills' to fetch Skills course progress from GitHub",
          instructions: [
            "1. Set GITHUB_TOKEN environment variable (optional but recommended)",
            "2. Run: npm run fetch:skills",
            "3. Run: npm run aggregate-data"
          ]
        },
        { status: 404 }
      );
    }

    return NextResponse.json(skillsData);
  } catch (error) {
    console.error("Error fetching skills data:", error);
    return NextResponse.json(
      { error: "Failed to fetch skills data" },
      { status: 500 }
    );
  }
}
