"use client";

import { MetricCard, SimpleBarChart, SimpleAreaChart, DonutChart } from "@/components/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Users, 
  Zap, 
  Clock, 
  ArrowRight,
  CheckCircle2,
  Target,
  Sparkles
} from "lucide-react";

// Learning to Impact Flow Data
const impactFlowData = {
  learningHours: 12500,
  skillsAcquired: 847,
  productAdoption: 78,
  timeOnPlatform: 156,
};

// Learning Stage Impact
const stageImpactData = [
  { 
    stage: "Awareness", 
    learners: 4586, 
    avgUsageIncrease: 12, 
    platformTimeIncrease: 8,
    topProduct: "Docs & Guides"
  },
  { 
    stage: "Exploration", 
    learners: 3421, 
    avgUsageIncrease: 28, 
    platformTimeIncrease: 22,
    topProduct: "GitHub Copilot"
  },
  { 
    stage: "Active Learning", 
    learners: 2156, 
    avgUsageIncrease: 45, 
    platformTimeIncrease: 38,
    topProduct: "Actions"
  },
  { 
    stage: "Proficiency", 
    learners: 1256, 
    avgUsageIncrease: 67, 
    platformTimeIncrease: 52,
    topProduct: "Advanced Security"
  },
  { 
    stage: "Mastery", 
    learners: 523, 
    avgUsageIncrease: 89, 
    platformTimeIncrease: 71,
    topProduct: "Enterprise Features"
  },
];

// Learning → Usage Correlation Over Time
const correlationData = [
  { name: "Jul", learningHours: 1200, productUsage: 45, platformTime: 32 },
  { name: "Aug", learningHours: 1450, productUsage: 52, platformTime: 38 },
  { name: "Sep", learningHours: 1680, productUsage: 61, platformTime: 45 },
  { name: "Oct", learningHours: 1920, productUsage: 68, platformTime: 51 },
  { name: "Nov", learningHours: 2100, productUsage: 74, platformTime: 58 },
  { name: "Dec", learningHours: 2340, productUsage: 78, platformTime: 62 },
  { name: "Jan", learningHours: 2580, productUsage: 82, platformTime: 67 },
];

// Product Adoption by Learning Stage
const productAdoptionData = [
  { name: "Copilot", before: 23, after: 78 },
  { name: "Actions", before: 34, after: 72 },
  { name: "Codespaces", before: 12, after: 56 },
  { name: "Security", before: 18, after: 64 },
  { name: "Packages", before: 15, after: 48 },
];

// ROI Breakdown
const roiBreakdown = [
  { name: "Developer Productivity", value: 42, color: "#22c55e" },
  { name: "Reduced Onboarding Time", value: 28, color: "#3b82f6" },
  { name: "Feature Adoption", value: 18, color: "#8b5cf6" },
  { name: "Support Ticket Reduction", value: 12, color: "#f59e0b" },
];

export default function LearningImpactPage() {
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
          Impact Score: 87/100
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
                {impactFlowData.learningHours.toLocaleString()}
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
                {impactFlowData.skillsAcquired}
              </div>
              <div className="text-sm text-muted-foreground">skills acquired</div>
              <ArrowRight className="absolute right-[-20px] top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground z-10" />
            </div>

            {/* Step 3: Product Adoption */}
            <div className="relative p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">
                Product Adoption
              </div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                +{impactFlowData.productAdoption}%
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
                +{impactFlowData.timeOnPlatform}%
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
          value="4,586"
          description="Enrolled in learning paths"
          trend={{ value: 18.2, isPositive: true }}
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="Avg Usage Increase"
          value="+67%"
          description="After completing courses"
          trend={{ value: 12.5, isPositive: true }}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          title="Features Adopted"
          value="4.2"
          description="New features per learner"
          trend={{ value: 8.3, isPositive: true }}
          icon={<Zap className="h-4 w-4" />}
        />
        <MetricCard
          title="Time to Value"
          value="-42%"
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
            {stageImpactData.map((stage, index) => (
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
            {productAdoptionData.map((product) => (
              <div key={product.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{product.name}</span>
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                    +{product.after - product.before}% increase
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground w-16">Before</span>
                      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-muted-foreground/40 rounded-full"
                          style={{ width: `${product.before}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-10">{product.before}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-16">After</span>
                      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                          style={{ width: `${product.after}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-10">{product.after}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
                  Learners who complete 3+ courses show 67% higher product usage
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Copilot Leading</div>
                <div className="text-sm text-muted-foreground">
                  Copilot learning paths drive highest adoption increase at 55%
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Faster Onboarding</div>
                <div className="text-sm text-muted-foreground">
                  New users with training reach proficiency 42% faster
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
