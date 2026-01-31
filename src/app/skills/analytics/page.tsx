"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Layers,
  TrendingUp,
  Sparkles,
  Target,
  GitFork,
  ArrowRight,
  Zap,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Treemap,
  Sankey,
  Layer,
  Rectangle,
  LabelList,
} from "recharts";

// Label formatters for LabelList components
const formatNumberLabel = (value: any) => formatNumber(Number(value));
const formatPercentLabel = (value: any) => `${Math.round(Number(value))}%`;

// Custom tooltip with dark mode support
const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm text-foreground" style={{ color: entry.color }}>
            {entry.name}: {formatter ? formatter(entry.value, entry.name) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Tooltip wrapper style to prevent white background on hover
const tooltipWrapperStyle = { outline: "none", background: "transparent" };
const tooltipCursor = { fill: "hsl(var(--muted))", opacity: 0.3 };

interface DeepDiveData {
  categoryOverlap: {
    aiTotal: number;
    actionsTotal: number;
    gitTotal: number;
    securityTotal: number;
    aiAndGit: number;
    aiAndActions: number;
    aiAndSecurity: number;
    gitAndActions: number;
    gitAndSecurity: number;
    actionsAndSecurity: number;
    multiCategory: number;
    allCategories: number;
  };
  depthDistribution: Array<{
    level: string;
    users: number;
    avgSkills: number;
    copilotRate: number;
    actionsRate: number;
    avgMaturity: number;
  }>;
  engagementHeatmap: Array<{
    skillsBucket: string;
    viewsBucket: string;
    users: number;
    copilotRate: number;
  }>;
  learningPaths: Array<{
    pathType: string;
    users: number;
    avgSkills: number;
  }>;
  learningSynergy: Array<{
    type: string;
    users: number;
    copilotRate: number;
    actionsRate: number;
    avgMaturity: number;
    avgCopilotDays: number;
  }>;
  topCombinations: Array<{
    combination: string;
    users: number;
    copilotRate: number;
  }>;
}

const DEPTH_COLORS = [
  "#8b5cf6", // Power User - purple
  "#3b82f6", // Active Learner - blue
  "#10b981", // Engaged - green
  "#f59e0b", // Getting Started - amber
  "#6b7280", // None - gray
];

// Color lookup by depth level name
const DEPTH_COLOR_MAP: Record<string, string> = {
  "Power User (10+)": "#8b5cf6",
  "Active Learner (5-9)": "#3b82f6",
  "Engaged (3-4)": "#10b981",
  "Getting Started (1-2)": "#f59e0b",
  "None": "#6b7280",
};

const CATEGORY_COLORS: Record<string, string> = {
  AI: "#8b5cf6",
  Git: "#10b981",
  Actions: "#f59e0b",
  Security: "#ef4444",
};

export default function SkillsDeepDivePage() {
  const [data, setData] = useState<DeepDiveData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/enriched/stats/skills-deep-dive");
        if (!response.ok) throw new Error("Failed to fetch data");
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error || "Failed to load data"}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const overlap = data.categoryOverlap;
  const totalSkillUsers =
    overlap.aiTotal + overlap.gitTotal + overlap.actionsTotal + overlap.securityTotal;

  // Prepare category overlap data for visualization
  const categoryTotals = [
    { name: "AI/Copilot", users: overlap.aiTotal, color: "#8b5cf6" },
    { name: "Git/GitHub", users: overlap.gitTotal, color: "#10b981" },
    { name: "Actions/CI", users: overlap.actionsTotal, color: "#f59e0b" },
    { name: "Security", users: overlap.securityTotal, color: "#ef4444" },
  ].sort((a, b) => b.users - a.users);

  // Multi-category stats
  const multiCategoryRate = overlap.multiCategory > 0 
    ? Math.round((overlap.multiCategory / (data.depthDistribution.find(d => d.level !== "None")?.users || 1)) * 100)
    : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Layers className="h-8 w-8 text-purple-500" />
          Skills Deep Dive
        </h1>
        <p className="text-muted-foreground mt-1">
          Cross-category analysis, learning patterns, and skill journey insights
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-2 py-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
            <strong>Data Window:</strong> Skills data limited to last ~90 days (Kusto retention)
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-purple-400" />
            <strong>Note:</strong> Copilot adoption metrics are independent of skills course activity. 
            Actions metrics may include course-triggered workflow runs.
          </p>
        </div>
      </div>

      {/* Category Overlap Summary */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-200 dark:border-purple-800">
        <CardContent className="py-6">
          <div className="grid gap-6 md:grid-cols-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                {formatNumber(overlap.multiCategory)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Multi-Category Learners (3+)
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                {formatNumber(overlap.allCategories)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Complete Suite (All 4)
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 dark:text-green-400">
                {formatNumber(overlap.aiAndGit)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                AI + Git Combo (Most Popular)
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-600 dark:text-amber-400">
                {overlap.actionsTotal > 0 
                  ? Math.round((overlap.aiAndActions / overlap.actionsTotal) * 100)
                  : 0}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Actions Users Also Have AI Skills
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="depth" className="space-y-4">
        <TabsList>
          <TabsTrigger value="depth">Skill Depth</TabsTrigger>
          <TabsTrigger value="paths">Learning Paths</TabsTrigger>
          <TabsTrigger value="synergy">Learn + Skills</TabsTrigger>
          <TabsTrigger value="combos">Skill Combos</TabsTrigger>
        </TabsList>

        {/* Skill Depth Distribution */}
        <TabsContent value="depth" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Skill Depth Distribution
                </CardTitle>
                <CardDescription>
                  User engagement levels by skills completed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.depthDistribution
                        .filter((d) => d.level !== "None")
                        .slice()
                        .reverse()}
                      layout="vertical"
                      margin={{ left: 20, right: 50 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal />
                      <XAxis type="number" tickFormatter={formatNumber} />
                      <YAxis dataKey="level" type="category" width={130} />
                      <Tooltip wrapperStyle={tooltipWrapperStyle} cursor={tooltipCursor}
                        content={<CustomTooltip formatter={(v: number) => formatNumber(v)} />}
                      />
                      <Bar dataKey="users" name="Users" radius={[0, 4, 4, 0]}>
                        {data.depthDistribution
                          .filter((d) => d.level !== "None")
                          .slice()
                          .reverse()
                          .map((item) => (
                            <Cell key={item.level} fill={DEPTH_COLOR_MAP[item.level] || "#6b7280"} />
                          ))}
                        <LabelList dataKey="users" position="right" formatter={formatNumberLabel} className="fill-foreground text-xs" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Adoption by Skill Depth
                </CardTitle>
                <CardDescription>
                  Product adoption rates increase with skills
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.depthDistribution}
                      margin={{ left: 20, right: 30, top: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="level"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip wrapperStyle={tooltipWrapperStyle} cursor={tooltipCursor}
                        content={<CustomTooltip formatter={formatPercentLabel} />}
                      />
                      <Bar
                        dataKey="copilotRate"
                        name="Copilot %"
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList dataKey="copilotRate" position="top" formatter={formatPercentLabel} className="fill-foreground text-xs" />
                      </Bar>
                      <Bar
                        dataKey="actionsRate"
                        name="Actions %"
                        fill="#f59e0b"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList dataKey="actionsRate" position="top" formatter={formatPercentLabel} className="fill-foreground text-xs" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Depth Stats Cards */}
          <div className="grid gap-4 md:grid-cols-5">
            {data.depthDistribution.map((depth, i) => (
              <Card
                key={depth.level}
                className={
                  depth.level === "Power User (10+)"
                    ? "border-purple-300 dark:border-purple-700"
                    : ""
                }
              >
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: DEPTH_COLORS[i] }}
                    />
                    {depth.level}
                  </CardDescription>
                  <CardTitle className="text-2xl">
                    {formatNumber(depth.users)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Copilot</span>
                      <Badge
                        variant={
                          depth.copilotRate > 70 ? "default" : "secondary"
                        }
                      >
                        {depth.copilotRate}%
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Maturity</span>
                      <span>{depth.avgMaturity}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Learning Paths */}
        <TabsContent value="paths" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitFork className="h-5 w-5" />
                  Learning Path Patterns
                </CardTitle>
                <CardDescription>
                  What skill categories do users focus on?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.learningPaths}
                      layout="vertical"
                      margin={{ left: 20, right: 50 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal />
                      <XAxis type="number" tickFormatter={formatNumber} />
                      <YAxis dataKey="pathType" type="category" width={120} />
                      <Tooltip wrapperStyle={tooltipWrapperStyle} cursor={tooltipCursor}
                        content={<CustomTooltip formatter={(v: number) => formatNumber(v)} />}
                      />
                      <Bar
                        dataKey="users"
                        name="Users"
                        fill="#8b5cf6"
                        radius={[0, 4, 4, 0]}
                      >
                        <LabelList dataKey="users" position="right" formatter={formatNumberLabel} className="fill-foreground text-xs" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Category Overlap Matrix
                </CardTitle>
                <CardDescription>
                  Users with skills in multiple categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Overlap pairs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-green-500/10 border">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Badge
                          style={{ backgroundColor: CATEGORY_COLORS.AI }}
                        >
                          AI
                        </Badge>
                        <ArrowRight className="h-3 w-3" />
                        <Badge
                          style={{ backgroundColor: CATEGORY_COLORS.Git }}
                        >
                          Git
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold mt-1">
                        {formatNumber(overlap.aiAndGit)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        users with both
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-amber-500/10 border">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Badge
                          style={{ backgroundColor: CATEGORY_COLORS.AI }}
                        >
                          AI
                        </Badge>
                        <ArrowRight className="h-3 w-3" />
                        <Badge
                          style={{ backgroundColor: CATEGORY_COLORS.Actions }}
                        >
                          Actions
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold mt-1">
                        {formatNumber(overlap.aiAndActions)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        users with both
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-amber-500/10 border">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Badge
                          style={{ backgroundColor: CATEGORY_COLORS.Git }}
                        >
                          Git
                        </Badge>
                        <ArrowRight className="h-3 w-3" />
                        <Badge
                          style={{ backgroundColor: CATEGORY_COLORS.Actions }}
                        >
                          Actions
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold mt-1">
                        {formatNumber(overlap.gitAndActions)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        users with both
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-red-500/10 border">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Badge
                          style={{ backgroundColor: CATEGORY_COLORS.AI }}
                        >
                          AI
                        </Badge>
                        <ArrowRight className="h-3 w-3" />
                        <Badge
                          style={{ backgroundColor: CATEGORY_COLORS.Security }}
                        >
                          Security
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold mt-1">
                        {formatNumber(overlap.aiAndSecurity)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        users with both
                      </div>
                    </div>
                  </div>

                  {/* Key insight */}
                  <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                        <div>
                          <div className="font-semibold">
                            Most Common Path: AI → Git
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatNumber(overlap.aiAndGit)} users complete both
                            AI/Copilot and Git/GitHub skills, representing{" "}
                            {overlap.aiTotal > 0
                              ? Math.round(
                                  (overlap.aiAndGit / overlap.aiTotal) * 100
                                )
                              : 0}
                            % of AI skill learners.
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Skills + Learn Synergy */}
        <TabsContent value="synergy" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Learning Channel Synergy
                </CardTitle>
                <CardDescription>
                  Impact of combining Skills + GitHub Learn
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.learningSynergy}
                      margin={{ left: 20, right: 30, top: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="type"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip wrapperStyle={tooltipWrapperStyle} cursor={tooltipCursor} content={<CustomTooltip formatter={formatPercentLabel} />} />
                      <Bar
                        dataKey="copilotRate"
                        name="Copilot %"
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList dataKey="copilotRate" position="top" formatter={formatPercentLabel} className="fill-foreground text-xs" />
                      </Bar>
                      <Bar
                        dataKey="actionsRate"
                        name="Actions %"
                        fill="#f59e0b"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList dataKey="actionsRate" position="top" formatter={formatPercentLabel} className="fill-foreground text-xs" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Synergy Breakdown</CardTitle>
                <CardDescription>
                  Users by learning channel combination
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.learningSynergy.map((item, i) => {
                    const colors = [
                      "bg-purple-500",
                      "bg-blue-500",
                      "bg-green-500",
                      "bg-gray-400",
                    ];
                    return (
                      <div
                        key={item.type}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-3 w-3 rounded-full ${colors[i]}`}
                          />
                          <div>
                            <div className="font-medium">{item.type}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatNumber(item.users)} users
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex gap-2">
                            <Badge variant="secondary">
                              {item.copilotRate}% Copilot
                            </Badge>
                            <Badge variant="outline">
                              {item.avgCopilotDays}d active
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Synergy insight */}
                  {data.learningSynergy.length >= 2 && (
                    <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                      <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                          <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                          <div>
                            <div className="font-semibold">Synergy Effect</div>
                            <div className="text-sm text-muted-foreground">
                              Users who engage with both Skills and GitHub Learn
                              show{" "}
                              <strong>
                                +
                                {Math.round(
                                  data.learningSynergy[0]?.copilotRate -
                                    (data.learningSynergy[3]?.copilotRate || 35)
                                )}
                                %
                              </strong>{" "}
                              higher Copilot adoption than non-learners.
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Top Skill Combinations */}
        <TabsContent value="combos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Top Skill Combinations
              </CardTitle>
              <CardDescription>
                Most popular category combinations and their adoption rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.topCombinations}
                      layout="vertical"
                      margin={{ left: 20, right: 50 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal />
                      <XAxis type="number" tickFormatter={formatNumber} />
                      <YAxis
                        dataKey="combination"
                        type="category"
                        width={120}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip wrapperStyle={tooltipWrapperStyle} cursor={tooltipCursor}
                        content={<CustomTooltip formatter={(v: number, name: string) => name === "users" ? formatNumber(v) : `${v}%`} />}
                      />
                      <Bar
                        dataKey="users"
                        name="Users"
                        fill="#8b5cf6"
                        radius={[0, 4, 4, 0]}
                      >
                        <LabelList dataKey="users" position="right" formatter={formatNumberLabel} className="fill-foreground text-xs" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">
                    Combinations Ranked by Adoption Impact
                  </h4>
                  {data.topCombinations
                    .sort((a, b) => b.copilotRate - a.copilotRate)
                    .slice(0, 8)
                    .map((combo, i) => (
                      <div
                        key={combo.combination}
                        className="flex items-center justify-between p-2 rounded border"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground w-6">
                            #{i + 1}
                          </span>
                          <div className="flex gap-1">
                            {combo.combination.split(" + ").map((cat) => (
                              <Badge
                                key={cat}
                                style={{
                                  backgroundColor:
                                    CATEGORY_COLORS[cat] || "#6b7280",
                                }}
                              >
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {formatNumber(combo.users)} users
                          </span>
                          <Badge
                            variant={
                              combo.copilotRate >= 80
                                ? "default"
                                : combo.copilotRate >= 60
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {combo.copilotRate}% Copilot
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Insights */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Target className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                  <div>
                    <div className="font-semibold">Top Performer</div>
                    <div className="text-sm text-muted-foreground">
                      {data.topCombinations[0]?.combination || "AI + Git"} is
                      the most common combination with{" "}
                      {formatNumber(data.topCombinations[0]?.users || 0)} users
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <div className="font-semibold">Highest Adoption</div>
                    <div className="text-sm text-muted-foreground">
                      {data.topCombinations.sort(
                        (a, b) => b.copilotRate - a.copilotRate
                      )[0]?.combination || "Multi-Category"}{" "}
                      users have{" "}
                      {data.topCombinations.sort(
                        (a, b) => b.copilotRate - a.copilotRate
                      )[0]?.copilotRate || 0}
                      % Copilot adoption
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <div className="font-semibold">Multi-Category Elite</div>
                    <div className="text-sm text-muted-foreground">
                      {formatNumber(overlap.multiCategory)} users have skills in
                      3+ categories, {formatNumber(overlap.allCategories)} have all
                      4
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
