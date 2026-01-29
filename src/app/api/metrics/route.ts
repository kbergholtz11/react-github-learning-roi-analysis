import { NextResponse } from "next/server";
import { getDashboardMetrics, getJourneyFunnel, getLearnerStatusBreakdown, getProductAdoptionComparison } from "@/lib/data-service";

export async function GET() {
  try {
    const metrics = getDashboardMetrics();
    const funnel = getJourneyFunnel();
    const statusBreakdown = getLearnerStatusBreakdown();
    const productAdoption = getProductAdoptionComparison();

    return NextResponse.json({
      metrics,
      funnel,
      statusBreakdown,
      productAdoption,
    });
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard metrics" },
      { status: 500 }
    );
  }
}
