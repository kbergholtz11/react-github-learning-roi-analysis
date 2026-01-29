"use client";

import { MetricCard, SimpleAreaChart, DonutChart } from "@/components/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  Users, 
  Zap, 
  Clock, 
  ArrowRight,
  CheckCircle2,
  Target,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImpact } from "@/hooks/use-data";

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-6 w-32" />
      </div>
      <Skeleton className="h-40" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

function ErrorState({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Failed to load impact data</h2>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <Button onClick={() => window.location.reload()}>Retry</Button>
    </div>
  );
}

export default function LearningImpactPage() {
  const { data, isLoading, error } = useImpact();

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error as Error} />;
  if (!data) return null;

  const { impactFlow, productAdoption, stageImpact, correlationData, roiBreakdown, metrics } = data;

  // Calculate impact score
  const impactScore = Math.min(100, Math.round(
    (metrics.avgUsageIncrease / 100) * 40 +
    (metrics.featuresAdopted / 5) * 30 +
    30
  ));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Impact</h1>
          <p className="text-muted-foreground">
            How learning translates to platform engagement and business outcomes
          </p>
        </div>
        <Badge variant="default" className="bg-gradient-to-r from-violet-500 to-purple-600">
          <Sparkles className="h-3 w-3 mr-1" />
          Impact Score: {impactScore}/100
        </Badge>
      </div>

      {/* Impact Flow Visualization */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Learning to Impact Flow
          </CardTitle>
          <CardDescription>
            The journey from learning investment to measurable outcomes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {/* Step 1: Learning Hours */}
            <div className="relative p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">
                Learning Investment
              </div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {impactFlow.learningHours.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">hours consumed</div>
              <ArrowRight className="absolute right-[-20px] top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground z-10" />
            </div>

            {/* Step 2: Skills Acquired */}
            <div className="relative p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <div className="text-xs font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-2">
                Skills Developed
              </div>
              <div className="text-3xl font-bold text-violet-600 dark:text-violet-400">
                {impactFlow.skillsAcquired.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">certifications earned</div>
              <ArrowRight className="absolute right-[-20px] top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground z-10" />
            </div>

            {/* Step 3: Product Adoption */}
            <div className="relative p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">
                Product Adoption
              </div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                +{impactFlow.productAdoption}%
              </div>
              <div className="text-sm text-muted-foreground">usage increase</div>
              <ArrowRight className="absolute right-[-20px] top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground z-10" />
            </div>

            {/* Step 4: Time on Platform */}
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-2">
                Platform Engagement
              </div>
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                +{impactFlow.timeOnPlatform}%
              </div>
              <div className="text-sm text-muted-foreground">time on platform</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Impact Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Learners"
          value={metrics.activeLearners.toLocaleString()}
          description="Enrolled in learning paths"
          trend={{ value: 18.2, isPositive: true }}
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="Avg Usage Increase"
          value={`+${metrics.avgUsageIncrease}%`}
          description="After completing courses"
          trend={{ value: 12.5, isPositive: true }}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          title="Features Adopted"
          value={metrics.featuresAdopted.toString()}
          description="New features per learner"
          trend={{ value: 8.3, isPositive: true }}
          icon={<Zap className="h-4 w-4" />}
        />
        <MetricCard
          title="Time to Value"
          value={`${metrics.timeToValue}%`}
          description="Faster onboarding"
          trend={{ value: 15.1, isPositive: true }}
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      {/* Learning Stage Impact Table */}
      <Card>
        <CardHeader>
          <CardTitle>Impact by Learning Stage</CardTitle>
          <CardDescription>
            How each stage of the learning journey correlates with platform engagement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stageImpact.map((stage, index) => (
              <div 
                key={stage.stage}
                className="flex items-center gap-4 p-4 rounded-lg bg-muted/50"
              >
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-semibold">{stage.stage}</span>
                      <span className="text-muted-foreground ml-2 text-sm">
                        {stage.learners.toLocaleString()} learners
                      </span>
                    </div>
                    <Badge variant="outline">{stage.topProduct}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Usage Increase</div>
                      <div className="flex items-center gap-2">
                        <Progress value={stage.avgUsageIncrease} className="h-2" />
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          +{stage.avgUsageIncrease}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Platform Time</div>
                      <div className="flex items-center gap-2">
                        <Progress value={stage.platformTimeIncrease} className="h-2" />
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          +{stage.platformTimeIncrease}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Correlation Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Learning ↔ Usage Correlation</CardTitle>
            <CardDescription>
              Tracking the relationship between learning hours and platform engagement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleAreaChart 
              data={correlationData}
              dataKey="productUsage"
              secondaryDataKey="platformTime"
              color="#22c55e"
              secondaryColor="#3b82f6"
            />
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Product Usage %</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">Platform Time %</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ROI Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>ROI Breakdown</CardTitle>
            <CardDescription>
              Where the value of learning is realized
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={roiBreakdown} />
          </CardContent>
        </Card>
      </div>

      {/* Product Adoption Before/After */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Product Adoption: Before vs After Learning
          </CardTitle>
          <CardDescription>
            Adoption rates for key GitHub products before and after completing learning paths
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {productAdoption.map((product) => {
              const increase = product.before > 0 
                ? Math.round(((product.after - product.before) / product.before) * 100)
                : product.after > 0 ? 100 : 0;
              const maxValue = Math.max(product.before, product.after);
              
              return (
                <div key={product.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{product.name}</span>
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                      +{increase}% increase
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground w-16">Before</span>
                        <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-muted-foreground/40 rounded-full"
                            style={{ width: `${maxValue > 0 ? (product.before / maxValue) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-12">{product.before}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-16">After</span>
                        <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                            style={{ width: `${maxValue > 0 ? (product.after / maxValue) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-12">{product.after}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
        <CardHeader>
          <CardTitle className="text-green-700 dark:text-green-400">Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Strong Correlation</div>
                <div className="text-sm text-muted-foreground">
                  Certified users show {metrics.avgUsageIncrease}% higher product usage
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Multi-Product Adoption</div>
                <div className="text-sm text-muted-foreground">
                  Learners adopt {metrics.featuresAdopted} features on average
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Faster Onboarding</div>
                <div className="text-sm text-muted-foreground">
                  New users with training reach proficiency {Math.abs(metrics.timeToValue)}% faster
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
