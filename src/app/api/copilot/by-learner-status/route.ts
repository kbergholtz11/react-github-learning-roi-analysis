import { NextResponse } from "next/server";
import { proxyToBackend, backendEndpoints } from "@/lib/backend-proxy";

export async function GET() {
  try {
    // Proxy to FastAPI backend (correlates Copilot usage with learner certification status)
    const backendData = await proxyToBackend(backendEndpoints.copilotByLearnerStatus);
    if (backendData) {
      return NextResponse.json(backendData);
    }

    // No fallback - requires live Kusto data
    return NextResponse.json(
      { 
        error: "Copilot learner status data unavailable",
        message: "FastAPI backend required for real-time Copilot data",
        data: [],
      },
      { status: 503 }
    );
  } catch (error) {
    console.error("Error fetching copilot by learner status:", error);
    return NextResponse.json(
      { error: "Failed to fetch copilot learner status data" },
      { status: 500 }
    );
  }
}
