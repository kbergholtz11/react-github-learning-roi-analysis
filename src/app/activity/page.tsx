"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard, SimpleBarChart } from "@/components/dashboard";
import { ExportButton } from "@/components/export-button";
import { Progress } from "@/components/ui/progress";
import { 
  GitPullRequest, 
  MessageSquare, 
  AlertCircle,
  Activity,
  Users,
  Calendar,
  TrendingUp,
  Award,
  CheckCircle2,
  Zap,
  Shield,
  Search,
  Package,
  FileText,
  Bot,
  Flame
} from "lucide-react";
import { useGitHubActivity } from "@/hooks/use-unified-data";

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}

function ErrorState({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Failed to load activity data</h2>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <p className="text-sm text-muted-foreground">
        Make sure the backend is running: <code className="bg-muted px-1 rounded">cd backend && uvicorn app.main:app --reload</code>
      </p>
    </div>
  );
}

export default function GitHubActivityPage() {
  const { data, isLoading, error } = useGitHubActivity();

  // Prepare status chart data
  const statusChartData = useMemo(() => {
    if (!data?.byStatus) return [];
    return data.byStatus
      .filter(s => s.count > 1000)
      .slice(0, 8)
      .map(s => ({
        name: s.status || "Unknown",
        users: s.count,
        activeDays: s.avgActiveDays90d,
        copilotDays: s.avgCopilotDays,
      }));
  }, [data?.byStatus]);

  // Product usage chart data
  const productChartData = useMemo(() => {
    if (!data?.productUsage) return [];
    return [
      { name: "Copilot", users: data.productUsage.copilot.users, color: "#8b5cf6" },
      { name: "Actions", users: data.productUsage.actions.users, color: "#f97316" },
      { name: "Pull Requests", users: data.productUsage.pullRequests.users, color: "#3b82f6" },
      { name: "Issues", users: data.productUsage.issues.users, color: "#22c55e" },
      { name: "Security", users: data.productUsage.security.users, color: "#ef4444" },
      { name: "Code Search", users: data.productUsage.codeSearch.users, color: "#06b6d4" },
      { name: "Projects", users: data.productUsage.projects.users, color: "#eab308" },
      { name: "Discussions", users: data.productUsage.discussions.users, color: "#ec4899" },
    ].sort((a, b) => b.users - a.users);
  }, [data?.productUsage]);

  // Export data preparation
  const exportData = useMemo(() => {
    if (!data) return { title: "", headers: [], rows: [] };
    
    return {
      title: "GitHub Activity by Status",
      headers: ["Status", "Count", "Avg Active Days (90d)", "Avg PR Days", "Avg Copilot Days", "With Activity"],
      rows: data.byStatus.map(s => [
        s.status || "Unknown",
        s.count.toString(),
        s.avgActiveDays90d.toString(),
        s.avgPrDays.toString(),
        s.avgCopilotDays.toString(),
        s.withActivity.toString(),
      ]),
    };
  }, [data]);

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error as Error} />;
  if (!data) return null;

  const { totals, averages, productUsage, byCertStatus, byStatus, topContributors } = data;

  // Calculate activity rate
  const activityRate = data.totalUsers > 0 
    ? Math.round((data.totalUsersWithActivity / data.totalUsers) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GitHub Activity</h1>
          <p className="text-muted-foreground">
            Development activity metrics across {data.totalUsers.toLocaleString()} learners
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-sm">
            <Users className="h-3 w-3 mr-1" />
            {data.totalUsersWithActivity.toLocaleString()} Active ({activityRate}%)
          </Badge>
          <ExportButton data={exportData} filename="github-activity" />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Users with Activity"
          value={data.totalUsersWithActivity.toLocaleString()}
          description={`${activityRate}% of all learners`}
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="Users with PRs"
          value={data.usersWithPRs.toLocaleString()}
          description={`${averages.prDays} avg PR days`}
          icon={<GitPullRequest className="h-4 w-4" />}
        />
        <MetricCard
          title="Copilot Users"
          value={data.usersWithCopilot.toLocaleString()}
          description={`${averages.copilotDays} avg Copilot days`}
          icon={<Bot className="h-4 w-4" />}
        />
        <MetricCard
          title="Avg Active Days (90d)"
          value={averages.activeDays90d.toString()}
          description="Days with contributions"
          icon={<Calendar className="h-4 w-4" />}
        />
      </div>

      {/* Product Usage Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Product Adoption Across Learners
          </CardTitle>
          <CardDescription>
            GitHub product usage by {data.totalUsers.toLocaleString()} learners
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-5 w-5 text-violet-600" />
                <span className="font-semibold">Copilot</span>
              </div>
              <div className="text-2xl font-bold text-violet-600">{productUsage.copilot.users.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{totals.copilotDays.toLocaleString()} total days</p>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="h-5 w-5 text-orange-600" />
                <span className="font-semibold">Actions</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">{productUsage.actions.users.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{totals.actionsDays.toLocaleString()} total days</p>
            </div>
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-red-600" />
                <span className="font-semibold">Security</span>
              </div>
              <div className="text-2xl font-bold text-red-600">{data.usersWithSecurity.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{totals.securityDays.toLocaleString()} total days</p>
            </div>
            <div className="p-4 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800">
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-5 w-5 text-cyan-600" />
                <span className="font-semibold">Code Search</span>
              </div>
              <div className="text-2xl font-bold text-cyan-600">{productUsage.codeSearch.users.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{totals.codeSearchDays.toLocaleString()} total days</p>
            </div>
          </div>

          {/* Product usage chart */}
          <SimpleBarChart 
            data={productChartData}
            dataKey="users"
            color="#8b5cf6"
          />

          {/* Additional products table */}
          <div className="mt-6 rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Product</th>
                  <th className="text-right p-3 font-medium">Users</th>
                  <th className="text-right p-3 font-medium">Total Days</th>
                  <th className="text-right p-3 font-medium">Adoption Rate</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Pull Requests", icon: <GitPullRequest className="h-4 w-4" />, ...productUsage.pullRequests },
                  { name: "Issues", icon: <MessageSquare className="h-4 w-4" />, ...productUsage.issues },
                  { name: "Copilot", icon: <Bot className="h-4 w-4" />, ...productUsage.copilot },
                  { name: "Actions", icon: <Flame className="h-4 w-4" />, ...productUsage.actions },
                  { name: "Security", icon: <Shield className="h-4 w-4" />, ...productUsage.security },
                  { name: "Projects", icon: <FileText className="h-4 w-4" />, ...productUsage.projects },
                  { name: "Packages", icon: <Package className="h-4 w-4" />, ...productUsage.packages },
                ].sort((a, b) => b.users - a.users).map((product) => (
                  <tr key={product.name} className="border-b last:border-0">
                    <td className="p-3 font-medium flex items-center gap-2">
                      {product.icon}
                      {product.name}
                    </td>
                    <td className="p-3 text-right font-mono">{product.users.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono">{product.totalDays.toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <span className="font-mono">{data.totalUsers > 0 ? Math.round(product.users / data.totalUsers * 100) : 0}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Certified vs Learning Comparison */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Activity Impact: Certified vs Non-Certified
          </CardTitle>
          <CardDescription>
            How certification correlates with GitHub activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Certified Users */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-green-500" />
                <span className="font-semibold">Certified Users</span>
                <Badge variant="secondary" className="ml-auto">
                  {byCertStatus.certified.count.toLocaleString()}
                </Badge>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Avg Active Days (90d)</span>
                    <span className="font-mono font-bold text-green-600">
                      {byCertStatus.certified.avgActiveDays90d}
                    </span>
                  </div>
                  <Progress value={Math.min(100, byCertStatus.certified.avgActiveDays90d)} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Avg PR Days</span>
                    <span className="font-mono font-bold text-green-600">
                      {byCertStatus.certified.avgPrDays}
                    </span>
                  </div>
                  <Progress value={Math.min(100, byCertStatus.certified.avgPrDays * 2)} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Avg Copilot Days</span>
                    <span className="font-mono font-bold text-green-600">
                      {byCertStatus.certified.avgCopilotDays}
                    </span>
                  </div>
                  <Progress value={Math.min(100, byCertStatus.certified.avgCopilotDays)} className="h-2" />
                </div>
              </div>
            </div>

            {/* Learning Users */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">Learning/Non-Certified</span>
                <Badge variant="secondary" className="ml-auto">
                  {byCertStatus.learning.count.toLocaleString()}
                </Badge>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Avg Active Days (90d)</span>
                    <span className="font-mono font-bold text-blue-600">
                      {byCertStatus.learning.avgActiveDays90d}
                    </span>
                  </div>
                  <Progress value={Math.min(100, byCertStatus.learning.avgActiveDays90d)} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Avg PR Days</span>
                    <span className="font-mono font-bold text-blue-600">
                      {byCertStatus.learning.avgPrDays}
                    </span>
                  </div>
                  <Progress value={Math.min(100, byCertStatus.learning.avgPrDays * 2)} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Avg Copilot Days</span>
                    <span className="font-mono font-bold text-blue-600">
                      {byCertStatus.learning.avgCopilotDays}
                    </span>
                  </div>
                  <Progress value={Math.min(100, byCertStatus.learning.avgCopilotDays)} className="h-2" />
                </div>
              </div>
            </div>
          </div>

          {/* Impact callout */}
          {byCertStatus.certified.avgActiveDays90d > byCertStatus.learning.avgActiveDays90d && (
            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              <p className="text-sm">
                <span className="font-semibold text-green-600">
                  Certified users are {Math.round((byCertStatus.certified.avgActiveDays90d / byCertStatus.learning.avgActiveDays90d - 1) * 100)}% more active
                </span>
                {" "}on GitHub (based on 90-day activity window)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity by Learner Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity by Learner Status
          </CardTitle>
          <CardDescription>Average activity metrics by certification journey stage</CardDescription>
        </CardHeader>
        <CardContent>
          {statusChartData.length > 0 && (
            <SimpleBarChart 
              data={statusChartData}
              dataKey="activeDays"
              color="#22c55e"
            />
          )}
          
          <div className="mt-6 rounded-md border overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Users</th>
                  <th className="text-right p-3 font-medium">Avg Active (90d)</th>
                  <th className="text-right p-3 font-medium">Avg PR Days</th>
                  <th className="text-right p-3 font-medium">Avg Copilot</th>
                  <th className="text-right p-3 font-medium">Avg Actions</th>
                  <th className="text-right p-3 font-medium">With Activity</th>
                </tr>
              </thead>
              <tbody>
                {byStatus.slice(0, 10).map((status) => (
                  <tr key={status.status} className="border-b last:border-0">
                    <td className="p-3 font-medium">{status.status || "Unknown"}</td>
                    <td className="p-3 text-right font-mono">{status.count.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono">{status.avgActiveDays90d}</td>
                    <td className="p-3 text-right font-mono">{status.avgPrDays}</td>
                    <td className="p-3 text-right font-mono">{status.avgCopilotDays}</td>
                    <td className="p-3 text-right font-mono">{status.avgActionsDays}</td>
                    <td className="p-3 text-right">
                      <span className="font-mono">{status.withActivity.toLocaleString()}</span>
                      <span className="text-muted-foreground text-xs ml-1">
                        ({status.count > 0 ? Math.round(status.withActivity / status.count * 100) : 0}%)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Contributors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Top Contributors
          </CardTitle>
          <CardDescription>Most active learners by total active days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">#</th>
                  <th className="text-left p-3 font-medium">Handle</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Certs</th>
                  <th className="text-right p-3 font-medium">Active Days</th>
                  <th className="text-right p-3 font-medium">Active (90d)</th>
                  <th className="text-right p-3 font-medium">PR Days</th>
                  <th className="text-right p-3 font-medium">Copilot</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {topContributors.slice(0, 15).map((contributor, idx) => (
                  <tr key={contributor.handle} className="border-b last:border-0">
                    <td className="p-3 text-muted-foreground">{idx + 1}</td>
                    <td className="p-3 font-medium font-mono text-sm">
                      {contributor.handle.length > 20 
                        ? contributor.handle.slice(0, 20) + "..." 
                        : contributor.handle}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">
                        {contributor.status || "Unknown"}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      {contributor.certifications > 0 ? (
                        <Badge variant="default" className="bg-green-600">
                          {contributor.certifications}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-bold">{contributor.totalActiveDays}</td>
                    <td className="p-3 text-right font-mono">{contributor.activeDays90d}</td>
                    <td className="p-3 text-right font-mono">{contributor.prDays}</td>
                    <td className="p-3 text-right font-mono">{contributor.copilotDays}</td>
                    <td className="p-3 text-right font-mono">{contributor.actionsDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Total Engagement Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Total Engagement Summary
          </CardTitle>
          <CardDescription>Aggregate metrics across all learners</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold text-primary">{totals.activeDays.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Total Active Days</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{totals.prDays.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Total PR Days</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{totals.issuesDays.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Total Issue Days</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold text-violet-600">{totals.copilotDays.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Total Copilot Days</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold text-amber-600">{totals.engagementEvents.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Total Engagement Events</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
