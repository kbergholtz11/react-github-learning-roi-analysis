"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, ChevronLeft, ChevronRight, X, AlertCircle, Users, Loader2, 
  ArrowUpDown, ArrowUp, ArrowDown, Sparkles, Shield, FileDown,
  TrendingUp, AlertTriangle, Target, Award, Building2, Globe2,
  Clock, Calendar, Zap, GraduationCap, Trophy
} from "lucide-react";
import { useUrlParams } from "@/hooks/use-url-params";
import { useEnrichedLearners, useSegmentCounts } from "@/hooks/use-unified-data";
import type { LearnerStatus, EnrichedLearner, DataQualityLevel } from "@/types/data";

type SortField = "handle" | "status" | "certs" | "company" | "region" | "quality" | "lastActivity";
type SortOrder = "asc" | "desc";
type InsightSegment = "all" | "at-risk" | "rising-stars" | "ready-to-advance" | "inactive" | "high-value";

const statusColors: Record<string, string> = {
  Mastery: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  "Power User": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  Practitioner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "Active Learner": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  Explorer: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300",
  Champion: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  Specialist: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  "Multi-Certified": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  Certified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  Learning: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

const insightSegmentConfig: Record<InsightSegment, { 
  label: string; 
  icon: typeof Users; 
  color: string;
  description: string;
}> = {
  all: { 
    label: "All Learners", 
    icon: Users, 
    color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    description: "Everyone in the learning ecosystem"
  },
  "at-risk": { 
    label: "At Risk", 
    icon: AlertTriangle, 
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    description: "Failed exams, stalled progress, or declining engagement"
  },
  "rising-stars": { 
    label: "Rising Stars", 
    icon: TrendingUp, 
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    description: "Fast progressors with multiple recent certifications"
  },
  "ready-to-advance": { 
    label: "Ready to Advance", 
    icon: Target, 
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    description: "Strong candidates for next certification level"
  },
  inactive: { 
    label: "Inactive", 
    icon: Clock, 
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    description: "No activity in last 90 days"
  },
  "high-value": { 
    label: "High Value", 
    icon: Trophy, 
    color: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
    description: "Champions and specialists driving adoption"
  },
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-24" />)}
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

// Insight segment card component
function InsightCard({ 
  segment, 
  count, 
  isActive, 
  onClick 
}: { 
  segment: InsightSegment; 
  count: number; 
  isActive: boolean;
  onClick: () => void;
}) {
  const config = insightSegmentConfig[segment];
  const Icon = config.icon;
  
  return (
    <Card 
      className={`cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${
        isActive ? "ring-2 ring-primary shadow-md" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded-md ${config.color}`}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="font-medium text-sm">{config.label}</span>
        </div>
        <div className="text-2xl font-bold">{count.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{config.description}</p>
      </CardContent>
    </Card>
  );
}

// Helper functions for EnrichedLearner
function getEmail(user: EnrichedLearner): string {
  return user.email || "";
}

function getHandle(user: EnrichedLearner): string {
  return user.userhandle || "";
}

function getCerts(user: EnrichedLearner): number {
  return user.exams_passed || 0;
}

function getCompany(user: EnrichedLearner): string {
  return user.exam_company || user.company_name || "";
}

function getRegion(user: EnrichedLearner): string {
  return user.region || user.exam_region || "";
}

function getJobRole(user: EnrichedLearner): string {
  return user.job_role || "";
}

function getLastActivity(user: EnrichedLearner): string {
  return user.last_activity || user.last_exam || "";
}

function getTotalExams(user: EnrichedLearner): number {
  return user.total_exams || 0;
}

function getCopilotDays(user: EnrichedLearner): number {
  return user.copilot_days || 0;
}

function usesCopilot(user: EnrichedLearner): boolean {
  return user.uses_copilot || false;
}

function usesActions(user: EnrichedLearner): boolean {
  return user.uses_actions || false;
}

function getDataQuality(user: EnrichedLearner): { score: number; level: DataQualityLevel } {
  return {
    score: user.data_quality_score || 0,
    level: user.data_quality_level || "low",
  };
}

// Determine if learner is "at risk"
function isAtRisk(user: EnrichedLearner): boolean {
  const totalExams = getTotalExams(user);
  const certs = getCerts(user);
  const failedExams = totalExams - certs;
  
  if (failedExams >= 2) return true;
  if (totalExams >= 2 && certs === 0) return true;
  if (getDataQuality(user).level === "low" && totalExams > 0) return true;
  
  return false;
}

// Determine if learner is a "rising star"
function isRisingStar(user: EnrichedLearner): boolean {
  const certs = getCerts(user);
  const status = user.learner_status || "";
  
  if (certs >= 2) return true;
  if (["Multi-Certified", "Specialist", "Champion"].includes(status)) return true;
  
  return false;
}

// Determine if learner is "ready to advance"
function isReadyToAdvance(user: EnrichedLearner): boolean {
  const certs = getCerts(user);
  const copilotDays = getCopilotDays(user);
  const status = user.learner_status || "";
  
  // Ready to advance: single cert with product adoption, or Learning/Engaged with high Copilot
  if (certs === 1 && (usesCopilot(user) || usesActions(user))) return true;
  if (status === "Certified" && copilotDays > 30) return true;
  if ((status === "Learning" || status === "Engaged") && copilotDays > 60) return true;
  
  return false;
}

// Determine if learner is inactive
function isInactive(user: EnrichedLearner): boolean {
  const lastActivity = getLastActivity(user);
  if (!lastActivity) return true;
  
  try {
    const lastDate = new Date(lastActivity);
    const daysSinceActivity = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceActivity > 90;
  } catch {
    return false;
  }
}

// Determine if learner is high-value
function isHighValue(user: EnrichedLearner): boolean {
  const status = user.learner_status || "";
  const certs = getCerts(user);
  
  if (["Champion", "Specialist", "Mastery"].includes(status)) return true;
  if (certs >= 3) return true;
  
  return false;
}

// Company breakdown component  
function CompanyBreakdown({ learners }: { learners: EnrichedLearner[] }) {
  const companyData = useMemo(() => {
    const companies: Record<string, { count: number; certified: number; copilotUsers: number }> = {};
    
    learners.forEach(learner => {
      const company = getCompany(learner) || "Unknown";
      if (!companies[company]) {
        companies[company] = { count: 0, certified: 0, copilotUsers: 0 };
      }
      companies[company].count++;
      if (getCerts(learner) > 0) companies[company].certified++;
      if (usesCopilot(learner)) companies[company].copilotUsers++;
    });
    
    return Object.entries(companies)
      .map(([name, data]) => ({
        name,
        ...data,
        certRate: data.count > 0 ? Math.round((data.certified / data.count) * 100) : 0,
        copilotRate: data.count > 0 ? Math.round((data.copilotUsers / data.count) * 100) : 0,
      }))
      .filter(c => c.name !== "Unknown" && c.count > 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [learners]);

  if (companyData.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Top Companies
        </CardTitle>
        <CardDescription>Certification and adoption by organization</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {companyData.map((company) => (
            <div key={company.name} className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{company.name}</p>
                <p className="text-xs text-muted-foreground">{company.count} learners</p>
              </div>
              <div className="flex gap-3 text-sm">
                <div className="text-right">
                  <span className="font-semibold text-green-600 dark:text-green-400">{company.certRate}%</span>
                  <p className="text-xs text-muted-foreground">certified</p>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-violet-600 dark:text-violet-400">{company.copilotRate}%</span>
                  <p className="text-xs text-muted-foreground">Copilot</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Region breakdown component
function RegionBreakdown({ learners }: { learners: EnrichedLearner[] }) {
  const regionData = useMemo(() => {
    const regions: Record<string, { count: number; certified: number }> = {};
    
    learners.forEach(learner => {
      const region = getRegion(learner) || "Unknown";
      if (!regions[region]) {
        regions[region] = { count: 0, certified: 0 };
      }
      regions[region].count++;
      if (getCerts(learner) > 0) regions[region].certified++;
    });
    
    return Object.entries(regions)
      .map(([name, data]) => ({
        name,
        ...data,
        certRate: data.count > 0 ? Math.round((data.certified / data.count) * 100) : 0,
      }))
      .filter(r => r.name !== "Unknown")
      .sort((a, b) => b.count - a.count);
  }, [learners]);

  if (regionData.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe2 className="h-4 w-4" />
          By Region
        </CardTitle>
        <CardDescription>Geographic distribution</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {regionData.map((region) => (
            <div key={region.name} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{region.name}</span>
                  <span className="text-xs text-muted-foreground">{region.count.toLocaleString()}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div 
                    className="bg-primary rounded-full h-1.5 transition-all"
                    style={{ width: `${region.certRate}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold w-12 text-right">{region.certRate}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Quick Actions panel
function QuickActions({ segment, count }: { segment: InsightSegment; count: number }) {
  const actions: Record<InsightSegment, { label: string; description: string; action: () => void }[]> = {
    all: [],
    "at-risk": [
      { 
        label: "Send re-engagement email", 
        description: `Target ${count} learners with support resources`,
        action: () => alert("Email campaign feature coming soon!") 
      },
      { 
        label: "Assign mentors", 
        description: "Pair struggling learners with champions",
        action: () => alert("Mentor matching feature coming soon!") 
      },
    ],
    "rising-stars": [
      { 
        label: "Invite to Champion program", 
        description: `${count} learners qualify for advancement`,
        action: () => alert("Champion invitation feature coming soon!") 
      },
      { 
        label: "Feature in newsletter", 
        description: "Celebrate achievements publicly",
        action: () => alert("Newsletter feature coming soon!") 
      },
    ],
    "ready-to-advance": [
      { 
        label: "Send certification vouchers", 
        description: `Provide exam vouchers to ${count} ready learners`,
        action: () => alert("Voucher distribution feature coming soon!") 
      },
      { 
        label: "Schedule study groups", 
        description: "Organize group preparation sessions",
        action: () => alert("Study group feature coming soon!") 
      },
    ],
    inactive: [
      { 
        label: "Win-back campaign", 
        description: `Re-engage ${count} dormant learners`,
        action: () => alert("Win-back feature coming soon!") 
      },
    ],
    "high-value": [
      { 
        label: "Request testimonials", 
        description: "Gather success stories from top performers",
        action: () => alert("Testimonial feature coming soon!") 
      },
      { 
        label: "Invite to events", 
        description: "Engage champions as speakers or mentors",
        action: () => alert("Event invitation feature coming soon!") 
      },
    ],
  };

  const segmentActions = actions[segment];
  if (!segmentActions || segmentActions.length === 0) return null;

  return (
    <Card className="border-dashed border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Quick Actions
        </CardTitle>
        <CardDescription>Recommended actions for this segment</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {segmentActions.map((action, idx) => (
            <Button 
              key={idx}
              variant="outline" 
              className="w-full justify-start h-auto py-3 px-4"
              onClick={action.action}
            >
              <div className="text-left">
                <p className="font-medium">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function LearnerExplorerPage() {
  const router = useRouter();
  
  const { params, setParams, hasActiveFilters, clearParams } = useUrlParams({
    search: "",
    page: 1,
    status: "" as LearnerStatus | "",
    segment: "all" as InsightSegment,
  });

  const [sortField, setSortField] = useState<SortField>("handle");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [isExporting, setIsExporting] = useState(false);
  const [localSearch, setLocalSearch] = useState(params.search);
  const [activeTab, setActiveTab] = useState<"table" | "analytics">("table");
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== params.search) {
        setParams({ search: localSearch, page: 1 });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, params.search, setParams]);

  useEffect(() => {
    setLocalSearch(params.search);
  }, [params.search]);

  const searchTerm = params.search;
  const currentPage = params.page;
  const statusFilter = params.status;
  const segmentFilter = (params.segment as InsightSegment) || "all";
  const pageSize = 50;

  // Use server-side pagination - pass offset based on current page
  const offset = (currentPage - 1) * pageSize;
  
  // Use enriched learners API with server-side pagination AND segment filtering
  const { data, isLoading, error, isFetching } = useEnrichedLearners({
    search: searchTerm || undefined,
    segment: segmentFilter,
    limit: pageSize,
    offset: offset,
  });

  // Fetch accurate segment counts from server (computed across all 367K learners)
  const { data: serverSegmentCounts } = useSegmentCounts();

  const allLearners = (data?.learners || []) as EnrichedLearner[];
  const totalCount = data?.total_count || data?.count || 0;

  // Apply status filter client-side (enriched API doesn't have status filter)
  const statusFilteredLearners = useMemo(() => {
    if (!statusFilter) return allLearners;
    return allLearners.filter(l => l.learner_status === statusFilter);
  }, [allLearners, statusFilter]);

  // Use server-side segment counts (accurate across all learners)
  const segmentCounts = useMemo(() => {
    if (serverSegmentCounts) {
      return {
        all: serverSegmentCounts.all,
        "at-risk": serverSegmentCounts.at_risk,
        "rising-stars": serverSegmentCounts.rising_stars,
        "ready-to-advance": serverSegmentCounts.ready_to_advance,
        inactive: serverSegmentCounts.inactive,
        "high-value": serverSegmentCounts.high_value,
      };
    }
    // Fallback to totalCount for "all" while loading
    return {
      all: totalCount,
      "at-risk": 0,
      "rising-stars": 0,
      "ready-to-advance": 0,
      inactive: 0,
      "high-value": 0,
    };
  }, [serverSegmentCounts, totalCount]);

  // Segment filtering now done server-side, just use the returned data
  const displayLearners = statusFilteredLearners;

  // Calculate total pages from server total_count
  const totalPages = Math.ceil(totalCount / pageSize);

  const getStatusColor = (status: string) => {
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortOrder === "asc" 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Sort learners
  const sortedLearners = useMemo(() => {
    return [...displayLearners].sort((a, b) => {
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
        case "company":
          aVal = getCompany(a).toLowerCase();
          bVal = getCompany(b).toLowerCase();
          break;
        case "region":
          aVal = getRegion(a).toLowerCase();
          bVal = getRegion(b).toLowerCase();
          break;
        case "quality":
          aVal = getDataQuality(a).score;
          bVal = getDataQuality(b).score;
          break;
        case "lastActivity":
          aVal = getLastActivity(a);
          bVal = getLastActivity(b);
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [displayLearners, sortField, sortOrder]);

  // Export to CSV
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const headers = ["Handle", "Email", "Status", "Certs", "Company", "Region", "Job Role", "Copilot Days", "Last Activity", "Quality"];
      
      const rows = displayLearners.map(learner => [
        getHandle(learner),
        getEmail(learner),
        learner.learner_status || "",
        getCerts(learner).toString(),
        getCompany(learner),
        getRegion(learner),
        getJobRole(learner),
        getCopilotDays(learner).toString(),
        getLastActivity(learner),
        getDataQuality(learner).level,
      ]);
      
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(","))
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `learners-${segmentFilter}-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }, [displayLearners, segmentFilter]);

  // Early returns AFTER all hooks
  if (isLoading && !data) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error as Error} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Talent Intelligence</h1>
          <p className="text-muted-foreground">
            Discover insights and take action on {totalCount.toLocaleString()} learners
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport} disabled={isExporting || displayLearners.length === 0}>
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Export {segmentFilter !== "all" ? insightSegmentConfig[segmentFilter].label : "All"}
        </Button>
      </div>

      {/* Insight Segment Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {(Object.keys(insightSegmentConfig) as InsightSegment[]).map((segment) => (
          <InsightCard
            key={segment}
            segment={segment}
            count={segment === "all" ? totalCount : segmentCounts[segment]}
            isActive={segmentFilter === segment}
            onClick={() => setParams({ segment, page: 1 })}
          />
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Column - Table/Analytics */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, company, or region..."
                    className="pl-10 pr-10"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                  />
                  {isFetching && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
                  )}
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setParams({ status: e.target.value as LearnerStatus | "", page: 1 })}
                  className="px-3 py-2 rounded-md border border-input bg-background"
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
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Table vs Analytics */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "table" | "analytics")}>
            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
              <TabsTrigger value="table" className="gap-2">
                <Users className="h-4 w-4" />
                Learner List
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="table" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    {segmentFilter !== "all" && (
                      <Badge className={insightSegmentConfig[segmentFilter].color}>
                        {insightSegmentConfig[segmentFilter].label}
                      </Badge>
                    )}
                    {(segmentFilter === "all" ? totalCount : segmentCounts[segmentFilter]).toLocaleString()} Learners
                  </CardTitle>
                  <CardDescription>
                    Showing {displayLearners.length} of {(segmentFilter === "all" ? totalCount : segmentCounts[segmentFilter]).toLocaleString()} • Click any row to view full profile
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sortedLearners.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No learners found in this segment</p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50 text-xs font-medium border-b">
                        <button 
                          className="col-span-2 flex items-center hover:text-foreground text-left"
                          onClick={() => handleSort("handle")}
                        >
                          Learner <SortIcon field="handle" />
                        </button>
                        <button 
                          className="col-span-2 flex items-center hover:text-foreground text-left"
                          onClick={() => handleSort("status")}
                        >
                          Status <SortIcon field="status" />
                        </button>
                        <button 
                          className="col-span-1 flex items-center hover:text-foreground text-left"
                          onClick={() => handleSort("certs")}
                        >
                          Certs <SortIcon field="certs" />
                        </button>
                        <button 
                          className="col-span-2 flex items-center hover:text-foreground text-left"
                          onClick={() => handleSort("company")}
                        >
                          Company <SortIcon field="company" />
                        </button>
                        <button 
                          className="col-span-1 flex items-center hover:text-foreground text-left"
                          onClick={() => handleSort("region")}
                        >
                          Region <SortIcon field="region" />
                        </button>
                        <div className="col-span-2">Products</div>
                        <button 
                          className="col-span-2 flex items-center hover:text-foreground text-left"
                          onClick={() => handleSort("lastActivity")}
                        >
                          Last Active <SortIcon field="lastActivity" />
                        </button>
                      </div>
                      {sortedLearners.map((learner, idx) => {
                        const lastActivity = getLastActivity(learner);
                        let activityDisplay = "—";
                        if (lastActivity) {
                          try {
                            const date = new Date(lastActivity);
                            const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
                            if (days === 0) activityDisplay = "Today";
                            else if (days === 1) activityDisplay = "Yesterday";
                            else if (days < 30) activityDisplay = `${days}d ago`;
                            else if (days < 365) activityDisplay = `${Math.floor(days / 30)}mo ago`;
                            else activityDisplay = `${Math.floor(days / 365)}y ago`;
                          } catch {
                            activityDisplay = "—";
                          }
                        }
                        
                        return (
                          <div
                            key={`${getHandle(learner) || getEmail(learner)}-${idx}`}
                            className="grid grid-cols-12 gap-2 p-3 items-center border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer text-sm"
                            onClick={() => router.push(`/journey/profile?email=${encodeURIComponent(getEmail(learner))}`)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && router.push(`/journey/profile?email=${encodeURIComponent(getEmail(learner))}`)}
                          >
                            <div className="col-span-2">
                              <p className="font-medium truncate">{getHandle(learner) || "—"}</p>
                              <p className="text-xs text-muted-foreground truncate">{getJobRole(learner) || getEmail(learner)}</p>
                            </div>
                            <div className="col-span-2">
                              <Badge className={`${getStatusColor(learner.learner_status)} text-xs`}>
                                {learner.learner_status}
                              </Badge>
                            </div>
                            <div className="col-span-1">
                              <div className="flex items-center gap-1">
                                <Award className="h-3 w-3 text-amber-500" />
                                <span className="font-semibold">{getCerts(learner)}</span>
                              </div>
                            </div>
                            <div className="col-span-2 truncate text-muted-foreground">
                              {getCompany(learner) || "—"}
                            </div>
                            <div className="col-span-1 truncate text-muted-foreground">
                              {getRegion(learner) || "—"}
                            </div>
                            <div className="col-span-2 flex gap-1 flex-wrap">
                              {usesCopilot(learner) && (
                                <Badge variant="outline" className="text-xs gap-1 bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border-violet-200 px-1.5 py-0">
                                  <Sparkles className="h-2.5 w-2.5" />
                                  Copilot
                                </Badge>
                              )}
                              {usesActions(learner) && (
                                <Badge variant="outline" className="text-xs gap-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 px-1.5 py-0">
                                  <Shield className="h-2.5 w-2.5" />
                                  Actions
                                </Badge>
                              )}
                            </div>
                            <div className="col-span-2 flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {activityDisplay}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount.toLocaleString()} learners
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                          Page {currentPage} of {totalPages.toLocaleString()}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setParams({ page: Math.max(1, currentPage - 1) })}
                            disabled={currentPage <= 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setParams({ page: Math.min(totalPages, currentPage + 1) })}
                            disabled={currentPage >= totalPages}
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <CompanyBreakdown learners={displayLearners} />
                <RegionBreakdown learners={displayLearners} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Quick Actions & Stats */}
        <div className="space-y-4">
          {/* Segment-specific actions */}
          {segmentFilter !== "all" && (
            <QuickActions segment={segmentFilter} count={segmentCounts[segmentFilter]} />
          )}

          {/* Summary Stats for selected segment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Segment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Avg. Certifications
                </span>
                <span className="font-semibold">
                  {displayLearners.length > 0 
                    ? (displayLearners.reduce((sum, l) => sum + getCerts(l), 0) / displayLearners.length).toFixed(1)
                    : "0"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Copilot Adoption
                </span>
                <span className="font-semibold">
                  {displayLearners.length > 0 
                    ? Math.round((displayLearners.filter(usesCopilot).length / displayLearners.length) * 100)
                    : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Actions Adoption
                </span>
                <span className="font-semibold">
                  {displayLearners.length > 0 
                    ? Math.round((displayLearners.filter(usesActions).length / displayLearners.length) * 100)
                    : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Companies
                </span>
                <span className="font-semibold">
                  {new Set(displayLearners.map(getCompany).filter(Boolean)).size}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Globe2 className="h-4 w-4" />
                  Regions
                </span>
                <span className="font-semibold">
                  {new Set(displayLearners.map(getRegion).filter(Boolean)).size}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(
                  displayLearners.reduce((acc, l) => {
                    const status = l.learner_status || "Unknown";
                    acc[status] = (acc[status] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <Badge className={`${getStatusColor(status)} text-xs`}>{status}</Badge>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
