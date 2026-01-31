"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Users, 
  GitFork, 
  CheckCircle2, 
  TrendingUp, 
  Loader2,
  Award,
  Target,
  Activity,
  BarChart3,
  GitCommit,
  Calendar,
  ExternalLink
} from "lucide-react";
import { useSkillsCourses } from "@/hooks/use-data";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

const CATEGORY_COLORS: Record<string, string> = {
  "Copilot": "#8b5cf6",
  "Actions": "#f59e0b",
  "Fundamentals": "#10b981",
  "Security": "#ef4444",
  "Advanced": "#3b82f6",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  "beginner": "#10b981",
  "intermediate": "#f59e0b",
  "advanced": "#ef4444",
};

function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
}

export default function SkillsAnalyticsPage() {
  const { data: skillsData, isLoading, error } = useSkillsCourses();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !skillsData) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Skills Data</CardTitle>
            <CardDescription>
              {error?.message || "Skills data not available. Run the skills sync script."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Prepare data for charts
  const categoryData = skillsData.byCategory || [];
  const difficultyData = skillsData.byDifficulty || [];
  const courseFunnels = skillsData.courseFunnels || [];
  const monthlyTrends = skillsData.monthlyTrends || [];
  const topLearners = skillsData.topSkillLearners || [];

  // Top courses sorted by total forks for funnel analysis
  const topCourseFunnels = [...courseFunnels]
    .filter(c => c.funnel.forked > 0)
    .sort((a, b) => b.funnel.forked - a.funnel.forked)
    .slice(0, 10);

  // Courses with known learners for detailed analysis
  const knownCourseFunnels = [...courseFunnels]
    .filter(c => c.funnel.knownLearners > 0)
    .sort((a, b) => b.funnel.knownLearners - a.funnel.knownLearners)
    .slice(0, 10);

  // Radar chart data for category comparison
  const radarData = categoryData.map(cat => ({
    category: cat.category,
    courses: cat.courses * 10, // Scale for visibility
    engagement: cat.activeUsers,
    completion: cat.completedUsers,
    effort: cat.avgCommitsPerUser * 10,
  }));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Skills Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Deep dive into GitHub Skills course engagement, completion rates, and learner behavior
        </p>
      </div>

      {/* Global Stats Banner */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-200 dark:border-purple-800">
        <CardContent className="py-6">
          <div className="grid gap-6 md:grid-cols-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600">{formatNumber(skillsData.totalEnrollments || 0)}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Enrollments (All Users)</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">{formatNumber(skillsData.totalUniqueLearners || 0)}</div>
              <div className="text-sm text-muted-foreground mt-1">Unique Learners Worldwide</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600">{skillsData.knownEnrollments || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Known Learner Enrollments</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-600">{skillsData.knownLearnerRatio || 0}%</div>
              <div className="text-sm text-muted-foreground mt-1">Of Total Are Known</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Courses
            </CardDescription>
            <CardTitle className="text-2xl">{skillsData.totalCourses}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Across {categoryData.length} categories
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Known Learners
            </CardDescription>
            <CardTitle className="text-2xl">{formatNumber(skillsData.uniqueKnownLearners || 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {skillsData.knownEnrollments || 0} enrollments tracked
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Completion Rate
            </CardDescription>
            <CardTitle className="text-2xl text-green-600">{skillsData.completionRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={skillsData.completionRate} className="h-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <GitCommit className="h-4 w-4" />
              Total Commits
            </CardDescription>
            <CardTitle className="text-2xl">{formatNumber(skillsData.totalCommits || 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              From known learners
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <GitFork className="h-4 w-4" />
              Total Forks
            </CardDescription>
            <CardTitle className="text-2xl">
              {formatNumber(skillsData.totalEnrollments || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Course starts worldwide
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="funnels" className="space-y-4">
        <TabsList>
          <TabsTrigger value="funnels">
            <Target className="h-4 w-4 mr-2" />
            Engagement Funnels
          </TabsTrigger>
          <TabsTrigger value="categories">
            <BarChart3 className="h-4 w-4 mr-2" />
            Category Performance
          </TabsTrigger>
          <TabsTrigger value="trends">
            <TrendingUp className="h-4 w-4 mr-2" />
            Enrollment Trends
          </TabsTrigger>
          <TabsTrigger value="learners">
            <Award className="h-4 w-4 mr-2" />
            Top Learners
          </TabsTrigger>
        </TabsList>

        {/* Engagement Funnels Tab */}
        <TabsContent value="funnels" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Total Forks by Course - Shows ALL engagement */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Course Popularity (Total Forks)</CardTitle>
                <CardDescription>
                  Total enrollments worldwide - showing all users who started each course
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topCourseFunnels.map(c => ({
                        name: c.name.length > 25 ? c.name.slice(0, 25) + "..." : c.name,
                        category: c.category,
                        "Total Forks": c.funnel.forked,
                        "Known Learners": c.funnel.knownLearners,
                      }))}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" tickFormatter={(v) => formatNumber(v)} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        tick={{ fontSize: 12 }}
                        width={140}
                      />
                      <Tooltip 
                        formatter={(value) => formatNumber(Number(value) || 0)}
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Legend />
                      <Bar dataKey="Total Forks" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="Known Learners" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Known Learner Engagement Funnel */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Known Learner Journey</CardTitle>
                <CardDescription>
                  Engagement funnel for tracked learners: Enrolled → Active → Completed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={knownCourseFunnels.map(c => ({
                        name: c.name.length > 25 ? c.name.slice(0, 25) + "..." : c.name,
                        category: c.category,
                        "Enrolled": c.funnel.knownLearners,
                        "Active": c.funnel.active,
                        "Completed": c.funnel.completed,
                      }))}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        tick={{ fontSize: 12 }}
                        width={140}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Legend />
                      <Bar dataKey="Enrolled" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="Active" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="Completed" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Completion Rates by Course */}
            <Card>
              <CardHeader>
                <CardTitle>Completion Rates by Course</CardTitle>
                <CardDescription>Percentage of known learners who completed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {knownCourseFunnels.slice(0, 8).map(course => (
                    <div key={course.name} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium truncate max-w-[200px]">
                          {course.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary"
                            style={{ backgroundColor: CATEGORY_COLORS[course.category] + "20" }}
                          >
                            {course.category}
                          </Badge>
                          <span className="text-sm font-bold text-green-600">
                            {course.rates.overallCompletionRate}%
                          </span>
                        </div>
                      </div>
                      <Progress 
                        value={course.rates.overallCompletionRate} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Average Commits per Course */}
            <Card>
              <CardHeader>
                <CardTitle>Learner Effort (Avg Commits)</CardTitle>
                <CardDescription>Average commits per known learner</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={knownCourseFunnels
                        .filter(c => c.avgCommits > 0)
                        .sort((a, b) => b.avgCommits - a.avgCommits)
                        .slice(0, 8)
                        .map(c => ({
                          name: c.name.length > 20 ? c.name.slice(0, 20) + "..." : c.name,
                          commits: c.avgCommits,
                          category: c.category,
                        }))}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={95} />
                      <Tooltip />
                      <Bar dataKey="commits" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                        {knownCourseFunnels
                          .filter(c => c.avgCommits > 0)
                          .sort((a, b) => b.avgCommits - a.avgCommits)
                          .slice(0, 8)
                          .map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={CATEGORY_COLORS[entry.category] || "#8b5cf6"} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Category Performance Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Category Overview Cards */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Category Performance Overview</CardTitle>
                <CardDescription>Engagement and completion metrics by course category (showing total forks and known learners)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-5">
                  {categoryData.map(cat => (
                    <Card 
                      key={cat.category} 
                      className="border-l-4"
                      style={{ borderLeftColor: CATEGORY_COLORS[cat.category] }}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{cat.category}</CardTitle>
                        <CardDescription>{cat.courses} courses</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Forks</span>
                          <span className="font-medium text-blue-600">{formatNumber(cat.totalForks)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Known Learners</span>
                          <span className="font-medium">{cat.uniqueKnownUsers || cat.knownLearners}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Active</span>
                          <span className="font-medium text-purple-600">{cat.activeUsers}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Completed</span>
                          <span className="font-medium text-green-600">{cat.completedUsers}</span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Known Ratio</span>
                            <span className="font-bold text-amber-600">{cat.knownRatio || 0}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Total Forks vs Known by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Total vs Known by Category</CardTitle>
                <CardDescription>Comparing worldwide forks to tracked learners</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData.map(c => ({
                      name: c.category,
                      totalForks: c.totalForks,
                      knownLearners: c.knownLearners,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => formatNumber(v)} />
                      <Tooltip formatter={(value) => formatNumber(Number(value) || 0)} />
                      <Legend />
                      <Bar dataKey="totalForks" name="Total Forks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="knownLearners" name="Known Learners" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Difficulty Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Difficulty Distribution</CardTitle>
                <CardDescription>Total enrollments and known learners by difficulty</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={difficultyData.map(d => ({
                      name: d.difficulty.charAt(0).toUpperCase() + d.difficulty.slice(1),
                      courses: d.courses,
                      totalForks: d.totalForks,
                      knownEnrollments: d.knownEnrollments || d.totalEnrollments,
                      completed: d.completed,
                      avgCommits: d.avgCommits,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v) => formatNumber(v)} />
                      <Tooltip formatter={(value) => formatNumber(Number(value) || 0)} />
                      <Legend />
                      <Bar dataKey="totalForks" name="Total Forks" radius={[4, 4, 0, 0]}>
                        {difficultyData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={DIFFICULTY_COLORS[entry.difficulty] || "#8b5cf6"} 
                          />
                        ))}
                      </Bar>
                      <Bar dataKey="knownEnrollments" name="Known Learners" fill="#6b7280" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Enrollment Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Monthly Enrollment Trends</CardTitle>
                <CardDescription>Course enrollments over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrends.slice(-12).map(t => ({
                      month: t.month,
                      total: t.total,
                      completed: t.completed,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 11 }}
                        tickFormatter={(val) => {
                          const [year, month] = val.split("-");
                          return `${month}/${year.slice(2)}`;
                        }}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(label) => `Month: ${label}`}
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="total" 
                        name="Total Enrollments"
                        stroke="#8b5cf6" 
                        fill="#8b5cf620" 
                        strokeWidth={2}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="completed" 
                        name="Completed"
                        stroke="#10b981" 
                        fill="#10b98120"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Enrollments by Category Over Time */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Category Trends Over Time</CardTitle>
                <CardDescription>Monthly enrollments by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrends.slice(-12).map(t => ({
                      month: t.month,
                      ...t.byCategory,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 11 }}
                        tickFormatter={(val) => {
                          const [year, month] = val.split("-");
                          return `${month}/${year.slice(2)}`;
                        }}
                      />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Legend />
                      {Object.keys(CATEGORY_COLORS).map(cat => (
                        <Line 
                          key={cat}
                          type="monotone" 
                          dataKey={cat} 
                          stroke={CATEGORY_COLORS[cat]} 
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Top Learners Tab */}
        <TabsContent value="learners" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Top Skills Champions
              </CardTitle>
              <CardDescription>
                Most engaged learners across GitHub Skills courses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topLearners.map((learner, index) => (
                  <div 
                    key={learner.handle} 
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <a 
                          href={`https://github.com/${learner.handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:underline flex items-center gap-1"
                        >
                          {learner.handle}
                          <ExternalLink className="h-3 w-3 opacity-50" />
                        </a>
                        <div className="flex gap-1 mt-1">
                          {learner.categories.map(cat => (
                            <Badge 
                              key={cat} 
                              variant="secondary" 
                              className="text-xs"
                              style={{ 
                                backgroundColor: CATEGORY_COLORS[cat] + "20",
                                color: CATEGORY_COLORS[cat]
                              }}
                            >
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-lg">{learner.coursesCompleted}</div>
                        <div className="text-xs text-muted-foreground">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg text-purple-600">{learner.totalCommits}</div>
                        <div className="text-xs text-muted-foreground">Commits</div>
                      </div>
                      {learner.lastEnrollment && (
                        <div className="text-center hidden md:block">
                          <div className="font-medium">
                            {new Date(learner.lastEnrollment).toLocaleDateString("en-US", { 
                              month: "short", 
                              year: "2-digit" 
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground">Last Active</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Learner Stats Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg Courses per Learner</CardDescription>
                <CardTitle className="text-2xl">
                  {topLearners.length > 0 
                    ? (topLearners.reduce((sum, l) => sum + l.coursesCompleted, 0) / topLearners.length).toFixed(1)
                    : 0
                  }
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Among top {topLearners.length} learners
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Multi-Category Learners</CardDescription>
                <CardTitle className="text-2xl">
                  {topLearners.filter(l => l.categories.length > 1).length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Learning across multiple areas
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg Commits per Learner</CardDescription>
                <CardTitle className="text-2xl">
                  {topLearners.length > 0 
                    ? Math.round(topLearners.reduce((sum, l) => sum + l.totalCommits, 0) / topLearners.length)
                    : 0
                  }
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Hands-on engagement level
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
