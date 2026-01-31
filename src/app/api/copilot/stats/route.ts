import { NextResponse } from "next/server";
import { proxyToBackend, backendEndpoints } from "@/lib/backend-proxy";

export async function GET() {
  try {
    // Proxy to FastAPI backend (real Kusto data from copilot_unified_engagement)
    const backendData = await proxyToBackend(backendEndpoints.copilotStats);
    if (backendData) {
      return NextResponse.json(backendData);
    }

    // No fallback - Copilot stats require live Kusto data
    return NextResponse.json(
      { 
        error: "Copilot stats unavailable",
        message: "FastAPI backend required for real-time Copilot data",
        total_users: 0,
        active_30d: 0,
        active_7d: 0,
        total_events: 0,
      },
      { status: 503 }
    );
  } catch (error) {
    console.error("Error fetching copilot stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch copilot stats" },
      { status: 500 }
    );
  }
}
