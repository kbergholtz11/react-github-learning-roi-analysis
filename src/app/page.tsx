"use client";

import Link from "next/link";
import { MetricCard, DonutChart, SimpleAreaChart } from "@/components/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Award, 
  TrendingUp, 
  ArrowRight,
  Sparkles,
  GraduationCap,
  Zap,
  Activity,
  Target
} from "lucide-react";

// Learning Journey Stages
const journeyStages = [
  { stage: "Awareness", count: 4586, percentage: 100, color: "#94a3b8" },
  { stage: "Exploration", count: 3421, percentage: 75, color: "#3b82f6" },
  { stage: "Active Learning", count: 2156, percentage: 47, color: "#8b5cf6" },
  { stage: "Proficiency", count: 1256, percentage: 27, color: "#22c55e" },
  { stage: "Mastery", count: 523, percentage: 11, color: "#f59e0b" },
];

// Impact Summary
const impactSummary = [
  { name: "Usage Increase", value: 67, color: "#22c55e" },
  { name: "Time on Platform", value: 52, color: "#3b82f6" },
  { name: "Feature Adoption", value: 78, color: "#8b5cf6" },
  { name: "Productivity Gain", value: 45, color: "#f59e0b" },
];

// Learning Activity Trend
const activityTrend = [
  { name: "Aug", learners: 2800, completions: 420, usage: 45 },
  { name: "Sep", learners: 3200, completions: 520, usage: 52 },
  { name: "Oct", learners: 3600, completions: 640, usage: 58 },
  { name: "Nov", learners: 4100, completions: 780, usage: 65 },
  { name: "Dec", learners: 4400, completions: 920, usage: 71 },
  { name: "Jan", learners: 4586, completions: 1048, usage: 78 },
];

// Top Learning Paths by Impact
const topPaths = [
  { name: "GitHub Copilot Mastery", learners: 1247, impact: 89, adoption: "+55%" },
  { name: "Actions & Automation", learners: 982, impact: 82, adoption: "+48%" },
  { name: "Security Fundamentals", learners: 756, impact: 76, adoption: "+42%" },
  { name: "Code Review Excellence", learners: 634, impact: 71, adoption: "+38%" },
];

// Quick Navigation Cards
const quickNavCards = [
  {
    title: "Learning Impact",
    description: "See how learning drives platform engagement",
    href: "/impact",
    icon: TrendingUp,
    color: "from-green-500 to-emerald-500",
  },
  {
    title: "Journey Overview",
    description: "Explore the full learner journey",
    href: "/journey/overview",
    icon: Target,
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "Behavior Change",
    description: "Track workflow transformations",
    href: "/behavior",
    icon: Activity,
    color: "from-violet-500 to-purple-500",
  },
  {
    title: "Compare Cohorts",
    description: "Learners vs non-learners analysis",
    href: "/compare",
    icon: Users,
    color: "from-amber-500 to-orange-500",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Journey Analytics</h1>
          <p className="text-muted-foreground">
            Track how GitHub Learning transforms users into platform experts
          </p>
        </div>
        <Badge variant="default" className="bg-gradient-to-r from-violet-500 to-purple-600">
          <Sparkles className="h-3 w-3 mr-1" />
          Impact Score: 87/100
        </Badge>
      </div>

      {/* Primary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Learners"
          value="4,586"
          description="In learning journey"
          trend={{ value: 18.2, isPositive: true }}
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="Reached Proficiency"
          value="1,256"
          description="Demonstrating mastery"
          trend={{ value: 12.5, isPositive: true }}
          icon={<Award className="h-4 w-4" />}
        />
        <MetricCard
          title="Avg. Usage Increase"
          value="+67%"
          description="After learning completion"
          trend={{ value: 8.3, isPositive: true }}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          title="Products Adopted"
          value="4.2"
          description="New products per learner"
          trend={{ value: 15.1, isPositive: true }}
          icon={<Zap className="h-4 w-4" />}
        />
      </div>

      {/* Journey Funnel Overview */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Learning Journey Overview
          </CardTitle>
          <CardDescription>
            User progression through the learning stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {journeyStages.map((stage) => (
              <div key={stage.stage} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium">{stage.stage}</div>
                <div className="flex-1">
                  <div className="h-8 bg-muted rounded-lg overflow-hidden">
                    <div 
                      className="h-full rounded-lg transition-all duration-500"
                      style={{ 
                        width: `${stage.percentage}%`,
                        backgroundColor: stage.color,
                      }}
                    />
                  </div>
                </div>
                <div className="w-20 text-right">
                  <span className="font-semibold">{stage.count.toLocaleString()}</span>
                  <span className="text-muted-foreground text-xs ml-1">({stage.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="outline" asChild>
              <Link href="/journey/funnel">
                View Detailed Funnel <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Activity & Impact Trend */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Learning Activity & Platform Usage</CardTitle>
            <CardDescription>Correlation between learning and engagement over time</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleAreaChart 
              data={activityTrend}
              dataKey="completions"
              secondaryDataKey="usage"
              color="#22c55e"
              secondaryColor="#3b82f6"
            />
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Course Completions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">Usage Score %</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Impact Distribution */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Impact Distribution</CardTitle>
            <CardDescription>Where learning makes the difference</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={impactSummary} />
          </CardContent>
        </Card>
      </div>

      {/* Top Learning Paths by Impact */}
      <Card>
        <CardHeader>
          <CardTitle>Top Learning Paths by Impact</CardTitle>
          <CardDescription>Courses driving the most behavior change and adoption</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topPaths.map((path, index) => (
              <div key={path.name} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{path.name}</span>
                    <Badge variant="secondary" className="text-green-600 dark:text-green-400">
                      {path.adoption} adoption
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {path.learners.toLocaleString()} learners
                    </span>
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Impact:</span>
                      <Progress value={path.impact} className="h-2 flex-1" />
                      <span className="text-sm font-medium">{path.impact}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Navigation */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Explore More</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickNavCards.map((card) => (
            <Link key={card.href} href={card.href}>
              <Card className="h-full hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer group">
                <CardContent className="pt-6">
                  <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${card.color} text-white mb-4 group-hover:scale-110 transition-transform`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold mb-1">{card.title}</h3>
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,410</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+180</span> active learners
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,048</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+128</span> this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Impact Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87.3</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+4.2</span> from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Retention Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.2%</div>
            <p className="text-xs text-muted-foreground">
              Learners still active at 90 days
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
