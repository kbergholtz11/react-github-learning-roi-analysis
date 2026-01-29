"use client";

import { MetricCard, DonutChart, SimpleBarChart, SimpleAreaChart } from "@/components/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, GraduationCap, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";

// Sample journey funnel data
const funnelData = [
  { name: "Enrolled", value: 4586, color: "#3b82f6" },
  { name: "Started Learning", value: 3892, color: "#8b5cf6" },
  { name: "50% Complete", value: 2847, color: "#a855f7" },
  { name: "Completed Course", value: 1891, color: "#d946ef" },
  { name: "Certified", value: 1256, color: "#22c55e" },
];

const weeklyProgressData = [
  { name: "Week 1", enrolled: 580, completed: 45 },
  { name: "Week 2", enrolled: 620, completed: 72 },
  { name: "Week 3", enrolled: 540, completed: 95 },
  { name: "Week 4", enrolled: 710, completed: 125 },
  { name: "Week 5", enrolled: 680, completed: 142 },
  { name: "Week 6", enrolled: 590, completed: 168 },
];

const pathCompletionData = [
  { name: "GitHub Foundations", value: 892, color: "#22c55e" },
  { name: "GitHub Actions", value: 654, color: "#3b82f6" },
  { name: "GitHub Advanced Security", value: 423, color: "#8b5cf6" },
  { name: "GitHub Copilot", value: 387, color: "#f59e0b" },
  { name: "GitHub Admin", value: 245, color: "#ef4444" },
];

const recentLearners = [
  { name: "Sarah Chen", path: "GitHub Actions", progress: 85, status: "active" },
  { name: "Mike Johnson", path: "GitHub Copilot", progress: 100, status: "completed" },
  { name: "Emily Davis", path: "GitHub Foundations", progress: 42, status: "active" },
  { name: "James Wilson", path: "Advanced Security", progress: 67, status: "active" },
  { name: "Lisa Anderson", path: "GitHub Admin", progress: 100, status: "certified" },
];

export default function JourneyOverviewPage() {
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
          Last synced: 5 min ago
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Enrolled"
          value="4,586"
          description="Across all learning paths"
          trend={{ value: 8.3, isPositive: true }}
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="In Progress"
          value="2,074"
          description="Actively learning"
          trend={{ value: 12.1, isPositive: true }}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          title="Completed"
          value="1,891"
          description="Finished courses"
          trend={{ value: 5.7, isPositive: true }}
          icon={<CheckCircle className="h-4 w-4" />}
        />
        <MetricCard
          title="Avg. Completion Time"
          value="18 days"
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
              {funnelData.map((stage, index) => {
                const percentage = (stage.value / funnelData[0].value) * 100;
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
            <CardTitle>Weekly Enrollment vs Completion</CardTitle>
            <CardDescription>New enrollments and completions per week</CardDescription>
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

      {/* Path Completion and Recent Learners */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Completions by Path</CardTitle>
            <CardDescription>Distribution across learning paths</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={pathCompletionData} />
          </CardContent>
        </Card>

        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Learner Activity</CardTitle>
            <CardDescription>Latest updates from active learners</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLearners.map((learner) => (
                <div key={learner.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium">{learner.name.split(' ').map(n => n[0]).join('')}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{learner.name}</p>
                      <p className="text-xs text-muted-foreground">{learner.path}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24">
                      <div className="flex justify-between text-xs mb-1">
                        <span>{learner.progress}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${learner.progress}%` }}
                        />
                      </div>
                    </div>
                    <Badge variant={
                      learner.status === 'certified' ? 'default' : 
                      learner.status === 'completed' ? 'secondary' : 'outline'
                    }>
                      {learner.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
