"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, Target, Zap, Award, Rocket, ChevronDown, Loader2 } from "lucide-react";
import { useJourney, useMetrics, useImpact } from "@/hooks/use-data";

// Icon mapping for stages
const stageIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Learning: Target,
  Certified: Award,
  "Multi-Certified": Zap,
  Specialist: Rocket,
  Champion: TrendingUp,
};

// Stage colors
const stageGradients: Record<string, string> = {
  Learning: "from-blue-500 to-cyan-500",
  Certified: "from-green-500 to-emerald-500",
  "Multi-Certified": "from-purple-500 to-violet-500",
  Specialist: "from-amber-500 to-yellow-500",
  Champion: "from-pink-500 to-rose-500",
};

export default function JourneyFunnelPage() {
  const { data: journeyData, isLoading: journeyLoading } = useJourney();
  const { data: metricsData, isLoading: metricsLoading } = useMetrics();
  const { data: impactData, isLoading: impactLoading } = useImpact();

  const isLoading = journeyLoading || metricsLoading || impactLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const funnel = journeyData?.funnel || [];
  const metrics = metricsData?.metrics;
  const dropOffAnalysis = journeyData?.dropOffAnalysis || [];
  const stageImpact = impactData?.stageImpact || [];

  // Calculate overall conversion (Learning → Champion)
  const learningCount = funnel.find(f => f.stage === "Learning")?.count || 1;
  const championCount = funnel.find(f => f.stage === "Champion")?.count || 0;
  const overallConversion = ((championCount / learningCount) * 100).toFixed(1);

  // Certification rate (Certified + above / Learning)
  const certifiedTotal = funnel.filter(f => f.stage !== "Learning").reduce((sum, f) => sum + f.count, 0);
  const certificationRate = ((certifiedTotal / learningCount) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Learner Journey Funnel</h1>
        <p className="text-muted-foreground mt-1">
          Track cumulative progression from first touch through learning, certification, and product adoption
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Learners</CardDescription>
            <CardTitle className="text-2xl">{metrics?.totalLearners?.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              All registered users
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Certification Rate</CardDescription>
            <CardTitle className="text-2xl">{certificationRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Learning → Certified+
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Time to Cert</CardDescription>
            <CardTitle className="text-2xl">{journeyData?.avgTimeToCompletion || 45} days</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              From first learning activity
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Champions</CardDescription>
            <CardTitle className="text-2xl">{championCount.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {overallConversion}% of learners
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Journey Funnel</CardTitle>
          <CardDescription>
            Progressive conversion through learning stages ({metrics?.totalLearners?.toLocaleString()} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {funnel.map((stage, index) => {
              const Icon = stageIcons[stage.stage] || Users;
              const gradient = stageGradients[stage.stage] || "from-gray-500 to-gray-600";
              const percentage = (stage.count / learningCount) * 100;
              const nextStage = funnel[index + 1];
              const conversionToNext = nextStage ? ((nextStage.count / stage.count) * 100).toFixed(1) : null;
              
              return (
                <div key={stage.stage} className="relative">
                  {/* Funnel bar */}
                  <div 
                    className={`relative h-16 rounded-lg bg-gradient-to-r ${gradient} transition-all duration-500`}
                    style={{ width: `${Math.max(percentage, 20)}%` }}
                  >
                    <div className="absolute inset-0 flex items-center justify-between px-4">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-white" />
                        <div>
                          <p className="font-semibold text-white">{stage.stage}</p>
                          <p className="text-xs text-white/80">
                            {stage.stage === "Learning" ? "Started learning journey" : 
                             stage.stage === "Certified" ? "Earned first certification" :
                             stage.stage === "Multi-Certified" ? "Multiple certifications" :
                             stage.stage === "Specialist" ? "Product specialist" :
                             "Community champion"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-white">{stage.count.toLocaleString()}</p>
                        <p className="text-xs text-white/80">{percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Conversion arrow */}
                  {conversionToNext && (
                    <div className="flex items-center justify-center py-1">
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      <span className="ml-2 text-xs text-muted-foreground">
                        {conversionToNext}% conversion
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for detailed analysis */}
      <Tabs defaultValue="conversions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="conversions">Stage Conversions</TabsTrigger>
          <TabsTrigger value="impact">Stage Impact</TabsTrigger>
          <TabsTrigger value="time">Time Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="conversions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stage-to-Stage Conversions</CardTitle>
              <CardDescription>Drop-off and conversion metrics between each funnel stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dropOffAnalysis.filter(d => d.nextStage).map((stage) => {
                  const conversionRate = 100 - stage.dropOffRate;
                  return (
                    <div key={`${stage.stage}-${stage.nextStage}`} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{stage.stage} → {stage.nextStage}</p>
                        <p className="text-sm text-muted-foreground">{stage.count.toLocaleString()} learners at this stage</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{conversionRate}%</p>
                        <Badge variant={conversionRate > 70 ? "default" : conversionRate > 30 ? "secondary" : "destructive"}>
                          {conversionRate > 70 ? "Strong" : conversionRate > 30 ? "Moderate" : "Needs Attention"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Impact by Stage</CardTitle>
              <CardDescription>How each journey stage affects product usage and platform engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stageImpact.map((stage) => (
                  <div key={stage.stage} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{stage.stage}</h4>
                      <Badge>{stage.learners.toLocaleString()} learners</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-green-600">+{stage.avgUsageIncrease}%</p>
                        <p className="text-xs text-muted-foreground">Usage Increase</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">+{stage.platformTimeIncrease}%</p>
                        <p className="text-xs text-muted-foreground">Platform Time</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-600">{stage.topProduct}</p>
                        <p className="text-xs text-muted-foreground">Top Product</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Time to Progression</CardTitle>
              <CardDescription>Average time between journey stages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(journeyData?.stageVelocity || {}).map(([stage, days]) => (
                    <div key={stage} className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground capitalize">{stage} Stage</p>
                      <p className="text-3xl font-bold mt-1">{days} days</p>
                      <p className="text-sm text-muted-foreground">Average time in stage</p>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-lg bg-primary/10">
                  <p className="text-sm font-medium">Total Journey Time (Avg)</p>
                  <p className="text-3xl font-bold mt-1">{journeyData?.avgTimeToCompletion || 45} days</p>
                  <p className="text-sm text-muted-foreground">From first activity to certification</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
