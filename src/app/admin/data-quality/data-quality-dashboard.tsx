"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Database,
  RefreshCw,
  FileText,
  Activity,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExploreInKusto } from "@/components/explore-in-kusto";

interface QualityCheck {
  name: string;
  passed: boolean;
  message: string;
  severity: string;
  category: string;
  details: Record<string, any>;
  timestamp: string;
}

interface QualitySummary {
  total_checks: number;
  passed: number;
  failed: number;
  errors: number;
  warnings: number;
}

interface QualityReport {
  available: boolean;
  timestamp?: string;
  summary?: QualitySummary;
  by_category?: Record<string, { passed: number; failed: number }>;
  failed_checks?: QualityCheck[];
}

interface SyncStatus {
  available: boolean;
  sources?: Record<string, {
    last_sync: string;
    status: string;
    rows: number;
    error?: string;
  }>;
}

interface HealthData {
  status: string;
  data_freshness: {
    file_exists: boolean;
    last_modified: string | null;
    hours_since_update: number | null;
    is_fresh: boolean;
  };
  sync_status: Record<string, any> | null;
}

async function fetchDataQuality(): Promise<QualityReport> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const response = await fetch(`${baseUrl}/api/data-quality`);
  if (!response.ok) throw new Error("Failed to fetch quality report");
  return response.json();
}

async function fetchSyncStatus(): Promise<SyncStatus> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const response = await fetch(`${baseUrl}/api/sync-status`);
  if (!response.ok) throw new Error("Failed to fetch sync status");
  return response.json();
}

async function fetchHealth(): Promise<HealthData> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const response = await fetch(`${baseUrl}/health/data`);
  if (!response.ok) throw new Error("Failed to fetch health data");
  return response.json();
}

export function DataQualityDashboard() {
  const { data: qualityData, isLoading: qualityLoading, refetch: refetchQuality } = useQuery({
    queryKey: ["data-quality-admin"],
    queryFn: fetchDataQuality,
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  const { data: syncData, isLoading: syncLoading, refetch: refetchSync } = useQuery({
    queryKey: ["sync-status"],
    queryFn: fetchSyncStatus,
    refetchInterval: 60 * 1000,
  });

  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ["health-data"],
    queryFn: fetchHealth,
    refetchInterval: 30 * 1000,
  });

  const isLoading = qualityLoading || syncLoading || healthLoading;

  const handleRefreshAll = () => {
    refetchQuality();
    refetchSync();
    refetchHealth();
  };

  // Calculate overall health
  const overallStatus = healthData?.status || "unknown";
  const qualityScore = qualityData?.summary 
    ? (qualityData.summary.passed / qualityData.summary.total_checks * 100) 
    : 0;

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Quality Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor data quality, freshness, and sync status
          </p>
        </div>
        <Button onClick={handleRefreshAll} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh All
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Overall Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Overall Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {overallStatus === "healthy" ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : overallStatus === "degraded" ? (
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              ) : (
                <XCircle className="h-8 w-8 text-red-500" />
              )}
              <span className="text-2xl font-bold capitalize">{overallStatus}</span>
            </div>
          </CardContent>
        </Card>

        {/* Quality Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Quality Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{qualityScore.toFixed(0)}%</div>
            <Progress value={qualityScore} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {qualityData?.summary?.passed || 0}/{qualityData?.summary?.total_checks || 0} checks passed
            </p>
          </CardContent>
        </Card>

        {/* Data Freshness */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Data Freshness
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthData?.data_freshness ? (
              <>
                <div className="flex items-center gap-2">
                  {healthData.data_freshness.is_fresh ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-yellow-500" />
                  )}
                  <span className="text-lg font-medium">
                    {healthData.data_freshness.hours_since_update?.toFixed(1) ?? "?"} hours ago
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Threshold: 24 hours
                </p>
              </>
            ) : (
              <span className="text-muted-foreground">No data</span>
            )}
          </CardContent>
        </Card>

        {/* Active Sources */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {syncData?.sources ? Object.keys(syncData.sources).length : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active sync sources
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="quality" className="space-y-4">
        <TabsList>
          <TabsTrigger value="quality">Quality Checks</TabsTrigger>
          <TabsTrigger value="sync">Sync Status</TabsTrigger>
          <TabsTrigger value="failed">Failed Checks</TabsTrigger>
        </TabsList>

        {/* Quality Checks */}
        <TabsContent value="quality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality Checks by Category</CardTitle>
              <CardDescription>
                Breakdown of data quality checks by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              {qualityData?.by_category ? (
                <div className="space-y-4">
                  {Object.entries(qualityData.by_category).map(([category, stats]) => {
                    const total = stats.passed + stats.failed;
                    const passRate = total > 0 ? (stats.passed / total * 100) : 0;
                    
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium capitalize">{category}</span>
                          <span className="text-sm text-muted-foreground">
                            {stats.passed}/{total} passed
                          </span>
                        </div>
                        <Progress value={passRate} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No quality report available. Run validate-data-quality.py to generate.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quality Summary */}
          {qualityData?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{qualityData.summary.total_checks}</div>
                    <p className="text-xs text-muted-foreground">Total Checks</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{qualityData.summary.passed}</div>
                    <p className="text-xs text-muted-foreground">Passed</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{qualityData.summary.failed}</div>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{qualityData.summary.errors}</div>
                    <p className="text-xs text-muted-foreground">Errors</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{qualityData.summary.warnings}</div>
                    <p className="text-xs text-muted-foreground">Warnings</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Sync Status */}
        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Source Sync Status</CardTitle>
              <CardDescription>
                Status of all data synchronization sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              {syncData?.sources ? (
                <div className="space-y-3">
                  {Object.entries(syncData.sources).map(([source, info]) => (
                    <div 
                      key={source}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {info.status === "success" ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : info.status === "error" ? (
                          <XCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        )}
                        <div>
                          <div className="font-medium">{source}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(info.last_sync).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={info.status === "success" ? "outline" : "destructive"}>
                          {info.status}
                        </Badge>
                        {info.rows > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {info.rows.toLocaleString()} rows
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No sync status available. Run sync-enriched-learners.py to sync data.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Failed Checks */}
        <TabsContent value="failed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Failed Quality Checks</CardTitle>
              <CardDescription>
                Checks that need attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {qualityData?.failed_checks && qualityData.failed_checks.length > 0 ? (
                <div className="space-y-4">
                  {qualityData.failed_checks.map((check, index) => (
                    <div 
                      key={index}
                      className="p-4 border rounded-lg bg-red-50 dark:bg-red-950"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {check.severity === "error" ? (
                            <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                          )}
                          <div>
                            <div className="font-medium">{check.name}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {check.message}
                            </div>
                            <Badge variant="outline" className="mt-2">
                              {check.category}
                            </Badge>
                          </div>
                        </div>
                        <Badge variant={check.severity === "error" ? "destructive" : "secondary"}>
                          {check.severity}
                        </Badge>
                      </div>
                      {check.details && Object.keys(check.details).length > 0 && (
                        <div className="mt-3 p-2 bg-muted rounded text-xs font-mono">
                          {JSON.stringify(check.details, null, 2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    All quality checks passed!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Helpful Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Helpful Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="https://data.githubapp.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border rounded-lg hover:bg-muted transition-colors"
            >
              <h4 className="font-medium">Data Dot</h4>
              <p className="text-sm text-muted-foreground">
                Explore table schemas and documentation
              </p>
            </a>
            <a
              href="https://github.com/github/data"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border rounded-lg hover:bg-muted transition-colors"
            >
              <h4 className="font-medium">GitHub Data Repo</h4>
              <p className="text-sm text-muted-foreground">
                Data team documentation and resources
              </p>
            </a>
            <ExploreInKusto
              query="canonical_accounts_current | take 10"
              database="canonical"
              label="Open Kusto Explorer"
              variant="outline"
              size="default"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
