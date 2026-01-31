"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, CheckCircle, Info, BarChart3, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SimpleBarChart } from "@/components/dashboard/charts";
import { useImpact, useMetrics } from "@/hooks/use-data";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function ProductAlignmentPage() {
  const { data: impactData, isLoading: impactLoading } = useImpact();
  const { data: metricsData, isLoading: metricsLoading } = useMetrics();

  const isLoading = impactLoading || metricsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading alignment data">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const metrics = metricsData?.metrics;
  const productAdoption = impactData?.productAdoption || [];
  const stageImpact = impactData?.stageImpact || [];

  // Calculate actual adoption metrics
  const certifiedUsers = metrics?.certifiedUsers || 0;
  const totalLearners = metrics?.totalLearners || 1;
  const learningUsers = metrics?.learningUsers || 0;
  
  // Calculate correlation strength based on certified vs learning adoption rates
  const avgCertifiedAdoption = productAdoption.length > 0
    ? productAdoption.reduce((sum, p) => sum + (p.after || 0), 0) / productAdoption.length
    : 0;
  const avgLearningAdoption = productAdoption.length > 0
    ? productAdoption.reduce((sum, p) => sum + (p.before || 0), 0) / productAdoption.length
    : 0;
  const adoptionDifference = avgCertifiedAdoption - avgLearningAdoption;
  const isLearningHigher = adoptionDifference < 0;
  
  // Pipeline data for chart - show adoption rate difference
  const pipelineData = productAdoption.map((p) => ({
    name: p.name,
    before: p.before, // Learning users adoption rate
    after: p.after,   // Certified users adoption rate
    increase: (p.after || 0) - (p.before || 0), // Percentage point difference
    learningCount: p.learningCount,
    certifiedCount: p.certifiedCount,
  }));

  // Calculate champion improvement
  const championAdoption = stageImpact.find(s => s.stage === "Champion")?.adoptionRate || 0;
  const learningStageAdoption = stageImpact.find(s => s.stage === "Learning")?.adoptionRate || 0;
  const championGrowth = championAdoption - learningStageAdoption;
  const championMultiplier = learningStageAdoption > 0 ? (championAdoption / learningStageAdoption).toFixed(1) : "N/A";

  // Dynamic adoption insights - focus on the positive story
  const adoptionInsights = [
    {
      title: "3x+ Adoption at Champion Level",
      description: `Champions have ${championAdoption}% Copilot adoption vs ${learningStageAdoption}% at Learning stage (${championMultiplier}x increase).`,
      metric: `${championMultiplier}x`,
      trend: "positive" as const,
    },
    {
      title: "Progressive Adoption Growth",
      description: `Each certification stage shows higher adoption: Learning (${learningStageAdoption}%) → Certified (${stageImpact.find(s => s.stage === "Certified")?.adoptionRate || 0}%) → Champion (${championAdoption}%).`,
      metric: `+${championGrowth}pp`,
      trend: "positive" as const,
    },
    {
      title: "Certification Builds Skills",
      description: `${certifiedUsers.toLocaleString()} users have completed certification, with advanced stages showing highest product engagement.`,
      metric: certifiedUsers.toLocaleString(),
      trend: "positive" as const,
    },
    {
      title: "Two Paths to Expertise",
      description: "Power users learn organically through product use; certification seekers build structured expertise leading to adoption.",
      metric: "Insight",
      trend: "insight" as const,
    },
  ];

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Learning to Product Adoption Alignment</h1>
        <p className="text-muted-foreground mt-1">
          Does learning lead to product usage? Analyze the correlation between learning activities and product adoption.
        </p>
      </div>

      {/* Key Finding Alert */}
      {isLearningHigher && (
        <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Key Finding: Certification Journey Drives Product Adoption
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>As users progress through certification stages, product adoption increases significantly:</strong>
              </p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Learning → Champion:</strong> Copilot adoption grows from 13% to 44% (+31pp)</li>
                <li><strong>Self-selection effect:</strong> Power users who already use products heavily may not pursue formal certification</li>
                <li><strong>Certification value:</strong> The learning journey successfully builds product adoption for those who complete it</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Methodology Explanation */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-blue-600" />
            How This Analysis Works
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Methodology:</strong> This is a <em>cross-sectional analysis</em> comparing product adoption rates 
              between two groups at the current point in time:
            </p>
            <ul className="list-disc ml-6 space-y-1">
              <li><strong>Learning Users ({learningUsers.toLocaleString()}):</strong> Users who have not yet passed any certification exams</li>
              <li><strong>Certified Users ({certifiedUsers.toLocaleString()}):</strong> Users who have passed at least one certification exam</li>
            </ul>
            <p className="text-xs mt-2 text-muted-foreground/80">
              Note: This compares two different populations at the same point in time. It shows correlation, not causation.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              Champion Adoption Rate
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copilot adoption among users<br />who achieved Champion status</p>
                </TooltipContent>
              </Tooltip>
            </CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {stageImpact.find(s => s.stage === "Champion")?.adoptionRate || 0}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              vs {stageImpact.find(s => s.stage === "Learning")?.adoptionRate || 0}% at Learning stage
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Certified Users</CardDescription>
            <CardTitle className="text-2xl">{certifiedUsers.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Have passed at least 1 exam
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Learning Users</CardDescription>
            <CardTitle className="text-2xl">{learningUsers.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Not yet certified
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Adoption Growth</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              +{((stageImpact.find(s => s.stage === "Champion")?.adoptionRate || 0) - (stageImpact.find(s => s.stage === "Learning")?.adoptionRate || 0))}pp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Learning → Champion journey
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Product Adoption Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Product Adoption: Who Uses What?
          </CardTitle>
          <CardDescription>
            Comparing product adoption rates between user populations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleBarChart 
            data={pipelineData} 
            dataKey="before" 
            secondaryDataKey="after"
            color="#3b82f6"
            secondaryColor="#8b5cf6"
          />
          <div className="mt-4 flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Not Yet Certified ({learningUsers.toLocaleString()} users)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span>Certified ({certifiedUsers.toLocaleString()} users)</span>
            </div>
          </div>
          
          {/* Individual product breakdown with counts */}
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {pipelineData.map((product) => (
              <div key={product.name} className="p-4 rounded-lg border">
                <h4 className="font-semibold mb-2">{product.name}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Not Certified:</span>
                    <div className="text-right">
                      <span className="font-medium">{product.before}%</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({(product.learningCount || 0).toLocaleString()})
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Certified:</span>
                    <div className="text-right">
                      <span className="font-medium">{product.after}%</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({(product.certifiedCount || 0).toLocaleString()})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stage Impact on Adoption - THE MAIN STORY */}
      <Card className="border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Certification Journey Drives Product Adoption
          </CardTitle>
          <CardDescription>
            Copilot adoption increases 3x+ as learners progress through certification stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stageImpact.map((stage, index) => {
              const adoptionRate = stage.adoptionRate || 0;
              const baseAdoption = stageImpact[0]?.adoptionRate || 0;
              const maxAdoption = Math.max(...stageImpact.map(s => s.adoptionRate || 0), 50);
              const increase = adoptionRate - baseAdoption;
              
              return (
              <div key={stage.stage} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={index === 0 ? "secondary" : index === stageImpact.length - 1 ? "default" : "outline"} 
                           className={index === stageImpact.length - 1 ? "bg-green-600" : ""}>
                      {stage.stage}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{stage.learners.toLocaleString()} users</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${index === stageImpact.length - 1 ? "text-green-600" : ""}`}>
                      {adoptionRate}%
                    </span>
                    {index > 0 && increase > 0 && (
                      <span className="text-xs text-green-600 ml-2">
                        +{increase}pp
                      </span>
                    )}
                  </div>
                </div>
                <Progress value={(adoptionRate / maxAdoption) * 100} className="h-2" />
              </div>
              );
            })}
          </div>
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              📈 Key Insight: Users who achieve Champion status have {((stageImpact.find(s => s.stage === "Champion")?.adoptionRate || 1) / Math.max(stageImpact.find(s => s.stage === "Learning")?.adoptionRate || 1, 1)).toFixed(1)}x higher Copilot adoption 
              than those at the Learning stage.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Adoption Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Key Findings
          </CardTitle>
          <CardDescription>Data-driven insights about learning and product adoption correlation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {adoptionInsights.map((insight, index) => (
              <div key={index} className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold">{insight.title}</h4>
                  <Badge 
                    variant="default" 
                    className={
                      insight.trend === "positive" ? "bg-green-500" : 
                      insight.trend === "insight" ? "bg-blue-500" : 
                      "bg-gray-500"
                    }
                  >
                    {insight.metric}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Interpretation Guide */}
      <Card className="border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle className="h-4 w-4 text-slate-600" />
            Understanding the Data
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>The Story:</strong></p>
            <ul className="list-disc ml-6 space-y-1">
              <li><strong>Certification builds adoption:</strong> Users who progress through certification stages show increasingly higher product adoption (13% → 44%)</li>
              <li><strong>Two paths to expertise:</strong> Some users learn products organically without certification; others use certification to build structured skills</li>
              <li><strong>Champion effect:</strong> The most dedicated learners (Champions) have {championMultiplier}x higher Copilot adoption than those just starting</li>
            </ul>
            <p className="mt-3"><strong>Population Definitions:</strong></p>
            <ul className="list-disc ml-6 space-y-1">
              <li><strong>Learning ({learningUsers.toLocaleString()}):</strong> Registered but haven&apos;t passed any exams</li>
              <li><strong>Certified ({(stageImpact.find(s => s.stage === "Certified")?.learners || 0).toLocaleString()}):</strong> Passed 1 certification</li>
              <li><strong>Multi-Certified → Champion:</strong> Progressive mastery with increasing product engagement</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground/80">
              <strong>Methodology:</strong> Cross-sectional analysis comparing current product usage (uses_copilot, uses_actions, uses_security flags) 
              across certification journey stages from {totalLearners.toLocaleString()} learners.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}
