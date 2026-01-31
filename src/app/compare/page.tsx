"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimpleBarChart, SimpleAreaChart } from "@/components/dashboard";
import { ExportButton } from "@/components/export-button";
import { 
  ArrowUp, 
  ArrowDown, 
  Minus, 
  Users, 
  Clock, 
  Globe, 
  Award, 
  TrendingUp,
  Sparkles,
  GitBranch,
  Shield
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMetrics, useJourney, useImpact } from "@/hooks/use-unified-data";
import { Progress } from "@/components/ui/progress";

// Types for cohort data
interface TenureCohort {
  tenure: string;
  label: string;
  description: string;
  count: number;
  avg_days_since_cert: number | null;
  avg_certs: number;
  avg_skills: number;
  avg_learn_views: number;
  products: {
    copilot: { rate_90d: number; rate_ever: number; avg_days?: number };
    actions: { rate_90d: number; rate_ever: number; avg_days?: number };
    security: { rate_90d: number; rate_ever: number };
    pr: { rate_ever: number };
    issues: { rate_ever: number };
    code_search: { rate_ever: number };
    packages: { rate_ever: number };
    projects: { rate_ever: number };
    discussions: { rate_ever: number };
    pages: { rate_ever: number };
  };
  avg_active_days: number;
  avg_products: number;
}

interface RegionBreakdown {
  region: string;
  certifiedUsers: number;
  totalCerts: number;
  percentage: number;
}

interface CertificationPassRate {
  certification: string;
  passed: number;
  failed: number;
  totalAttempts: number;
  passRate: number;
}

interface ProductAdoption {
  key: string;
  name: string;
  users90d: number;
  usersEver: number;
  rate90d: number;
  rateEver: number;
}

// Hook to fetch tenure cohort data
function useTenureCohorts() {
  return useQuery<{ tenure_groups: TenureCohort[] }>({
    queryKey: ["tenure-cohorts"],
    queryFn: async () => {
      const res = await fetch("http://localhost:8000/api/enriched/stats/certified-adoption-by-tenure");
      if (!res.ok) throw new Error("Failed to fetch tenure cohorts");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

// Hook to fetch product adoption data
function useProductAdoption() {
  return useQuery<{ products: ProductAdoption[]; total_learners: number; avg_products: number }>({
    queryKey: ["product-adoption"],
    queryFn: async () => {
      const res = await fetch("http://localhost:8000/api/enriched/stats/product-adoption");
      if (!res.ok) throw new Error("Failed to fetch product adoption");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

export default function ComparisonPage() {
  const [selectedTab, setSelectedTab] = useState("tenure");
  
  const { data: metrics, isLoading: metricsLoading } = useMetrics();
  const { data: journey, isLoading: journeyLoading } = useJourney();
  const { data: impact, isLoading: impactLoading } = useImpact();
  const { data: tenureData, isLoading: tenureLoading } = useTenureCohorts();
  const { data: productData, isLoading: productLoading } = useProductAdoption();
  
  const isLoading = metricsLoading || journeyLoading || impactLoading || tenureLoading || productLoading;

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return "text-green-600 dark:text-green-400";
    if (value < 0) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const getProgressColor = (value: number) => {
    if (value >= 30) return "bg-green-500";
    if (value >= 15) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading comparison data">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>
        <Skeleton className="h-12 w-full max-w-lg" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  // Extract data
  const tenureCohorts = tenureData?.tenure_groups || [];
  const certAnalytics = metrics?.certificationAnalytics;
  const regionBreakdown: RegionBreakdown[] = certAnalytics?.geographicBreakdown?.regionBreakdown || [];
  const certPassRates: CertificationPassRate[] = certAnalytics?.certificationPassRates || [];
  const products = productData?.products || [];
  
  // Tenure comparison chart data
  const tenureChartData = tenureCohorts.map((c) => ({
    name: c.label.replace("Pre-Certification", "Pre-Cert").replace("Post-Cert", ""),
    copilot: c.products?.copilot?.rate_90d || 0,
    actions: c.products?.actions?.rate_90d || 0,
    security: c.products?.security?.rate_90d || 0,
  }));

  // Region chart data
  const regionChartData = regionBreakdown
    .filter((r) => r.region !== "Unknown" && r.region !== "Other")
    .map((r) => ({
      name: r.region,
      value: r.certifiedUsers,
    }));

  // Certification pass rate chart data
  const certChartData = certPassRates
    .filter((c) => c.totalAttempts > 50)
    .map((c) => ({
      name: c.certification.replace("GitHub ", ""),
      passRate: c.passRate,
      attempts: c.totalAttempts,
    }));

  // Product adoption chart data
  const productChartData = products.map((p) => ({
    name: p.name,
    ever: p.rateEver,
    recent: p.rate90d,
  }));

  // Build export data
  const exportData = {
    title: "Cohort Comparison Analysis",
    headers: ["Cohort", "Users", "Copilot Rate", "Actions Rate"],
    rows: tenureCohorts.map((c) => [
      c.label, 
      c.count, 
      `${c.products?.copilot?.rate_90d || 0}%`,
      `${c.products?.actions?.rate_90d || 0}%`
    ]),
  };

  // Summary stats
  const totalCertified = regionBreakdown.reduce((sum, r) => sum + r.certifiedUsers, 0);
  const avgPassRate = certAnalytics?.summary?.overallPassRate || 0;
  const topRegion = regionBreakdown.sort((a, b) => b.certifiedUsers - a.certifiedUsers)[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compare Cohorts</h1>
          <p className="text-muted-foreground">
            Analyze performance differences across tenure, regions, certifications, and products
          </p>
        </div>
        <ExportButton data={exportData} filename="cohort-comparison" />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Certified</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCertified.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across {regionBreakdown.length} regions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Pass Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgPassRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {certAnalytics?.summary?.totalExamAttempts?.toLocaleString() || 0} total attempts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Region</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topRegion?.region || "N/A"}</div>
            <p className="text-xs text-muted-foreground">
              {topRegion?.percentage?.toFixed(1) || 0}% of all certified users
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenure Cohorts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenureCohorts.length}</div>
            <p className="text-xs text-muted-foreground">
              Pre & post-certification stages
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="tenure" className="gap-2">
            <Clock className="h-4 w-4" />
            Tenure
          </TabsTrigger>
          <TabsTrigger value="regions" className="gap-2">
            <Globe className="h-4 w-4" />
            Regions
          </TabsTrigger>
          <TabsTrigger value="certifications" className="gap-2">
            <Award className="h-4 w-4" />
            Certifications
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Products
          </TabsTrigger>
        </TabsList>

        {/* Tenure Cohort Tab */}
        <TabsContent value="tenure" className="space-y-4">
          {/* Info Banner */}
          <div className="rounded-lg border bg-blue-500/5 border-blue-500/20 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">90-Day Activity Tracking</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Only <strong>Copilot</strong>, <strong>Actions</strong>, and <strong>Security</strong> have 90-day activity tracking. 
                  Other products (PRs, Issues, etc.) only have &quot;ever used&quot; data. See the detailed table below for all metrics.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>90-Day Product Adoption by Tenure</CardTitle>
                <CardDescription>Copilot & Actions usage rates across certification stages</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleBarChart 
                  data={tenureChartData} 
                  dataKey="copilot"
                  secondaryDataKey="actions"
                  color="#8b5cf6"
                  secondaryColor="#f59e0b"
                />
                <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-violet-500" />
                    <span>Copilot</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                    <span>Actions</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>All 90-Day Product Rates</CardTitle>
                <CardDescription>Copilot, Actions & Security by tenure cohort</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tenureCohorts.map((cohort) => (
                  <div key={cohort.tenure} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {cohort.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {cohort.count.toLocaleString()} users
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col items-center p-2 rounded-md bg-violet-500/10">
                        <Sparkles className="h-3 w-3 text-violet-500 mb-1" />
                        <span className="text-sm font-bold text-violet-700 dark:text-violet-400">
                          {cohort.products?.copilot?.rate_90d?.toFixed(1) || 0}%
                        </span>
                        <span className="text-[10px] text-muted-foreground">Copilot</span>
                      </div>
                      <div className="flex flex-col items-center p-2 rounded-md bg-amber-500/10">
                        <GitBranch className="h-3 w-3 text-amber-500 mb-1" />
                        <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                          {cohort.products?.actions?.rate_90d?.toFixed(1) || 0}%
                        </span>
                        <span className="text-[10px] text-muted-foreground">Actions</span>
                      </div>
                      <div className="flex flex-col items-center p-2 rounded-md bg-emerald-500/10">
                        <Shield className="h-3 w-3 text-emerald-500 mb-1" />
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                          {cohort.products?.security?.rate_90d?.toFixed(1) || 0}%
                        </span>
                        <span className="text-[10px] text-muted-foreground">Security</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Tenure Cohort Comparison</CardTitle>
              <CardDescription>Product usage and engagement metrics by certification tenure</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <div className="grid grid-cols-7 gap-4 p-4 bg-muted/50 text-sm font-medium min-w-[800px]">
                  <div>Cohort</div>
                  <div className="text-right">Users</div>
                  <div className="text-right flex items-center justify-end gap-1">
                    <Sparkles className="h-3 w-3" />
                    Copilot
                  </div>
                  <div className="text-right flex items-center justify-end gap-1">
                    <GitBranch className="h-3 w-3" />
                    Actions
                  </div>
                  <div className="text-right flex items-center justify-end gap-1">
                    <Shield className="h-3 w-3" />
                    Security
                  </div>
                  <div className="text-right">Avg Products</div>
                  <div className="text-right">Active Days</div>
                </div>
                {tenureCohorts.map((cohort) => (
                  <div key={cohort.tenure} className="grid grid-cols-7 gap-4 p-4 border-t items-center min-w-[800px]">
                    <div>
                      <div className="font-medium">{cohort.label}</div>
                      <div className="text-xs text-muted-foreground truncate" title={cohort.description}>
                        {cohort.description.slice(0, 40)}...
                      </div>
                    </div>
                    <div className="text-right font-mono">{cohort.count.toLocaleString()}</div>
                    <div className="text-right">
                      <Badge 
                        variant="secondary" 
                        className={cohort.products?.copilot?.rate_90d >= 15 
                          ? "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-400" 
                          : cohort.products?.copilot?.rate_90d >= 8 
                          ? "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" 
                          : "bg-gray-500/10 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400"}
                      >
                        {cohort.products?.copilot?.rate_90d?.toFixed(1) || 0}%
                      </Badge>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant="secondary" 
                        className={cohort.products?.actions?.rate_90d >= 10 
                          ? "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-400" 
                          : cohort.products?.actions?.rate_90d >= 5 
                          ? "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" 
                          : "bg-gray-500/10 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400"}
                      >
                        {cohort.products?.actions?.rate_90d?.toFixed(1) || 0}%
                      </Badge>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm">
                        {cohort.products?.security?.rate_90d?.toFixed(1) || 0}%
                      </span>
                    </div>
                    <div className="text-right font-mono">{cohort.avg_products?.toFixed(1) || 0}</div>
                    <div className="text-right font-mono">{cohort.avg_active_days?.toFixed(0) || 0}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Regions Tab */}
        <TabsContent value="regions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Certified Users by Region</CardTitle>
                <CardDescription>Geographic distribution of certified learners</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleBarChart 
                  data={regionChartData} 
                  dataKey="value"
                  color="#3b82f6"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Regional Breakdown</CardTitle>
                <CardDescription>Certified users and total certifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {regionBreakdown
                    .filter((r) => r.region !== "Unknown" && r.region !== "Other")
                    .map((region) => (
                    <div key={region.region} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{region.region}</span>
                          <Badge variant="outline" className="text-xs">
                            {region.certifiedUsers.toLocaleString()} users
                          </Badge>
                        </div>
                        <span className="text-sm font-medium">
                          {region.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={region.percentage} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {region.totalCerts.toLocaleString()} total certifications
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Region Performance Table</CardTitle>
              <CardDescription>Detailed certification metrics by geographic region</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-5 gap-4 p-4 bg-muted/50 text-sm font-medium">
                  <div>Region</div>
                  <div className="text-right">Certified Users</div>
                  <div className="text-right">Total Certs</div>
                  <div className="text-right">Certs/User</div>
                  <div className="text-right">Share</div>
                </div>
                {regionBreakdown.map((region) => {
                  const certsPerUser = region.certifiedUsers > 0 
                    ? (region.totalCerts / region.certifiedUsers).toFixed(2) 
                    : "0";
                  return (
                    <div key={region.region} className="grid grid-cols-5 gap-4 p-4 border-t items-center">
                      <div className="font-medium">{region.region}</div>
                      <div className="text-right font-mono">{region.certifiedUsers.toLocaleString()}</div>
                      <div className="text-right font-mono">{region.totalCerts.toLocaleString()}</div>
                      <div className="text-right font-mono">{certsPerUser}</div>
                      <div className="text-right">
                        <Badge 
                          variant="secondary" 
                          className={region.percentage >= 30 
                            ? "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-400" 
                            : region.percentage >= 10 
                            ? "bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" 
                            : "bg-gray-500/10 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400"}
                        >
                          {region.percentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certifications Tab */}
        <TabsContent value="certifications" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pass Rates by Certification</CardTitle>
                <CardDescription>Success rates across different exams</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleBarChart 
                  data={certChartData} 
                  dataKey="passRate"
                  color="#22c55e"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Retry Analytics</CardTitle>
                <CardDescription>How learners recover from failed attempts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">First-Time Pass Rate</p>
                    <p className="text-2xl font-bold">
                      {certAnalytics?.retryAnalytics?.firstTimePassRate?.toFixed(1) || 0}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Retry Success Rate</p>
                    <p className="text-2xl font-bold">
                      {certAnalytics?.retryAnalytics?.retrySuccessRate?.toFixed(1) || 0}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Avg Attempts to Pass</p>
                    <p className="text-2xl font-bold">
                      {certAnalytics?.retryAnalytics?.avgAttemptsToPass?.toFixed(1) || 0}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Near-Miss (60-69%)</p>
                    <p className="text-2xl font-bold">
                      {certAnalytics?.nearMissSegment?.nearMissCount?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Attempt Distribution</p>
                  <div className="space-y-2">
                    {["firstTry", "secondTry", "thirdTry", "fourPlusTries"].map((key, i) => {
                      const labels = ["1st Try", "2nd Try", "3rd Try", "4+ Tries"];
                      const value = certAnalytics?.retryAnalytics?.attemptDistribution?.[key as keyof typeof certAnalytics.retryAnalytics.attemptDistribution] || 0;
                      const total = certAnalytics?.retryAnalytics?.firstTimePasses || 1;
                      const pct = ((value / total) * 100);
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-xs w-16">{labels[i]}</span>
                          <Progress value={pct} className="h-2 flex-1" />
                          <span className="text-xs font-mono w-16 text-right">{value.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Certification Performance Comparison</CardTitle>
              <CardDescription>Pass rates, attempts, and scores by certification type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-5 gap-4 p-4 bg-muted/50 text-sm font-medium">
                  <div>Certification</div>
                  <div className="text-right">Total Attempts</div>
                  <div className="text-right">Passed</div>
                  <div className="text-right">Failed</div>
                  <div className="text-right">Pass Rate</div>
                </div>
                {certPassRates.map((cert) => (
                  <div key={cert.certification} className="grid grid-cols-5 gap-4 p-4 border-t items-center">
                    <div className="font-medium">{cert.certification}</div>
                    <div className="text-right font-mono text-muted-foreground">
                      {cert.totalAttempts.toLocaleString()}
                    </div>
                    <div className="text-right font-mono text-green-600 dark:text-green-400">
                      {cert.passed.toLocaleString()}
                    </div>
                    <div className="text-right font-mono text-red-600 dark:text-red-400">
                      {cert.failed.toLocaleString()}
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant="secondary" 
                        className={cert.passRate >= 70 
                          ? "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-400" 
                          : cert.passRate >= 60 
                          ? "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" 
                          : "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-400"}
                      >
                        {cert.passRate.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Product Adoption Rates</CardTitle>
                <CardDescription>Ever used vs. active in last 90 days</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleBarChart 
                  data={productChartData} 
                  dataKey="ever"
                  secondaryDataKey="recent"
                  color="#8b5cf6"
                  secondaryColor="#22c55e"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Adoption Summary</CardTitle>
                <CardDescription>Key product usage metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Learners</p>
                    <p className="text-2xl font-bold">
                      {productData?.total_learners?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Avg Products/User</p>
                    <p className="text-2xl font-bold">
                      {productData?.avg_products?.toFixed(1) || 0}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t space-y-3">
                  <p className="text-sm font-medium">Top Products (Ever Used)</p>
                  {products.slice(0, 5).map((product) => (
                    <div key={product.key} className="flex items-center gap-2">
                      <span className="text-sm w-24 truncate">{product.name}</span>
                      <Progress value={product.rateEver} className="h-2 flex-1" />
                      <span className="text-xs font-mono w-12 text-right">{product.rateEver.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Product Adoption Comparison</CardTitle>
              <CardDescription>Detailed usage metrics across all GitHub products</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-5 gap-4 p-4 bg-muted/50 text-sm font-medium">
                  <div>Product</div>
                  <div className="text-right">Users (Ever)</div>
                  <div className="text-right">Rate (Ever)</div>
                  <div className="text-right">Active 90d</div>
                  <div className="text-right">Rate (90d)</div>
                </div>
                {products.map((product) => (
                  <div key={product.key} className="grid grid-cols-5 gap-4 p-4 border-t items-center">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-right font-mono text-muted-foreground">
                      {product.usersEver.toLocaleString()}
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant="secondary" 
                        className={product.rateEver >= 50 
                          ? "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-400" 
                          : product.rateEver >= 30 
                          ? "bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" 
                          : "bg-gray-500/10 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400"}
                      >
                        {product.rateEver.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="text-right font-mono">
                      {product.users90d > 0 ? product.users90d.toLocaleString() : "—"}
                    </div>
                    <div className="text-right">
                      {product.rate90d > 0 ? (
                        <Badge 
                          variant="secondary" 
                          className={product.rate90d >= 30 
                            ? "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-400" 
                            : product.rate90d >= 15 
                            ? "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" 
                            : "bg-gray-500/10 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400"}
                        >
                          {product.rate90d.toFixed(1)}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
