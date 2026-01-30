import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const { email } = await params;
    const decodedEmail = decodeURIComponent(email).trim();
    
    const response = await fetch(
      `${BACKEND_URL}/api/learners/${encodeURIComponent(decodedEmail)}/exams`,
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching learner exams:", error);
    return NextResponse.json(
      { error: "Failed to fetch learner exams", exams: [], total_exams: 0, passed_count: 0, failed_count: 0, status_breakdown: {}, source: "error" },
      { status: 200 } // Return 200 with empty data to avoid client errors
    );
  }
}
