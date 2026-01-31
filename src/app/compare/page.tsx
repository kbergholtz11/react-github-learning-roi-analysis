"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimpleBarChart, SimpleAreaChart } from "@/components/dashboard";
import { ExportButton } from "@/components/export-button";
import { ArrowUp, ArrowDown, Minus, Layers, Calendar, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMetrics, useJourney, useImpact } from "@/hooks/use-data";

export default function ComparisonPage() {
  const [selectedTab, setSelectedTab] = useState("stages");
  
  const { data: metrics, isLoading: metricsLoading } = useMetrics();
  const { data: journey, isLoading: journeyLoading } = useJourney();
  const { data: impact, isLoading: impactLoading } = useImpact();
  
  const isLoading = metricsLoading || journeyLoading || impactLoading;

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-gray-600";
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
        <Skeleton className="h-12 w-96" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  // Build stage data from journey funnel
  const stageData = journey?.funnel?.map((stage: { stage: string; count: number }, index: number, arr: { stage: string; count: number }[]) => {
    const prevCount = index > 0 ? arr[index - 1].count : stage.count;
    const conversionRate = prevCount > 0 ? ((stage.count / prevCount) * 100) : 100;
    return {
      name: stage.stage,
      learners: stage.count,
      conversionRate: Math.round(conversionRate),
    };
  }) || [];

  // Stage chart data
  const stageChartData = stageData.map((s: { name: string; learners: number }) => ({
    name: s.name,
    value: s.learners,
  }));

  // Monthly progression data - use correct property names
  const monthlyData = journey?.monthlyProgression?.map((m) => ({
    name: m.name,
    certified: m.certified ?? 0,
    learning: m.learning ?? 0,
  })) || [];

  // Stage impact data
  const stageImpact = impact?.stageImpact || [];

  // Build export data
  const stageExportData = {
    title: "Stage Comparison",
    headers: ["Stage", "Learners", "Conversion Rate"],
    rows: stageData.map((s: { name: string; learners: number; conversionRate: number }) => [s.name, s.learners, `${s.conversionRate}%`]),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comparison & Benchmarks</h1>
          <p className="text-muted-foreground">
            Compare performance across departments, courses, and time periods
          </p>
        </div>
        <ExportButton data={stageExportData} filename="comparison-data" />
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="stages" className="gap-2">
            <Layers className="h-4 w-4" />
            Stages
          </TabsTrigger>
          <TabsTrigger value="monthly" className="gap-2">
            <Calendar className="h-4 w-4" />
            Monthly
          </TabsTrigger>
          <TabsTrigger value="impact" className="gap-2">
            <Target className="h-4 w-4" />
            Impact
          </TabsTrigger>
        </TabsList>

        {/* Stages Tab */}
        <TabsContent value="stages" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Learners by Journey Stage</CardTitle>
                <CardDescription>Distribution across the learning funnel</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleBarChart 
                  data={stageChartData} 
                  dataKey="value"
                  color="#8b5cf6"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Monthly Progression</CardTitle>
                <CardDescription>Certified vs Learning over time</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleAreaChart 
                  data={monthlyData} 
                  dataKey="certified"
                  secondaryDataKey="learning"
                  color="#22c55e"
                  secondaryColor="#3b82f6"
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Stage Performance Table</CardTitle>
              <CardDescription>Detailed metrics by journey stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 text-sm font-medium">
                  <div>Stage</div>
                  <div className="text-right">Learners</div>
                  <div className="text-right">Conversion</div>
                </div>
                {stageData.map((stage: { name: string; learners: number; conversionRate: number }) => (
                  <div key={stage.name} className="grid grid-cols-3 gap-4 p-4 border-t items-center">
                    <div className="font-medium">{stage.name}</div>
                    <div className="text-right font-mono">{stage.learners.toLocaleString()}</div>
                    <div className="text-right">
                      <Badge 
                        variant="secondary" 
                        className={stage.conversionRate >= 50 
                          ? "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-400" 
                          : stage.conversionRate >= 30 
                          ? "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" 
                          : "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-400"}
                      >
                        {stage.conversionRate}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Tab */}
        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Learner Distribution</CardTitle>
              <CardDescription>Certified, Learning, and Prospects over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 text-sm font-medium">
                  <div>Month</div>
                  <div className="text-right">Certified</div>
                  <div className="text-right">Learning</div>
                  <div className="text-right">Change</div>
                </div>
                {journey?.monthlyProgression?.map((row, index, arr) => {
                  const certified = row.certified ?? 0;
                  const learning = row.learning ?? 0;
                  const prevCertified = index > 0 ? (arr[index - 1].certified ?? 0) : certified;
                  const change = prevCertified > 0 ? Math.round(((certified - prevCertified) / prevCertified) * 100) : 0;
                  return (
                    <div key={row.name} className="grid grid-cols-4 gap-4 p-4 border-t items-center">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-right font-mono">{certified.toLocaleString()}</div>
                      <div className="text-right font-mono">{learning.toLocaleString()}</div>
                      <div className={`text-right flex items-center justify-end gap-1 ${getTrendColor(change)}`}>
                        {getTrendIcon(change)}
                        <span className="font-medium">{Math.abs(change)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Impact Tab */}
        <TabsContent value="impact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learning Impact by Stage</CardTitle>
              <CardDescription>Adoption and engagement metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-5 gap-4 p-4 bg-muted/50 text-sm font-medium">
                  <div>Stage</div>
                  <div className="text-right">Learners</div>
                  <div className="text-right">Top Product</div>
                  <div className="text-right">Usage Increase</div>
                  <div className="text-right">Platform Time</div>
                </div>
                {stageImpact.map((stage: { stage: string; learners: number; avgUsageIncrease: number; platformTimeIncrease: number; topProduct: string }) => {
                  return (
                    <div key={stage.stage} className="grid grid-cols-5 gap-4 p-4 border-t items-center">
                      <div className="font-medium">{stage.stage}</div>
                      <div className="text-right font-mono text-muted-foreground">{stage.learners.toLocaleString()}</div>
                      <div className="text-right font-mono font-medium">{stage.topProduct}</div>
                      <div className={`text-right flex items-center justify-end gap-1 ${getTrendColor(stage.avgUsageIncrease)}`}>
                        {getTrendIcon(stage.avgUsageIncrease)}
                        <span className="font-medium">{Math.abs(stage.avgUsageIncrease)}%</span>
                      </div>
                      <div className="text-right font-mono">+{stage.platformTimeIncrease}%</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
