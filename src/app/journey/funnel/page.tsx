"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, TrendingUp, ChevronDown, 
  Eye, Activity, BookOpen, GraduationCap, Crown,
  ArrowRight, Clock, CheckCircle2, Compass, Rocket
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useJourney, useMetrics, useImpact } from "@/hooks/use-unified-data";

// Icon mapping for progression-based journey stages
const stageIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "Discovered": Eye,
  "Exploring": Compass,
  "Active": Activity,
  "Learning": BookOpen,
  "Certified": GraduationCap,
  "Power User": Rocket,
  "Champion": Crown,
};

// Stage colors (progression gradient from discovery to mastery)
const stageGradients: Record<string, string> = {
  "Discovered": "from-slate-400 to-slate-500",
  "Exploring": "from-slate-500 to-slate-600",
  "Active": "from-sky-500 to-sky-600",
  "Learning": "from-blue-500 to-blue-600",
  "Certified": "from-green-500 to-green-600",
  "Power User": "from-purple-500 to-purple-600",
  "Champion": "from-amber-500 to-amber-600",
};

// Stage background colors for cards
const stageBgColors: Record<string, string> = {
  "Discovered": "bg-slate-100 dark:bg-slate-900",
  "Exploring": "bg-slate-100 dark:bg-slate-900",
  "Active": "bg-sky-50 dark:bg-sky-950",
  "Learning": "bg-blue-50 dark:bg-blue-950",
  "Certified": "bg-green-50 dark:bg-green-950",
  "Power User": "bg-purple-50 dark:bg-purple-950",
  "Champion": "bg-amber-50 dark:bg-amber-950",
};

// Helper function to get stage descriptions
function getStageDescription(stage: string): string {
  const descriptions: Record<string, string> = {
    "Discovered": "First registered or touched GitHub learning ecosystem",
    "Exploring": "Engaging with learning content or GitHub products",
    "Active": "Regular platform activity and contributions",
    "Learning": "Actively enrolled in courses or consuming learning content",
    "Certified": "Earned first GitHub certification",
    "Power User": "Multiple certifications or deep product expertise",
    "Champion": "4+ certifications, expert driving adoption",
  };
  return descriptions[stage] || "";
}

// Helper function to format stage keys from camelCase
function formatStageKey(key: string): string {
  const mapping: Record<string, string> = {
    "discovered": "Discovered",
    "exploring": "Exploring",
    "active": "Active", 
    "learning": "Learning",
    "certified": "Certified",
    "powerUser": "Power User",
    "champion": "Champion",
  };
  return mapping[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}

export default function JourneyFunnelPage() {
  const { data: journeyData, isLoading: journeyLoading } = useJourney();
  const { data: metricsData, isLoading: metricsLoading } = useMetrics();
  const { data: impactData, isLoading: impactLoading } = useImpact();

  const isLoading = journeyLoading || metricsLoading || impactLoading;

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading funnel data">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-56 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const funnel = journeyData?.funnel || [];
  const progressionAnalysis = journeyData?.progressionAnalysis || [];
  const stageVelocity = journeyData?.stageVelocity || {};
  const stageImpact = impactData?.stageImpact || [];

  // Get first touch count as the top of funnel
  const discoveredCount = funnel.find((f: { stage: string }) => f.stage === "Discovered")?.count || funnel[0]?.count || 1;
  const championCount = funnel.find((f: { stage: string }) => f.stage === "Champion")?.count || 0;
  const certifiedCount = funnel.find((f: { stage: string }) => f.stage === "Certified")?.count || 0;
  
  // Calculate key conversion rates
  const discoveredToCertified = discoveredCount > 0 ? ((certifiedCount / discoveredCount) * 100).toFixed(1) : "0";
  const discoveredToChampion = discoveredCount > 0 ? ((championCount / discoveredCount) * 100).toFixed(1) : "0";
  
  // Get learning stage count
  const learningCount = funnel.find((f: { stage: string }) => f.stage === "Learning")?.count || 0;
  const learningToCertified = learningCount > 0 ? ((certifiedCount / learningCount) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Learner Journey Progression</h1>
        <p className="text-muted-foreground mt-1">
          Track how users progress from their first touch with GitHub learning through certification and mastery
        </p>
      </div>

      {/* Key Journey Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-slate-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Total Users
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{discoveredCount.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              In the learning ecosystem
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Active Learners
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{learningCount.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              {((learningCount / discoveredCount) * 100).toFixed(0)}% of total users
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Certified Users
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{certifiedCount.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {learningToCertified}% of learners certified
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Champions
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{championCount.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {discoveredToChampion}% full journey conversion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Journey Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Journey Progression Funnel
          </CardTitle>
          <CardDescription>
            User progression from first touch through learning, certification, and mastery
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Funnel container with centered alignment */}
          <div className="flex flex-col items-center space-y-0">
            {funnel.map((stage: { stage: string; count: number; description?: string }, index: number) => {
              const Icon = stageIcons[stage.stage] || Users;
              const gradient = stageGradients[stage.stage] || "from-gray-500 to-gray-600";
              // Calculate width based on count relative to first stage - creates funnel shape
              // Use square root scale for better visual differentiation while keeping readability
              const rawPercent = discoveredCount > 0 ? (stage.count / discoveredCount) * 100 : 100;
              // Square root scaling makes small values more visible while maintaining proportions
              const scaledPercent = Math.sqrt(rawPercent) * 10;
              const widthPercent = Math.max(Math.min(scaledPercent, 100), 28);
              
              const nextStage = funnel[index + 1];
              const conversionToNext = nextStage && stage.count > 0 
                ? ((nextStage.count / stage.count) * 100).toFixed(0) 
                : null;
              
              // Determine if this is a key milestone stage
              const isMilestone = ["Certified", "Champion"].includes(stage.stage);
              
              return (
                <div key={stage.stage} className="w-full flex flex-col items-center">
                  {/* Funnel segment */}
                  <div 
                    className={`relative rounded-lg bg-gradient-to-r ${gradient} transition-all duration-500 shadow-sm hover:shadow-md cursor-default overflow-hidden ${isMilestone ? 'ring-2 ring-offset-1 ring-offset-background' : ''}`}
                    style={{ 
                      width: `${widthPercent}%`,
                      minWidth: '240px',
                      maxWidth: '100%'
                    }}
                  >
                    <div className="flex items-center justify-between px-3 py-2 gap-2">
                      {/* Left side - Icon and label */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className={`p-1.5 rounded-md flex-shrink-0 ${isMilestone ? 'bg-white/30' : 'bg-white/20'}`}>
                          <Icon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-white text-sm whitespace-nowrap">{stage.stage}</p>
                            {isMilestone && (
                              <span className="text-white/80 text-xs">★</span>
                            )}
                          </div>
                          <p className="text-[10px] text-white/60 truncate">
                            {stage.description || getStageDescription(stage.stage)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Right side - Numbers */}
                      <div className="text-right flex-shrink-0 pl-2">
                        <p className="font-bold text-white text-base tabular-nums">
                          {stage.count.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-white/60 tabular-nums">
                          {rawPercent.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Conversion connector between stages */}
                  {conversionToNext && (
                    <div className="flex items-center py-0.5">
                      <div className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-muted-foreground">
                        <ChevronDown className="h-3 w-3" />
                        <span className="tabular-nums">{conversionToNext}%</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Funnel Summary */}
          <div className="mt-8 pt-6 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">{discoveredCount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950">
                <p className="text-2xl font-bold text-green-600">{discoveredToCertified}%</p>
                <p className="text-xs text-muted-foreground">Certification Rate</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-amber-50 dark:bg-amber-950">
                <p className="text-2xl font-bold text-amber-600">{championCount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Champions</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950">
                <p className="text-2xl font-bold text-purple-600">{journeyData?.avgTimeToCompletion || 45}d</p>
                <p className="text-xs text-muted-foreground">Avg. Time to Cert</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="impact" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="impact">Stage Impact</TabsTrigger>
          <TabsTrigger value="progression">Stage Progression</TabsTrigger>
          <TabsTrigger value="time">Time Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="progression" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5" />
                Stage-to-Stage Progression
              </CardTitle>
              <CardDescription>
                Conversion rates between each journey stage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {progressionAnalysis.filter((d) => d.nextStage).map((stage) => {
                  const conversionRate = stage.conversionRate || 0;
                  const isGoodConversion = conversionRate > 50;
                  const isMediumConversion = conversionRate > 25 && conversionRate <= 50;
                  const Icon = stageIcons[stage.stage] || Users;
                  const NextIcon = stage.nextStage ? (stageIcons[stage.nextStage] || Users) : Users;
                  
                  return (
                    <div 
                      key={`${stage.stage}-${stage.nextStage}`} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
                    >
                      {/* Stage transition */}
                      <div className="flex items-center gap-3 mb-3 sm:mb-0">
                        <div className={`p-2 rounded-lg ${stageBgColors[stage.stage] || "bg-muted"}`}>
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium text-sm">{stage.stage}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div className={`p-2 rounded-lg ${stage.nextStage ? stageBgColors[stage.nextStage] : "bg-muted"} || "bg-muted"`}>
                          <NextIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium text-sm">{stage.nextStage}</span>
                      </div>
                      
                      {/* Stats */}
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{stage.count.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">users</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${isGoodConversion ? 'bg-green-500' : isMediumConversion ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(conversionRate, 100)}%` }}
                            />
                          </div>
                          <span className={`text-lg font-bold tabular-nums ${isGoodConversion ? 'text-green-600' : isMediumConversion ? 'text-amber-600' : 'text-red-600'}`}>
                            {conversionRate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Summary stats */}
              <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950">
                  <p className="text-2xl font-bold text-green-600 tabular-nums">{discoveredToCertified}%</p>
                  <p className="text-xs text-muted-foreground">Discovered → Certified</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950">
                  <p className="text-2xl font-bold text-purple-600 tabular-nums">{learningToCertified}%</p>
                  <p className="text-xs text-muted-foreground">Learning → Certified</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950">
                  <p className="text-2xl font-bold text-amber-600 tabular-nums">{discoveredToChampion}%</p>
                  <p className="text-xs text-muted-foreground">Full Journey</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time to Progression
              </CardTitle>
              <CardDescription>Average time users spend before progressing to each stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(stageVelocity).map(([stage, days]) => {
                  const stageKey = formatStageKey(stage);
                  const Icon = stageIcons[stageKey] || Clock;
                  
                  return (
                    <div 
                      key={stage} 
                      className={`p-4 rounded-lg ${stageBgColors[stageKey] || "bg-muted/50"}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium capitalize">{stageKey}</p>
                      </div>
                      <p className="text-3xl font-bold">{days as number}</p>
                      <p className="text-sm text-muted-foreground">days average</p>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 p-4 rounded-lg bg-primary/10">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <p className="font-medium">Total Journey Time (Average)</p>
                </div>
                <p className="text-4xl font-bold">{journeyData?.avgTimeToCompletion || 45} days</p>
                <p className="text-sm text-muted-foreground">From first learning visit to certification</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Impact by Journey Stage</CardTitle>
              <CardDescription>How each journey stage affects product adoption and platform engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stageImpact.map((stage: { stage: string; learners?: number; avgUsageIncrease: number; platformTimeIncrease: number; topProduct: string }) => (
                  <div key={stage.stage} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const Icon = stageIcons[stage.stage] || Users;
                          return <Icon className="h-5 w-5 text-muted-foreground" />;
                        })()}
                        <h4 className="font-semibold">{stage.stage}</h4>
                      </div>
                      <Badge>{stage.learners?.toLocaleString() || 0} users</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          {stage.avgUsageIncrease > 0 ? "+" : ""}{stage.avgUsageIncrease}%
                        </p>
                        <p className="text-xs text-muted-foreground">Usage Increase</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">
                          {stage.platformTimeIncrease > 0 ? "+" : ""}{stage.platformTimeIncrease}%
                        </p>
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
      </Tabs>
      
      {/* Data Sources Footer */}
      <div className="text-xs text-muted-foreground text-center pt-4 border-t">
        <p>
          Data sources: GitHub Learn ({journeyData?.dataSourceCounts?.githubLearn?.toLocaleString() || "N/A"} users), 
          GitHub Activity ({journeyData?.dataSourceCounts?.githubActivity?.toLocaleString() || "N/A"} users), 
          Skills Enrollments ({journeyData?.dataSourceCounts?.skillsEnrollments?.toLocaleString() || "N/A"} enrollments), 
          Certified Users ({journeyData?.dataSourceCounts?.certifiedUsers?.toLocaleString() || "N/A"} users)
        </p>
      </div>
    </div>
  );
}
