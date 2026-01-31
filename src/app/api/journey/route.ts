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

// Journey-based stage colors (progression from exploration to mastery)
const stageColors: Record<string, string> = {
  "Mastery": "#ef4444",        // Red - highest achievement
  "Power User": "#f59e0b",     // Amber - advanced
  "Practitioner": "#22c55e",   // Green - actively practicing
  "Active Learner": "#3b82f6", // Blue - learning
  "Explorer": "#94a3b8",       // Slate - just starting
};

// Stage order for proper funnel display (top to bottom: highest to lowest)
const stageOrder = ["Mastery", "Power User", "Practitioner", "Active Learner", "Explorer"];

export async function GET() {
  try {
    // Use metrics endpoint which has journey-based status breakdown
    const metricsData = await proxyToBackend<{
      status_breakdown: Array<{status: string; count: number; percentage: number}>;
      funnel: Array<{stage: string; count: number; percentage: number; color: string}>;
      metrics: Record<string, number>;
    }>(backendEndpoints.metrics);
    
    if (metricsData?.funnel && Array.isArray(metricsData.funnel) && metricsData.funnel.length > 0) {
      // Use the funnel directly from metrics (already in correct format with journey stages)
      const funnel = metricsData.funnel.map(s => ({
        stage: s.stage,
        count: s.count,
        percentage: s.percentage,
        color: stageColors[s.stage] || s.color || "#94a3b8",
      }));
      
      // Sort by stage order (Mastery first, Explorer last)
      funnel.sort((a, b) => {
        const aIndex = stageOrder.indexOf(a.stage);
        const bIndex = stageOrder.indexOf(b.stage);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });
      
      const totalLearners = funnel.reduce((sum, s) => sum + s.count, 0);
      
      // Build drop-off analysis (conversion from one stage to the next)
      const dropOffAnalysis = funnel.map((stage, index) => {
        const nextStage = funnel[index + 1];
        const conversionRate = nextStage 
          ? Math.round((stage.count / nextStage.count) * 100)
          : 100;
        return {
          stage: stage.stage,
          count: stage.count,
          dropOffRate: 100 - conversionRate,
          conversionRate,
          nextStage: nextStage?.stage || null,
        };
      });

      return NextResponse.json({
        funnel,
        totalJourneyUsers: totalLearners,
        avgTimeToCompletion: 45,
        stageVelocity: {
          exploring: 5,
          learning: 21,
          practicing: 14,
          mastery: 30,
        },
        dropOffAnalysis,
        monthlyProgression: [],
        source: "journey",
      });
    }

    // Try FastAPI backend journey endpoint
    const backendData = await proxyToBackend(backendEndpoints.journey);
    if (backendData) {
      return NextResponse.json({
        ...backendData,
        source: "kusto",
      });
    }

    // Fall back to pre-aggregated JSON files
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
      dataSourceCounts: journeyData.dataSourceCounts,
      generatedAt: journeyData.generatedAt,
      source: "aggregated",
    });
  } catch (error) {
    console.error("Error fetching journey data:", error);
    return NextResponse.json(
      { error: "Failed to fetch journey data" },
      { status: 500 }
    );
  }
}
