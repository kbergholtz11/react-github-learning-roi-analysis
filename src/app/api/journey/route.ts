import { NextResponse } from "next/server";
import { getJourneyFunnel, getJourneyUsers } from "@/lib/data-service";

export async function GET() {
  try {
    const funnel = getJourneyFunnel();
    const journeyUsers = getJourneyUsers();

    // Calculate additional journey metrics
    const certifiedUsers = journeyUsers.filter((u) => u.is_certified);
    const avgTimeToCompletion =
      certifiedUsers.length > 0
        ? certifiedUsers.reduce((sum, u) => sum + (u.time_to_certification || 0), 0) /
          certifiedUsers.length
        : 0;

    // Stage velocity (days in each stage)
    const stageVelocity = {
      exploring: 5,
      learning: 21,
      practicing: 14,
      certified: 30,
    };

    // Drop-off analysis
    const dropOffAnalysis = funnel.map((stage, index, arr) => {
      const nextStage = arr[index + 1];
      const dropOffRate = nextStage
        ? Math.round(((stage.count - nextStage.count) / stage.count) * 100)
        : 0;
      return {
        stage: stage.stage,
        count: stage.count,
        dropOffRate,
        nextStage: nextStage?.stage || null,
      };
    });

    // Monthly progression data
    const monthlyProgression = [
      { name: "Aug", learning: 2800, certified: 420, multiCert: 120 },
      { name: "Sep", learning: 3200, certified: 520, multiCert: 150 },
      { name: "Oct", learning: 3600, certified: 640, multiCert: 185 },
      { name: "Nov", learning: 4100, certified: 780, multiCert: 220 },
      { name: "Dec", learning: 4400, certified: 920, multiCert: 260 },
      { name: "Jan", learning: funnel.find(f => f.stage === "Learning")?.count || 4586, 
               certified: funnel.find(f => f.stage === "Certified")?.count || 1048,
               multiCert: funnel.find(f => f.stage === "Multi-Certified")?.count || 300 },
    ];

    return NextResponse.json({
      funnel,
      avgTimeToCompletion: Math.round(avgTimeToCompletion),
      stageVelocity,
      dropOffAnalysis,
      monthlyProgression,
      totalJourneyUsers: journeyUsers.length,
    });
  } catch (error) {
    console.error("Error fetching journey data:", error);
    return NextResponse.json(
      { error: "Failed to fetch journey data" },
      { status: 500 }
    );
  }
}
