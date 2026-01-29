"use client";

import { MetricCard, DonutChart, SimpleBarChart, SimpleAreaChart } from "@/components/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Award, DollarSign, Target, CheckCircle, AlertTriangle, ArrowUpRight, TrendingUp, Zap } from "lucide-react";

// Executive summary data
const programHealthData = [
  { name: "On Track", value: 78, color: "#22c55e" },
  { name: "At Risk", value: 15, color: "#f59e0b" },
  { name: "Off Track", value: 7, color: "#ef4444" },
];

const impactMetrics = [
  { name: "Platform Usage", before: 45, after: 78, unit: "%" },
  { name: "Feature Adoption", before: 23, after: 67, unit: "%" },
  { name: "Time to Productivity", before: 45, after: 26, unit: "days", inverse: true },
  { name: "Support Tickets", before: 156, after: 89, unit: "/mo", inverse: true },
];

const quarterlyPerformanceData = [
  { name: "Q1", target: 1000, actual: 950 },
  { name: "Q2", target: 1200, actual: 1280 },
  { name: "Q3", target: 1400, actual: 1520 },
  { name: "Q4", target: 1600, actual: 1750 },
];

const investmentTrendData = [
  { name: "Jan", budget: 50000, spent: 48000 },
  { name: "Feb", budget: 50000, spent: 52000 },
  { name: "Mar", budget: 55000, spent: 54000 },
  { name: "Apr", budget: 55000, spent: 53000 },
  { name: "May", budget: 60000, spent: 58000 },
  { name: "Jun", budget: 60000, spent: 61000 },
];

const keyInitiatives = [
  { name: "GitHub Copilot Rollout", status: "on-track", progress: 85, impact: "High", owner: "Engineering" },
  { name: "Security Certification", status: "on-track", progress: 72, impact: "Critical", owner: "Security" },
  { name: "DevOps Transformation", status: "at-risk", progress: 45, impact: "High", owner: "Platform" },
  { name: "New Hire Onboarding", status: "on-track", progress: 90, impact: "Medium", owner: "HR" },
  { name: "Advanced Git Training", status: "completed", progress: 100, impact: "Medium", owner: "Engineering" },
];

const highlights = [
  { title: "Certification Rate Up 23%", description: "Exceeded Q4 target by 150 certifications", type: "success" },
  { title: "$825K Annual ROI", description: "Productivity and quality improvements", type: "success" },
  { title: "67% Usage Increase", description: "Average platform usage post-learning", type: "success" },
  { title: "76% Copilot Adoption", description: "Highest adoption rate across enterprise", type: "success" },
];

export default function ExecutiveSummaryPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Executive Summary</h1>
          <p className="text-muted-foreground">
            Strategic overview of the GitHub Learning program
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            Q4 2025 Report
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Program Healthy
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Learners"
          value="4,586"
          description="Active in journey"
          trend={{ value: 15.2, isPositive: true }}
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="Usage Increase"
          value="+67%"
          description="Post-learning engagement"
          trend={{ value: 12.5, isPositive: true }}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          title="Annual ROI"
          value="$825K"
          description="Realized value"
          trend={{ value: 32.5, isPositive: true }}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <MetricCard
          title="Products Adopted"
          value="4.2"
          description="Avg per learner"
          trend={{ value: 18.0, isPositive: true }}
          icon={<Zap className="h-4 w-4" />}
        />
      </div>

      {/* Learning Impact Summary */}
      <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-green-700 dark:text-green-400">Learning → Impact Summary</CardTitle>
          <CardDescription>Key metrics showing the direct impact of learning on platform engagement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            {impactMetrics.map((metric) => {
              const improvement = metric.inverse 
                ? ((metric.before - metric.after) / metric.before) * 100
                : ((metric.after - metric.before) / metric.before) * 100;
              return (
                <div key={metric.name} className="space-y-2">
                  <div className="text-sm font-medium">{metric.name}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{metric.after}{metric.unit}</span>
                    <span className="text-sm text-green-600 dark:text-green-400">
                      {metric.inverse ? '↓' : '↑'}{Math.abs(improvement).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    was {metric.before}{metric.unit}
                  </div>
                  <Progress value={metric.inverse ? (1 - metric.after/metric.before) * 100 : (metric.after/100) * 100} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Highlights */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {highlights.map((highlight) => (
          <Card key={highlight.title} className={highlight.type === 'warning' ? 'border-yellow-200 bg-yellow-50/50' : 'border-green-200 bg-green-50/50'}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                {highlight.type === 'success' ? (
                  <ArrowUpRight className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                )}
                <div>
                  <p className="font-medium text-sm">{highlight.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{highlight.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Program Health</CardTitle>
            <CardDescription>Initiative status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={programHealthData} />
          </CardContent>
        </Card>

        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Quarterly Performance</CardTitle>
            <CardDescription>Target vs actual certifications</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart 
              data={quarterlyPerformanceData} 
              dataKey="target"
              secondaryDataKey="actual"
              color="#94a3b8"
              secondaryColor="#22c55e"
            />
          </CardContent>
        </Card>
      </div>

      {/* Investment Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Utilization</CardTitle>
          <CardDescription>Monthly budget vs actual spend</CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleAreaChart 
            data={investmentTrendData}
            dataKey="budget"
            secondaryDataKey="spent"
            color="#94a3b8"
            secondaryColor="#3b82f6"
          />
        </CardContent>
      </Card>

      {/* Key Initiatives */}
      <Card>
        <CardHeader>
          <CardTitle>Key Initiatives</CardTitle>
          <CardDescription>Strategic learning program initiatives</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-5 gap-4 p-4 bg-muted/50 text-sm font-medium">
              <div>Initiative</div>
              <div>Owner</div>
              <div>Progress</div>
              <div>Impact</div>
              <div>Status</div>
            </div>
            {keyInitiatives.map((initiative) => (
              <div key={initiative.name} className="grid grid-cols-5 gap-4 p-4 border-t items-center">
                <div className="font-medium">{initiative.name}</div>
                <div className="text-sm text-muted-foreground">{initiative.owner}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-24">
                      <div 
                        className={`h-full rounded-full ${
                          initiative.status === 'completed' ? 'bg-green-500' :
                          initiative.status === 'at-risk' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${initiative.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8">{initiative.progress}%</span>
                  </div>
                </div>
                <div>
                  <Badge variant="outline" className={
                    initiative.impact === 'Critical' ? 'border-red-200 text-red-700' :
                    initiative.impact === 'High' ? 'border-orange-200 text-orange-700' :
                    'border-blue-200 text-blue-700'
                  }>
                    {initiative.impact}
                  </Badge>
                </div>
                <div>
                  <Badge className={
                    initiative.status === 'completed' ? 'bg-green-100 text-green-700' :
                    initiative.status === 'at-risk' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }>
                    {initiative.status === 'on-track' ? 'On Track' :
                     initiative.status === 'at-risk' ? 'At Risk' : 'Completed'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
