"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimpleBarChart, SimpleAreaChart } from "@/components/dashboard";
import { ExportButton } from "@/components/export-button";
import { ArrowUp, ArrowDown, Minus, Building, Calendar, Target } from "lucide-react";

// Department comparison data
const departmentData = [
  { name: "Engineering", learners: 1250, completions: 892, certifications: 423, engagementRate: 85, trend: 12 },
  { name: "DevOps", learners: 680, completions: 534, certifications: 287, engagementRate: 82, trend: 8 },
  { name: "Security", learners: 420, completions: 356, certifications: 189, engagementRate: 88, trend: 15 },
  { name: "Platform", learners: 380, completions: 298, certifications: 145, engagementRate: 79, trend: -3 },
  { name: "QA", learners: 290, completions: 212, certifications: 98, engagementRate: 75, trend: 5 },
];

// Quarterly comparison data
const quarterlyData = [
  { metric: "Total Learners", q1: 3200, q2: 3650, q3: 4100, q4: 4586, change: 12 },
  { metric: "Completions", q1: 1850, q2: 2100, q3: 2450, q4: 2892, change: 18 },
  { metric: "Certifications", q1: 680, q2: 820, q3: 1050, q4: 1256, change: 20 },
  { metric: "Avg. Score", q1: 82, q2: 84, q3: 85, q4: 87, change: 2 },
  { metric: "Completion Rate", q1: 68, q2: 71, q3: 73, q4: 76, change: 4 },
];

// Course comparison data
const courseComparisonData = [
  { name: "GitHub Actions", enrollments: 1250, completions: 892, rate: 71, avgTime: 14 },
  { name: "GitHub Copilot", enrollments: 1180, completions: 920, rate: 78, avgTime: 10 },
  { name: "GitHub Foundations", enrollments: 980, completions: 756, rate: 77, avgTime: 12 },
  { name: "Advanced Security", enrollments: 650, completions: 456, rate: 70, avgTime: 18 },
  { name: "GitHub Admin", enrollments: 420, completions: 287, rate: 68, avgTime: 21 },
];

const departmentChartData = departmentData.map(d => ({
  name: d.name,
  learners: d.learners,
  completions: d.completions,
}));

const trendChartData = [
  { name: "Jan", current: 3200, previous: 2800 },
  { name: "Feb", current: 3400, previous: 2950 },
  { name: "Mar", current: 3650, previous: 3100 },
  { name: "Apr", current: 3800, previous: 3200 },
  { name: "May", current: 4100, previous: 3400 },
  { name: "Jun", current: 4586, previous: 3650 },
];

export default function ComparisonPage() {
  const [selectedTab, setSelectedTab] = useState("departments");

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

  const departmentExportData = {
    title: "Department Comparison",
    headers: ["Department", "Learners", "Completions", "Certifications", "Engagement %", "Trend %"],
    rows: departmentData.map(d => [d.name, d.learners, d.completions, d.certifications, d.engagementRate, d.trend]),
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
        <ExportButton data={departmentExportData} filename="comparison-data" />
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="departments" className="gap-2">
            <Building className="h-4 w-4" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="quarterly" className="gap-2">
            <Calendar className="h-4 w-4" />
            Quarterly
          </TabsTrigger>
          <TabsTrigger value="courses" className="gap-2">
            <Target className="h-4 w-4" />
            Courses
          </TabsTrigger>
        </TabsList>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Learners vs Completions by Department</CardTitle>
                <CardDescription>Comparison across all departments</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleBarChart 
                  data={departmentChartData} 
                  dataKey="learners"
                  secondaryDataKey="completions"
                  color="#3b82f6"
                  secondaryColor="#22c55e"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Year-over-Year Trend</CardTitle>
                <CardDescription>Current vs previous year</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleAreaChart 
                  data={trendChartData} 
                  dataKey="current"
                  secondaryDataKey="previous"
                  color="#8b5cf6"
                  secondaryColor="#94a3b8"
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Department Performance Table</CardTitle>
              <CardDescription>Detailed metrics by department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-6 gap-4 p-4 bg-muted/50 text-sm font-medium">
                  <div>Department</div>
                  <div className="text-right">Learners</div>
                  <div className="text-right">Completions</div>
                  <div className="text-right">Certifications</div>
                  <div className="text-right">Engagement</div>
                  <div className="text-right">Trend</div>
                </div>
                {departmentData.map((dept) => (
                  <div key={dept.name} className="grid grid-cols-6 gap-4 p-4 border-t items-center">
                    <div className="font-medium">{dept.name}</div>
                    <div className="text-right font-mono">{dept.learners.toLocaleString()}</div>
                    <div className="text-right font-mono">{dept.completions.toLocaleString()}</div>
                    <div className="text-right font-mono">{dept.certifications}</div>
                    <div className="text-right">
                      <Badge variant="outline">{dept.engagementRate}%</Badge>
                    </div>
                    <div className={`text-right flex items-center justify-end gap-1 ${getTrendColor(dept.trend)}`}>
                      {getTrendIcon(dept.trend)}
                      <span className="font-medium">{Math.abs(dept.trend)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quarterly Tab */}
        <TabsContent value="quarterly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quarterly Performance Comparison</CardTitle>
              <CardDescription>Key metrics across quarters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-6 gap-4 p-4 bg-muted/50 text-sm font-medium">
                  <div>Metric</div>
                  <div className="text-right">Q1</div>
                  <div className="text-right">Q2</div>
                  <div className="text-right">Q3</div>
                  <div className="text-right">Q4</div>
                  <div className="text-right">Change</div>
                </div>
                {quarterlyData.map((row) => (
                  <div key={row.metric} className="grid grid-cols-6 gap-4 p-4 border-t items-center">
                    <div className="font-medium">{row.metric}</div>
                    <div className="text-right font-mono text-muted-foreground">{row.q1.toLocaleString()}</div>
                    <div className="text-right font-mono text-muted-foreground">{row.q2.toLocaleString()}</div>
                    <div className="text-right font-mono text-muted-foreground">{row.q3.toLocaleString()}</div>
                    <div className="text-right font-mono font-medium">{row.q4.toLocaleString()}</div>
                    <div className={`text-right flex items-center justify-end gap-1 ${getTrendColor(row.change)}`}>
                      {getTrendIcon(row.change)}
                      <span className="font-medium">{Math.abs(row.change)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Course Performance Comparison</CardTitle>
              <CardDescription>Metrics across all courses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-5 gap-4 p-4 bg-muted/50 text-sm font-medium">
                  <div>Course</div>
                  <div className="text-right">Enrollments</div>
                  <div className="text-right">Completions</div>
                  <div className="text-right">Completion Rate</div>
                  <div className="text-right">Avg. Time (days)</div>
                </div>
                {courseComparisonData.map((course) => (
                  <div key={course.name} className="grid grid-cols-5 gap-4 p-4 border-t items-center">
                    <div className="font-medium">{course.name}</div>
                    <div className="text-right font-mono">{course.enrollments.toLocaleString()}</div>
                    <div className="text-right font-mono">{course.completions.toLocaleString()}</div>
                    <div className="text-right">
                      <Badge 
                        variant="secondary" 
                        className={course.rate >= 75 ? "bg-green-100 text-green-700" : course.rate >= 70 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}
                      >
                        {course.rate}%
                      </Badge>
                    </div>
                    <div className="text-right font-mono">{course.avgTime}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
