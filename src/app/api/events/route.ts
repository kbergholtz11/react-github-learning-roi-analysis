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
    // Load events aggregated data
    const eventsData = getAggregatedData("events.json");
    
    if (!eventsData) {
      return NextResponse.json(
        { error: "Events data not found. Run aggregation script first." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...eventsData,
      source: "aggregated",
    });
  } catch (error) {
    console.error("Error loading events data:", error);
    return NextResponse.json(
      { error: "Failed to load events data" },
      { status: 500 }
    );
  }
}
