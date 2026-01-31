"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  GitPullRequest,
  CircleDot,
  Search,
  Package,
  LayoutGrid,
  MessageCircle,
  FileText,
  Bot,
  Shield,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Users,
  Target,
  Award,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Info,
  Lightbulb,
  GraduationCap,
  Star,
} from "lucide-react";
import { useSkillMaturityStats, useProductAdoptionStats, useEnrichedStats, useImpact, useProductAdoptionByCertification, useCertifiedAdoptionByTenure } from "@/hooks/use-unified-data";
import type { SkillMaturityDistribution, ProductAdoptionStats } from "@/hooks/use-unified-data";

// Product configuration with icons and colors
const PRODUCT_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; category: string }> = {
  copilot: { icon: Bot, color: "violet", category: "Advanced Tools" },
  actions: { icon: Zap, color: "orange", category: "CI/CD" },
  security: { icon: Shield, color: "red", category: "Advanced Tools" },
  pr: { icon: GitPullRequest, color: "green", category: "Collaboration" },
  issues: { icon: CircleDot, color: "blue", category: "Collaboration" },
  code_search: { icon: Search, color: "purple", category: "Ecosystem" },
  packages: { icon: Package, color: "yellow", category: "Ecosystem" },
  projects: { icon: LayoutGrid, color: "cyan", category: "Ecosystem" },
  discussions: { icon: MessageCircle, color: "pink", category: "Ecosystem" },
  pages: { icon: FileText, color: "emerald", category: "Ecosystem" },
};

// Skill maturity level colors
const MATURITY_COLORS: Record<string, string> = {
  "Novice": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  "Beginner": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "Intermediate": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "Advanced": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Expert": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Failed to load adoption data</h2>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <Button onClick={() => window.location.reload()}>Retry</Button>
    </div>
  );
}

export default function ProductAdoptionPage() {
  const { data: maturityData, isLoading: maturityLoading, error: maturityError } = useSkillMaturityStats();
  const { data: productData, isLoading: productLoading, error: productError } = useProductAdoptionStats();
  const { data: statsData, isLoading: statsLoading } = useEnrichedStats();
  const { data: impactData, isLoading: impactLoading } = useImpact();
  const { data: certAdoptionData, isLoading: certAdoptionLoading } = useProductAdoptionByCertification();
  const { data: tenureData, isLoading: tenureLoading } = useCertifiedAdoptionByTenure();

  const isLoading = maturityLoading || productLoading || statsLoading || impactLoading || certAdoptionLoading || tenureLoading;
  const error = maturityError || productError;

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error as Error} />;
  if (!maturityData || !productData) return null;

  // Merge product data with config
  const productStats = productData.products.map(p => ({
    ...p,
    ...PRODUCT_CONFIG[p.key],
    gain: p.usersEver > p.users90d && p.users90d > 0 
      ? Math.round(((p.usersEver - p.users90d) / p.users90d) * 100) 
      : 0,
    avgDays: 0,
  }));

  // Order maturity levels for display
  const maturityOrder = ["Expert", "Advanced", "Intermediate", "Beginner", "Novice"];
  const orderedMaturity = maturityOrder.map(level => 
    maturityData.distribution.find(d => d.level === level) || {
      level,
      count: 0,
      percentage: 0,
      avgScore: 0,
      copilot_pct: 0,
      actions_pct: 0,
      security_pct: 0,
      avg_products: 0,
      avg_certs: 0,
    }
  );

  // Impact data for before/after comparisons
  const productAdoption = impactData?.productAdoption || [];
  const stageImpact = impactData?.stageImpact || [];

  // Calculate certified vs non-certified stats
  const certifiedStage = stageImpact.find((s: { stage: string }) => s.stage === "Certified");
  const championStage = stageImpact.find((s: { stage: string }) => s.stage === "Champion");
  const specialistStage = stageImpact.find((s: { stage: string }) => s.stage === "Specialist");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Adoption</h1>
          <p className="text-muted-foreground">
            Track learner skill growth through GitHub product usage and platform engagement
          </p>
        </div>
        <Badge variant="default" className="bg-gradient-to-r from-green-500 to-emerald-600">
          <Award className="h-3 w-3 mr-1" />
          Avg Skill Score: {Math.round(maturityData.avgScore)}/100
        </Badge>
      </div>

      {/* Skill Maturity Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        {orderedMaturity.map(({ level, count, percentage }) => (
          <Card key={level} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                {level}
                <Badge className={MATURITY_COLORS[level]}>{percentage.toFixed(1)}%</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{count.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">learners</p>
              <Progress 
                value={percentage} 
                className="mt-2 h-1"
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Key Insights - Adoption Pattern Explanation */}
      <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Lightbulb className="h-5 w-5" />
            Key Insight: Understanding Certified vs Non-Certified Adoption
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-3 p-4 rounded-lg bg-background/50">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">Two Different Cohorts</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Non-certified learners ({certAdoptionData?.learning_count.toLocaleString() || "301K"}) are in active exploration mode, 
                trying many products as part of learning. Certified learners ({certAdoptionData?.certified_count.toLocaleString() || "66K"}) 
                have completed that phase and now specialize.
              </p>
            </div>
            <div className="space-y-3 p-4 rounded-lg bg-background/50">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="font-semibold">Long-term Value Grows</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Champion users show +{championStage?.avgUsageIncrease || 106}% higher engagement than baseline. 
                The journey from certification to Champion represents the true learning ROI trajectory - 
                track depth, not breadth.
              </p>
            </div>
            <div className="space-y-3 p-4 rounded-lg bg-background/50">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-violet-600" />
                <span className="font-semibold">Expert Adoption Strong</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Expert-level learners have {orderedMaturity[0].copilot_pct.toFixed(0)}% Copilot adoption - 
                {Math.round(orderedMaturity[0].copilot_pct / Math.max(orderedMaturity[4].copilot_pct, 1))}x higher than Novice. 
                Skill maturity strongly correlates with advanced tool adoption.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Adoption: Certified vs Non-Certified Learners - Cross-Sectional Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Product Adoption: Certified vs Non-Certified Learners
          </CardTitle>
          <CardDescription>
            Comparing product usage between two distinct groups: {certAdoptionData?.learning_count.toLocaleString() || "301K"} learners 
            who haven&apos;t certified yet vs {certAdoptionData?.certified_count.toLocaleString() || "66K"} who have earned certifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Group products by category */}
          {["AI & Automation", "Core Collaboration", "Discovery & Navigation", "Ecosystem", "Project Management", "Community", "Publishing"].map(category => {
            const categoryProducts = (certAdoptionData?.products || []).filter(p => p.category === category);
            if (categoryProducts.length === 0) return null;
            
            return (
              <div key={category} className="mb-6 last:mb-0">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">{category}</h4>
                <div className="space-y-4">
                  {categoryProducts.map((product) => {
                    // Use 90-day metrics for AI tools if available, otherwise use "ever" metrics
                    const nonCertified = product.before ?? product.before_ever;
                    const certified = product.after ?? product.after_ever;
                    const diff = certified - nonCertified;
                    const maxValue = Math.max(nonCertified, certified);
                    const isLower = diff < 0;
                    const Icon = PRODUCT_CONFIG[product.key]?.icon || Bot;
                    
                    return (
                      <div key={product.key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{product.name}</span>
                          </div>
                          <Badge variant={isLower ? "secondary" : "default"} className={isLower ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : ""}>
                            {isLower ? (
                              <ArrowDownRight className="h-3 w-3 mr-1" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                            )}
                            {Math.abs(diff).toFixed(1)}pp {isLower ? "lower" : "higher"}
                          </Badge>
                        </div>
                        <div className="flex gap-2 items-center">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-muted-foreground w-24">Non-Certified</span>
                              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500/60 rounded-full transition-all"
                                  style={{ width: `${maxValue > 0 ? (nonCertified / maxValue) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium w-14 text-right">{nonCertified.toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-24">Certified</span>
                              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all"
                                  style={{ width: `${maxValue > 0 ? (certified / maxValue) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium w-14 text-right">{certified.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          
          {/* Explanation callout */}
          <div className="mt-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-300">Why Are Certified Learners Using Products Less?</p>
                <p className="text-amber-600 dark:text-amber-400 mt-1">
                  This compares <strong>two different groups</strong>, not the same users before/after. Non-certified learners 
                  are actively exploring and trying products as part of their learning journey. Certified learners have 
                  completed their exploration phase and now focus on fewer tools they&apos;ve mastered. This is <em>specialization</em>, 
                  not reduced engagement.
                </p>
              </div>
            </div>
          </div>
          
          {/* What this means callout */}
          <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-700 dark:text-blue-300">What This Means for Program Design</p>
                <p className="text-blue-600 dark:text-blue-400 mt-1">
                  The {certAdoptionData?.learning_count.toLocaleString()} non-certified learners represent your 
                  &quot;exploration pipeline&quot; - actively trying products and building skills. Focus on converting them to 
                  certification. The {certAdoptionData?.certified_count.toLocaleString()} certified learners are your 
                  &quot;specialized practitioners&quot; - track their depth of usage and progression to Champion/Specialist.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Full Certification Journey */}
      <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <TrendingUp className="h-5 w-5" />
            The Full Certification Journey
          </CardTitle>
          <CardDescription>
            Product adoption before and after certification for {tenureData?.total_pre_cert?.toLocaleString() || "18K"} recently certified learners.
            <span className="font-medium text-green-600 dark:text-green-400 ml-1">
              Pre-cert usage is ONLY from before they got certified!
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Journey timeline */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            {(tenureData?.tenure_groups || []).map((group, index) => {
              const isPrecert = group.tenure === "pre_cert";
              const isVeteran = group.tenure === "veteran";
              
              return (
                <div key={group.tenure} className={`p-4 rounded-lg border relative ${
                  isPrecert ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" :
                  isVeteran ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" :
                  group.tenure === "established" ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" :
                  "bg-muted/50 border-border"
                }`}>
                  {/* Journey arrow */}
                  {index < (tenureData?.tenure_groups?.length || 0) - 1 && (
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 hidden md:block">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className={`font-semibold text-sm ${
                        isPrecert ? "text-amber-700 dark:text-amber-400" :
                        isVeteran ? "text-green-700 dark:text-green-400" : ""
                      }`}>
                        {group.label}
                      </span>
                      {isPrecert && (
                        <Badge variant="outline" className="ml-2 text-xs bg-amber-100 dark:bg-amber-900/50 border-amber-300">Before Cert</Badge>
                      )}
                      {isVeteran && (
                        <Badge variant="outline" className="ml-2 text-xs bg-green-100 dark:bg-green-900/50 border-green-300">Peak</Badge>
                      )}
                    </div>
                    <Badge variant="outline">{group.count.toLocaleString()}</Badge>
                  </div>
                  
                  {group.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{group.description}</p>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Copilot</span>
                      <span className={`font-medium ${
                        isPrecert ? "text-amber-600" :
                        isVeteran ? "text-green-600" : ""
                      }`}>
                        {group.products.copilot.rate_90d}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Actions</span>
                      <span className={`font-medium ${
                        isPrecert ? "text-amber-600" :
                        isVeteran ? "text-green-600" : ""
                      }`}>
                        {group.products.actions.rate_90d}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Products</span>
                      <span className={`font-medium ${
                        isPrecert ? "text-amber-600" :
                        isVeteran ? "text-green-600" : ""
                      }`}>
                        {group.avg_products.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Active Days</span>
                      <span className={`font-medium ${
                        isPrecert ? "text-amber-600" :
                        isVeteran ? "text-green-600" : ""
                      }`}>
                        {Math.round(group.avg_active_days)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Key products comparison */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Product Adoption by Tenure</h4>
            {["copilot", "actions", "security", "pr", "issues"].map(productKey => {
              const productName = {
                copilot: "GitHub Copilot",
                actions: "GitHub Actions", 
                security: "Advanced Security",
                pr: "Pull Requests",
                issues: "Issues"
              }[productKey] || productKey;
              
              const Icon = PRODUCT_CONFIG[productKey]?.icon || Bot;
              
              return (
                <div key={productKey} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{productName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(tenureData?.tenure_groups || []).map((group) => {
                      const rate = productKey === "copilot" || productKey === "actions" || productKey === "security"
                        ? (group.products[productKey as keyof typeof group.products] as { rate_ever: number }).rate_ever
                        : (group.products[productKey as keyof typeof group.products] as { rate_ever: number }).rate_ever;
                      
                      const isPrecert = group.tenure === "pre_cert";
                      const isVeteran = group.tenure === "veteran";
                      
                      return (
                        <div key={group.tenure} className="flex-1">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className={`text-muted-foreground truncate ${isPrecert ? "font-medium" : ""}`}>
                              {isPrecert ? "Before" : group.tenure}
                            </span>
                            <span className={`font-medium ${
                              isPrecert ? "text-amber-600" :
                              isVeteran ? "text-green-600" : ""
                            }`}>
                              {rate}%
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                isPrecert ? "bg-amber-500" :
                                isVeteran ? "bg-green-500" :
                                group.tenure === "established" ? "bg-blue-500" :
                                "bg-gray-400"
                              }`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Journey insight callout */}
          <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-amber-50 to-green-50 dark:from-amber-950/30 dark:to-green-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-green-700 dark:text-green-300">The ROI Story: Pre-Certification → Post-Certification Growth</p>
                <p className="text-muted-foreground mt-1">
                  <strong>Before certification:</strong> {tenureData?.tenure_groups?.[0]?.count.toLocaleString() || "18,106"} learners had 
                  <strong className="text-amber-600"> {tenureData?.tenure_groups?.[0]?.products.copilot.rate_90d || 6.8}% Copilot</strong> usage and 
                  <strong className="text-amber-600"> {tenureData?.tenure_groups?.[0]?.avg_products.toFixed(1) || "0.15"} products</strong>.
                  
                  <strong className="ml-2">After 365+ days post-cert:</strong> Veterans show 
                  <strong className="text-green-600"> {tenureData?.tenure_groups?.[3]?.products.copilot.rate_90d || 36.7}% Copilot</strong> and 
                  <strong className="text-green-600"> {tenureData?.tenure_groups?.[3]?.avg_products.toFixed(1) || "4.1"} products</strong> — 
                  a <strong className="text-green-600">{((tenureData?.tenure_groups?.[3]?.products.copilot.rate_90d || 36.7) / (tenureData?.tenure_groups?.[0]?.products.copilot.rate_90d || 6.8)).toFixed(1)}x increase</strong>!
                </p>
              </div>
            </div>
          </div>
          
          {/* Methodology note */}
          <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                <strong>Methodology:</strong> Pre-certification calculated from {tenureData?.tenure_groups?.[0]?.count.toLocaleString() || "18,106"} recently 
                certified learners: (total usage days - 90-day usage) isolates activity that occurred BEFORE their certification date. 
                Post-certification stages show current 90-day active usage segmented by time since certification.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning Stage Impact Journey */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Learning Stage Impact Journey
          </CardTitle>
          <CardDescription>
            How engagement evolves through the learning journey - the path from certification to expertise
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stageImpact.map((stage: { stage: string; learners: number; avgUsageIncrease: number; platformTimeIncrease: number; topProduct: string; adoptionRate?: number }, index: number) => {
              const isPositive = stage.avgUsageIncrease > 0;
              const isNeutral = stage.avgUsageIncrease === 0;
              
              return (
                <div 
                  key={stage.stage}
                  className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                >
                  <div className={`flex items-center justify-center h-10 w-10 rounded-full font-bold ${
                    stage.stage === "Champion" ? "bg-amber-500/20 text-amber-600" :
                    stage.stage === "Specialist" ? "bg-violet-500/20 text-violet-600" :
                    "bg-primary/10 text-primary"
                  }`}>
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
                        <div className="text-xs text-muted-foreground mb-1">Usage Change</div>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={Math.min(Math.abs(stage.avgUsageIncrease), 100)} 
                            className={`h-2 ${stage.avgUsageIncrease < 0 ? "[&>div]:bg-amber-500" : ""}`}
                          />
                          <span className={`text-sm font-medium ${
                            isPositive ? "text-green-600 dark:text-green-400" : 
                            isNeutral ? "text-muted-foreground" :
                            "text-amber-600 dark:text-amber-400"
                          }`}>
                            {isPositive ? "+" : ""}{stage.avgUsageIncrease}%
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
              );
            })}
          </div>
          
          {/* Journey insight */}
          <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-700 dark:text-green-400">
                The Journey Pays Off
              </span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400">
              While Certified users show a {Math.abs(certifiedStage?.avgUsageIncrease || 6)}% initial dip, 
              those who continue to <strong>Specialist</strong> (+{specialistStage?.avgUsageIncrease || 61}%) 
              and <strong>Champion</strong> (+{championStage?.avgUsageIncrease || 106}%) show massive engagement gains. 
              Focus programs on moving certified users through this journey.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Skill Maturity vs Product Adoption Correlation */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Skill Maturity vs Product Adoption
          </CardTitle>
          <CardDescription>
            How skill maturity level correlates with GitHub product adoption across {productData.total_learners.toLocaleString()} learners
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Level</th>
                  <th className="text-right py-3 px-2">Learners</th>
                  <th className="text-right py-3 px-2">Avg Score</th>
                  <th className="text-right py-3 px-2">Copilot</th>
                  <th className="text-right py-3 px-2">Actions</th>
                  <th className="text-right py-3 px-2">Security</th>
                  <th className="text-right py-3 px-2">Avg Products</th>
                </tr>
              </thead>
              <tbody>
                {orderedMaturity.map(m => (
                  <tr key={m.level} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <Badge className={MATURITY_COLORS[m.level]}>{m.level}</Badge>
                    </td>
                    <td className="text-right py-3 px-2 font-medium">{m.count.toLocaleString()}</td>
                    <td className="text-right py-3 px-2">{m.avgScore.toFixed(1)}</td>
                    <td className="text-right py-3 px-2">
                      <Badge variant={m.copilot_pct > 50 ? "default" : "secondary"}>
                        {m.copilot_pct.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="text-right py-3 px-2">
                      <Badge variant={m.actions_pct > 50 ? "default" : "secondary"}>
                        {m.actions_pct.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="text-right py-3 px-2">
                      <Badge variant={m.security_pct > 30 ? "default" : "secondary"}>
                        {m.security_pct.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="text-right py-3 px-2">{m.avg_products.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Product Adoption Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Products</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Tools</TabsTrigger>
          <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
          <TabsTrigger value="ecosystem">Ecosystem</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {productStats.map(product => (
              <ProductCard key={product.key} product={product} total={productData.total_learners} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {productStats.filter(p => p.category === "Advanced Tools" || p.category === "CI/CD").map(product => (
              <ProductCard key={product.key} product={product} total={productData.total_learners} expanded />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="collaboration" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {productStats.filter(p => p.category === "Collaboration").map(product => (
              <ProductCard key={product.key} product={product} total={productData.total_learners} expanded />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ecosystem" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {productStats.filter(p => p.category === "Ecosystem").map(product => (
              <ProductCard key={product.key} product={product} total={productData.total_learners} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Summary Insights */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-violet-500/5 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-700 dark:text-blue-400">Adoption Insights Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <div className="font-medium">Expert Advantage</div>
                <div className="text-sm text-muted-foreground">
                  Expert-level learners adopt {orderedMaturity[0].avg_products.toFixed(1)} products on average, 
                  compared to just {orderedMaturity[4].avg_products.toFixed(1)} for Novice - a {Math.round(orderedMaturity[0].avg_products / orderedMaturity[4].avg_products)}x difference.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <div className="font-medium">Copilot Correlation</div>
                <div className="text-sm text-muted-foreground">
                  {productStats.find(p => p.key === "copilot")?.usersEver.toLocaleString()} learners use Copilot. 
                  Expert users have {orderedMaturity[0].copilot_pct.toFixed(0)}% adoption vs {orderedMaturity[4].copilot_pct.toFixed(0)}% for Novice.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <div className="font-medium">Champion Goal</div>
                <div className="text-sm text-muted-foreground">
                  Focus on moving users from Certified to Champion status for +{championStage?.avgUsageIncrease || 106}% engagement gains.
                  Currently {championStage?.learners.toLocaleString() || 795} champions.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Product Card Component
function ProductCard({ 
  product, 
  total,
  expanded = false 
}: { 
  product: {
    key: string;
    name: string;
    icon?: React.ComponentType<{ className?: string }>;
    color?: string;
    users90d: number;
    usersEver: number;
    rate90d: number;
    rateEver: number;
    avgDays?: number;
    gain: number;
  };
  total: number;
  expanded?: boolean;
}) {
  const Icon = product.icon || Bot;
  
  return (
    <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {product.name}
          </div>
          {product.gain > 0 && (
            <Badge variant="outline" className="text-xs text-green-600 border-green-200">
              +{product.gain}%
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{product.rateEver}%</span>
          <span className="text-xs text-muted-foreground">365d</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{product.rate90d}% active 90d</span>
          <ChevronRight className="h-3 w-3" />
          <span>{product.usersEver.toLocaleString()} users</span>
        </div>
        <Progress value={product.rateEver} className="h-1.5 mt-2" />
        {expanded && product.avgDays !== undefined && product.avgDays > 0 && (
          <div className="pt-2 border-t mt-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Avg days active</span>
              <span className="font-medium">{product.avgDays} days</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
