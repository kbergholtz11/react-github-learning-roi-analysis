"use client";

import { MetricCard } from "@/components/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  TrendingUp, 
  Zap, 
  Award, 
  BookOpen,
  Code2,
  Target,
  ArrowUpRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSkillJourney, useTopSkilledLearners } from "@/hooks/use-unified-data";

export default function JourneyOverviewPage() {
  const { data: skillData, isLoading: skillLoading } = useSkillJourney();
  const { data: topLearners, isLoading: topLoading } = useTopSkilledLearners(5);

  const isLoading = skillLoading || topLoading;

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading journey overview">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-72 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const growthMetrics = skillData?.growthMetrics;
  const dimensionAverages = skillData?.dimensionAverages || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Skill Development Journey</h1>
          <p className="text-muted-foreground">
            Track learner skill growth through learning, product usage, and certification
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Skill-based model
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Learners"
          value={skillData?.totalLearners?.toLocaleString() || "0"}
          description="Across all skill levels"
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="Avg Skill Score"
          value={skillData?.avgSkillScore?.toFixed(1) || "0"}
          description="Out of 100 points"
          icon={<Target className="h-4 w-4" />}
        />
        <MetricCard
          title="Active Learners"
          value={growthMetrics?.active_30_days?.toLocaleString() || "0"}
          description={`${growthMetrics?.active_percentage?.toFixed(1) || 0}% active in 30 days`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          title="With Certifications"
          value={growthMetrics?.with_certifications?.toLocaleString() || "0"}
          description={`${growthMetrics?.cert_percentage?.toFixed(1) || 0}% of learners`}
          icon={<Award className="h-4 w-4" />}
        />
      </div>

      {/* Skill Funnel */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Skill Development Funnel
            </CardTitle>
            <CardDescription>
              Progression based on learning, product usage, and certification (not just certs!)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {skillData?.funnel?.slice().reverse().map((stage) => {
                // Use the maximum count across all stages for proper bar scaling
                const maxCount = Math.max(...(skillData.funnel?.map(s => s.count) || [1]));
                const barPercentage = (stage.count / maxCount) * 100;
                
                return (
                  <div key={stage.level} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="font-medium">{stage.level}</span>
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          ({stage.description})
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          {stage.count.toLocaleString()}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(stage.percentage)}%
                        </Badge>
                        <span className="text-xs text-muted-foreground w-16 text-right">
                          Avg: {stage.avgScore}
                        </span>
                      </div>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${barPercentage}%`, 
                          backgroundColor: stage.color 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Dimension Breakdown */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Skill Dimensions</CardTitle>
            <CardDescription>
              Average scores by skill dimension (higher is better)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(dimensionAverages).map(([dimension, score]) => {
                const icons: Record<string, React.ReactNode> = {
                  "learning": <BookOpen className="h-4 w-4" />,
                  "product_usage": <Code2 className="h-4 w-4" />,
                  "certification": <Award className="h-4 w-4" />,
                  "consistency": <TrendingUp className="h-4 w-4" />,
                  "growth": <ArrowUpRight className="h-4 w-4" />,
                };
                const displayNames: Record<string, string> = {
                  "learning": "Learning",
                  "product_usage": "Product Usage",
                  "certification": "Certification",
                  "consistency": "Consistency",
                  "growth": "Growth",
                };
                const weights = skillData?.weights || {};
                const weight = weights[dimension] || 0;
                const displayName = displayNames[dimension] || dimension;
                const numericScore = typeof score === 'number' ? score : 0;
                
                return (
                  <div key={dimension} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {icons[dimension] || <Target className="h-4 w-4" />}
                        <span className="text-sm font-medium">{displayName}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(weight * 100).toFixed(0)}% weight)
                        </span>
                      </div>
                      <span className="text-sm font-bold">{numericScore.toFixed(1)}/100</span>
                    </div>
                    <Progress value={numericScore} className="h-2" />
                  </div>
                );
              })}
            </div>
            
            {/* Weight explanation */}
            <div className="mt-6 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Skill Score = </strong>
                Learning (25%) + Product Usage (35%) + Certification (15%) + 
                Consistency (15%) + Growth (10%)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Skilled Learners & Growth */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Top Skilled Learners</CardTitle>
            <CardDescription>
              Highest skill scores based on learning + usage + certification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topLearners?.learners?.map((learner, index) => (
                <div 
                  key={learner.handle} 
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{learner.handle}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{learner.learningHours.toFixed(0)}h learning</span>
                        <span>•</span>
                        <span>{learner.productUsageHours.toFixed(0)}h usage</span>
                        <span>•</span>
                        <span>{learner.totalCerts} certs</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={learner.skillLevel === "Expert" ? "default" : 
                               learner.skillLevel === "Advanced" ? "secondary" : "outline"}
                    >
                      {learner.skillLevel}
                    </Badge>
                    <div className="text-right">
                      <p className="font-bold text-lg">{learner.skillScore}</p>
                      <p className="text-xs text-muted-foreground">score</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Growth Indicators</CardTitle>
            <CardDescription>
              Learner engagement and trajectory metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Active in last 30 days */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Active (30 days)</span>
                  <span className="font-medium">
                    {growthMetrics?.active_30_days?.toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={growthMetrics?.active_percentage || 0} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {growthMetrics?.active_percentage?.toFixed(1)}% of all learners
                </p>
              </div>

              {/* Growing learners */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Growing Trajectory</span>
                  <span className="font-medium">
                    {growthMetrics?.growing_learners?.toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={growthMetrics?.growing_percentage || 0} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {growthMetrics?.growing_percentage?.toFixed(1)}% showing improvement
                </p>
              </div>

              {/* With certifications */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Certified</span>
                  <span className="font-medium">
                    {growthMetrics?.with_certifications?.toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={growthMetrics?.cert_percentage || 0} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {growthMetrics?.cert_percentage?.toFixed(1)}% have certifications
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
