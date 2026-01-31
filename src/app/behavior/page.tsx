"use client";

import { MetricCard, SimpleBarChart, SimpleAreaChart } from "@/components/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  Code2,
  GitPullRequest,
  GitCommit,
  Shield,
  Zap,
  TrendingUp,
  Users,
  Loader2
} from "lucide-react";
import { useImpact, useMetrics, useJourney } from "@/hooks/use-data";

export default function BehaviorChangePage() {
  const { data: impactData, isLoading: impactLoading } = useImpact();
  const { data: metricsData, isLoading: metricsLoading } = useMetrics();
  const { data: journeyData, isLoading: journeyLoading } = useJourney();

  const isLoading = impactLoading || metricsLoading || journeyLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const metrics = metricsData?.metrics;
  const productAdoption = impactData?.productAdoption || [];
  const stageImpact = impactData?.stageImpact || [];
  const correlationData = impactData?.correlationData || [];

  // Calculate behavior metrics from impact data
  const avgUsageIncrease = Math.abs(metrics?.avgUsageIncrease || 0);
  
  // Build behavior metrics from product adoption (before/after)
  const behaviorMetrics = [
    {
      category: "Product Adoption",
      icon: Code2,
      metrics: productAdoption.map(p => ({
        name: p.name,
        before: p.before,
        after: p.after,
        unit: "%",
        inverse: false,
      })),
    },
    {
      category: "Stage Impact",
      icon: TrendingUp,
      metrics: stageImpact.slice(0, 3).map(s => ({
        name: `${s.stage} Stage`,
        before: 0,
        after: s.avgUsageIncrease,
        unit: "% increase",
        inverse: false,
      })),
    },
  ];

  // Build timeline from correlation data
  const behaviorTimeline = correlationData.map(c => ({
    name: c.name,
    productUsage: c.productUsage,
    platformTime: c.platformTime,
    learningHours: Math.round(c.learningHours / 100),
  }));

  // Cohort comparison from stage impact
  const cohortComparison = stageImpact.map(s => ({
    name: s.stage,
    learners: s.avgUsageIncrease,
    baseline: 10,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Behavior Change</h1>
          <p className="text-muted-foreground">
            How learning transforms user behaviors and workflows
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Analyzing {metrics?.totalLearners?.toLocaleString()} learners
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Avg Usage Change"
          value={`${avgUsageIncrease > 0 ? '+' : ''}${metrics?.avgUsageIncrease}%`}
          description="Post-learning platform usage"
          trend={{ value: 12.3, isPositive: avgUsageIncrease > 0 }}
          icon={<Activity className="h-4 w-4" />}
        />
        <MetricCard
          title="Time to Certification"
          value={`${journeyData?.avgTimeToCompletion || 45} days`}
          description="Avg journey completion"
          trend={{ value: 5.2, isPositive: false }}
          icon={<Clock className="h-4 w-4" />}
        />
        <MetricCard
          title="Impact Score"
          value={`${metrics?.impactScore}/100`}
          description="Overall learning impact"
          trend={{ value: 8.1, isPositive: true }}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          title="Certified Users"
          value={metrics?.certifiedUsers?.toLocaleString() || "0"}
          description="Completed learning journey"
          trend={{ value: 15.4, isPositive: true }}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      {/* Before/After Comparison Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {behaviorMetrics.map((category) => (
          <Card key={category.category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <category.icon className="h-5 w-5 text-primary" />
                {category.category}
              </CardTitle>
              <CardDescription>Before vs after learning completion</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {category.metrics.map((metric) => {
                  const improvement = metric.after - metric.before;
                  const isPositive = improvement > 0;
                  
                  return (
                    <div key={metric.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{metric.name}</div>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="text-muted-foreground text-sm">
                            Before: <span className="font-medium text-foreground">{metric.before}{metric.unit}</span>
                          </div>
                          <div className="text-muted-foreground text-sm">
                            After: <span className="font-medium text-foreground">{metric.after}{metric.unit}</span>
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant={isPositive ? "default" : "secondary"}
                        className={isPositive ? "bg-green-500/10 text-green-600 dark:text-green-400" : ""}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                        )}
                        {Math.abs(improvement)}%
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Behavior Change Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Behavior Change Timeline</CardTitle>
          <CardDescription>
            How key behaviors evolve over the learning journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleAreaChart 
            data={behaviorTimeline}
            dataKey="productUsage"
            secondaryDataKey="platformTime"
            color="#22c55e"
            secondaryColor="#3b82f6"
          />
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Product Usage</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Platform Time</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stage Impact Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Impact by Journey Stage</CardTitle>
          <CardDescription>
            Usage increase at each stage of the learning journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleBarChart 
            data={cohortComparison}
            dataKey="learners"
            secondaryDataKey="baseline"
            color="#22c55e"
            secondaryColor="#94a3b8"
          />
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Actual Usage Increase</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-slate-400" />
              <span className="text-muted-foreground">Baseline</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-violet-500/5 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-700 dark:text-blue-400">Behavior Change Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <GitCommit className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">Certification Impact</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {metrics?.certifiedUsers?.toLocaleString()} users have completed their learning journey and show improved platform engagement.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <GitPullRequest className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">Learning Hours</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {metrics?.totalLearningHours?.toLocaleString()} total learning hours invested across the organization.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">Champion Growth</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Champion users show {stageImpact.find(s => s.stage === "Champion")?.avgUsageIncrease || 95}% higher engagement than baseline.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
