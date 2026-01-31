"use client";

/**
 * Skills Analysis Dashboard
 * 
 * Comprehensive view of skills course engagement and its correlation
 * with product adoption (Copilot, Actions, Security).
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  BookOpen,
  Sparkles,
  Zap,
  Shield,
  GitBranch,
  TrendingUp,
  Users,
  Award,
  ArrowRight,
  BarChart3,
  CheckCircle2,
} from "lucide-react";

interface SkillsAnalytics {
  overview: {
    totalLearners: number;
    usersWithSkills: number;
    usersWithSkillsViews: number;
    totalSkillsCompleted: number;
    avgSkillsPerUser: number;
    totalPageViews: number;
    avgPageViews: number;
  };
  byCategory: Array<{
    name: string;
    users: number;
    completions: number;
    avgPerUser: number;
  }>;
  skillsToAdoption: Array<{
    segment: string;
    users: number;
    copilotRate: number;
    actionsRate: number;
    securityRate: number;
    avgCopilotDays: number;
    avgCerts: number;
  }>;
  categoryCorrelations: Array<{
    name: string;
    rateWithSkill: number;
    rateWithoutSkill: number;
    lift: number;
  }>;
  skillsVsCerts: Array<{
    segment: string;
    users: number;
    copilotRate: number;
    actionsRate: number;
    avgCopilotDays: number;
    avgMaturity: number;
  }>;
  maturityDistribution: Array<{
    level: string;
    users: number;
    avgScore: number;
    copilotRate: number;
  }>;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "AI/Copilot": Sparkles,
  "Actions/CI-CD": Zap,
  "Git/GitHub Basics": GitBranch,
  "Security": Shield,
};

const CATEGORY_COLORS: Record<string, string> = {
  "AI/Copilot": "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800",
  "Actions/CI-CD": "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
  "Git/GitHub Basics": "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
  "Security": "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
};

export default function SkillsAnalysisPage() {
  const [data, setData] = useState<SkillsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/enriched/stats/skills-analytics");
        if (!response.ok) throw new Error("Failed to fetch skills analytics");
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorCard error={error} />;
  if (!data) return null;

  const skillsAdoptionRate = data.overview.totalLearners > 0
    ? (data.overview.usersWithSkills / data.overview.totalLearners) * 100
    : 0;

  // Find the "No Skills" baseline for comparison
  const noSkillsBaseline = data.skillsToAdoption.find(s => s.segment === "No Skills");
  const highSkillsUsers = data.skillsToAdoption.find(s => s.segment === "5+ Skills");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-blue-500" />
            Skills Analysis
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Analyze skills course engagement and its impact on GitHub product adoption.
            Skills courses are interactive, hands-on tutorials in the skills/* repos.
          </p>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-2 py-1 w-fit">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
            <strong>Data Window:</strong> Skills data limited to last ~90 days (Kusto retention). Product adoption also uses 90-day metrics.
          </p>
        </div>
        <Link href="/skills/analytics">
          <Button variant="outline" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Deep Dive
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Skills Learners"
          value={data.overview.usersWithSkills.toLocaleString()}
          subtitle={`${skillsAdoptionRate.toFixed(1)}% of all learners`}
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="Skills Completed"
          value={data.overview.totalSkillsCompleted.toLocaleString()}
          subtitle={`${data.overview.avgSkillsPerUser} avg per user`}
          icon={CheckCircle2}
          color="green"
        />
        <MetricCard
          title="Page Views"
          value={data.overview.totalPageViews.toLocaleString()}
          subtitle={`${data.overview.avgPageViews} avg per user`}
          icon={BookOpen}
          color="purple"
        />
        <MetricCard
          title="Copilot Lift"
          value={`+${((highSkillsUsers?.copilotRate || 0) - (noSkillsBaseline?.copilotRate || 0)).toFixed(0)}%`}
          subtitle="5+ Skills vs No Skills"
          icon={TrendingUp}
          color="amber"
          highlight
        />
      </div>

      {/* Key Insight Banner */}
      <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/50">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Key Insight: Skills → Product Adoption</h3>
              <p className="text-muted-foreground mt-1">
                Users who complete <strong>5+ skills courses</strong> show{" "}
                <strong className="text-green-600 dark:text-green-400">
                  {((highSkillsUsers?.copilotRate || 0) - (noSkillsBaseline?.copilotRate || 0)).toFixed(0)}% higher
                </strong>{" "}
                Copilot adoption and{" "}
                <strong className="text-orange-600 dark:text-orange-400">
                  {((highSkillsUsers?.actionsRate || 0) - (noSkillsBaseline?.actionsRate || 0)).toFixed(0)}% higher
                </strong>{" "}
                        Actions adoption compared to users with no skills.
              </p>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
                <strong>Note:</strong> Copilot adoption is independent of skills course activity. 
                Actions rates may include some course-triggered workflows.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="categories">By Category</TabsTrigger>
          <TabsTrigger value="adoption">Skills → Adoption</TabsTrigger>
          <TabsTrigger value="correlations">Correlations</TabsTrigger>
          <TabsTrigger value="comparison">Skills vs Certs</TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.byCategory.map((category) => {
              const Icon = CATEGORY_ICONS[category.name] || BookOpen;
              const colorClass = CATEGORY_COLORS[category.name] || "text-gray-600 bg-gray-50 border-gray-200";
              const totalSkillsUsers = data.overview.usersWithSkills;
              const pct = totalSkillsUsers > 0 ? (category.users / totalSkillsUsers) * 100 : 0;

              return (
                <Card key={category.name} className={`border ${colorClass.split(' ').slice(1).join(' ')}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className={`h-5 w-5 ${colorClass.split(' ')[0]}`} />
                      {category.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-3xl font-bold">{category.users.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">learners</p>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Completions</span>
                        <span className="font-semibold">{category.completions.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Avg per user</span>
                        <span className="font-semibold">{category.avgPerUser}</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                      <p className="text-xs text-muted-foreground">{pct.toFixed(1)}% of skills users</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Skills → Adoption Tab */}
        <TabsContent value="adoption" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Adoption by Skills Completion</CardTitle>
              <CardDescription>
                How skills course completion correlates with GitHub product usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {data.skillsToAdoption.map((segment) => {
                  const isBaseline = segment.segment === "No Skills";
                  return (
                    <div key={segment.segment} className={`space-y-3 ${isBaseline ? 'opacity-60' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant={isBaseline ? "secondary" : "default"}>
                            {segment.segment}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {segment.users.toLocaleString()} users
                          </span>
                        </div>
                        {isBaseline && (
                          <span className="text-xs text-muted-foreground italic">Baseline</span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <ProductAdoptionBar
                          label="Copilot"
                          rate={segment.copilotRate}
                          baseline={noSkillsBaseline?.copilotRate}
                          icon={Sparkles}
                          color="purple"
                        />
                        <ProductAdoptionBar
                          label="Actions"
                          rate={segment.actionsRate}
                          baseline={noSkillsBaseline?.actionsRate}
                          icon={Zap}
                          color="orange"
                        />
                        <ProductAdoptionBar
                          label="Security"
                          rate={segment.securityRate}
                          baseline={noSkillsBaseline?.securityRate}
                          icon={Shield}
                          color="green"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Correlations Tab */}
        <TabsContent value="correlations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Skills Category → Product Correlations</CardTitle>
              <CardDescription>
                Do specific skills categories correlate with their corresponding product usage?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {data.categoryCorrelations.map((corr) => (
                  <div key={corr.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{corr.name}</span>
                      <span className={`font-bold ${corr.lift > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {corr.lift > 0 ? '+' : ''}{corr.lift}% lift
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                        <p className="text-sm text-muted-foreground">With Skill</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{corr.rateWithSkill}%</p>
                      </div>
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-muted-foreground">Without Skill</p>
                        <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{corr.rateWithoutSkill}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills vs Certs Tab */}
        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Skills vs Certifications</CardTitle>
              <CardDescription>
                Comparing learning paths: Skills-only, Cert-only, Both, or Neither
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">Segment</th>
                      <th className="text-right py-3 px-2">Users</th>
                      <th className="text-right py-3 px-2">
                        <span className="flex items-center justify-end gap-1">
                          <Sparkles className="h-4 w-4 text-purple-500" />
                          Copilot
                        </span>
                      </th>
                      <th className="text-right py-3 px-2">
                        <span className="flex items-center justify-end gap-1">
                          <Zap className="h-4 w-4 text-orange-500" />
                          Actions
                        </span>
                      </th>
                      <th className="text-right py-3 px-2">Avg Copilot Days</th>
                      <th className="text-right py-3 px-2">Avg Maturity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.skillsVsCerts.map((row) => (
                      <tr key={row.segment} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <Badge variant={row.segment === "Both" ? "default" : "outline"}>
                            {row.segment}
                          </Badge>
                        </td>
                        <td className="text-right py-3 px-2 font-mono">
                          {row.users.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-2">
                          <span className="font-semibold">{row.copilotRate}%</span>
                        </td>
                        <td className="text-right py-3 px-2">
                          <span className="font-semibold">{row.actionsRate}%</span>
                        </td>
                        <td className="text-right py-3 px-2">{row.avgCopilotDays}</td>
                        <td className="text-right py-3 px-2">{row.avgMaturity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper Components

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-4 w-96" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

function ErrorCard({ error }: { error: string }) {
  return (
    <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
      <CardContent className="pt-6">
        <p className="text-red-600 dark:text-red-400">Error: {error}</p>
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  color: "blue" | "green" | "purple" | "amber" | "orange";
  highlight?: boolean;
}

function MetricCard({ title, value, subtitle, icon: Icon, color, highlight }: MetricCardProps) {
  const colorClasses = {
    blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
    green: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30",
    purple: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30",
    orange: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30",
  };

  return (
    <Card className={highlight ? "border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ProductAdoptionBarProps {
  label: string;
  rate: number;
  baseline?: number;
  icon: React.ElementType;
  color: "purple" | "orange" | "green";
}

function ProductAdoptionBar({ label, rate, baseline, icon: Icon, color }: ProductAdoptionBarProps) {
  const lift = baseline !== undefined ? rate - baseline : 0;
  const colorClasses = {
    purple: "text-purple-500",
    orange: "text-orange-500",
    green: "text-green-500",
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1">
          <Icon className={`h-3 w-3 ${colorClasses[color]}`} />
          {label}
        </span>
        <span className="font-semibold">{rate}%</span>
      </div>
      <Progress value={rate} className="h-2" />
      {lift !== 0 && baseline !== undefined && (
        <p className={`text-xs ${lift > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
          {lift > 0 ? '+' : ''}{lift.toFixed(0)}% vs baseline
        </p>
      )}
    </div>
  );
}
