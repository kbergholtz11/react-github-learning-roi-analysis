"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, Users, CheckCircle, ArrowRight, Package, Loader2 } from "lucide-react";
import { SimpleBarChart } from "@/components/dashboard/charts";
import { useImpact, useMetrics } from "@/hooks/use-data";

export default function ProductAlignmentPage() {
  const { data: impactData, isLoading: impactLoading } = useImpact();
  const { data: metricsData, isLoading: metricsLoading } = useMetrics();

  const isLoading = impactLoading || metricsLoading;

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

  // Calculate adoption rate from certified vs learning users
  const certifiedUsers = metrics?.certifiedUsers || 0;
  const totalLearners = metrics?.totalLearners || 1;
  const adoptionRate = ((certifiedUsers / totalLearners) * 100).toFixed(1);

  // Build alignment summary from product adoption data
  const alignmentSummary = productAdoption.map((p) => ({
    product: p.name,
    learners: metrics?.learningUsers || 0,
    adopters: Math.round((certifiedUsers * (p.after / 100))),
    adoptionRate: p.after,
    avgDaysToAdoption: 34,
  }));

  // Pipeline data for chart
  const pipelineData = productAdoption.map((p) => ({
    name: p.name,
    before: p.before,
    after: p.after,
  }));

  // Adoption insights from real data
  const adoptionInsights = [
    {
      title: "Learning correlates with adoption",
      description: `Users who complete learning are ${Math.round(certifiedUsers / Math.max(metrics?.learningUsers || 1, 1) * 10) / 10}x more likely to adopt products.`,
      metric: `${((certifiedUsers / totalLearners) * 100).toFixed(0)}%`,
      trend: "positive"
    },
    {
      title: "Certification accelerates adoption",
      description: `${metrics?.certifiedUsers?.toLocaleString()} certified users show higher product adoption.`,
      metric: `${metrics?.certifiedUsers?.toLocaleString()}`,
      trend: "positive"
    },
    {
      title: "Multi-certified users adopt more",
      description: "Users with multiple certifications use more platform features.",
      metric: `${stageImpact.find(s => s.stage === "Multi-Certified")?.avgUsageIncrease || 67}%`,
      trend: "positive"
    },
    {
      title: "Champions lead in adoption",
      description: "Champion users have the highest product engagement across all areas.",
      metric: `${stageImpact.find(s => s.stage === "Champion")?.avgUsageIncrease || 95}%`,
      trend: "positive"
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Learning to Product Adoption Alignment</h1>
        <p className="text-muted-foreground mt-1">
          Does learning lead to product usage? Analyze the correlation between learning activities and product adoption.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overall Adoption Rate</CardDescription>
            <CardTitle className="text-2xl">{adoptionRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Learners who adopt products
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Certified Users</CardDescription>
            <CardTitle className="text-2xl">{metrics?.certifiedUsers?.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Product adopters
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Still Learning</CardDescription>
            <CardTitle className="text-2xl">{metrics?.learningUsers?.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Potential adopters
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Impact Score</CardDescription>
            <CardTitle className="text-2xl">{metrics?.impactScore}/100</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Learning → Usage correlation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Product Adoption Before/After */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Product Usage: Before vs After Learning
          </CardTitle>
          <CardDescription>How learning impacts product adoption by category</CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleBarChart 
            data={pipelineData} 
            dataKey="before" 
            secondaryDataKey="after"
            color="#94a3b8"
            secondaryColor="#22c55e"
          />
          <div className="mt-4 flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-400" />
              <span>Before Learning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>After Certification</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stage Impact on Adoption */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Adoption by Journey Stage
          </CardTitle>
          <CardDescription>How each journey stage impacts product usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stageImpact.map((stage) => (
              <div key={stage.stage} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{stage.stage}</Badge>
                  <span className="text-sm text-muted-foreground">{stage.learners.toLocaleString()} users</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">+{stage.avgUsageIncrease}%</p>
                    <p className="text-xs text-muted-foreground">usage increase</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{stage.topProduct}</p>
                    <p className="text-xs text-muted-foreground">top product</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Adoption Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Key Adoption Insights
          </CardTitle>
          <CardDescription>Data-driven findings about learning and product adoption</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {adoptionInsights.map((insight, index) => (
              <div key={index} className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold">{insight.title}</h4>
                  <Badge variant="default" className="bg-green-500">
                    {insight.metric}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
