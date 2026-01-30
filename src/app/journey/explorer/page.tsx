"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, ChevronLeft, ChevronRight, X, AlertCircle, Users, Loader2 } from "lucide-react";
import { useUrlParams } from "@/hooks/use-url-params";
import { useLearners } from "@/hooks/use-data";
import type { LearnerStatus, CertifiedUser, UnifiedUser } from "@/types/data";

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

  // Only show full skeleton on initial load, not during search/filter
  if (isLoading && !data) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error as Error} />;

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
                <div className="col-span-3">Email</div>
                <div className="col-span-2">Username</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Certifications</div>
                <div className="col-span-2">Product Focus</div>
                <div className="col-span-1">ID</div>
              </div>
              {learners.map((learner, idx) => (
                <div
                  key={`${getEmail(learner)}-${idx}`}
                  className="grid grid-cols-12 gap-4 p-4 items-center border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/journey/profile?email=${encodeURIComponent(getEmail(learner))}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && router.push(`/journey/profile?email=${encodeURIComponent(getEmail(learner))}`)}
                >
                  <div className="col-span-3 truncate">
                    <span className="font-medium">{getEmail(learner) || "—"}</span>
                  </div>
                  <div className="col-span-2 truncate text-muted-foreground">
                    {getHandle(learner) ? `@${getHandle(learner)}` : "—"}
                  </div>
                  <div className="col-span-2">
                    <Badge className={getStatusColor(learner.learner_status)}>
                      {learner.learner_status}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold">{getCerts(learner)}</span>
                    <span className="text-muted-foreground text-sm ml-1">passed</span>
                  </div>
                  <div className="col-span-2 truncate text-sm text-muted-foreground">
                    {"cert_product_focus" in learner ? learner.cert_product_focus : "—"}
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
