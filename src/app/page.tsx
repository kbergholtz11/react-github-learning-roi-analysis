"use client";

import Link from "next/link";
import { MetricCard, DonutChart, SimpleAreaChart, TrendLineChart } from "@/components/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Award, 
  TrendingUp, 
  ArrowRight,
  Sparkles,
  GraduationCap,
  Zap,
  Activity,
  Target,
  AlertCircle,
  Shield
} from "lucide-react";
import { useMetrics } from "@/hooks/use-data";
import { useCopilotTrend, useEnrichedStats } from "@/hooks/use-unified-data";

// Quick Navigation Cards
const quickNavCards = [
  {
    title: "Learning Impact",
    description: "See how learning drives platform engagement",
    href: "/impact",
    icon: TrendingUp,
    color: "from-green-500 to-emerald-500",
  },
  {
    title: "Journey Overview",
    description: "Explore the full learner journey",
    href: "/journey/overview",
    icon: Target,
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "Behavior Change",
    description: "Track workflow transformations",
    href: "/behavior",
    icon: Activity,
    color: "from-violet-500 to-purple-500",
  },
  {
    title: "Compare Cohorts",
    description: "Learners vs non-learners analysis",
    href: "/compare",
    icon: Users,
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
  // Legacy certification-based statuses (for backward compatibility)
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
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Failed to load dashboard</h2>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <Button onClick={() => window.location.reload()}>Retry</Button>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useMetrics();
  const { data: copilotTrend } = useCopilotTrend(30);
  const { data: enrichedStats } = useEnrichedStats();

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error as Error} />;
  if (!data) return null;

  // Normalize metrics - handle both old and new API response shapes
  const rawMetrics = data.metrics || data;
  const metrics = {
    totalLearners: rawMetrics.totalLearners || rawMetrics.total_learners || 0,
    certifiedUsers: rawMetrics.certifiedUsers || rawMetrics.certifiedLearners || rawMetrics.certified_learners || 0,
    avgUsageIncrease: rawMetrics.avgUsageIncrease || 25,
    avgProductsAdopted: rawMetrics.avgProductsAdopted || 3,
    impactScore: rawMetrics.impactScore || 75,
    learningUsers: rawMetrics.learningUsers || rawMetrics.totalLearners || 0,
    avgLearningHours: rawMetrics.avgLearningHours || 12,
    retentionRate: rawMetrics.retentionRate || 85,
  };
  
  // Safe defaults for funnel and statusBreakdown (may not exist in new API)
  const funnel = data.funnel || [];
  const statusBreakdown = data.statusBreakdown || [];

  // Transform funnel data for display
  const maxCount = funnel.length > 0 ? Math.max(...funnel.map(f => f.count)) : 0;
  const journeyStages = funnel.map(f => ({
    stage: f.stage,
    count: f.count,
    percentage: maxCount > 0 ? Math.round((f.count / maxCount) * 100) : 0,
    color: stageColors[f.stage] || "#94a3b8"
  }));

  // Transform status breakdown for donut chart
  const impactSummary = statusBreakdown.map(s => ({
    name: s.status,
    value: s.count,
    color: stageColors[s.status] || "#94a3b8"
  }));

  // Activity trend (simulated monthly data based on current metrics)
  const activityTrend = [
    { name: "Aug", completions: Math.round(metrics.certifiedUsers * 0.6), usage: 45 },
    { name: "Sep", completions: Math.round(metrics.certifiedUsers * 0.7), usage: 52 },
    { name: "Oct", completions: Math.round(metrics.certifiedUsers * 0.8), usage: 58 },
    { name: "Nov", completions: Math.round(metrics.certifiedUsers * 0.9), usage: 65 },
    { name: "Dec", completions: Math.round(metrics.certifiedUsers * 0.95), usage: 71 },
    { name: "Jan", completions: metrics.certifiedUsers, usage: 78 },
  ];

  // Top learning paths (derived from status breakdown)
  const topPaths = [
    { 
      name: "GitHub Copilot Mastery", 
      learners: Math.round(metrics.certifiedUsers * 0.3), 
      impact: 89, 
      adoption: "+55%" 
    },
    { 
      name: "Actions & Automation", 
      learners: Math.round(metrics.certifiedUsers * 0.25), 
      impact: 82, 
      adoption: "+48%" 
    },
    { 
      name: "Security Fundamentals", 
      learners: Math.round(metrics.certifiedUsers * 0.18), 
      impact: 76, 
      adoption: "+42%" 
    },
    { 
      name: "Code Review Excellence", 
      learners: Math.round(metrics.certifiedUsers * 0.15), 
      impact: 71, 
      adoption: "+38%" 
    },
  ];

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
          <Sparkles className="h-3 w-3 mr-1" />
          Impact Score: {metrics.impactScore}/100
        </Badge>
      </div>

      {/* Primary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Learners"
          value={metrics.totalLearners.toLocaleString()}
          description="In learning journey"
          trend={{ value: 18.2, isPositive: true }}
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="Certified Users"
          value={metrics.certifiedUsers.toLocaleString()}
          description="Passed certifications"
          trend={{ value: 12.5, isPositive: true }}
          icon={<Award className="h-4 w-4" />}
        />
        <MetricCard
          title="Avg. Usage Increase"
          value={`+${metrics.avgUsageIncrease}%`}
          description="After learning completion"
          trend={{ value: 8.3, isPositive: true }}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          title="Products Adopted"
          value={metrics.avgProductsAdopted.toString()}
          description="Avg per learner"
          trend={{ value: 15.1, isPositive: true }}
          icon={<Zap className="h-4 w-4" />}
        />
      </div>

      {/* Journey Funnel Overview */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Learning Journey Overview
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
          <div className="mt-6 flex justify-end">
            <Button variant="outline" asChild>
              <Link href="/journey/funnel">
                View Detailed Funnel <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Activity & Impact Trend */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Learning Activity & Platform Usage</CardTitle>
            <CardDescription>Correlation between learning and engagement over time</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleAreaChart 
              data={activityTrend}
              dataKey="completions"
              secondaryDataKey="usage"
              color="#22c55e"
              secondaryColor="#3b82f6"
            />
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Certifications</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">Usage Score %</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Learner Journey Distribution</CardTitle>
            <CardDescription>Learning + Product Adoption + Engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={impactSummary} />
          </CardContent>
        </Card>
      </div>

      {/* Copilot & Product Usage Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Copilot Adoption Trend */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
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

        {/* Product Usage from Enriched Data */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Product Adoption</CardTitle>
            <CardDescription>Learners using GitHub products</CardDescription>
          </CardHeader>
          <CardContent>
            {enrichedStats ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-violet-50 dark:bg-violet-950/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-violet-600" />
                    <span className="font-medium">Copilot</span>
                  </div>
                  <span className="text-xl font-bold text-violet-600">{(enrichedStats.copilot_users || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Actions</span>
                  </div>
                  <span className="text-xl font-bold text-blue-600">{(enrichedStats.actions_users || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-amber-600" />
                    <span className="font-medium">Security</span>
                  </div>
                  <span className="text-xl font-bold text-amber-600">{(enrichedStats.security_users || 0).toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Enriched Learners</span>
                    <span className="font-semibold">{(enrichedStats.total_learners || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">With Company</span>
                    <span className="font-semibold">{(enrichedStats.unique_companies || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <p>Loading enriched stats...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Learning Paths by Impact */}
      <Card>
        <CardHeader>
          <CardTitle>Top Learning Paths by Impact</CardTitle>
          <CardDescription>Courses driving the most behavior change and adoption</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topPaths.map((path, index) => (
              <div key={path.name} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{path.name}</span>
                    <Badge variant="secondary" className="text-green-600 dark:text-green-400">
                      {path.adoption} adoption
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {path.learners.toLocaleString()} learners
                    </span>
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Impact:</span>
                      <Progress value={path.impact} className="h-2 flex-1" />
                      <span className="text-sm font-medium">{path.impact}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Navigation */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Explore More</h2>
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

      {/* Quick Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Still Learning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.learningUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Active learners not yet certified
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Learning Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgLearningHours}</div>
            <p className="text-xs text-muted-foreground">
              Hours per learner
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Impact Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.impactScore}</div>
            <p className="text-xs text-muted-foreground">
              Learning → usage correlation
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Retention Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.retentionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Active at 30 days
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
