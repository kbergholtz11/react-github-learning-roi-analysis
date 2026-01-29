"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, Users, CheckCircle, ArrowRight, Package } from "lucide-react";
import { SimpleBarChart } from "@/components/dashboard/charts";

// Product alignment data
const alignmentSummary = [
  { 
    product: "GitHub Copilot", 
    learners: 2100, 
    adopters: 1638, 
    adoptionRate: 78,
    avgDaysToAdoption: 23
  },
  { 
    product: "GitHub Actions", 
    learners: 1650, 
    adopters: 1073, 
    adoptionRate: 65,
    avgDaysToAdoption: 31
  },
  { 
    product: "Advanced Security", 
    learners: 875, 
    adopters: 455, 
    adoptionRate: 52,
    avgDaysToAdoption: 45
  },
  { 
    product: "Admin & Platform", 
    learners: 375, 
    adopters: 154, 
    adoptionRate: 41,
    avgDaysToAdoption: 58
  },
];

// Learning to adoption pipeline chart data
const pipelineData = [
  { name: "Copilot", learners: 2100, adopters: 1638 },
  { name: "Actions", learners: 1650, adopters: 1073 },
  { name: "Security", learners: 875, adopters: 455 },
  { name: "Admin", learners: 375, adopters: 154 },
];

// Cross-product usage patterns
const crossProductData = [
  { combination: "Copilot + Actions", users: 892, percentage: 17.8 },
  { combination: "Copilot + Security", users: 423, percentage: 8.5 },
  { combination: "Actions + Security", users: 312, percentage: 6.2 },
  { combination: "All Three Products", users: 245, percentage: 4.9 },
  { combination: "Single Product Only", users: 2128, percentage: 42.6 },
];

// Adoption journey insights
const adoptionInsights = [
  {
    title: "Learning correlates with adoption",
    description: "Users who complete 5+ learning sessions are 3.2x more likely to adopt products within 30 days.",
    metric: "3.2x",
    trend: "positive"
  },
  {
    title: "Certification accelerates adoption",
    description: "Certified users show 89% product adoption vs 52% for non-certified learners.",
    metric: "+37%",
    trend: "positive"
  },
  {
    title: "Event attendance boosts engagement",
    description: "Bootcamp attendees have 2.1x higher product usage in the first 60 days.",
    metric: "2.1x",
    trend: "positive"
  },
  {
    title: "Multi-product learners retain better",
    description: "Users learning multiple products have 67% higher 6-month retention.",
    metric: "+67%",
    trend: "positive"
  },
];

// Recommended actions
const recommendations = [
  {
    priority: "High",
    action: "Increase Advanced Security learning content",
    reason: "Lowest adoption rate at 52% - gap between learning and product use",
    impact: "Could improve adoption by 15-20%"
  },
  {
    priority: "High",
    action: "Create cross-product learning paths",
    reason: "Only 4.9% of users use all three products",
    impact: "Increase multi-product adoption by 2x"
  },
  {
    priority: "Medium",
    action: "Add hands-on labs for Admin & Platform",
    reason: "Longest time to adoption (58 days avg)",
    impact: "Reduce time-to-adoption by 30%"
  },
  {
    priority: "Medium",
    action: "Expand Copilot certification prep",
    reason: "Highest adoption product - maximize conversion",
    impact: "Additional 200+ certifications/quarter"
  },
];

export default function ProductAlignmentPage() {
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
            <CardTitle className="text-2xl">66.4%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Learners who adopt products
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Time to Adoption</CardDescription>
            <CardTitle className="text-2xl">34 days</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              From first learning activity
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Multi-Product Users</CardDescription>
            <CardTitle className="text-2xl">1,872</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Using 2+ products
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Learning-to-Adoption Lift</CardDescription>
            <CardTitle className="text-2xl">3.2x</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Vs non-learners
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alignment Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Product Alignment Summary
          </CardTitle>
          <CardDescription>Learning focus vs actual product adoption by product</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b">
                  <th className="pb-3 font-medium">Product</th>
                  <th className="pb-3 font-medium text-right">Learners</th>
                  <th className="pb-3 font-medium text-right">Adopters</th>
                  <th className="pb-3 font-medium text-right">Adoption Rate</th>
                  <th className="pb-3 font-medium text-right">Time to Adoption</th>
                </tr>
              </thead>
              <tbody>
                {alignmentSummary.map((row) => (
                  <tr key={row.product} className="border-b last:border-0">
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{row.product}</span>
                      </div>
                    </td>
                    <td className="py-4 text-right">{row.learners.toLocaleString()}</td>
                    <td className="py-4 text-right">{row.adopters.toLocaleString()}</td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress value={row.adoptionRate} className="w-20 h-2" />
                        <span className="font-medium w-12">{row.adoptionRate}%</span>
                      </div>
                    </td>
                    <td className="py-4 text-right text-muted-foreground">
                      {row.avgDaysToAdoption} days
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Charts and Insights */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Learning to Adoption Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Learning → Adoption Pipeline
            </CardTitle>
            <CardDescription>Comparing learners to product adopters</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart 
              data={pipelineData} 
              dataKey="learners" 
              secondaryDataKey="adopters"
              color="#a78bfa"
              secondaryColor="#22c55e"
            />
            <div className="mt-4 flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-violet-400" />
                <span>Learners</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Adopters</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cross-Product Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Cross-Product Usage Patterns
            </CardTitle>
            <CardDescription>How users combine multiple products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {crossProductData.map((item) => (
                <div key={item.combination} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.combination}</p>
                    <Progress value={item.percentage} max={50} className="h-2 mt-1" />
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-bold">{item.users.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{item.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Recommended Actions
          </CardTitle>
          <CardDescription>Suggested improvements based on alignment analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div key={index} className="p-4 rounded-lg border">
                <div className="flex items-start gap-4">
                  <Badge 
                    variant={rec.priority === "High" ? "destructive" : "secondary"}
                    className="mt-0.5"
                  >
                    {rec.priority}
                  </Badge>
                  <div className="flex-1">
                    <h4 className="font-semibold">{rec.action}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{rec.reason}</p>
                    <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Expected Impact: {rec.impact}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
