"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, Target, Zap, Award, Rocket, ChevronDown } from "lucide-react";

// Funnel stage data
const funnelStages = [
  { 
    name: "Registered", 
    count: 5000, 
    percentage: 100, 
    color: "from-violet-500 to-purple-600",
    description: "Users who have registered for learning",
    icon: Users 
  },
  { 
    name: "Learning Started", 
    count: 4250, 
    percentage: 85, 
    color: "from-blue-500 to-cyan-500",
    description: "Started at least one learning activity",
    icon: Target 
  },
  { 
    name: "Engaged Learner", 
    count: 2875, 
    percentage: 57.5, 
    color: "from-green-500 to-emerald-500",
    description: "Meaningful engagement (5+ sessions or event attendance)",
    icon: Zap 
  },
  { 
    name: "Certified", 
    count: 1625, 
    percentage: 32.5, 
    color: "from-amber-500 to-yellow-500",
    description: "Achieved GitHub certification",
    icon: Award 
  },
  { 
    name: "Copilot Trial", 
    count: 1125, 
    percentage: 22.5, 
    color: "from-pink-500 to-rose-500",
    description: "Started Copilot trial after certification",
    icon: Rocket 
  },
  { 
    name: "Copilot Active", 
    count: 875, 
    percentage: 17.5, 
    color: "from-purple-600 to-indigo-600",
    description: "Active paid Copilot subscriber",
    icon: TrendingUp 
  },
];

// Conversion metrics between stages
const conversionMetrics = [
  { from: "Registered", to: "Learning Started", rate: 85, avgDays: 3 },
  { from: "Learning Started", to: "Engaged Learner", rate: 67.6, avgDays: 14 },
  { from: "Engaged Learner", to: "Certified", rate: 56.5, avgDays: 45 },
  { from: "Certified", to: "Copilot Trial", rate: 69.2, avgDays: 7 },
  { from: "Copilot Trial", to: "Copilot Active", rate: 77.8, avgDays: 30 },
];

// Product breakdown
const productBreakdown = [
  { product: "GitHub Copilot", learners: 2100, certified: 892, adoptionRate: 78 },
  { product: "GitHub Actions", learners: 1650, certified: 498, adoptionRate: 65 },
  { product: "Advanced Security", learners: 875, certified: 235, adoptionRate: 52 },
  { product: "Admin & Platform", learners: 375, certified: 0, adoptionRate: 41 },
];

export default function JourneyFunnelPage() {
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
            <CardDescription>Overall Conversion</CardDescription>
            <CardTitle className="text-2xl">17.5%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Registered → Active Copilot User
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Certification Rate</CardDescription>
            <CardTitle className="text-2xl">32.5%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Of all registered learners
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Time to Cert</CardDescription>
            <CardTitle className="text-2xl">62 days</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              From registration to certification
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Product Adoption</CardDescription>
            <CardTitle className="text-2xl">77.8%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Trial to active conversion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Journey Funnel</CardTitle>
          <CardDescription>
            Progressive conversion through learning stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {funnelStages.map((stage, index) => {
              const Icon = stage.icon;
              return (
                <div key={stage.name} className="relative">
                  {/* Funnel bar */}
                  <div 
                    className={`relative h-16 rounded-lg bg-gradient-to-r ${stage.color} transition-all duration-500`}
                    style={{ width: `${Math.max(stage.percentage, 20)}%` }}
                  >
                    <div className="absolute inset-0 flex items-center justify-between px-4">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-white" />
                        <div>
                          <p className="font-semibold text-white">{stage.name}</p>
                          <p className="text-xs text-white/80">{stage.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-white">{stage.count.toLocaleString()}</p>
                        <p className="text-xs text-white/80">{stage.percentage}%</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Conversion arrow */}
                  {index < funnelStages.length - 1 && (
                    <div className="flex items-center justify-center py-1">
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      <span className="ml-2 text-xs text-muted-foreground">
                        {conversionMetrics[index]?.rate}% conversion
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
          <TabsTrigger value="products">By Product</TabsTrigger>
          <TabsTrigger value="time">Time Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="conversions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stage-to-Stage Conversions</CardTitle>
              <CardDescription>Detailed conversion metrics between each funnel stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conversionMetrics.map((metric) => (
                  <div key={`${metric.from}-${metric.to}`} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{metric.from} → {metric.to}</p>
                      <p className="text-sm text-muted-foreground">Avg. {metric.avgDays} days</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{metric.rate}%</p>
                      <Badge variant={metric.rate > 70 ? "default" : metric.rate > 50 ? "secondary" : "destructive"}>
                        {metric.rate > 70 ? "Strong" : metric.rate > 50 ? "Moderate" : "Needs Attention"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Funnel by Product Focus</CardTitle>
              <CardDescription>How different product tracks perform through the funnel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productBreakdown.map((product) => (
                  <div key={product.product} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{product.product}</h4>
                      <Badge>{product.adoptionRate}% adoption</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{product.learners.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Learners</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{product.certified.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Certified</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{((product.certified / product.learners) * 100).toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground">Cert Rate</p>
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
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Fast Track ({"<"}60 days)</p>
                    <p className="text-3xl font-bold mt-1">423</p>
                    <p className="text-sm text-green-600">26% of certified users</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Steady Progress (60-180 days)</p>
                    <p className="text-3xl font-bold mt-1">892</p>
                    <p className="text-sm text-blue-600">55% of certified users</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Long Journey (180+ days)</p>
                    <p className="text-3xl font-bold mt-1">310</p>
                    <p className="text-sm text-amber-600">19% of certified users</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Median Time to Certification</p>
                    <p className="text-3xl font-bold mt-1">62 days</p>
                    <p className="text-sm text-muted-foreground">Across all learners</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
