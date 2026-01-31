import { NextResponse } from "next/server";
import { proxyToBackend, backendEndpoints } from "@/lib/backend-proxy";

export async function GET() {
  try {
    // Proxy to FastAPI backend (real Kusto data from copilot_unified_engagement)
    const backendData = await proxyToBackend(backendEndpoints.copilotByLanguage);
    if (backendData) {
      return NextResponse.json(backendData);
    }

    // No fallback - requires live Kusto data
    return NextResponse.json(
      { 
        error: "Copilot language data unavailable",
        message: "FastAPI backend required for real-time Copilot data",
        data: [],
      },
      { status: 503 }
    );
  } catch (error) {
    console.error("Error fetching copilot by language:", error);
    return NextResponse.json(
      { error: "Failed to fetch copilot language data" },
      { status: 500 }
    );
  }
}
