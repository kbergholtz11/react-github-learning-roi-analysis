"use client";

import { MetricCard, DonutChart, SimpleBarChart, SimpleAreaChart } from "@/components/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Award, Clock, Target } from "lucide-react";

// Sample data - will be replaced with API calls
const engagementData = [
  { name: "Active", value: 2847, color: "#22c55e" },
  { name: "Completed", value: 1256, color: "#3b82f6" },
  { name: "In Progress", value: 1591, color: "#f59e0b" },
  { name: "Not Started", value: 892, color: "#ef4444" },
];

const weeklyActivityData = [
  { name: "Mon", learners: 420, completions: 85 },
  { name: "Tue", learners: 380, completions: 72 },
  { name: "Wed", learners: 510, completions: 95 },
  { name: "Thu", learners: 450, completions: 88 },
  { name: "Fri", learners: 320, completions: 65 },
  { name: "Sat", learners: 180, completions: 42 },
  { name: "Sun", learners: 150, completions: 35 },
];

const monthlyProgressData = [
  { name: "Jan", active: 1200, certified: 180 },
  { name: "Feb", active: 1350, certified: 220 },
  { name: "Mar", active: 1580, certified: 280 },
  { name: "Apr", active: 1890, certified: 350 },
  { name: "May", active: 2200, certified: 420 },
  { name: "Jun", active: 2500, certified: 520 },
];

const topCourses = [
  { name: "GitHub Actions Fundamentals", completions: 847, trend: "+12%" },
  { name: "GitHub Copilot for Developers", completions: 732, trend: "+28%" },
  { name: "Advanced Git Workflows", completions: 589, trend: "+8%" },
  { name: "Security Best Practices", completions: 456, trend: "+15%" },
  { name: "GitHub Enterprise Admin", completions: 324, trend: "+5%" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Dashboard</h1>
          <p className="text-muted-foreground">
            Track GitHub Learning program performance and ROI metrics
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Last updated: Just now
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Learners"
          value="4,586"
          description="Active in the program"
          trend={{ value: 12.5, isPositive: true }}
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="Certified Users"
          value="1,256"
          description="Completed certifications"
          trend={{ value: 8.2, isPositive: true }}
          icon={<Award className="h-4 w-4" />}
        />
        <MetricCard
          title="Completion Rate"
          value="73.2%"
          description="Course completion average"
          trend={{ value: 4.1, isPositive: true }}
          icon={<Target className="h-4 w-4" />}
        />
        <MetricCard
          title="Avg. Time to Cert"
          value="24 days"
          description="From start to certification"
          trend={{ value: 2.3, isPositive: false }}
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Engagement Breakdown */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Learner Engagement</CardTitle>
            <CardDescription>Current status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={engagementData} />
          </CardContent>
        </Card>

        {/* Weekly Activity */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Weekly Activity</CardTitle>
            <CardDescription>Active learners and completions this week</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart 
              data={weeklyActivityData} 
              dataKey="learners"
              secondaryDataKey="completions"
              color="#3b82f6"
              secondaryColor="#22c55e"
            />
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Monthly Progress */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Monthly Progress</CardTitle>
            <CardDescription>Active learners vs certified users over time</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleAreaChart 
              data={monthlyProgressData}
              dataKey="active"
              secondaryDataKey="certified"
              color="#3b82f6"
              secondaryColor="#22c55e"
            />
          </CardContent>
        </Card>

        {/* Top Courses */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Top Courses</CardTitle>
            <CardDescription>Most completed this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCourses.map((course, index) => (
                <div key={course.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium leading-none">{course.name}</p>
                      <p className="text-sm text-muted-foreground">{course.completions} completions</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-green-600">
                    {course.trend}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2,410</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+180</span> from last week
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">48</div>
                <p className="text-xs text-muted-foreground">
                  Across 12 learning paths
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg. Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">87.3%</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+2.1%</span> from last month
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>
                Detailed analytics will be displayed here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reports</CardTitle>
              <CardDescription>
                Generate and view reports here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
