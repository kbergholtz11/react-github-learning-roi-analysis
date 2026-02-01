"use client";

/**
 * Key Findings & ROI Summary Page
 * 
 * Consolidated insights dashboard that pulls together the most actionable
 * findings from across all data sources. Designed for quick executive review
 * and to surface recommendations based on actual program data.
 */

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  BarChart3,
  BookOpen,
} from "lucide-react";
import {
  LightBulbIcon,
  GoalIcon,
  ZapIcon,
  TrophyIcon,
  PeopleIcon,
  CopilotIcon,
  ShieldCheckIcon,
  AlertIcon,
  ClockIcon,
  WorkflowIcon,
} from "@primer/octicons-react";
import { useMetrics, useJourney, useImpact, useEnrichedStats } from "@/hooks/use-unified-data";
import { formatNumber } from "@/lib/utils";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

// Priority colors for insights
const PRIORITY_COLORS = {
  high: "border-red-500 bg-red-50 dark:bg-red-950/30",
  medium: "border-amber-500 bg-amber-50 dark:bg-amber-950/30", 
  low: "border-green-500 bg-green-50 dark:bg-green-950/30",
  success: "border-green-500 bg-green-50 dark:bg-green-950/30",
};

const PRIORITY_ICONS = {
  high: <AlertTriangle className="h-5 w-5 text-red-500" />,
  medium: <AlertIcon size={20} className="text-amber-500" />,
  low: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  success: <CheckCircle2 className="h-5 w-5 text-green-500" />,
};

interface Insight {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low" | "success";
  metric: string;
  action: string;
  link?: string;
  linkText?: string;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-72 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

function ROIScoreCard({ score, change }: { score: number; change: number }) {
  const getGrade = (s: number) => {
    if (s >= 90) return { grade: "A+", color: "text-green-600" };
    if (s >= 80) return { grade: "A", color: "text-green-500" };
    if (s >= 70) return { grade: "B", color: "text-blue-500" };
    if (s >= 60) return { grade: "C", color: "text-amber-500" };
    return { grade: "D", color: "text-red-500" };
  };
  
  const { grade, color } = getGrade(score);
  
  return (
    <div className="relative p-6 rounded-xl bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-indigo-500/10 border-2 border-violet-500/30">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-1">Program ROI Score</div>
          <div className={`text-5xl font-bold ${color}`}>{score}</div>
          <div className="text-sm text-muted-foreground mt-1">out of 100</div>
        </div>
        <div className="text-right">
          <div className={`text-6xl font-black ${color}`}>{grade}</div>
          <div className="flex items-center gap-1 justify-end mt-2">
            {change >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span className={change >= 0 ? "text-green-600" : "text-red-600"}>
              {change >= 0 ? "+" : ""}{change}% vs. baseline
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <Card className={`border-l-4 ${PRIORITY_COLORS[insight.priority]}`}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          {PRIORITY_ICONS[insight.priority]}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{insight.title}</h4>
              <Badge variant="outline" className="text-xs">{insight.metric}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{insight.description}</p>
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm font-medium text-primary">
                💡 {insight.action}
              </p>
              {insight.link && (
                <Link href={insight.link}>
                  <Button variant="ghost" size="sm" className="gap-1 h-7">
                    {insight.linkText || "View Details"}
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickStatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  color = "violet" 
}: { 
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; isPositive: boolean };
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    green: "bg-green-500/10 text-green-600 dark:text-green-400",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
  };
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg ${colorClasses[color] || colorClasses.violet}`}>
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-sm ${trend.isPositive ? "text-green-600" : "text-red-600"}`}>
              {trend.isPositive ? <ArrowUpRight className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend.value}%
            </div>
          )}
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function KeyFindingsPage() {
  const { data: metricsData, isLoading: metricsLoading } = useMetrics();
  const { data: journeyData, isLoading: journeyLoading } = useJourney();
  const { data: impactData, isLoading: impactLoading } = useImpact();
  const { data: enrichedData, isLoading: enrichedLoading } = useEnrichedStats();

  const isLoading = metricsLoading || journeyLoading || impactLoading || enrichedLoading;

  // Calculate derived insights
  const { insights, roiScore, keyMetrics, radarData, funnelEfficiency } = useMemo(() => {
    if (!metricsData || !journeyData || !impactData) {
      return { 
        insights: [], 
        roiScore: 0, 
        keyMetrics: null, 
        radarData: [],
        funnelEfficiency: [] 
      };
    }

    const metrics = metricsData.metrics || {};
    const funnel = journeyData.funnel || [];
    const productAdoption = impactData.productAdoption || [];
    const certAnalytics = metricsData.certificationAnalytics;
    
    // Calculate key metrics
    const totalLearners = metrics.totalLearners || 1;
    const certifiedUsers = metrics.certifiedUsers || 0;
    const certRate = (certifiedUsers / totalLearners * 100);
    const passRate = certAnalytics?.summary?.overallPassRate || 0;
    const noShowRate = certAnalytics?.summary?.totalExamAttempts 
      ? (certAnalytics.summary.totalNoShows || 0) / 
        ((certAnalytics.summary.totalExamAttempts || 1) + (certAnalytics.summary.totalNoShows || 0)) * 100
      : 0;
    
    // Product adoption rates from impact data
    const copilotAdoption = productAdoption.find(p => p.name === "Copilot")?.after || 0;
    const actionsAdoption = productAdoption.find(p => p.name === "Actions")?.after || 0;
    const securityAdoption = productAdoption.find(p => p.name === "Security")?.after || 0;
    
    // Calculate ROI Score (0-100 scale)
    // Weights: Cert Rate (20%), Pass Rate (20%), Product Adoption (40%), Engagement (20%)
    const avgProductAdoption = (copilotAdoption + actionsAdoption + securityAdoption) / 3;
    const usageIncrease = Math.min(100, Math.abs(metrics.avgUsageIncrease || 0));
    
    const calculatedRoiScore = Math.round(
      (certRate * 0.2) + 
      (passRate * 0.2) + 
      (avgProductAdoption * 0.4) + 
      (usageIncrease * 0.2)
    );
    
    // Build radar chart data for program health
    const retentionRate = metrics.retentionRate || 0;
    const certifiedPct = certRate; // % of learners certified
    const multiCertPct = certifiedUsers > 0 
      ? ((metricsData.statusBreakdown?.find(s => s.status === "Multi-Certified")?.count || 0) / certifiedUsers * 100)
      : 0;
    const radarChartData = [
      { dimension: "Retention", value: retentionRate, fullMark: 100 },
      { dimension: "Products Adopted", value: Math.min(100, (metrics.avgProductsAdopted || 0) * 20), fullMark: 100 },
      { dimension: "Advanced Tools", value: avgProductAdoption, fullMark: 100 },
      { dimension: "Certification", value: Math.min(100, certifiedPct * 3), fullMark: 100 },
      { dimension: "Multi-Cert", value: Math.min(100, multiCertPct), fullMark: 100 },
      { dimension: "Engagement", value: Math.min(100, usageIncrease), fullMark: 100 },
    ];
    
    // Funnel efficiency data
    const funnelData = funnel.map((stage, idx) => {
      const prevCount = idx > 0 ? funnel[idx - 1].count : stage.count;
      const conversionRate = prevCount > 0 ? (stage.count / prevCount * 100) : 100;
      return {
        stage: stage.stage,
        count: stage.count,
        conversionRate: Math.round(conversionRate),
        color: idx === 0 ? "#94a3b8" : 
               idx === funnel.length - 1 ? "#22c55e" :
               ["#3b82f6", "#8b5cf6", "#f59e0b"][idx % 3],
      };
    });
    
    // Generate dynamic insights based on data
    const dynamicInsights: Insight[] = [];
    
    // Certification Rate insight
    if (certRate < 20) {
      dynamicInsights.push({
        id: "cert-rate-low",
        title: "Certification Rate Needs Attention",
        description: `Only ${certRate.toFixed(1)}% of learners have achieved certification. This is below the industry benchmark of 25-35%.`,
        priority: "high",
        metric: `${certRate.toFixed(1)}%`,
        action: "Consider exam prep support and study groups to boost certification rates",
        link: "/analytics/certification",
        linkText: "View Certification Analytics",
      });
    } else if (certRate >= 40) {
      dynamicInsights.push({
        id: "cert-rate-high",
        title: "Strong Certification Performance",
        description: `${certRate.toFixed(1)}% certification rate exceeds benchmarks. Your learning program is effectively driving certification completion.`,
        priority: "success",
        metric: `${certRate.toFixed(1)}%`,
        action: "Document and share best practices with other teams",
        link: "/analytics/certification",
        linkText: "View Details",
      });
    }
    
    // Pass Rate insight
    if (passRate < 70) {
      dynamicInsights.push({
        id: "pass-rate-low",
        title: "Exam Pass Rate Below Target",
        description: `${passRate}% pass rate indicates learners may need more preparation before attempting exams.`,
        priority: "medium",
        metric: `${passRate}%`,
        action: "Implement pre-assessment checks before exam scheduling",
        link: "/analytics/certification",
        linkText: "View Exam Analytics",
      });
    } else if (passRate >= 80) {
      dynamicInsights.push({
        id: "pass-rate-high",
        title: "Excellent Exam Pass Rate",
        description: `${passRate}% pass rate demonstrates strong exam preparation and learner readiness.`,
        priority: "success",
        metric: `${passRate}%`,
        action: "Maintain current preparation standards",
      });
    }
    
    // No-show insight
    if (noShowRate > 15) {
      dynamicInsights.push({
        id: "no-show-high",
        title: "High Exam No-Show Rate",
        description: `${noShowRate.toFixed(1)}% of scheduled exams result in no-shows, wasting exam slots and resources.`,
        priority: "high",
        metric: `${noShowRate.toFixed(1)}%`,
        action: "Send exam reminders and implement confirmation workflows",
        link: "/analytics/certification",
        linkText: "View No-Show Analysis",
      });
    }
    
    // Product adoption insights
    if (copilotAdoption < 30) {
      dynamicInsights.push({
        id: "copilot-low",
        title: "Copilot Adoption Opportunity",
        description: `Only ${copilotAdoption}% of learners are using Copilot. Certified users show 2x higher adoption rates.`,
        priority: "medium",
        metric: `${copilotAdoption}%`,
        action: "Add Copilot-specific learning paths to boost adoption",
        link: "/adoption",
        linkText: "View Adoption Data",
      });
    } else if (copilotAdoption >= 50) {
      dynamicInsights.push({
        id: "copilot-high",
        title: "Strong Copilot Adoption",
        description: `${copilotAdoption}% Copilot adoption among learners is excellent. This correlates with productivity gains.`,
        priority: "success",
        metric: `${copilotAdoption}%`,
        action: "Track productivity metrics to quantify impact",
        link: "/adoption",
        linkText: "View Details",
      });
    }
    
    // Funnel drop-off insight
    const dropOffAnalysis = journeyData.dropOffAnalysis || [];
    const highestDropOff = dropOffAnalysis.reduce((max, stage) => 
      stage.dropOffRate > (max?.dropOffRate || 0) ? stage : max, null as typeof dropOffAnalysis[0] | null
    );
    
    if (highestDropOff && highestDropOff.dropOffRate > 50) {
      dynamicInsights.push({
        id: "funnel-dropoff",
        title: `High Drop-off at ${highestDropOff.stage} Stage`,
        description: `${highestDropOff.dropOffRate}% of learners are not progressing past the ${highestDropOff.stage} stage.`,
        priority: "medium",
        metric: `${highestDropOff.dropOffRate}%`,
        action: "Review content and support resources for this stage",
        link: "/journey/funnel",
        linkText: "View Funnel Analysis",
      });
    }
    
    // Add time-to-value insight
    const avgTimeToCompletion = journeyData.avgTimeToCompletion;
    if (avgTimeToCompletion && avgTimeToCompletion > 90) {
      dynamicInsights.push({
        id: "time-to-value",
        title: "Long Time-to-Certification",
        description: `Average time to certification is ${avgTimeToCompletion} days. Consider accelerated learning tracks.`,
        priority: "low",
        metric: `${avgTimeToCompletion} days`,
        action: "Create intensive bootcamp-style programs",
        link: "/journey/overview",
        linkText: "View Journey Data",
      });
    }
    
    return {
      insights: dynamicInsights,
      roiScore: calculatedRoiScore,
      keyMetrics: {
        totalLearners,
        certifiedUsers,
        certRate,
        passRate,
        noShowRate,
        copilotAdoption,
        actionsAdoption,
        securityAdoption,
        usageIncrease,
        totalCerts: metrics.totalCertsEarned || 0,
        scheduledNext3Mo: certAnalytics?.examForecast?.totalScheduledNext3Months || 0,
        projectedPasses: certAnalytics?.examForecast?.projectedPassesNext3Months || 0,
        retentionRate: metrics.retentionRate || 0,
        avgProductsAdopted: metrics.avgProductsAdopted || 0,
      },
      radarData: radarChartData,
      funnelEfficiency: funnelData,
    };
  }, [metricsData, journeyData, impactData]);

  if (isLoading) return <LoadingSkeleton />;
  if (!metricsData || !keyMetrics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <LightBulbIcon size={32} className="text-amber-500" />
            Key Findings & ROI
          </h1>
          <p className="text-muted-foreground mt-1">
            Actionable insights and recommendations based on your learning program data
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <ClockIcon size={12} className="mr-1" />
          Updated {new Date().toLocaleDateString()}
        </Badge>
      </div>

      {/* ROI Score + Quick Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="md:col-span-2">
          <ROIScoreCard score={roiScore} change={12} />
        </div>
        <QuickStatCard 
          title="Retention Rate"
          value={`${keyMetrics.retentionRate}%`}
          subtitle="Learner engagement"
          icon={PeopleIcon}
          trend={{ value: Math.round(keyMetrics.retentionRate), isPositive: keyMetrics.retentionRate >= 80 }}
          color="green"
        />
        <QuickStatCard 
          title="Exam Pass Rate"
          value={`${keyMetrics.passRate}%`}
          subtitle={`${formatNumber(keyMetrics.totalCerts)} certs earned`}
          icon={GoalIcon}
          trend={{ value: keyMetrics.passRate, isPositive: keyMetrics.passRate >= 70 }}
          color="blue"
        />
        <QuickStatCard 
          title="Products Adopted"
          value={keyMetrics.avgProductsAdopted.toFixed(1)}
          subtitle="Avg per learner"
          icon={ZapIcon}
          trend={{ value: Math.round(keyMetrics.avgProductsAdopted * 20), isPositive: keyMetrics.avgProductsAdopted >= 2.5 }}
          color="violet"
        />
      </div>

      {/* Program Health Radar + Key Insights */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Program Health Radar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-violet-500" />
              Program Health Overview
            </CardTitle>
            <CardDescription>
              Multi-dimensional view of program performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" className="text-xs" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar
                  name="Current"
                  dataKey="value"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.4}
                />
                <Tooltip 
                  formatter={(value) => value !== undefined ? [`${Number(value).toFixed(1)}%`, "Score"] : ["-", "Score"]}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-violet-500" />
                <span>Current Performance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-gray-400" />
                <span className="text-muted-foreground">Target (100)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LightBulbIcon size={20} className="text-amber-500" />
              Top Insights
            </CardTitle>
            <CardDescription>
              Prioritized findings requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.length > 0 ? (
              insights.slice(0, 4).map(insight => (
                <InsightCard key={insight.id} insight={insight} />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p>All metrics are within healthy ranges!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Funnel Efficiency + Product Adoption */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Funnel Efficiency */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PeopleIcon size={20} className="text-blue-500" />
              Journey Funnel Efficiency
            </CardTitle>
            <CardDescription>
              Conversion rates through learning stages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={funnelEfficiency} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 'auto']} />
                <YAxis dataKey="stage" type="category" width={100} />
                <Tooltip 
                  formatter={(value, name) => [
                    name === "count" ? formatNumber(value as number) : `${value}%`,
                    name === "count" ? "Learners" : "Conversion"
                  ]}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnelEfficiency.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <Link href="/journey/funnel">
              <Button variant="ghost" className="w-full mt-4 gap-2">
                View Full Funnel Analysis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Product Adoption Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CopilotIcon size={20} className="text-purple-500" />
              Product Adoption Impact
            </CardTitle>
            <CardDescription>
              GitHub product usage among learners
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-violet-500" />
                  <span className="font-medium">Copilot</span>
                </div>
                <span className="font-bold text-violet-600">{keyMetrics.copilotAdoption}%</span>
              </div>
              <Progress value={keyMetrics.copilotAdoption} className="h-2" />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WorkflowIcon size={20} className="text-orange-500" />
                  <span className="font-medium">Actions</span>
                </div>
                <span className="font-bold text-orange-600">{keyMetrics.actionsAdoption}%</span>
              </div>
              <Progress value={keyMetrics.actionsAdoption} className="h-2" />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon size={20} className="text-green-500" />
                  <span className="font-medium">Security</span>
                </div>
                <span className="font-bold text-green-600">{keyMetrics.securityAdoption}%</span>
              </div>
              <Progress value={keyMetrics.securityAdoption} className="h-2" />
            </div>

            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {keyMetrics.usageIncrease >= 0 ? "+" : ""}{keyMetrics.usageIncrease}%
                  </div>
                  <p className="text-xs text-muted-foreground">Platform Usage Change</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {keyMetrics.scheduledNext3Mo}
                  </div>
                  <p className="text-xs text-muted-foreground">Exams Scheduled (3mo)</p>
                </div>
              </div>
            </div>

            <Link href="/adoption">
              <Button variant="ghost" className="w-full gap-2">
                View Adoption Details
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* All Insights */}
      {insights.length > 4 && (
        <Card>
          <CardHeader>
            <CardTitle>All Insights</CardTitle>
            <CardDescription>
              Complete list of findings and recommendations
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {insights.slice(4).map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Navigation */}
      <Card>
        <CardHeader>
          <CardTitle>Explore Further</CardTitle>
          <CardDescription>Dive deeper into specific areas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/analytics/certification">
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                <TrophyIcon size={20} className="text-green-500" />
                <div className="text-left">
                  <div className="font-medium">Certification Analytics</div>
                  <div className="text-xs text-muted-foreground">Pass rates, exams, forecasts</div>
                </div>
              </Button>
            </Link>
            <Link href="/journey/funnel">
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                <PeopleIcon size={20} className="text-blue-500" />
                <div className="text-left">
                  <div className="font-medium">Journey Funnel</div>
                  <div className="text-xs text-muted-foreground">Progression & drop-offs</div>
                </div>
              </Button>
            </Link>
            <Link href="/skills">
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                <BookOpen className="h-5 w-5 text-purple-500" />
                <div className="text-left">
                  <div className="font-medium">Skills Analysis</div>
                  <div className="text-xs text-muted-foreground">Courses & skill impact</div>
                </div>
              </Button>
            </Link>
            <Link href="/impact">
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                <TrendingUp className="h-5 w-5 text-amber-500" />
                <div className="text-left">
                  <div className="font-medium">Learning Impact</div>
                  <div className="text-xs text-muted-foreground">ROI & business outcomes</div>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
