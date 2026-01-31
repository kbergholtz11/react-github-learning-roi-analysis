"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, Award, TrendingUp, Target, Loader2, BookOpen, ArrowRight, GitFork, Users, BarChart3 } from "lucide-react";
import { useMetrics, useJourney, useImpact, useSkillsCourses } from "@/hooks/use-data";
import Link from "next/link";

function getCompetencyLevel(score: number): string {
  if (score >= 80) return "Expert";
  if (score >= 60) return "Advanced";
  if (score >= 40) return "Intermediate";
  return "Beginner";
}

function getCompetencyColor(level: string): string {
  switch (level) {
    case "Expert": return "text-purple-600 bg-purple-500/10 dark:text-purple-400 dark:bg-purple-500/20";
    case "Advanced": return "text-blue-600 bg-blue-500/10 dark:text-blue-400 dark:bg-blue-500/20";
    case "Intermediate": return "text-green-600 bg-green-500/10 dark:text-green-400 dark:bg-green-500/20";
    default: return "text-muted-foreground bg-muted";
  }
}

export default function SkillsDashboardPage() {
  const { data: metrics, isLoading: metricsLoading } = useMetrics();
  const { data: journey, isLoading: journeyLoading } = useJourney();
  const { data: impact, isLoading: impactLoading } = useImpact();
  const { data: skillsData, isLoading: skillsLoading } = useSkillsCourses();
  
  const isLoading = metricsLoading || journeyLoading || impactLoading || skillsLoading;

  // Memoize expensive calculations - must be called before any early returns
  const { totalLearners, certified, certificationLevels, avgProficiency, stageImpact } = useMemo(() => {
    const total = metrics?.metrics?.totalLearners || 0;
    const certifiedCount = metrics?.metrics?.certifiedUsers || 0;
    const levels = {
      "0": metrics?.metrics?.prospectUsers || 0,
      "1": metrics?.metrics?.certifiedUsers || 0,
      "2+": (metrics?.metrics?.totalCertsEarned || 0) - (metrics?.metrics?.certifiedUsers || 0),
    };
    
    const stageImpactData = impact?.stageImpact || [];
    const proficiency = stageImpactData.length > 0
      ? Math.round(stageImpactData.reduce((sum: number, s: { avgUsageIncrease: number }) => sum + s.avgUsageIncrease, 0) / stageImpactData.length)
      : 0;
    
    return { 
      totalLearners: total, 
      certified: certifiedCount, 
      certificationLevels: levels, 
      avgProficiency: proficiency,
      stageImpact: stageImpactData,
    };
  }, [metrics, impact]);
  
  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading skills data">
        <div className="flex justify-between items-start">
          <div>
            <Skeleton className="h-8 w-72 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Skills Development Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive view of learner skills growth and product proficiency across the cohort
          </p>
        </div>
        <Link href="/skills/analytics">
          <Button variant="outline" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            View Skills Analytics
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* GitHub Skills Quick Stats */}
      {skillsData && (
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  GitHub Skills Courses
                </CardTitle>
                <CardDescription>Hands-on interactive learning from skills.github.com</CardDescription>
              </div>
              <Link href="/skills/analytics">
                <Button size="sm" className="gap-1">
                  Full Analytics
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{skillsData.totalCourses}</div>
                <div className="text-xs text-muted-foreground">Courses</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{(skillsData.uniqueKnownLearners || skillsData.totalUniqueLearners || 0).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Unique Learners</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{skillsData.completionRate}%</div>
                <div className="text-xs text-muted-foreground">Completion Rate</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{(skillsData.totalCommits || 0).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Commits</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">
                  {(skillsData.byCategory?.reduce((sum, c) => sum + c.totalForks, 0) || 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Total Forks</div>
              </div>
            </div>
            
            {/* Top Categories */}
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm font-medium mb-2">Top Categories</div>
              <div className="flex flex-wrap gap-2">
                {(skillsData.byCategory || []).slice(0, 5).map((cat) => (
                  <Badge key={cat.category} variant="secondary" className="gap-1">
                    {cat.category}
                    <span className="text-muted-foreground">({cat.knownLearners} learners)</span>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Adoption Rate</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              {avgProficiency}%
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={avgProficiency} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Certified Learners</CardDescription>
            <CardTitle className="text-2xl">{certified.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {((certified / totalLearners) * 100).toFixed(1)}% of total learners
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Multi-Certified</CardDescription>
            <CardTitle className="text-2xl">{(certificationLevels["2+"] || 0).toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Learners with 2+ certifications
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Learners</CardDescription>
            <CardTitle className="text-2xl">{totalLearners.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Across all skill levels
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stage Impact Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Skills by Journey Stage
          </CardTitle>
          <CardDescription>Product adoption and engagement metrics by learning stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stageImpact.map((stage: { stage: string; learners: number; avgUsageIncrease: number; platformTimeIncrease: number; topProduct: string }) => {
              return (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{stage.stage}</span>
                      <Badge className={`ml-2 ${getCompetencyColor(getCompetencyLevel(stage.avgUsageIncrease))}`}>
                        {getCompetencyLevel(stage.avgUsageIncrease)}
                      </Badge>
                    </div>
                    <span className="text-sm text-green-600">+{stage.avgUsageIncrease}% growth</span>
                  </div>
                  <Progress value={Math.min(stage.avgUsageIncrease, 100)} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {stage.learners.toLocaleString()} learners • Top: {stage.topProduct}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Certification Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Certification Distribution
            </CardTitle>
            <CardDescription>Learners by number of certifications earned</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(certificationLevels).map(([level, count]) => (
                <div key={level} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className={level === "2+" ? "bg-purple-600" : level === "1" ? "bg-blue-600" : "bg-gray-600"}>
                      {level} cert{level !== "1" && level !== "0" ? "s" : level === "1" ? "" : "s"}
                    </Badge>
                    <span className="font-medium">{level === "0" ? "No certification" : level === "1" ? "Single certified" : "Multi-certified"}</span>
                  </div>
                  <span className="font-bold">{(count as number).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Learning Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Learning Insights
            </CardTitle>
            <CardDescription>Key findings from the skills data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
                <h4 className="font-semibold text-green-700 dark:text-green-400">High Adoption</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {avgProficiency}% average adoption rate across all journey stages
                </p>
              </div>
              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
                <h4 className="font-semibold text-blue-700 dark:text-blue-400">Certified Population</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {certified.toLocaleString()} learners have earned certifications ({((certified / totalLearners) * 100).toFixed(1)}%)
                </p>
              </div>
              <div className="p-4 rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800">
                <h4 className="font-semibold text-purple-700 dark:text-purple-400">Multi-Certified</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {(certificationLevels["2+"] || 0).toLocaleString()} power users with multiple certifications
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
