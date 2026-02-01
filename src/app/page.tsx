"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MetricCard, DonutChart, SimpleAreaChart, TrendLineChart } from "@/components/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  PeopleIcon,
  TrophyIcon,
  GraphIcon,
  SparkleIcon,
  MortarBoardIcon,
  ZapIcon,
  PulseIcon,
  GoalIcon,
  AlertIcon,
  ShieldCheckIcon,
  ClockIcon,
  SyncIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  GitCommitIcon,
  GitPullRequestIcon,
  CopilotIcon,
  WorkflowIcon,
  OrganizationIcon,
} from "@primer/octicons-react";
import { useMetrics, useSkillsCourses, useSkillJourney } from "@/hooks/use-unified-data";
import { useCopilotTrend, useEnrichedStats, useJourney, useImpact, useEvents, useGitHubActivity } from "@/hooks/use-unified-data";

// Quick Navigation Cards - defined outside component to avoid recreation
const quickNavCards = [
  {
    title: "Learning Impact",
    description: "See how learning drives platform engagement",
    href: "/impact",
    icon: GraphIcon,
    color: "from-green-500 to-emerald-500",
  },
  {
    title: "Journey Overview",
    description: "Explore the full learner journey",
    href: "/journey/overview",
    icon: GoalIcon,
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "GitHub Activity",
    description: "Track platform engagement metrics",
    href: "/activity",
    icon: PulseIcon,
    color: "from-violet-500 to-purple-500",
  },
  {
    title: "Compare Cohorts",
    description: "Learners vs non-learners analysis",
    href: "/compare",
    icon: PeopleIcon,
    color: "from-amber-500 to-orange-500",
  },
];

// Stage colors for the funnel - includes both legacy and journey-based statuses
const stageColors: Record<string, string> = {
  // Journey-based statuses (new holistic view)
  "Mastery": "#ef4444",        // Red - highest achievement
  "Power User": "#f59e0b",     // Amber - advanced
  "Practitioner": "#22c55e",   // Green - actively practicing
  "Active Learner": "#3b82f6", // Blue - learning
  "Explorer": "#94a3b8",       // Slate - just starting
  // Certification-based statuses
  Engaged: "#94a3b8",          // Slate - engaged but not certified
  Learning: "#3b82f6",
  Certified: "#22c55e",
  "Multi-Certified": "#8b5cf6",
  Specialist: "#f59e0b",
  Champion: "#ef4444",
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-64" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Skeleton className="h-80 col-span-4" />
        <Skeleton className="h-80 col-span-3" />
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <AlertIcon size={48} className="text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Failed to load dashboard</h2>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <Button onClick={() => window.location.reload()}>Retry</Button>
    </div>
  );
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const { data, isLoading, error } = useMetrics();
  const { data: copilotTrend } = useCopilotTrend(30);
  const { data: enrichedStats } = useEnrichedStats();
  const { data: skillsData } = useSkillsCourses();
  const { data: journeyData } = useJourney();
  const { data: skillJourneyData } = useSkillJourney();
  const { data: eventsData } = useEvents();
  const { data: activityData } = useGitHubActivity();

  // Memoize expensive data transformations
  const { metrics, funnel, statusBreakdown, certificationAnalytics } = useMemo(() => {
    if (!data) return { metrics: null, funnel: [], statusBreakdown: [], certificationAnalytics: null };
    
    // Normalize metrics - handle both old and new API response shapes
    // Use type assertion to handle different API shapes
    const rawMetrics = (data.metrics || data) as unknown as Record<string, unknown>;
    return {
      metrics: {
        totalLearners: Number(rawMetrics.totalLearners ?? rawMetrics.total_learners ?? 0),
        certifiedUsers: Number(rawMetrics.certifiedUsers ?? rawMetrics.certifiedLearners ?? rawMetrics.certified_learners ?? 0),
        avgUsageIncrease: Number(rawMetrics.avgUsageIncrease ?? rawMetrics.avg_usage_increase ?? 0),
        avgProductsAdopted: Number(rawMetrics.avgProductsAdopted ?? rawMetrics.avg_products_adopted ?? 0),
        impactScore: Number(rawMetrics.impactScore ?? rawMetrics.impact_score ?? 0),
        learningUsers: Number(rawMetrics.learningUsers ?? rawMetrics.learning_users ?? rawMetrics.totalLearners ?? 0),
        avgLearningHours: Number(rawMetrics.avgLearningHours ?? rawMetrics.avg_learning_hours ?? 0),
        retentionRate: Number(rawMetrics.retentionRate ?? rawMetrics.retention_rate ?? 0),
        totalPassedExams: Number(rawMetrics.totalPassed ?? 0),
        overallPassRate: Number(rawMetrics.overallPassRate ?? 0),
      },
      funnel: data.funnel || [],
      statusBreakdown: data.statusBreakdown || [],
      certificationAnalytics: data.certificationAnalytics || null,
    };
  }, [data]);

  // Memoize derived chart data
  const { journeyStages, impactSummary } = useMemo(() => {
    if (!metrics) return { journeyStages: [], impactSummary: [] };
    
    // Transform funnel data for display
    const maxCount = funnel.length > 0 ? Math.max(...funnel.map((f: { count: number }) => f.count)) : 0;
    const journeyStages = funnel.map((f: { stage: string; count: number }) => ({
      stage: f.stage,
      count: f.count,
      percentage: maxCount > 0 ? Math.round((f.count / maxCount) * 100) : 0,
      color: stageColors[f.stage] || "#94a3b8"
    })).reverse();

    // Transform status breakdown for donut chart
    const impactSummary = statusBreakdown.map((s: { status: string; count: number }) => ({
      name: s.status,
      value: s.count,
      color: stageColors[s.status] || "#94a3b8"
    }));

    return { journeyStages, impactSummary };
  }, [metrics, funnel, statusBreakdown]);

  // Get real certification pass rates by certification for activity trend
  const certificationTrend = useMemo(() => {
    const passRates = data?.certificationAnalytics?.certificationPassRates;
    if (!passRates || passRates.length === 0) return [];
    
    return passRates.slice(0, 6).map((cert: { certification: string; passed: number; passRate: number }) => ({
      name: cert.certification.replace("GitHub ", ""),
      completions: cert.passed,
      usage: Math.round(cert.passRate)
    }));
  }, [data]);

  // Get real skills data for top paths
  const topPaths = useMemo(() => {
    if (!skillsData?.byCategory) return [];
    
    return skillsData.byCategory
      .sort((a, b) => b.knownLearners - a.knownLearners)
      .slice(0, 4)
      .map((cat) => ({
        name: `${cat.category} Track`,
        learners: cat.knownLearners,
        impact: Math.round(cat.completionRate),
        adoption: `${cat.courses} courses`
      }));
  }, [skillsData]);

  // Journey velocity data - how long it takes to move through stages
  const stageVelocity = useMemo(() => {
    if (!journeyData?.stageVelocity) return null;
    return journeyData.stageVelocity;
  }, [journeyData]);

  // Skill dimensions radar data
  const skillDimensions = useMemo(() => {
    if (!skillJourneyData?.dimensionAverages) return [];
    const dims = skillJourneyData.dimensionAverages;
    return [
      { name: "Learning", value: dims.learning || 0, fullMark: 100 },
      { name: "Product Usage", value: dims.product_usage || 0, fullMark: 100 },
      { name: "Certification", value: dims.certification || 0, fullMark: 100 },
      { name: "Consistency", value: dims.consistency || 0, fullMark: 100 },
      { name: "Growth", value: dims.growth || 0, fullMark: 100 },
    ];
  }, [skillJourneyData]);

  // Near miss and retry analytics
  const examInsights = useMemo(() => {
    if (!certificationAnalytics) return null;
    return {
      nearMiss: certificationAnalytics.nearMissSegment || null,
      retry: certificationAnalytics.retryAnalytics || null,
      forecast: certificationAnalytics.examForecast || null,
    };
  }, [certificationAnalytics]);

  // Early returns after all hooks
  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error as Error} />;
  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Journey Analytics</h1>
          <p className="text-muted-foreground">
            Track how GitHub Learning transforms users into platform experts
          </p>
        </div>
        <Badge variant="default" className="bg-gradient-to-r from-violet-500 to-purple-600">
          <SparkleIcon size={12} className="mr-1" />
          Impact Score: {metrics.impactScore}/100
        </Badge>
      </div>

      {/* Primary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Learners"
          value={metrics.totalLearners.toLocaleString()}
          description="In learning journey"
          icon={<PeopleIcon size={16} />}
        />
        <MetricCard
          title="Certified Users"
          value={metrics.certifiedUsers.toLocaleString()}
          description={`${metrics.overallPassRate}% pass rate`}
          icon={<TrophyIcon size={16} />}
        />
        <MetricCard
          title="Avg. Usage Change"
          value={`${metrics.avgUsageIncrease >= 0 ? '+' : ''}${metrics.avgUsageIncrease}%`}
          description="After learning completion"
          trend={metrics.avgUsageIncrease >= 0 ? { value: Math.abs(metrics.avgUsageIncrease), isPositive: true } : { value: Math.abs(metrics.avgUsageIncrease), isPositive: false }}
          icon={<GraphIcon size={16} />}
        />
        <MetricCard
          title="Products Adopted"
          value={metrics.avgProductsAdopted.toString()}
          description="Avg per learner"
          icon={<ZapIcon size={16} />}
        />
      </div>

      {/* Tabbed Dashboard Sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <GoalIcon size={16} />
            Overview
          </TabsTrigger>
          <TabsTrigger value="certifications" className="gap-2">
            <TrophyIcon size={16} />
            Certifications
          </TabsTrigger>
          <TabsTrigger value="skills" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Skills
          </TabsTrigger>
          <TabsTrigger value="velocity" className="gap-2">
            <ClockIcon size={16} />
            Velocity
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Journey Funnel Overview */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MortarBoardIcon size={20} className="text-primary" />
                Learning Journey Funnel
              </CardTitle>
              <CardDescription>
                User progression through the learning stages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {journeyStages.map((stage) => (
                  <div key={stage.stage} className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium">{stage.stage}</div>
                    <div className="flex-1">
                      <div className="h-8 bg-muted rounded-lg overflow-hidden">
                        <div 
                          className="h-full rounded-lg transition-all duration-500"
                          style={{ 
                            width: `${stage.percentage}%`,
                            backgroundColor: stage.color,
                          }}
                        />
                      </div>
                    </div>
                    <div className="w-24 text-right">
                      <span className="font-semibold">{stage.count.toLocaleString()}</span>
                      <span className="text-muted-foreground text-xs ml-1">({stage.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Copilot Adoption Trend */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CopilotIcon size={20} className="text-violet-500" />
                  Copilot Adoption Trend
                </CardTitle>
                <CardDescription>Daily active learners using GitHub Copilot (30 days)</CardDescription>
              </CardHeader>
              <CardContent>
                {copilotTrend && copilotTrend.length > 0 ? (
                  <>
                    <SimpleAreaChart 
                      data={copilotTrend.map(d => ({
                        name: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                        value: d.active_users,
                        events: d.total_events || 0
                      }))}
                      dataKey="value"
                      color="#8b5cf6"
                    />
                    <div className="flex justify-center gap-6 mt-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-violet-500" />
                        <span className="text-muted-foreground">Active Users</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    <p>Copilot trend data loading...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Learner Distribution</CardTitle>
                <CardDescription>By certification level</CardDescription>
              </CardHeader>
              <CardContent>
                <DonutChart data={impactSummary} />
              </CardContent>
            </Card>
          </div>

          {/* Product Adoption Row */}
          <Card>
            <CardHeader>
              <CardTitle>Product Adoption Overview</CardTitle>
              <CardDescription>Learners actively using GitHub products (90-day window)</CardDescription>
            </CardHeader>
            <CardContent>
              {enrichedStats ? (
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="flex items-center justify-between p-4 bg-violet-50 dark:bg-violet-950/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900">
                        <CopilotIcon size={20} className="text-violet-600" />
                      </div>
                      <div>
                        <span className="font-medium">Copilot</span>
                        <p className="text-xs text-muted-foreground">AI pair programmer</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-violet-600">{(enrichedStats.copilot_users || 0).toLocaleString()}</span>
                      <p className="text-xs text-muted-foreground">
                        {enrichedStats.total_learners ? Math.round((enrichedStats.copilot_users || 0) / enrichedStats.total_learners * 100) : 0}% of learners
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                        <WorkflowIcon size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <span className="font-medium">Actions</span>
                        <p className="text-xs text-muted-foreground">CI/CD automation</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-blue-600">{(enrichedStats.actions_users || 0).toLocaleString()}</span>
                      <p className="text-xs text-muted-foreground">
                        {enrichedStats.total_learners ? Math.round((enrichedStats.actions_users || 0) / enrichedStats.total_learners * 100) : 0}% of learners
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
                        <ShieldCheckIcon size={20} className="text-amber-600" />
                      </div>
                      <div>
                        <span className="font-medium">Security</span>
                        <p className="text-xs text-muted-foreground">GHAS features</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-amber-600">{(enrichedStats.security_users || 0).toLocaleString()}</span>
                      <p className="text-xs text-muted-foreground">
                        {enrichedStats.total_learners ? Math.round((enrichedStats.security_users || 0) / enrichedStats.total_learners * 100) : 0}% of learners
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                        <OrganizationIcon size={20} className="text-green-600" />
                      </div>
                      <div>
                        <span className="font-medium">With Company</span>
                        <p className="text-xs text-muted-foreground">Enterprise learners</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-green-600">{(enrichedStats.learners_with_company || 0).toLocaleString()}</span>
                      <p className="text-xs text-muted-foreground">
                        {enrichedStats.total_learners ? Math.round((enrichedStats.learners_with_company || 0) / enrichedStats.total_learners * 100) : 0}% of learners
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[100px] flex items-center justify-center text-muted-foreground">
                  <p>Loading product adoption data...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* GitHub Activity & Events Summary */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* GitHub Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCommitIcon size={20} className="text-green-500" />
                  GitHub Activity
                </CardTitle>
                <CardDescription>Development contributions from learners</CardDescription>
              </CardHeader>
              <CardContent>
                {activityData ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {activityData.totals.activeDays.toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">Active Days</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {activityData.totals.prDays.toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">PR Days</p>
                    </div>
                    <div className="text-center p-3 bg-violet-50 dark:bg-violet-950/30 rounded-lg">
                      <div className="text-2xl font-bold text-violet-600">
                        {activityData.totals.copilotDays.toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">Copilot Days</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-[80px] flex items-center justify-center text-muted-foreground">
                    <p>Loading activity data...</p>
                  </div>
                )}
                <Button variant="ghost" size="sm" className="w-full mt-4" asChild>
                  <Link href="/activity">
                    View Activity Details <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Events Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon size={20} className="text-amber-500" />
                  Events & Engagement
                </CardTitle>
                <CardDescription>Bootcamps, workshops, and partner events</CardDescription>
              </CardHeader>
              <CardContent>
                {eventsData ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                      <div className="text-2xl font-bold text-amber-600">
                        {eventsData.summary.totalUsers.toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">Attendees</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {eventsData.summary.attendanceRate}%
                      </div>
                      <p className="text-xs text-muted-foreground">Attendance Rate</p>
                    </div>
                    <div className="text-center p-3 bg-violet-50 dark:bg-violet-950/30 rounded-lg">
                      <div className="text-2xl font-bold text-violet-600">
                        {eventsData.impact.certificationRateOfAttendees}%
                      </div>
                      <p className="text-xs text-muted-foreground">→ Certified</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-[80px] flex items-center justify-center text-muted-foreground">
                    <p>Loading events data...</p>
                  </div>
                )}
                <Button variant="ghost" size="sm" className="w-full mt-4" asChild>
                  <Link href="/events">
                    View Events Details <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Certifications Tab */}
        <TabsContent value="certifications" className="space-y-6">
          {/* Certification Performance */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Total Passed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{metrics.totalPassedExams.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Certification exams passed</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <GoalIcon size={16} className="text-blue-500" />
                  Pass Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{metrics.overallPassRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">Overall success rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-violet-500" />
                  First-Time Pass
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-violet-600">
                  {examInsights?.retry?.firstTimePassRate || 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Pass on first attempt</p>
              </CardContent>
            </Card>
          </div>

          {/* Pass Rates by Certification */}
          <Card>
            <CardHeader>
              <CardTitle>Certification Performance by Exam</CardTitle>
              <CardDescription>Pass count and success rate across certifications</CardDescription>
            </CardHeader>
            <CardContent>
              {certificationTrend.length > 0 ? (
                <>
                  <SimpleAreaChart 
                    data={certificationTrend}
                    dataKey="completions"
                    secondaryDataKey="usage"
                    color="#22c55e"
                    secondaryColor="#3b82f6"
                    useSecondaryAxis={true}
                  />
                  <div className="flex justify-center gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      <span className="text-muted-foreground">Passed Count</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-blue-500" />
                      <span className="text-muted-foreground">Pass Rate %</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  <p>Loading certification data...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Near Miss & Retry Analytics */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Near Miss Segment */}
            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Near-Miss Segment
                </CardTitle>
                <CardDescription>
                  Learners within 5% of passing threshold — high-value intervention targets
                </CardDescription>
              </CardHeader>
              <CardContent>
                {examInsights?.nearMiss ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                      <div>
                        <span className="text-3xl font-bold text-amber-600">
                          {examInsights.nearMiss.nearMissCount?.toLocaleString() || 0}
                        </span>
                        <p className="text-sm text-muted-foreground">
                          Near-miss attempts ({examInsights.nearMiss.nearMissThreshold || "60-69%"})
                        </p>
                      </div>
                      <Badge variant="outline" className="border-amber-500 text-amber-600">
                        High Priority
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {examInsights.nearMiss.nearMissByCertification?.slice(0, 4).map((cert: { certification: string; count: number }) => (
                        <div key={cert.certification} className="flex items-center justify-between text-sm">
                          <span>{cert.certification.replace("GitHub ", "")}</span>
                          <span className="font-medium">{cert.count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[150px] flex items-center justify-center text-muted-foreground">
                    <p>Loading near-miss data...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Retry Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-blue-500" />
                  Retry Analytics
                </CardTitle>
                <CardDescription>
                  How learners perform on subsequent attempts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {examInsights?.retry ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {examInsights.retry.firstTimePassRate}%
                        </div>
                        <p className="text-xs text-muted-foreground">First-time pass</p>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {examInsights.retry.retrySuccessRate}%
                        </div>
                        <p className="text-xs text-muted-foreground">Retry success</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Attempt Distribution</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-16">1st try</span>
                        <Progress value={100} className="h-2 flex-1" />
                        <span className="text-xs font-medium w-16 text-right">
                          {examInsights.retry.attemptDistribution?.firstTry?.toLocaleString() || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-16">2nd try</span>
                        <Progress 
                          value={examInsights.retry.attemptDistribution?.firstTry ? 
                            (examInsights.retry.attemptDistribution.secondTry / examInsights.retry.attemptDistribution.firstTry) * 100 : 0} 
                          className="h-2 flex-1" 
                        />
                        <span className="text-xs font-medium w-16 text-right">
                          {examInsights.retry.attemptDistribution?.secondTry?.toLocaleString() || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-16">3rd try</span>
                        <Progress 
                          value={examInsights.retry.attemptDistribution?.firstTry ? 
                            (examInsights.retry.attemptDistribution.thirdTry / examInsights.retry.attemptDistribution.firstTry) * 100 : 0} 
                          className="h-2 flex-1" 
                        />
                        <span className="text-xs font-medium w-16 text-right">
                          {examInsights.retry.attemptDistribution?.thirdTry?.toLocaleString() || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-[150px] flex items-center justify-center text-muted-foreground">
                    <p>Loading retry analytics...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Exam Forecast */}
          {examInsights?.forecast && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon size={20} className="text-green-500" />
                  Exam Forecast (Next 3 Months)
                </CardTitle>
                <CardDescription>
                  Scheduled exams and projected outcomes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {examInsights.forecast.monthlyForecast?.slice(0, 3).map((month: { 
                    month: string; 
                    scheduled: number; 
                    projectedPasses: number; 
                    projectedPassRate: number;
                  }) => (
                    <div key={month.month} className="p-4 border rounded-lg">
                      <div className="text-lg font-semibold mb-3">
                        {new Date(month.month + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Scheduled</span>
                          <span className="font-medium">{month.scheduled}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Projected Passes</span>
                          <span className="font-medium text-green-600">{month.projectedPasses}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Expected Rate</span>
                          <span className="font-medium">{month.projectedPassRate}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-6">
          {/* Skill Dimensions */}
          <Card>
            <CardHeader>
              <CardTitle>Skill Dimension Averages</CardTitle>
              <CardDescription>
                Average scores across the 5 dimensions that make up the skill score
              </CardDescription>
            </CardHeader>
            <CardContent>
              {skillDimensions.length > 0 ? (
                <div className="space-y-4">
                  {skillDimensions.map((dim) => (
                    <div key={dim.name} className="flex items-center gap-4">
                      <div className="w-32 text-sm font-medium">{dim.name}</div>
                      <div className="flex-1">
                        <Progress value={dim.value} className="h-4" />
                      </div>
                      <div className="w-16 text-right font-semibold">{dim.value.toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  <p>Loading skill dimensions...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Growth Metrics */}
          {skillJourneyData?.growthMetrics && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Growing Learners
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {skillJourneyData.growthMetrics.growing_percentage}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {skillJourneyData.growthMetrics.growing_learners.toLocaleString()} actively improving
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    Active (30d)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {skillJourneyData.growthMetrics.active_percentage}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {skillJourneyData.growthMetrics.active_30_days.toLocaleString()} active learners
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrophyIcon size={16} className="text-violet-500" />
                    Certified
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-violet-600">
                    {skillJourneyData.growthMetrics.cert_percentage}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {skillJourneyData.growthMetrics.with_certifications.toLocaleString()} with certs
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Top Learning Paths */}
          <Card>
            <CardHeader>
              <CardTitle>Top Skills Tracks by Activity</CardTitle>
              <CardDescription>Skills course categories with highest learner engagement</CardDescription>
            </CardHeader>
            <CardContent>
              {topPaths.length > 0 ? (
                <div className="space-y-4">
                  {topPaths.map((path, index) => (
                    <div key={path.name} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">{path.name}</span>
                          <Badge variant="secondary" className="text-blue-600 dark:text-blue-400">
                            {path.adoption}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">
                            {path.learners.toLocaleString()} known learners
                          </span>
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Completion:</span>
                            <Progress value={path.impact} className="h-2 flex-1" />
                            <span className="text-sm font-medium">{path.impact}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  <p>Run <code className="bg-muted px-1 rounded">npm run fetch:skills</code> to load skills data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Velocity Tab */}
        <TabsContent value="velocity" className="space-y-6">
          {/* Stage Velocity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClockIcon size={20} className="text-blue-500" />
                Journey Stage Velocity
              </CardTitle>
              <CardDescription>
                Average time (in days) learners spend at each stage of the journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stageVelocity ? (
                <div className="space-y-4">
                  {Object.entries(stageVelocity).map(([stage, days]) => {
                    const stageName = stage.charAt(0).toUpperCase() + stage.slice(1).replace(/([A-Z])/g, ' $1');
                    const maxDays = Math.max(...Object.values(stageVelocity as Record<string, number>));
                    const percentage = maxDays > 0 ? ((days as number) / maxDays) * 100 : 0;
                    return (
                      <div key={stage} className="flex items-center gap-4">
                        <div className="w-28 text-sm font-medium">{stageName}</div>
                        <div className="flex-1">
                          <div className="h-6 bg-muted rounded-lg overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                              style={{ width: `${Math.max(percentage, 5)}%` }}
                            >
                              {percentage > 20 && (
                                <span className="text-xs font-medium text-white">{days}d</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {percentage <= 20 && (
                          <div className="w-12 text-right text-sm font-medium">{days}d</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  <p>Loading velocity data...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Key Insights */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fastest Progression</CardTitle>
                <CardDescription>Stages with quickest advancement</CardDescription>
              </CardHeader>
              <CardContent>
                {stageVelocity ? (
                  <div className="space-y-3">
                    {Object.entries(stageVelocity)
                      .filter(([, days]) => days as number > 0)
                      .sort((a, b) => (a[1] as number) - (b[1] as number))
                      .slice(0, 3)
                      .map(([stage, days], i) => (
                        <div key={stage} className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-bold ${
                            i === 0 ? 'bg-green-500' : i === 1 ? 'bg-blue-500' : 'bg-violet-500'
                          }`}>
                            {i + 1}
                          </div>
                          <div>
                            <div className="font-medium">{stage.charAt(0).toUpperCase() + stage.slice(1)}</div>
                            <div className="text-sm text-muted-foreground">{days} days average</div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Loading...</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bottlenecks</CardTitle>
                <CardDescription>Stages where learners spend most time</CardDescription>
              </CardHeader>
              <CardContent>
                {stageVelocity ? (
                  <div className="space-y-3">
                    {Object.entries(stageVelocity)
                      .filter(([, days]) => days as number > 0)
                      .sort((a, b) => (b[1] as number) - (a[1] as number))
                      .slice(0, 3)
                      .map(([stage, days], i) => (
                        <div key={stage} className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-bold ${
                            i === 0 ? 'bg-red-500' : i === 1 ? 'bg-orange-500' : 'bg-amber-500'
                          }`}>
                            {i + 1}
                          </div>
                          <div>
                            <div className="font-medium">{stage.charAt(0).toUpperCase() + stage.slice(1)}</div>
                            <div className="text-sm text-muted-foreground">{days} days average</div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Loading...</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Navigation */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Deep Dive</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickNavCards.map((card) => (
            <Link key={card.href} href={card.href}>
              <Card className="h-full hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer group">
                <CardContent className="pt-6">
                  <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${card.color} text-white mb-4 group-hover:scale-110 transition-transform`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold mb-1">{card.title}</h3>
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
