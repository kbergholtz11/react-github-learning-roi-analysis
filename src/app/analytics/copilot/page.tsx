"use client";

import { MetricCard, DonutChart, SimpleBarChart, SimpleAreaChart } from "@/components/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Code, Users, Clock, CheckCircle } from "lucide-react";

// Sample Copilot analytics data
const adoptionData = [
  { name: "Active Users", value: 1847, color: "#22c55e" },
  { name: "Occasional Users", value: 892, color: "#f59e0b" },
  { name: "Never Used", value: 423, color: "#ef4444" },
];

const weeklyUsageData = [
  { name: "Mon", suggestions: 4250, accepted: 3180 },
  { name: "Tue", suggestions: 3890, accepted: 2920 },
  { name: "Wed", suggestions: 5120, accepted: 3840 },
  { name: "Thu", suggestions: 4680, accepted: 3510 },
  { name: "Fri", suggestions: 3950, accepted: 2960 },
  { name: "Sat", suggestions: 1200, accepted: 900 },
  { name: "Sun", suggestions: 980, accepted: 735 },
];

const monthlyTrendData = [
  { name: "Aug", users: 450, acceptance: 68 },
  { name: "Sep", users: 680, acceptance: 71 },
  { name: "Oct", users: 920, acceptance: 73 },
  { name: "Nov", users: 1250, acceptance: 74 },
  { name: "Dec", users: 1580, acceptance: 75 },
  { name: "Jan", users: 1847, acceptance: 76 },
];

const languageData = [
  { name: "TypeScript", value: 32, color: "#3178c6" },
  { name: "Python", value: 28, color: "#3572A5" },
  { name: "JavaScript", value: 18, color: "#f7df1e" },
  { name: "Go", value: 12, color: "#00ADD8" },
  { name: "Java", value: 10, color: "#b07219" },
];

const topUsers = [
  { name: "Alex Rivera", department: "Engineering", suggestions: 2450, accepted: 1890, rate: "77%" },
  { name: "Jordan Lee", department: "Platform", suggestions: 2180, accepted: 1635, rate: "75%" },
  { name: "Casey Morgan", department: "DevOps", suggestions: 1920, accepted: 1498, rate: "78%" },
  { name: "Taylor Kim", department: "Engineering", suggestions: 1750, accepted: 1313, rate: "75%" },
  { name: "Morgan Chen", department: "Security", suggestions: 1580, accepted: 1248, rate: "79%" },
];

export default function CopilotAnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Copilot Analytics</h1>
          <p className="text-muted-foreground">
            Track GitHub Copilot adoption and productivity metrics
          </p>
        </div>
        <Badge variant="outline" className="text-sm bg-purple-50 text-purple-700 border-purple-200">
          <Bot className="h-3 w-3 mr-1" />
          Copilot Business
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Users"
          value="1,847"
          description="Using Copilot this month"
          trend={{ value: 18.5, isPositive: true }}
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="Acceptance Rate"
          value="76%"
          description="Suggestions accepted"
          trend={{ value: 3.2, isPositive: true }}
          icon={<CheckCircle className="h-4 w-4" />}
        />
        <MetricCard
          title="Time Saved"
          value="2,450 hrs"
          description="Estimated this month"
          trend={{ value: 22.1, isPositive: true }}
          icon={<Clock className="h-4 w-4" />}
        />
        <MetricCard
          title="Lines Generated"
          value="1.2M"
          description="Code lines suggested"
          trend={{ value: 15.8, isPositive: true }}
          icon={<Code className="h-4 w-4" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>User Adoption</CardTitle>
            <CardDescription>Copilot usage across organization</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={adoptionData} />
          </CardContent>
        </Card>

        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Weekly Suggestions</CardTitle>
            <CardDescription>Suggestions shown vs accepted</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart 
              data={weeklyUsageData} 
              dataKey="suggestions"
              secondaryDataKey="accepted"
              color="#8b5cf6"
              secondaryColor="#22c55e"
            />
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Adoption Trend</CardTitle>
            <CardDescription>Monthly active users and acceptance rate</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleAreaChart 
              data={monthlyTrendData}
              dataKey="users"
              color="#8b5cf6"
            />
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Usage by Language</CardTitle>
            <CardDescription>Top programming languages</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={languageData} />
          </CardContent>
        </Card>
      </div>

      {/* Top Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Copilot Users</CardTitle>
          <CardDescription>Most active users this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-5 gap-4 p-4 bg-muted/50 text-sm font-medium">
              <div>User</div>
              <div>Department</div>
              <div className="text-right">Suggestions</div>
              <div className="text-right">Accepted</div>
              <div className="text-right">Rate</div>
            </div>
            {topUsers.map((user, index) => (
              <div key={user.name} className="grid grid-cols-5 gap-4 p-4 border-t items-center">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="font-medium">{user.name}</span>
                </div>
                <div className="text-sm text-muted-foreground">{user.department}</div>
                <div className="text-right font-mono">{user.suggestions.toLocaleString()}</div>
                <div className="text-right font-mono">{user.accepted.toLocaleString()}</div>
                <div className="text-right">
                  <Badge variant="secondary" className="text-green-600">{user.rate}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
