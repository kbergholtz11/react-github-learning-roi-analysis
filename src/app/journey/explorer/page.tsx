"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, ChevronLeft, ChevronRight, X, AlertCircle, Users, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Sparkles, Shield } from "lucide-react";
import { useUrlParams } from "@/hooks/use-url-params";
import { useLearners } from "@/hooks/use-data";
import { DataQualityBadge, DataQualityDot } from "@/components/ui/data-quality-badge";
import type { LearnerStatus, CertifiedUser, UnifiedUser, DataQualityLevel } from "@/types/data";

type SortField = "handle" | "status" | "certs" | "focus" | "id" | "quality";
type SortOrder = "asc" | "desc";

const statusColors: Record<string, string> = {
  Champion: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  Specialist: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  "Multi-Certified": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  Certified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  Learning: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-16" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Failed to load learners</h2>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <Button onClick={() => window.location.reload()}>Retry</Button>
    </div>
  );
}

export default function LearnerExplorerPage() {
  const router = useRouter();
  
  // Use URL params for filter persistence - shareable links!
  const { params, setParams, hasActiveFilters, clearParams } = useUrlParams({
    search: "",
    page: 1,
    status: "" as LearnerStatus | "",
  });

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("handle");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Local state for immediate input feedback
  const [localSearch, setLocalSearch] = useState(params.search);
  
  // Debounce search - update URL params after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== params.search) {
        setParams({ search: localSearch, page: 1 });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, params.search, setParams]);

  // Sync local state when URL params change externally
  useEffect(() => {
    setLocalSearch(params.search);
  }, [params.search]);

  const searchTerm = params.search;
  const currentPage = params.page;
  const statusFilter = params.status;
  const pageSize = 25;

  const { data, isLoading, error, isFetching } = useLearners({
    search: searchTerm || undefined,
    learnerStatus: statusFilter ? (statusFilter as LearnerStatus) : "all",
    page: currentPage,
    pageSize,
  });

  const learners = data?.learners || [];
  const total = data?.total || 0;
  const page = data?.page || currentPage;
  const totalPages = Math.ceil(total / pageSize);

  const getStatusColor = (status: string) => {
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  // Helper to get email from either user type
  const getEmail = (user: CertifiedUser | UnifiedUser): string => {
    return user.email || "";
  };

  const getHandle = (user: CertifiedUser | UnifiedUser): string => {
    return user.user_handle || "";
  };

  const getCerts = (user: CertifiedUser | UnifiedUser): number => {
    if ("total_certs" in user) return user.total_certs;
    if ("total_passed" in user) return user.total_passed;
    return 0;
  };

  const getProductFocus = (user: CertifiedUser | UnifiedUser): string => {
    return "cert_product_focus" in user ? user.cert_product_focus || "" : "";
  };

  // Get data quality from enriched learner (if available)
  const getDataQuality = (user: CertifiedUser | UnifiedUser): { score: number; level: DataQualityLevel } => {
    // Check if user has enriched data quality fields
    if ("data_quality_score" in user && "data_quality_level" in user) {
      return {
        score: (user as unknown as { data_quality_score: number }).data_quality_score,
        level: (user as unknown as { data_quality_level: DataQualityLevel }).data_quality_level,
      };
    }
    // Default for non-enriched users
    return { score: 0, level: "low" };
  };

  // Check if user uses Copilot
  const usesCopilot = (user: CertifiedUser | UnifiedUser): boolean => {
    return "uses_copilot" in user && (user as unknown as { uses_copilot: boolean }).uses_copilot;
  };

  // Check if user uses Actions
  const usesActions = (user: CertifiedUser | UnifiedUser): boolean => {
    return "uses_actions" in user && (user as unknown as { uses_actions: boolean }).uses_actions;
  };

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortOrder === "asc" 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Sort learners - must be called before any returns!
  const sortedLearners = useMemo(() => {
    return [...learners].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      
      switch (sortField) {
        case "handle":
          aVal = getHandle(a).toLowerCase();
          bVal = getHandle(b).toLowerCase();
          break;
        case "status":
          aVal = a.learner_status || "";
          bVal = b.learner_status || "";
          break;
        case "certs":
          aVal = getCerts(a);
          bVal = getCerts(b);
          break;
        case "focus":
          aVal = getProductFocus(a).toLowerCase();
          bVal = getProductFocus(b).toLowerCase();
          break;
        case "id":
          aVal = a.dotcom_id || 0;
          bVal = b.dotcom_id || 0;
          break;
        case "quality":
          aVal = getDataQuality(a).score;
          bVal = getDataQuality(b).score;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [learners, sortField, sortOrder]);

  // Early returns AFTER all hooks
  if (isLoading && !data) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error as Error} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learner Explorer</h1>
          <p className="text-muted-foreground">
            Search and analyze {total.toLocaleString()} learners
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Data
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                placeholder="Search by email or username..."
                className="pl-10 pr-10"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                aria-label="Search learners"
              />
              {isFetching && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
              )}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setParams({ status: e.target.value as LearnerStatus | "", page: 1 })}
              className="px-3 py-2 rounded-md border border-input bg-background"
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              <option value="Champion">Champion</option>
              <option value="Specialist">Specialist</option>
              <option value="Multi-Certified">Multi-Certified</option>
              <option value="Certified">Certified</option>
              <option value="Learning">Learning</option>
              <option value="Engaged">Engaged</option>
              <option value="Registered">Registered</option>
            </select>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearParams} className="gap-2">
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Learners
          </CardTitle>
          <CardDescription>
            Showing {learners.length} of {total.toLocaleString()} learners
          </CardDescription>
        </CardHeader>
        <CardContent>
          {learners.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No learners found matching your criteria</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 text-sm font-medium border-b">
                <button 
                  className="col-span-2 flex items-center hover:text-foreground transition-colors text-left"
                  onClick={() => handleSort("handle")}
                >
                  Handle <SortIcon field="handle" />
                </button>
                <button 
                  className="col-span-2 flex items-center hover:text-foreground transition-colors text-left"
                  onClick={() => handleSort("status")}
                >
                  Status <SortIcon field="status" />
                </button>
                <button 
                  className="col-span-1 flex items-center hover:text-foreground transition-colors text-left"
                  onClick={() => handleSort("certs")}
                >
                  Certs <SortIcon field="certs" />
                </button>
                <div className="col-span-2 flex items-center text-left">
                  Products
                </div>
                <button 
                  className="col-span-2 flex items-center hover:text-foreground transition-colors text-left"
                  onClick={() => handleSort("focus")}
                >
                  Focus <SortIcon field="focus" />
                </button>
                <button 
                  className="col-span-2 flex items-center hover:text-foreground transition-colors text-left"
                  onClick={() => handleSort("quality")}
                >
                  Quality <SortIcon field="quality" />
                </button>
                <button 
                  className="col-span-1 flex items-center hover:text-foreground transition-colors text-left"
                  onClick={() => handleSort("id")}
                >
                  ID <SortIcon field="id" />
                </button>
              </div>
              </div>
              {sortedLearners.map((learner, idx) => (
                <div
                  key={`${getHandle(learner) || getEmail(learner)}-${idx}`}
                  className="grid grid-cols-12 gap-4 p-4 items-center border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/journey/profile?email=${encodeURIComponent(getEmail(learner))}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && router.push(`/journey/profile?email=${encodeURIComponent(getEmail(learner))}`)}
                >
                  <div className="col-span-2 truncate">
                    <span className="font-medium">{getHandle(learner) || "—"}</span>
                  </div>
                  <div className="col-span-2">
                    <Badge className={getStatusColor(learner.learner_status)}>
                      {learner.learner_status}
                    </Badge>
                  </div>
                  <div className="col-span-1">
                    <span className="font-semibold">{getCerts(learner)}</span>
                  </div>
                  <div className="col-span-2 flex gap-1">
                    {usesCopilot(learner) && (
                      <Badge variant="outline" className="text-xs gap-1 bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border-violet-200">
                        <Sparkles className="h-3 w-3" />
                        Copilot
                      </Badge>
                    )}
                    {usesActions(learner) && (
                      <Badge variant="outline" className="text-xs gap-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200">
                        <Shield className="h-3 w-3" />
                        Actions
                      </Badge>
                    )}
                  </div>
                  <div className="col-span-2 truncate text-sm text-muted-foreground">
                    {getProductFocus(learner) || "—"}
                  </div>
                  <div className="col-span-2">
                    <DataQualityBadge 
                      score={getDataQuality(learner).score} 
                      level={getDataQuality(learner).level} 
                    />
                  </div>
                  <div className="col-span-1 text-sm text-muted-foreground">
                    {learner.dotcom_id > 0 ? learner.dotcom_id : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setParams({ page: Math.max(1, page - 1) })}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setParams({ page: Math.min(totalPages, page + 1) })}
                  disabled={page >= totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        {Object.entries(statusColors).map(([status, color]) => {
          const count =
            status === statusFilter
              ? total
              : Math.round(total * (status === "Learning" ? 0.7 : status === "Certified" ? 0.15 : 0.05));
          return (
            <Card
              key={status}
              className={`cursor-pointer transition-all hover:scale-105 ${
                statusFilter === status ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setParams({ status: statusFilter === status ? "" : status as LearnerStatus, page: 1 })}
            >
              <CardContent className="pt-4 pb-4">
                <Badge className={color}>{status}</Badge>
                <div className="text-2xl font-bold mt-2">{count.toLocaleString()}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
