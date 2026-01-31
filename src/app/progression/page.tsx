"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2, TrendingUp, Award, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SimpleBarChart, SimpleAreaChart } from "@/components/dashboard/charts";
import { useMetrics, useJourney, useImpact } from "@/hooks/use-data";

export default function ProgressionTrackingPage() {
  const { data: metrics, isLoading: metricsLoading } = useMetrics();
  const { data: journey, isLoading: journeyLoading } = useJourney();
  const { data: impact, isLoading: impactLoading } = useImpact();
  
  const isLoading = metricsLoading || journeyLoading || impactLoading;
  
  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading progression data">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  // Calculate progression metrics from real data
  const totalLearners = metrics?.metrics?.totalLearners || 0;
  const certified = metrics?.metrics?.certifiedUsers || 0;
  const learning = metrics?.metrics?.learningUsers || 0;
  const prospects = metrics?.metrics?.prospectUsers || 0;
  
  // Journey stage data from real funnel
  const journeyStageData = journey?.funnel?.map((stage: { stage: string; count: number }) => ({
    name: stage.stage,
    value: stage.count,
  })) || [];
  
  // Monthly progression from journey data - using correct property names
  const monthlyProgression = journey?.monthlyProgression?.map((m) => ({
    name: m.name,
    certified: m.certified ?? 0,
    learning: m.learning ?? 0,
  })) || [];

  // Stage impact data - using correct property names  
  const stageImpact = impact?.stageImpact || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Learner Progression Tracking</h1>
        <p className="text-muted-foreground mt-1">
          Track how learners progress through their journey over time
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Learners</CardDescription>
            <CardTitle className="text-2xl">{totalLearners.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Across all stages
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Currently Learning</CardDescription>
            <CardTitle className="text-2xl">{learning.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {((learning / totalLearners) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Certified</CardDescription>
            <CardTitle className="text-2xl">{certified.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {((certified / totalLearners) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Prospects</CardDescription>
            <CardTitle className="text-2xl">{prospects.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Not yet engaged
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Journey Stage Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              Journey Stage Distribution
            </CardTitle>
            <CardDescription>Current distribution across journey stages</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart 
              data={journeyStageData} 
              dataKey="value" 
              color="#8b5cf6"
            />
          </CardContent>
        </Card>

        {/* Stage Impact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Learning Impact by Stage
            </CardTitle>
            <CardDescription>ROI and adoption metrics by journey stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stageImpact.map((stage: { stage: string; learners: number; avgUsageIncrease: number; platformTimeIncrease: number; topProduct: string }) => (
                <div key={stage.stage} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{stage.stage}</p>
                    <p className="text-sm text-muted-foreground">
                      {stage.learners.toLocaleString()} learners
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${stage.avgUsageIncrease >= 0 ? 'text-green-600' : 'text-amber-600'}`}>
                      {stage.avgUsageIncrease >= 0 ? '+' : ''}{stage.avgUsageIncrease}% usage
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stage.topProduct}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Progression */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Monthly Progression
          </CardTitle>
          <CardDescription>Learner distribution over time</CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleAreaChart 
            data={monthlyProgression} 
            dataKey="certified" 
            secondaryDataKey="learning"
            color="#22c55e"
            secondaryColor="#3b82f6"
          />
          <div className="mt-4 flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Certified</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Learning</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
