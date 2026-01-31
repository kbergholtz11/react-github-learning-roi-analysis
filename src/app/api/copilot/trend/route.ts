import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = searchParams.get("days") || "30";
    
    // Proxy to FastAPI backend (real Kusto data from copilot_unified_engagement)
    const backendData = await proxyToBackend(`/api/copilot/trend?days=${days}`);
    if (backendData) {
      return NextResponse.json(backendData);
    }

    // No fallback - requires live Kusto data
    return NextResponse.json(
      { 
        error: "Copilot trend data unavailable",
        message: "FastAPI backend required for real-time Copilot data",
        data: [],
      },
      { status: 503 }
    );
  } catch (error) {
    console.error("Error fetching copilot trend:", error);
    return NextResponse.json(
      { error: "Failed to fetch copilot trend data" },
      { status: 500 }
    );
  }
}
