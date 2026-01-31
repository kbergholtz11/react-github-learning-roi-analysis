import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getLearners } from "@/lib/data-service";
import { proxyToBackend, backendEndpoints } from "@/lib/backend-proxy";
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

    // Try FastAPI backend first (enriched data with Kusto)
    const backendParams = new URLSearchParams();
    if (filters.search) backendParams.set("search", filters.search);
    if (filters.learnerStatus && filters.learnerStatus !== "all") {
      backendParams.set("status", filters.learnerStatus);
    }
    if (filters.isCertified !== "all") {
      backendParams.set("is_certified", String(filters.isCertified));
    }
    backendParams.set("limit", String(filters.pageSize || 50));
    backendParams.set("offset", String(((filters.page || 1) - 1) * (filters.pageSize || 50)));

    const backendData = await proxyToBackend<{ learners: unknown[]; total: number }>(
      `${backendEndpoints.learners}?${backendParams.toString()}`
    );
    
    if (backendData && backendData.learners) {
      return NextResponse.json({
        learners: backendData.learners,
        total: backendData.total,
        page: filters.page || 1,
        pageSize: filters.pageSize || 50,
        totalPages: Math.ceil(backendData.total / (filters.pageSize || 50)),
        source: "kusto",
      });
    }

    // For initial load without search, use pre-aggregated top learners (instant)
    if (!filters.search && filters.learnerStatus === "all" && filters.isCertified === "all" && filters.page === 1) {
      const topLearnersData = getAggregatedData("top-learners.json");
      const pageSize = filters.pageSize ?? 20;
      if (topLearnersData) {
        return NextResponse.json({
          learners: topLearnersData.learners.slice(0, pageSize).map((l: Record<string, unknown>) => ({
            ...l,
            certs: l.total_certs || 0,
          })),
          total: topLearnersData.total,
          page: 1,
          pageSize: pageSize,
          totalPages: Math.ceil(topLearnersData.total / pageSize),
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
