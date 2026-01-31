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
  AlertCircle,
  Users,
  Target,
  Award,
  ChevronRight
} from "lucide-react";
import { useEnrichedLearners } from "@/hooks/use-unified-data";
import { useMemo } from "react";
import type { EnrichedLearner } from "@/types/data";

// Product configuration with icons and colors
const PRODUCTS = [
  { key: "copilot", name: "GitHub Copilot", icon: Bot, color: "violet", category: "Advanced Tools" },
  { key: "actions", name: "Actions", icon: Zap, color: "orange", category: "CI/CD" },
  { key: "security", name: "Security", icon: Shield, color: "red", category: "Advanced Tools" },
  { key: "pr", name: "Pull Requests", icon: GitPullRequest, color: "green", category: "Collaboration" },
  { key: "issues", name: "Issues", icon: CircleDot, color: "blue", category: "Collaboration" },
  { key: "code_search", name: "Code Search", icon: Search, color: "purple", category: "Ecosystem" },
  { key: "packages", name: "Packages", icon: Package, color: "yellow", category: "Ecosystem" },
  { key: "projects", name: "Projects", icon: LayoutGrid, color: "cyan", category: "Ecosystem" },
  { key: "discussions", name: "Discussions", icon: MessageCircle, color: "pink", category: "Ecosystem" },
  { key: "pages", name: "Pages", icon: FileText, color: "emerald", category: "Ecosystem" },
] as const;

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

// Helper to get product usage for a learner
function getProductUsage(learner: EnrichedLearner, productKey: string, window: '90d' | '365d'): boolean {
  const l = learner as unknown as Record<string, unknown>;
  if (window === '90d') {
    return l[`uses_${productKey}`] as boolean || false;
  }
  return l[`${productKey}_ever_used`] as boolean || false;
}

function getProductDays(learner: EnrichedLearner, productKey: string): number {
  const l = learner as unknown as Record<string, unknown>;
  return l[`${productKey}_days`] as number || 0;
}

export default function ProductAdoptionPage() {
  const { data: response, isLoading, error } = useEnrichedLearners();
  
  // Extract learners array from response
  const learners = response?.learners || [];

  const stats = useMemo(() => {
    if (!learners || learners.length === 0) return null;

    const total = learners.length;

    // Calculate adoption rates for each product
    const productStats = PRODUCTS.map(product => {
      const users90d = learners.filter(l => getProductUsage(l, product.key, '90d')).length;
      const usersEver = learners.filter(l => getProductUsage(l, product.key, '365d')).length;
      const totalDays = learners.reduce((sum, l) => sum + getProductDays(l, product.key), 0);
      
      return {
        ...product,
        users90d,
        usersEver,
        rate90d: Math.round((users90d / total) * 100 * 10) / 10,
        rateEver: Math.round((usersEver / total) * 100 * 10) / 10,
        avgDays: usersEver > 0 ? Math.round(totalDays / usersEver) : 0,
        gain: usersEver > users90d ? Math.round(((usersEver - users90d) / users90d) * 100) : 0,
      };
    }).sort((a, b) => b.rateEver - a.rateEver);

    // Calculate skill maturity distribution
    const maturityCounts: Record<string, number> = {
      "Expert": 0,
      "Advanced": 0,
      "Intermediate": 0,
      "Beginner": 0,
      "Novice": 0,
    };
    learners.forEach(l => {
      const level = l.skill_maturity_level || "Novice";
      if (maturityCounts[level] !== undefined) {
        maturityCounts[level]++;
      }
    });

    // Average skill maturity score
    const avgScore = learners.reduce((sum, l) => sum + (l.skill_maturity_score || 0), 0) / total;

    // Products adopted distribution
    const productsCounts: Record<number, number> = {};
    learners.forEach(l => {
      const count = l.products_adopted_count || 0;
      productsCounts[count] = (productsCounts[count] || 0) + 1;
    });

    // Certified vs non-certified skill maturity comparison
    const certified = learners.filter(l => (l.exams_passed || 0) > 0);
    const nonCertified = learners.filter(l => (l.exams_passed || 0) === 0);
    const certifiedAvgScore = certified.length > 0 
      ? certified.reduce((sum, l) => sum + (l.skill_maturity_score || 0), 0) / certified.length 
      : 0;
    const nonCertifiedAvgScore = nonCertified.length > 0 
      ? nonCertified.reduce((sum, l) => sum + (l.skill_maturity_score || 0), 0) / nonCertified.length 
      : 0;

    return {
      total,
      productStats,
      maturityCounts,
      avgScore: Math.round(avgScore),
      productsCounts,
      certified: certified.length,
      nonCertified: nonCertified.length,
      certifiedAvgScore: Math.round(certifiedAvgScore),
      nonCertifiedAvgScore: Math.round(nonCertifiedAvgScore),
    };
  }, [learners]);

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error as Error} />;
  if (!stats) return null;

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
          Avg Skill Score: {stats.avgScore}/100
        </Badge>
      </div>

      {/* Skill Maturity Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        {Object.entries(stats.maturityCounts).map(([level, count]) => (
          <Card key={level} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                {level}
                <Badge className={MATURITY_COLORS[level]}>{Math.round((count / stats.total) * 100)}%</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{count.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">learners</p>
              <Progress 
                value={(count / stats.total) * 100} 
                className="mt-2 h-1"
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Certification Impact */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Certification Impact on Skill Maturity
          </CardTitle>
          <CardDescription>
            Comparing product adoption between certified and non-certified learners
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Non-Certified ({stats.nonCertified.toLocaleString()})</span>
                <span className="font-bold text-2xl">{stats.nonCertifiedAvgScore}/100</span>
              </div>
              <Progress value={stats.nonCertifiedAvgScore} className="h-3" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Certified ({stats.certified.toLocaleString()})</span>
                <span className="font-bold text-2xl text-green-600">{stats.certifiedAvgScore}/100</span>
              </div>
              <Progress value={stats.certifiedAvgScore} className="h-3 [&>div]:bg-green-500" />
            </div>
          </div>
          <div className="mt-4 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="font-medium">
                Certified learners have{" "}
                <span className="text-green-600 font-bold">
                  +{stats.certifiedAvgScore - stats.nonCertifiedAvgScore} points
                </span>{" "}
                higher skill maturity on average
              </span>
            </div>
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
            {stats.productStats.map(product => (
              <ProductCard key={product.key} product={product} total={stats.total} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {stats.productStats.filter(p => p.category === "Advanced Tools").map(product => (
              <ProductCard key={product.key} product={product} total={stats.total} expanded />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="collaboration" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {stats.productStats.filter(p => p.category === "Collaboration").map(product => (
              <ProductCard key={product.key} product={product} total={stats.total} expanded />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ecosystem" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {stats.productStats.filter(p => p.category === "Ecosystem").map(product => (
              <ProductCard key={product.key} product={product} total={stats.total} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Products Adopted Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Products Adopted Distribution
          </CardTitle>
          <CardDescription>
            How many GitHub products each learner actively uses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 11 }, (_, i) => i).map(count => {
              const learnerCount = stats.productsCounts[count] || 0;
              const pct = (learnerCount / stats.total) * 100;
              return (
                <div key={count} className="flex items-center gap-3">
                  <span className="w-16 text-sm font-medium">{count} products</span>
                  <div className="flex-1">
                    <Progress value={pct} className="h-6" />
                  </div>
                  <span className="w-24 text-sm text-right">
                    {learnerCount.toLocaleString()} ({pct.toFixed(1)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Time Window Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>90-Day vs 365-Day Adoption Rates</CardTitle>
          <CardDescription>
            Expanding the time window captures occasional users who may be missed by 90-day metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Product</th>
                  <th className="text-right py-3 px-2">90-Day Users</th>
                  <th className="text-right py-3 px-2">365-Day Users</th>
                  <th className="text-right py-3 px-2">Additional Users</th>
                  <th className="text-right py-3 px-2">Gain</th>
                </tr>
              </thead>
              <tbody>
                {stats.productStats.map(product => (
                  <tr key={product.key} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <product.icon className="h-4 w-4" />
                        {product.name}
                      </div>
                    </td>
                    <td className="text-right py-3 px-2">{product.users90d.toLocaleString()}</td>
                    <td className="text-right py-3 px-2">{product.usersEver.toLocaleString()}</td>
                    <td className="text-right py-3 px-2 text-green-600">
                      +{(product.usersEver - product.users90d).toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-2">
                      <Badge variant={product.gain > 0 ? "default" : "secondary"}>
                        {product.gain > 0 ? `+${product.gain}%` : "0%"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    users90d: number;
    usersEver: number;
    rate90d: number;
    rateEver: number;
    avgDays: number;
    gain: number;
  };
  total: number;
  expanded?: boolean;
}) {
  const Icon = product.icon;
  
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
        {expanded && (
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
