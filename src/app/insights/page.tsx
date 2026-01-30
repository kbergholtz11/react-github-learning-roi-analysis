"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Sparkles,
  Code2,
  GitPullRequest,
  GraduationCap,
  TrendingUp,
  Languages,
  Users,
  CheckCircle2,
  MessageSquare,
  GitCommit,
  Eye,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import {
  useCopilotInsights,
  useGitHubActivity,
  useSkillsCourses,
} from "@/hooks/use-data";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#7c3aed", "#2563eb", "#059669", "#d97706", "#dc2626", "#8b5cf6", "#0891b2", "#65a30d"];

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// Copilot Insights Tab
function CopilotInsightsTab() {
  const { data, isLoading, error } = useCopilotInsights();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-amber-600">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">Copilot data not available</p>
              <p className="text-sm text-muted-foreground">
                Run <code className="bg-muted px-1 rounded">npm run fetch:copilot</code> to fetch Copilot metrics from GitHub API
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const languageData = data.languages?.slice(0, 10) || [];
  const totals = data.totals || {};

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suggestions</CardTitle>
            <Code2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totals.totalSuggestions || 0)}</div>
            <p className="text-xs text-muted-foreground">Code completions offered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acceptance Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.avgAcceptanceRate || 0}%</div>
            <p className="text-xs text-muted-foreground">Average across languages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lines Accepted</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(languageData.reduce((sum, l) => sum + (l.linesAccepted || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground">Lines of code from Copilot</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Languages</CardTitle>
            <Languages className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalLanguages || 0}</div>
            <p className="text-xs text-muted-foreground">Programming languages used</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Acceptance Rate by Language</CardTitle>
            <CardDescription>How often developers accept Copilot suggestions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={languageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 50]} unit="%" />
                <YAxis dataKey="language" type="category" width={80} />
                <Tooltip 
                  formatter={(value) => [`${value ?? 0}%`, "Acceptance Rate"]}
                />
                <Bar dataKey="acceptanceRate" fill="#7c3aed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suggestions by Language</CardTitle>
            <CardDescription>Distribution of code suggestions across languages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={languageData.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="suggestions"
                  nameKey="language"
                  label={({ name }: { name?: string }) => name || ""}
                >
                  {languageData.slice(0, 6).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatNumber(Number(value ?? 0))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Language Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Language Breakdown</CardTitle>
          <CardDescription>Detailed metrics per programming language</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {languageData.map((lang, idx) => (
              <div key={lang.language} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="font-medium capitalize">{lang.language}</span>
                  <Badge variant="outline">{lang.users} users</Badge>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <p className="font-medium">{formatNumber(lang.suggestions)}</p>
                    <p className="text-xs text-muted-foreground">suggestions</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatNumber(lang.acceptances)}</p>
                    <p className="text-xs text-muted-foreground">accepted</p>
                  </div>
                  <div className="text-right w-16">
                    <p className="font-bold text-green-600">{lang.acceptanceRate}%</p>
                    <Progress value={lang.acceptanceRate} className="h-1" />
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

// GitHub Activity Tab
function GitHubActivityTab() {
  const { data, isLoading, error } = useGitHubActivity();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-amber-600">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">GitHub activity data not available</p>
              <p className="text-sm text-muted-foreground">
                Run <code className="bg-muted px-1 rounded">npm run fetch:activity</code> to fetch developer activity
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totals = data.totals || {};
  const averages = data.averages || {};
  const topContributors = data.topContributors || [];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commits</CardTitle>
            <GitCommit className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totals.commits || 0)}</div>
            <p className="text-xs text-muted-foreground">{averages.commitsPerUser || 0} avg/user</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PRs Opened</CardTitle>
            <GitPullRequest className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totals.prsOpened || 0)}</div>
            <p className="text-xs text-muted-foreground">{averages.prsPerUser || 0} avg/user</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PRs Merged</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totals.prsMerged || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {totals.prsOpened ? Math.round((totals.prsMerged / totals.prsOpened) * 100) : 0}% merge rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Code Reviews</CardTitle>
            <Eye className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totals.codeReviews || 0)}</div>
            <p className="text-xs text-muted-foreground">Review comments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Days</CardTitle>
            <TrendingUp className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averages.activityDays || 0}</div>
            <p className="text-xs text-muted-foreground">Average per user</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Contributors */}
      <Card>
        <CardHeader>
          <CardTitle>Top Contributors</CardTitle>
          <CardDescription>Most active developers by commit count</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topContributors.slice(0, 10).map((contributor, idx) => (
              <div 
                key={contributor.handle} 
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {idx + 1}
                  </div>
                  <span className="font-medium">{contributor.handle}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <GitCommit className="h-4 w-4 text-green-500" />
                    <span>{contributor.commits}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <GitPullRequest className="h-4 w-4 text-blue-500" />
                    <span>{contributor.prsOpened}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4 text-amber-500" />
                    <span>{contributor.codeReviews}</span>
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

// Skills Courses Tab
function SkillsCoursesTab() {
  const { data, isLoading, error } = useSkillsCourses();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-amber-600">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">Skills course data not available</p>
              <p className="text-sm text-muted-foreground">
                Run <code className="bg-muted px-1 rounded">npm run fetch:skills</code> to fetch course progress
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const byCategory = data.byCategory || [];
  const popularCourses = data.popularCourses || [];
  const topLearners = data.topSkillLearners || [];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Courses Tracked</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalCourses || 0}</div>
            <p className="text-xs text-muted-foreground">Official GitHub Skills courses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalEnrollments || 0}</div>
            <p className="text-xs text-muted-foreground">Known learners in courses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.completedCourses || 0}</div>
            <p className="text-xs text-muted-foreground">Likely course completions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.completionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">Of enrolled learners</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* By Category */}
        <Card>
          <CardHeader>
            <CardTitle>Enrollments by Category</CardTitle>
            <CardDescription>Course participation across skill areas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {byCategory.map((cat, idx) => (
                <div key={cat.category} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="font-medium">{cat.category}</span>
                      <Badge variant="outline">{cat.courses} courses</Badge>
                    </div>
                    <span className="text-sm font-medium">{cat.knownLearners} learners</span>
                  </div>
                  <Progress 
                    value={byCategory.length > 0 ? (cat.knownLearners / Math.max(...byCategory.map(c => c.knownLearners))) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Popular Courses */}
        <Card>
          <CardHeader>
            <CardTitle>Popular Courses</CardTitle>
            <CardDescription>Most enrolled GitHub Skills courses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {popularCourses.slice(0, 8).map((course, idx) => (
                <div 
                  key={course.name} 
                  className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground w-6">{idx + 1}.</span>
                    <div>
                      <p className="font-medium text-sm">{course.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{course.category}</Badge>
                        <span className="text-xs text-muted-foreground">{course.difficulty}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatNumber(course.totalForks)}</p>
                    <p className="text-xs text-muted-foreground">forks</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Skill Learners */}
      <Card>
        <CardHeader>
          <CardTitle>Top Skills Learners</CardTitle>
          <CardDescription>Learners with most course completions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {topLearners.slice(0, 8).map((learner) => (
              <div 
                key={learner.handle} 
                className="p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{learner.handle}</span>
                  <Badge variant="default">{learner.coursesCompleted} ✓</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {learner.coursesStarted} started, {learner.coursesCompleted} completed
                </p>
                <div className="flex flex-wrap gap-1">
                  {learner.categories.map((cat) => (
                    <Badge key={cat} variant="outline" className="text-xs">{cat}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function InsightsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-purple-500" />
            Learning Insights
          </h1>
          <p className="text-muted-foreground">
            Enriched data from Copilot metrics, GitHub activity, and Skills courses
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="copilot" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="copilot" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Copilot
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <GitCommit className="h-4 w-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="skills" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Skills Courses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="copilot">
          <CopilotInsightsTab />
        </TabsContent>

        <TabsContent value="activity">
          <GitHubActivityTab />
        </TabsContent>

        <TabsContent value="skills">
          <SkillsCoursesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
