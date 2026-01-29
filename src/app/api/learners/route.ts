import { NextRequest, NextResponse } from "next/server";
import { getLearners } from "@/lib/data-service";
import type { LearnerFilters, LearnerStatus } from "@/types/data";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const filters: LearnerFilters = {
      search: searchParams.get("search") || undefined,
      learnerStatus: (searchParams.get("status") as LearnerStatus | "all") || "all",
      isCertified: searchParams.get("certified") === "true" 
        ? true 
        : searchParams.get("certified") === "false" 
        ? false 
        : "all",
      page: parseInt(searchParams.get("page") || "1"),
      pageSize: parseInt(searchParams.get("pageSize") || "50"),
    };

    const result = getLearners(filters);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching learners:", error);
    return NextResponse.json(
      { error: "Failed to fetch learners" },
      { status: 500 }
    );
  }
}
