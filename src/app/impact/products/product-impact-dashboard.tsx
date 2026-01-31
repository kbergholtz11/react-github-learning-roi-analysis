"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Zap, Shield, GitPullRequest, ArrowRight } from "lucide-react";
import { DataFreshness } from "@/components/data-freshness";
import { ExploreInKusto, DataSourceInfo } from "@/components/explore-in-kusto";

// Queries for exploring data
const COPILOT_QUERY = `
// Copilot adoption by certification status
canonical_user_daily_activity_per_product
| where product has "Copilot"
| where day >= ago(90d)
| summarize users = dcount(user_id) by bin(day, 1d)
`;

const PRODUCT_IMPACT_QUERY = `
// Product usage comparison: certified vs uncertified
let certified_users = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
| where passed
| distinct dotcom_id;

user_daily_activity_per_product
| where day >= ago(90d)
| extend is_certified = user_id in (certified_users)
| summarize 
    users = dcount(user_id),
    avg_engagement = avg(num_engagement_events)
by is_certified, product
`;

interface ProductUsageData {
  group_name: string;
  count: number;
  avg_copilot_days: number;
  avg_actions_days: number;
  avg_active_days: number;
  copilot_adoption_pct: number;
}

interface ImpactData {
  impact_score: number;
  copilot_users: number;
  actions_users: number;
  certified_vs_uncertified: ProductUsageData[];
  learning_to_adoption: {
    stage: string;
    copilot_rate: number;
    actions_rate: number;
    total_users: number;
  }[];
}

async function fetchProductImpact(): Promise<ImpactData> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const response = await fetch(`${baseUrl}/api/impact`);
  if (!response.ok) {
    throw new Error("Failed to fetch product impact data");
  }
  const data = await response.json();
  
  // Transform the data if needed
  return {
    impact_score: data.overall_impact_score || 0,
    copilot_users: data.copilot_users || 0,
    actions_users: data.actions_users || 0,
    certified_vs_uncertified: data.certified_vs_uncertified || [
      { group_name: "Certified", count: 0, avg_copilot_days: 0, avg_actions_days: 0, avg_active_days: 0, copilot_adoption_pct: 0 },
      { group_name: "Uncertified", count: 0, avg_copilot_days: 0, avg_actions_days: 0, avg_active_days: 0, copilot_adoption_pct: 0 },
    ],
    learning_to_adoption: data.stage_impact || [],
  };
}

export function ProductImpactDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["product-impact"],
    queryFn: fetchProductImpact,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Failed to load product impact data. Please try again later.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generate comparison data for the chart
  const comparisonData = data?.certified_vs_uncertified.map(group => ({
    name: group.group_name,
    "Copilot Days (90d)": group.avg_copilot_days || 0,
    "Actions Days (90d)": group.avg_actions_days || 0,
    "Total Active Days": group.avg_active_days || 0,
    "User Count": group.count || 0,
  })) || [];

  // Calculate lift percentages
  const certified = data?.certified_vs_uncertified.find(g => g.group_name === "Certified");
  const uncertified = data?.certified_vs_uncertified.find(g => g.group_name === "Uncertified");
  
  const copilotLift = certified && uncertified && uncertified.avg_copilot_days > 0
    ? ((certified.avg_copilot_days - uncertified.avg_copilot_days) / uncertified.avg_copilot_days * 100)
    : 0;
  
  const actionsLift = certified && uncertified && uncertified.avg_actions_days > 0
    ? ((certified.avg_actions_days - uncertified.avg_actions_days) / uncertified.avg_actions_days * 100)
    : 0;

  // Journey stage impact data
  const stageData = data?.learning_to_adoption.map(stage => ({
    stage: stage.stage?.replace("Stage ", "").substring(0, 15) || "Unknown",
    "Copilot Adoption %": stage.copilot_rate || 0,
    "Actions Adoption %": stage.actions_rate || 0,
    users: stage.total_users || 0,
  })) || [];

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Impact Analysis</h1>
          <p className="text-muted-foreground mt-1">
            Correlate learning activities with GitHub product adoption
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DataFreshness variant="badge" />
          <ExploreInKusto 
            query={PRODUCT_IMPACT_QUERY}
            database="canonical"
            label="Explore Data"
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-500" />
              Copilot Adoption Lift
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {copilotLift > 0 ? "+" : ""}{copilotLift.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Certified vs. uncertified learners
            </p>
            {copilotLift > 0 && (
              <Badge variant="outline" className="mt-2 text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                Higher usage after certification
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-blue-500" />
              Actions Adoption Lift
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {actionsLift > 0 ? "+" : ""}{actionsLift.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Certified vs. uncertified learners
            </p>
            {actionsLift > 0 && (
              <Badge variant="outline" className="mt-2 text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                Higher usage after certification
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-orange-500" />
              Overall Impact Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data?.impact_score?.toFixed(1) ?? "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Composite learning impact metric
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="comparison" className="space-y-4">
        <TabsList>
          <TabsTrigger value="comparison">Certified vs Uncertified</TabsTrigger>
          <TabsTrigger value="journey">Journey Stage Impact</TabsTrigger>
          <TabsTrigger value="correlation">Correlation Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Usage: Certified vs Uncertified</CardTitle>
              <CardDescription>
                Average product usage days comparing certified and uncertified learners
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Copilot Days (90d)" fill="#8b5cf6" />
                  <Bar dataKey="Actions Days (90d)" fill="#3b82f6" />
                  <Bar dataKey="Total Active Days" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Insight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Key Insight</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-medium">Certification Drives Copilot Adoption</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Certified learners use Copilot {copilotLift > 0 ? copilotLift.toFixed(0) : "more"}% 
                      more frequently than uncertified peers, suggesting that certification
                      programs effectively drive product adoption.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recommendation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <ArrowRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-medium">Accelerate Certification Programs</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Consider targeting teams with low product adoption for certification
                      programs. The data shows a clear correlation between certification
                      and increased feature usage.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="journey" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Adoption by Journey Stage</CardTitle>
              <CardDescription>
                How product adoption changes as learners progress through their journey
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="Copilot Adoption %" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Actions Adoption %" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learning-to-Adoption Correlation</CardTitle>
              <CardDescription>
                Relationship between learning engagement and product usage
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="users" 
                    name="Learners" 
                    type="number"
                    label={{ value: "Number of Learners", position: "bottom" }}
                  />
                  <YAxis 
                    dataKey="Copilot Adoption %" 
                    name="Copilot %" 
                    label={{ value: "Copilot Adoption %", angle: -90, position: "insideLeft" }}
                  />
                  <ZAxis range={[50, 500]} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter 
                    name="Journey Stages" 
                    data={stageData} 
                    fill="#8b5cf6"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Data Source Information */}
      <Card>
        <CardContent className="py-4">
          <DataSourceInfo
            source="canonical.user_daily_activity_per_product + ACE.exam_results"
            query={PRODUCT_IMPACT_QUERY}
            dataDotTable="user_daily_activity_per_product"
            dataDotSchema="canonical"
          />
        </CardContent>
      </Card>
    </div>
  );
}
