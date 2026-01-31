"use client";

/**
 * Learning → Product Adoption Insights Page
 * 
 * Comprehensive view of how ALL learning activities correlate with
 * GitHub product adoption (Copilot, Actions, Security).
 * 
 * Learning types analyzed:
 *   - Certifications (ACE exams)
 *   - Skills courses (skills/* repos)
 *   - GitHub Learn articles
 *   - Combined learning score
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  GraduationCap, 
  Sparkles, 
  Zap, 
  Shield, 
  BookOpen,
  Award,
  Code,
  TrendingUp,
  Users,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";
import {
  ActionsEngagementDistribution,
  ActionsEngagementSummary,
  calculateActionsEngagementLevel,
} from "@/components/actions-engagement";
import {
  CopilotAdoptionStats,
  CopilotCertificationImpact,
} from "@/components/copilot-adoption";

interface LearningSegment {
  name: string;
  description: string;
  userCount: number;
  copilotAdoption: number;
  actionsAdoption: number;
  securityAdoption: number;
  avgActionsLevel: number;
  avgCopilotDays: number;
}

interface AdoptionData {
  segments: LearningSegment[];
  overall: {
    totalLearners: number;
    certifiedCount: number;
    skillsOnlyCount: number;
    learnOnlyCount: number;
    multiModalCount: number;
  };
  actionsDistribution: {
    byLearningType: Record<string, Record<number, number>>;
  };
  copilotStats: {
    byLearningType: Record<string, { adopters: number; total: number; avgDays: number }>;
  };
}

export default function LearningAdoptionPage() {
  const [data, setData] = useState<AdoptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch from the enriched stats endpoint
        const response = await fetch("/api/enriched/stats/learning-adoption");
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load adoption data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-purple-500" />
          Learning → Product Adoption
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          Analyze how different types of learning activities correlate with GitHub product 
          adoption. Compare certification holders, skills course completers, and GitHub Learn 
          readers across Copilot, Actions, and Security adoption metrics.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <OverviewCard
          title="Total Learners"
          value={data.overall.totalLearners}
          icon={Users}
          color="blue"
        />
        <OverviewCard
          title="Certified"
          value={data.overall.certifiedCount}
          subtitle={`${((data.overall.certifiedCount / data.overall.totalLearners) * 100).toFixed(1)}% of learners`}
          icon={Award}
          color="green"
        />
        <OverviewCard
          title="Skills Only"
          value={data.overall.skillsOnlyCount}
          subtitle="No certifications yet"
          icon={Code}
          color="cyan"
        />
        <OverviewCard
          title="Multi-Modal"
          value={data.overall.multiModalCount}
          subtitle="Multiple learning types"
          icon={BookOpen}
          color="purple"
        />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="comparison" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="comparison">Segment Comparison</TabsTrigger>
          <TabsTrigger value="actions">Actions Engagement</TabsTrigger>
          <TabsTrigger value="copilot">Copilot Adoption</TabsTrigger>
          <TabsTrigger value="security">Security Features</TabsTrigger>
        </TabsList>

        {/* Segment Comparison Tab */}
        <TabsContent value="comparison" className="space-y-4">
          <SegmentComparisonTable segments={data.segments} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AdoptionByLearningTypeChart 
              segments={data.segments} 
              product="copilot"
              title="Copilot Adoption by Learning Type"
              icon={Sparkles}
              color="purple"
            />
            <AdoptionByLearningTypeChart 
              segments={data.segments} 
              product="actions"
              title="Actions Adoption by Learning Type"
              icon={Zap}
              color="orange"
            />
          </div>
        </TabsContent>

        {/* Actions Engagement Tab */}
        <TabsContent value="actions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ActionsEngagementSummary
              averageLevel={calculateAverageLevel(data.actionsDistribution.byLearningType)}
              powerUserPercentage={calculatePowerUserPercentage(data.actionsDistribution.byLearningType)}
              activeUsers={calculateActiveUsers(data.actionsDistribution.byLearningType)}
              totalUsers={data.overall.totalLearners}
            />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-500" />
                  Actions Level by Learning Type
                </CardTitle>
                <CardDescription>
                  Average engagement level (0-5) across learning segments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.segments.map((segment) => (
                    <div key={segment.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{segment.name}</span>
                        <span className="text-muted-foreground">
                          Avg Level: {segment.avgActionsLevel.toFixed(1)}
                        </span>
                      </div>
                      <Progress 
                        value={(segment.avgActionsLevel / 5) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <ActionsEngagementDistribution
            distribution={aggregateDistribution(data.actionsDistribution.byLearningType)}
            comparisonData={{
              certified: data.actionsDistribution.byLearningType["Certified"] || {},
              uncertified: data.actionsDistribution.byLearningType["Skills Only"] || {},
            }}
          />
        </TabsContent>

        {/* Copilot Adoption Tab */}
        <TabsContent value="copilot" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CopilotAdoptionStats
              totalUsers={data.overall.totalLearners}
              usersWithCopilot={Object.values(data.copilotStats.byLearningType).reduce((a, b) => a + b.adopters, 0)}
              subscribedUsers={Math.floor(Object.values(data.copilotStats.byLearningType).reduce((a, b) => a + b.adopters, 0) * 0.7)}
              activeUsers90d={Math.floor(Object.values(data.copilotStats.byLearningType).reduce((a, b) => a + b.adopters, 0) * 0.85)}
            />
            <CopilotLearningImpact copilotStats={data.copilotStats} />
          </div>
          
          <CopilotByLearningSegment segments={data.segments} />
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SecurityAdoptionCard segments={data.segments} />
            <SecurityByLearningType segments={data.segments} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper Components

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-4 w-96" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

interface OverviewCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ElementType;
  color: "blue" | "green" | "cyan" | "purple" | "orange" | "amber";
}

function OverviewCard({ title, value, subtitle, icon: Icon, color }: OverviewCardProps) {
  const colorClasses = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    cyan: "text-cyan-600 bg-cyan-50",
    purple: "text-purple-600 bg-purple-50",
    orange: "text-orange-600 bg-orange-50",
    amber: "text-amber-600 bg-amber-50",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SegmentComparisonTable({ segments }: { segments: LearningSegment[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          Learning Segment Comparison
        </CardTitle>
        <CardDescription>
          Product adoption rates across different learning activity types
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium">Learning Segment</th>
                <th className="text-right py-3 px-2 font-medium">Users</th>
                <th className="text-right py-3 px-2 font-medium">
                  <span className="flex items-center justify-end gap-1">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    Copilot
                  </span>
                </th>
                <th className="text-right py-3 px-2 font-medium">
                  <span className="flex items-center justify-end gap-1">
                    <Zap className="h-4 w-4 text-orange-500" />
                    Actions
                  </span>
                </th>
                <th className="text-right py-3 px-2 font-medium">
                  <span className="flex items-center justify-end gap-1">
                    <Shield className="h-4 w-4 text-green-500" />
                    Security
                  </span>
                </th>
                <th className="text-right py-3 px-2 font-medium">Avg Actions Level</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((segment, idx) => {
                const baseline = segments.find(s => s.name === "No Learning") || segments[segments.length - 1];
                const copilotDiff = segment.copilotAdoption - baseline.copilotAdoption;
                const actionsDiff = segment.actionsAdoption - baseline.actionsAdoption;
                const securityDiff = segment.securityAdoption - baseline.securityAdoption;

                return (
                  <tr key={segment.name} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <div>
                        <p className="font-medium">{segment.name}</p>
                        <p className="text-xs text-muted-foreground">{segment.description}</p>
                      </div>
                    </td>
                    <td className="text-right py-3 px-2 font-mono">
                      {segment.userCount.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-2">
                      <AdoptionCell value={segment.copilotAdoption} diff={copilotDiff} />
                    </td>
                    <td className="text-right py-3 px-2">
                      <AdoptionCell value={segment.actionsAdoption} diff={actionsDiff} />
                    </td>
                    <td className="text-right py-3 px-2">
                      <AdoptionCell value={segment.securityAdoption} diff={securityDiff} />
                    </td>
                    <td className="text-right py-3 px-2">
                      <Badge variant="outline">
                        L{segment.avgActionsLevel.toFixed(1)}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function AdoptionCell({ value, diff }: { value: number; diff: number }) {
  const DiffIcon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
  const diffColor = diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-400";

  return (
    <div className="flex items-center justify-end gap-2">
      <span className="font-semibold">{value.toFixed(1)}%</span>
      {Math.abs(diff) > 0.1 && (
        <span className={`text-xs flex items-center ${diffColor}`}>
          <DiffIcon className="h-3 w-3" />
          {Math.abs(diff).toFixed(1)}
        </span>
      )}
    </div>
  );
}

interface AdoptionByLearningTypeChartProps {
  segments: LearningSegment[];
  product: "copilot" | "actions" | "security";
  title: string;
  icon: React.ElementType;
  color: string;
}

function AdoptionByLearningTypeChart({ 
  segments, 
  product, 
  title, 
  icon: Icon,
  color 
}: AdoptionByLearningTypeChartProps) {
  const getValue = (s: LearningSegment) => {
    switch (product) {
      case "copilot": return s.copilotAdoption;
      case "actions": return s.actionsAdoption;
      case "security": return s.securityAdoption;
    }
  };

  const maxValue = Math.max(...segments.map(getValue));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className={`h-5 w-5 text-${color}-500`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {segments
          .sort((a, b) => getValue(b) - getValue(a))
          .map((segment) => {
            const value = getValue(segment);
            return (
              <div key={segment.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{segment.name}</span>
                  <span className="font-semibold">{value.toFixed(1)}%</span>
                </div>
                <Progress 
                  value={(value / maxValue) * 100} 
                  className="h-2"
                />
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
}

function CopilotLearningImpact({ copilotStats }: { copilotStats: AdoptionData["copilotStats"] }) {
  const entries = Object.entries(copilotStats.byLearningType);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          Copilot by Learning Activity
        </CardTitle>
        <CardDescription>
          Adoption rate and engagement by learning type
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries
          .sort((a, b) => (b[1].adopters / b[1].total) - (a[1].adopters / a[1].total))
          .map(([type, stats]) => {
            const rate = stats.total > 0 ? (stats.adopters / stats.total) * 100 : 0;
            return (
              <div key={type} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{type}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs">
                      {stats.avgDays.toFixed(1)} avg days
                    </span>
                    <span className="font-semibold">{rate.toFixed(1)}%</span>
                  </div>
                </div>
                <Progress value={rate} className="h-2" />
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
}

function CopilotByLearningSegment({ segments }: { segments: LearningSegment[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          Copilot Usage Intensity
        </CardTitle>
        <CardDescription>
          Average active Copilot days (90d) by learning segment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {segments
            .sort((a, b) => b.avgCopilotDays - a.avgCopilotDays)
            .map((segment) => (
              <div 
                key={segment.name}
                className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 border"
              >
                <p className="text-sm font-medium truncate">{segment.name}</p>
                <p className="text-2xl font-bold text-purple-600">
                  {segment.avgCopilotDays.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">avg days/90d</p>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityAdoptionCard({ segments }: { segments: LearningSegment[] }) {
  const avgAdoption = segments.reduce((a, s) => a + s.securityAdoption, 0) / segments.length;
  const highestSegment = segments.reduce((a, b) => a.securityAdoption > b.securityAdoption ? a : b);
  const lowestSegment = segments.reduce((a, b) => a.securityAdoption < b.securityAdoption ? a : b);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-500" />
          Security Feature Adoption
        </CardTitle>
        <CardDescription>
          Usage of Dependabot, CodeQL, and security features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-green-50">
            <p className="text-xs text-muted-foreground">Average</p>
            <p className="text-2xl font-bold text-green-600">{avgAdoption.toFixed(1)}%</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-green-100">
            <p className="text-xs text-muted-foreground">Highest</p>
            <p className="text-2xl font-bold text-green-700">{highestSegment.securityAdoption.toFixed(1)}%</p>
            <p className="text-xs truncate">{highestSegment.name}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-gray-50">
            <p className="text-xs text-muted-foreground">Lowest</p>
            <p className="text-2xl font-bold text-gray-600">{lowestSegment.securityAdoption.toFixed(1)}%</p>
            <p className="text-xs truncate">{lowestSegment.name}</p>
          </div>
        </div>
        
        <div className="p-4 rounded-lg bg-green-50 border border-green-200">
          <p className="text-sm text-green-800">
            <strong>Key Insight:</strong> {highestSegment.name} users show {" "}
            <strong>{(highestSegment.securityAdoption - lowestSegment.securityAdoption).toFixed(1)}%</strong> higher 
            security feature adoption than {lowestSegment.name} users.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityByLearningType({ segments }: { segments: LearningSegment[] }) {
  const maxValue = Math.max(...segments.map(s => s.securityAdoption));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-500" />
          Security by Learning Segment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {segments
          .sort((a, b) => b.securityAdoption - a.securityAdoption)
          .map((segment) => (
            <div key={segment.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{segment.name}</span>
                <span className="font-semibold">{segment.securityAdoption.toFixed(1)}%</span>
              </div>
              <Progress 
                value={(segment.securityAdoption / maxValue) * 100} 
                className="h-2"
              />
            </div>
          ))}
      </CardContent>
    </Card>
  );
}

// Helper functions

function calculateAverageLevel(byType: Record<string, Record<number, number>>): number {
  let totalWeight = 0;
  let totalCount = 0;
  Object.values(byType).forEach(dist => {
    Object.entries(dist).forEach(([level, count]) => {
      totalWeight += parseInt(level) * count;
      totalCount += count;
    });
  });
  return totalCount > 0 ? totalWeight / totalCount : 0;
}

function calculatePowerUserPercentage(byType: Record<string, Record<number, number>>): number {
  let powerUsers = 0;
  let total = 0;
  Object.values(byType).forEach(dist => {
    Object.entries(dist).forEach(([level, count]) => {
      if (parseInt(level) >= 4) powerUsers += count;
      total += count;
    });
  });
  return total > 0 ? (powerUsers / total) * 100 : 0;
}

function calculateActiveUsers(byType: Record<string, Record<number, number>>): number {
  let active = 0;
  Object.values(byType).forEach(dist => {
    Object.entries(dist).forEach(([level, count]) => {
      if (parseInt(level) > 0) active += count;
    });
  });
  return active;
}

function aggregateDistribution(byType: Record<string, Record<number, number>>): Record<number, number> {
  const result: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  Object.values(byType).forEach(dist => {
    Object.entries(dist).forEach(([level, count]) => {
      result[parseInt(level)] = (result[parseInt(level)] || 0) + count;
    });
  });
  return result;
}


