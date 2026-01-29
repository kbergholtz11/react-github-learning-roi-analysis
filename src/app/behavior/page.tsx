"use client";

import { MetricCard, SimpleBarChart, SimpleAreaChart } from "@/components/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  Code2,
  GitPullRequest,
  GitCommit,
  Shield,
  Zap,
  TrendingUp,
  Users
} from "lucide-react";

// Before/After Behavior Metrics
const behaviorMetrics = [
  {
    category: "Code Quality",
    icon: Code2,
    metrics: [
      { name: "Commits per week", before: 12, after: 18, unit: "" },
      { name: "Code review participation", before: 34, after: 72, unit: "%" },
      { name: "PR approval time", before: 48, after: 24, unit: "hrs", inverse: true },
    ]
  },
  {
    category: "Collaboration",
    icon: GitPullRequest,
    metrics: [
      { name: "PRs created", before: 4, after: 7, unit: "/week" },
      { name: "Comments on others' PRs", before: 8, after: 22, unit: "/week" },
      { name: "Cross-team contributions", before: 12, after: 34, unit: "%" },
    ]
  },
  {
    category: "Security Practices",
    icon: Shield,
    metrics: [
      { name: "Security scans run", before: 23, after: 89, unit: "%" },
      { name: "Vulnerabilities fixed", before: 45, after: 78, unit: "%" },
      { name: "Secret scanning enabled", before: 34, after: 92, unit: "%" },
    ]
  },
  {
    category: "Automation",
    icon: Zap,
    metrics: [
      { name: "CI/CD pipeline usage", before: 45, after: 87, unit: "%" },
      { name: "Actions workflows created", before: 2, after: 8, unit: "" },
      { name: "Deployment frequency", before: 4, after: 12, unit: "/month" },
    ]
  },
];

// Behavior Change Timeline
const behaviorTimeline = [
  { name: "W1", codeQuality: 45, collaboration: 38, automation: 32 },
  { name: "W2", codeQuality: 48, collaboration: 42, automation: 38 },
  { name: "W3", codeQuality: 52, collaboration: 48, automation: 45 },
  { name: "W4", codeQuality: 58, collaboration: 55, automation: 52 },
  { name: "W5", codeQuality: 62, collaboration: 61, automation: 58 },
  { name: "W6", codeQuality: 68, collaboration: 67, automation: 65 },
  { name: "W7", codeQuality: 72, collaboration: 71, automation: 72 },
  { name: "W8", codeQuality: 78, collaboration: 76, automation: 78 },
];

// Cohort Comparison
const cohortComparison = [
  { name: "Week 1", learners: 45, nonLearners: 42 },
  { name: "Week 2", learners: 52, nonLearners: 43 },
  { name: "Week 4", learners: 64, nonLearners: 44 },
  { name: "Week 8", learners: 78, nonLearners: 45 },
  { name: "Week 12", learners: 85, nonLearners: 46 },
];

// User Stories
const userStories = [
  {
    name: "Sarah Chen",
    role: "Senior Developer",
    team: "Platform Team",
    before: {
      copilotUsage: "Never used",
      prReviewTime: "3 days average",
      cicdAdoption: "Manual deployments"
    },
    after: {
      copilotUsage: "Daily power user",
      prReviewTime: "4 hours average",
      cicdAdoption: "Fully automated"
    },
    courses: ["Copilot Fundamentals", "Actions Advanced", "Code Review Best Practices"],
    impactQuote: "Learning GitHub Actions cut our deployment time from hours to minutes."
  },
  {
    name: "Marcus Johnson",
    role: "DevOps Engineer",
    team: "Infrastructure",
    before: {
      copilotUsage: "Occasional",
      prReviewTime: "2 days average",
      cicdAdoption: "Basic pipelines"
    },
    after: {
      copilotUsage: "Integrated in workflow",
      prReviewTime: "6 hours average",
      cicdAdoption: "Matrix builds, reusable workflows"
    },
    courses: ["Advanced Actions", "Security Hardening", "Enterprise Admin"],
    impactQuote: "The security training helped us achieve SOC2 compliance 3 months early."
  },
];

export default function BehaviorChangePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Behavior Change</h1>
          <p className="text-muted-foreground">
            How learning transforms user behaviors and workflows
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Analyzing 4,586 learners
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Avg Behavior Score"
          value="+47%"
          description="Improvement after training"
          trend={{ value: 12.3, isPositive: true }}
          icon={<Activity className="h-4 w-4" />}
        />
        <MetricCard
          title="Time to Behavior Change"
          value="18 days"
          description="Avg time to new habits"
          trend={{ value: 5.2, isPositive: false }}
          icon={<Clock className="h-4 w-4" />}
        />
        <MetricCard
          title="Sustained Change"
          value="89%"
          description="Still practicing at 90 days"
          trend={{ value: 8.1, isPositive: true }}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          title="Peer Influence"
          value="2.4x"
          description="Team members inspired"
          trend={{ value: 15.4, isPositive: true }}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      {/* Before/After Comparison Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {behaviorMetrics.map((category) => (
          <Card key={category.category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <category.icon className="h-5 w-5 text-primary" />
                {category.category}
              </CardTitle>
              <CardDescription>Before vs after learning completion</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {category.metrics.map((metric) => {
                  const improvement = metric.inverse 
                    ? ((metric.before - metric.after) / metric.before) * 100
                    : ((metric.after - metric.before) / metric.before) * 100;
                  const isPositive = metric.inverse 
                    ? metric.after < metric.before 
                    : metric.after > metric.before;
                  
                  return (
                    <div key={metric.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{metric.name}</div>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="text-muted-foreground text-sm">
                            Before: <span className="font-medium text-foreground">{metric.before}{metric.unit}</span>
                          </div>
                          <div className="text-muted-foreground text-sm">
                            After: <span className="font-medium text-foreground">{metric.after}{metric.unit}</span>
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant={isPositive ? "default" : "destructive"}
                        className={isPositive ? "bg-green-500/10 text-green-600 dark:text-green-400" : ""}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                        )}
                        {Math.abs(improvement).toFixed(0)}%
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Behavior Change Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Behavior Change Timeline</CardTitle>
          <CardDescription>
            How key behaviors evolve over the 8-week learning journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Behaviors</TabsTrigger>
              <TabsTrigger value="quality">Code Quality</TabsTrigger>
              <TabsTrigger value="collab">Collaboration</TabsTrigger>
              <TabsTrigger value="auto">Automation</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="pt-4">
              <SimpleAreaChart 
                data={behaviorTimeline}
                dataKey="codeQuality"
                secondaryDataKey="collaboration"
                color="#22c55e"
                secondaryColor="#3b82f6"
              />
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Code Quality</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">Collaboration</span>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="quality" className="pt-4">
              <SimpleAreaChart 
                data={behaviorTimeline}
                dataKey="codeQuality"
                color="#22c55e"
              />
            </TabsContent>
            <TabsContent value="collab" className="pt-4">
              <SimpleAreaChart 
                data={behaviorTimeline}
                dataKey="collaboration"
                color="#3b82f6"
              />
            </TabsContent>
            <TabsContent value="auto" className="pt-4">
              <SimpleAreaChart 
                data={behaviorTimeline}
                dataKey="automation"
                color="#8b5cf6"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Learners vs Non-Learners */}
      <Card>
        <CardHeader>
          <CardTitle>Learners vs Non-Learners</CardTitle>
          <CardDescription>
            Productivity score comparison over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleBarChart 
            data={cohortComparison}
            dataKey="learners"
            secondaryDataKey="nonLearners"
            color="#22c55e"
            secondaryColor="#94a3b8"
          />
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Completed Training</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-slate-400" />
              <span className="text-muted-foreground">No Training</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Stories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Success Stories
          </CardTitle>
          <CardDescription>
            Real examples of behavior transformation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {userStories.map((story) => (
              <div 
                key={story.name}
                className="p-6 rounded-xl border bg-gradient-to-br from-muted/50 to-transparent"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {story.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-semibold">{story.name}</div>
                    <div className="text-sm text-muted-foreground">{story.role} • {story.team}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <div className="font-medium text-muted-foreground mb-2">Before</div>
                    <ul className="space-y-1">
                      <li className="text-red-600 dark:text-red-400">• {story.before.copilotUsage}</li>
                      <li className="text-red-600 dark:text-red-400">• {story.before.prReviewTime}</li>
                      <li className="text-red-600 dark:text-red-400">• {story.before.cicdAdoption}</li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground mb-2">After</div>
                    <ul className="space-y-1">
                      <li className="text-green-600 dark:text-green-400">• {story.after.copilotUsage}</li>
                      <li className="text-green-600 dark:text-green-400">• {story.after.prReviewTime}</li>
                      <li className="text-green-600 dark:text-green-400">• {story.after.cicdAdoption}</li>
                    </ul>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {story.courses.map((course) => (
                    <Badge key={course} variant="secondary" className="text-xs">
                      {course}
                    </Badge>
                  ))}
                </div>

                <blockquote className="italic text-sm text-muted-foreground border-l-2 border-primary pl-3">
                  "{story.impactQuote}"
                </blockquote>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-violet-500/5 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-700 dark:text-blue-400">Behavior Change Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <GitCommit className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">Commit Patterns</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Learners commit 50% more frequently with 23% smaller, more focused commits after training.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <GitPullRequest className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">Review Culture</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Code review participation doubles within 4 weeks, with more constructive feedback patterns.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">Security Mindset</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Security-trained users proactively enable scanning 3x more than untrained peers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
