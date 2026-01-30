"use client";

import { MetricCard, DonutChart, SimpleBarChart } from "@/components/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Clock, CheckCircle, Loader2 } from "lucide-react";
import { useJourney, useMetrics } from "@/hooks/use-data";

export default function JourneyOverviewPage() {
  const { data: journeyData, isLoading: journeyLoading } = useJourney();
  const { data: metricsData, isLoading: metricsLoading } = useMetrics();

  const isLoading = journeyLoading || metricsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const funnel = journeyData?.funnel || [];
  const metrics = metricsData?.metrics;
  const monthlyProgression = journeyData?.monthlyProgression || [];

  // Build funnel data for display
  const funnelData = funnel.map((stage) => ({
    name: stage.stage,
    value: stage.count,
    color: stage.color,
  }));

  // Build path completion data from status breakdown
  const pathCompletionData = metricsData?.statusBreakdown?.map((s, i) => ({
    name: s.status,
    value: s.count,
    color: ["#3b82f6", "#22c55e", "#8b5cf6", "#f59e0b", "#ef4444"][i] || "#94a3b8",
  })) || [];

  // Weekly progress from monthly progression (adapt to weekly display)
  const weeklyProgressData = monthlyProgression.slice(-6).map((m) => ({
    name: m.name,
    enrolled: m.learning + m.certified,
    completed: m.certified,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Journey Overview</h1>
          <p className="text-muted-foreground">
            Track learner progression through certification paths
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Live data
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Enrolled"
          value={metrics?.totalLearners?.toLocaleString() || "0"}
          description="Across all learning paths"
          trend={{ value: 8.3, isPositive: true }}
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="In Progress"
          value={metrics?.learningUsers?.toLocaleString() || "0"}
          description="Actively learning"
          trend={{ value: 12.1, isPositive: true }}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          title="Certified"
          value={metrics?.certifiedUsers?.toLocaleString() || "0"}
          description="Finished & certified"
          trend={{ value: 5.7, isPositive: true }}
          icon={<CheckCircle className="h-4 w-4" />}
        />
        <MetricCard
          title="Avg. Completion Time"
          value={`${journeyData?.avgTimeToCompletion || 45} days`}
          description="From enrollment to completion"
          trend={{ value: 3.2, isPositive: false }}
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      {/* Funnel and Progress Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Learning Funnel</CardTitle>
            <CardDescription>Progression through learning stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {funnelData.map((stage) => {
                const maxValue = funnelData[0]?.value || 1;
                const percentage = (stage.value / maxValue) * 100;
                return (
                  <div key={stage.name} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{stage.name}</span>
                      <span className="text-muted-foreground">{stage.value.toLocaleString()} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ width: `${percentage}%`, backgroundColor: stage.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Monthly Enrollment vs Completion</CardTitle>
            <CardDescription>New enrollments and completions per month</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart 
              data={weeklyProgressData} 
              dataKey="enrolled"
              secondaryDataKey="completed"
              color="#3b82f6"
              secondaryColor="#22c55e"
            />
          </CardContent>
        </Card>
      </div>

      {/* Path Completion */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Learners by Status</CardTitle>
            <CardDescription>Distribution across learning statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={pathCompletionData} />
          </CardContent>
        </Card>

        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Drop-off Analysis</CardTitle>
            <CardDescription>Conversion rates between stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {journeyData?.dropOffAnalysis?.filter(d => d.nextStage).map((stage) => (
                <div key={stage.stage} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{stage.stage} → {stage.nextStage}</p>
                    <p className="text-sm text-muted-foreground">{stage.count.toLocaleString()} learners</p>
                  </div>
                  <Badge variant={stage.dropOffRate > 50 ? "destructive" : stage.dropOffRate > 30 ? "secondary" : "default"}>
                    {stage.dropOffRate}% drop-off
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
