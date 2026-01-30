import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getLearners } from "@/lib/data-service";
import type { LearnerFilters, LearnerStatus } from "@/types/data";

// Read pre-aggregated JSON (instant load, ~<10ms)
function getAggregatedData(filename: string) {
  const filepath = join(process.cwd(), "data", "aggregated", filename);
  if (!existsSync(filepath)) {
    return null;
  }
  return JSON.parse(readFileSync(filepath, "utf-8"));
}

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

    // For initial load without search, use pre-aggregated top learners (instant)
    if (!filters.search && filters.learnerStatus === "all" && filters.isCertified === "all" && filters.page === 1) {
      const topLearnersData = getAggregatedData("top-learners.json");
      if (topLearnersData) {
        return NextResponse.json({
          learners: topLearnersData.learners.slice(0, filters.pageSize).map((l: Record<string, unknown>) => ({
            ...l,
            certs: l.total_certs || 0,
          })),
          total: topLearnersData.total,
          page: 1,
          pageSize: filters.pageSize,
          totalPages: Math.ceil(topLearnersData.total / filters.pageSize),
          generatedAt: topLearnersData.generatedAt,
        });
      }
    }

    // For search or filtered queries, fall back to full CSV parsing
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
