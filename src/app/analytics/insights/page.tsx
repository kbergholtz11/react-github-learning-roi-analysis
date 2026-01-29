"use client";

import { MetricCard, DonutChart, SimpleBarChart, SimpleAreaChart } from "@/components/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Users, Target, Percent } from "lucide-react";

// Sample ROI data
const roiBreakdownData = [
  { name: "Productivity Gains", value: 420000, color: "#22c55e" },
  { name: "Reduced Onboarding", value: 185000, color: "#3b82f6" },
  { name: "Quality Improvements", value: 145000, color: "#8b5cf6" },
  { name: "Tool Consolidation", value: 75000, color: "#f59e0b" },
];

const quarterlyROIData = [
  { name: "Q1 2025", investment: 120000, returns: 180000 },
  { name: "Q2 2025", investment: 125000, returns: 245000 },
  { name: "Q3 2025", investment: 130000, returns: 320000 },
  { name: "Q4 2025", investment: 135000, returns: 425000 },
];

const departmentImpactData = [
  { name: "Engineering", value: 45, color: "#3b82f6" },
  { name: "DevOps", value: 25, color: "#22c55e" },
  { name: "Security", value: 15, color: "#8b5cf6" },
  { name: "Platform", value: 10, color: "#f59e0b" },
  { name: "QA", value: 5, color: "#ef4444" },
];

const monthlyMetricsData = [
  { name: "Jul", productivity: 12, quality: 8, satisfaction: 72 },
  { name: "Aug", productivity: 15, quality: 12, satisfaction: 74 },
  { name: "Sep", productivity: 18, quality: 15, satisfaction: 76 },
  { name: "Oct", productivity: 22, quality: 18, satisfaction: 78 },
  { name: "Nov", productivity: 25, quality: 21, satisfaction: 81 },
  { name: "Dec", productivity: 28, quality: 24, satisfaction: 84 },
];

const keyMetrics = [
  { metric: "Developer Productivity", baseline: "100%", current: "128%", improvement: "+28%", status: "above" },
  { metric: "Time to First PR", baseline: "5 days", current: "2.5 days", improvement: "-50%", status: "above" },
  { metric: "Code Review Time", baseline: "8 hours", current: "4 hours", improvement: "-50%", status: "above" },
  { metric: "Onboarding Time", baseline: "30 days", current: "18 days", improvement: "-40%", status: "above" },
  { metric: "Bug Rate", baseline: "12/month", current: "7/month", improvement: "-42%", status: "above" },
  { metric: "Developer Satisfaction", baseline: "72%", current: "84%", improvement: "+12%", status: "above" },
];

export default function InsightsROIPage() {
  const totalROI = roiBreakdownData.reduce((acc, item) => acc + item.value, 0);
  const totalInvestment = quarterlyROIData.reduce((acc, item) => acc + item.investment, 0);
  const roiPercentage = ((totalROI - totalInvestment) / totalInvestment * 100).toFixed(0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Insights & ROI</h1>
          <p className="text-muted-foreground">
            Measure the business impact of your learning investment
          </p>
        </div>
        <Badge variant="outline" className="text-sm bg-green-50 text-green-700 border-green-200">
          <TrendingUp className="h-3 w-3 mr-1" />
          ROI Positive
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total ROI"
          value={`$${(totalROI / 1000).toFixed(0)}K`}
          description="Annual value generated"
          trend={{ value: 32.5, isPositive: true }}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <MetricCard
          title="ROI Percentage"
          value={`${roiPercentage}%`}
          description="Return on investment"
          trend={{ value: 18.2, isPositive: true }}
          icon={<Percent className="h-4 w-4" />}
        />
        <MetricCard
          title="Productivity Gain"
          value="+28%"
          description="Developer efficiency"
          trend={{ value: 5.3, isPositive: true }}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          title="Learners Impacted"
          value="1,256"
          description="Completed training"
          trend={{ value: 8.7, isPositive: true }}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>ROI Breakdown</CardTitle>
            <CardDescription>Value contribution by category</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={roiBreakdownData} />
          </CardContent>
        </Card>

        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Quarterly Investment vs Returns</CardTitle>
            <CardDescription>Investment and realized value over time</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart 
              data={quarterlyROIData} 
              dataKey="investment"
              secondaryDataKey="returns"
              color="#ef4444"
              secondaryColor="#22c55e"
            />
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Monthly Impact Trends</CardTitle>
            <CardDescription>Productivity improvement over time</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleAreaChart 
              data={monthlyMetricsData}
              dataKey="productivity"
              secondaryDataKey="quality"
              color="#3b82f6"
              secondaryColor="#22c55e"
            />
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Impact by Department</CardTitle>
            <CardDescription>Where learning delivers most value</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={departmentImpactData} />
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Key Performance Indicators</CardTitle>
          <CardDescription>Before and after learning program implementation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-5 gap-4 p-4 bg-muted/50 text-sm font-medium">
              <div>Metric</div>
              <div className="text-right">Baseline</div>
              <div className="text-right">Current</div>
              <div className="text-right">Improvement</div>
              <div className="text-right">Status</div>
            </div>
            {keyMetrics.map((item) => (
              <div key={item.metric} className="grid grid-cols-5 gap-4 p-4 border-t items-center">
                <div className="font-medium">{item.metric}</div>
                <div className="text-right text-muted-foreground">{item.baseline}</div>
                <div className="text-right font-medium">{item.current}</div>
                <div className="text-right">
                  <span className={item.improvement.startsWith('+') || item.improvement.startsWith('-') ? 'text-green-600 font-medium' : ''}>
                    {item.improvement}
                  </span>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    <Target className="h-3 w-3 mr-1" />
                    Above Target
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
