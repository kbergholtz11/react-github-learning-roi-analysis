"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  Clock, 
  Database, 
  Zap, 
  RefreshCw, 
  Trash2,
  CheckCircle,
  AlertCircle,
  Server,
  HardDrive
} from "lucide-react";
import { DonutChart, SimpleBarChart } from "@/components/dashboard/charts";

// Performance metrics
const performanceMetrics = {
  uptime: "12d 4h 32m",
  totalQueries: 45892,
  successRate: 99.2,
  cacheHitRate: 87.3,
};

// Cache metrics
const cacheMetrics = {
  currentSize: 1247,
  maxSize: 2000,
  totalHits: 39412,
  totalMisses: 6480,
  memoryMB: 128.4,
};

// Query types performance
const queryTypeData = [
  { 
    name: "learner_journey",
    executions: 12450,
    successRate: 99.5,
    avgTimeMs: 45,
    p95TimeMs: 120,
    cacheHitRate: 92,
    totalRows: 1245000
  },
  { 
    name: "certification_stats",
    executions: 8920,
    successRate: 99.8,
    avgTimeMs: 32,
    p95TimeMs: 85,
    cacheHitRate: 95,
    totalRows: 892000
  },
  { 
    name: "product_usage",
    executions: 6780,
    successRate: 98.9,
    avgTimeMs: 78,
    p95TimeMs: 210,
    cacheHitRate: 85,
    totalRows: 678000
  },
  { 
    name: "event_analytics",
    executions: 4520,
    successRate: 99.1,
    avgTimeMs: 56,
    p95TimeMs: 145,
    cacheHitRate: 88,
    totalRows: 452000
  },
];

// Circuit breakers
const circuitBreakers = [
  { name: "kusto-primary", state: "closed", failureCount: 0, threshold: 5, timeout: 60 },
  { name: "kusto-secondary", state: "closed", failureCount: 1, threshold: 5, timeout: 60 },
  { name: "cache-redis", state: "closed", failureCount: 0, threshold: 3, timeout: 30 },
];

// Slow queries
const slowQueries = [
  { query: "complex_aggregation", timeMs: 5420, timestamp: "14:32:15", rows: 125000 },
  { query: "full_table_scan", timeMs: 6180, timestamp: "12:18:42", rows: 500000 },
  { query: "join_operation", timeMs: 5890, timestamp: "10:05:33", rows: 245000 },
];

// Chart data
const cacheHitMissData = [
  { name: "Hits", value: 39412, color: "#22c55e" },
  { name: "Misses", value: 6480, color: "#ef4444" },
];

const queryTimeData = queryTypeData.map(q => ({
  name: q.name.replace("_", " "),
  avgTime: q.avgTimeMs,
  p95Time: q.p95TimeMs,
}));

function getStateColor(state: string): string {
  switch (state) {
    case "closed": return "bg-green-500";
    case "open": return "bg-red-500";
    case "half_open": return "bg-yellow-500";
    default: return "bg-gray-500";
  }
}

function getStateEmoji(state: string): string {
  switch (state) {
    case "closed": return "🟢";
    case "open": return "🔴";
    case "half_open": return "🟡";
    default: return "⚪";
  }
}

export default function PerformanceDashboardPage() {
  const handleClearCache = () => {
    alert("Cache cleared! (Demo)");
  };

  const handleResetMetrics = () => {
    alert("Metrics reset! (Demo)");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Performance Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Monitor query performance, cache efficiency, and system health
        </p>
      </div>

      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Uptime</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" />
              {performanceMetrics.uptime}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Since last restart
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Queries</CardDescription>
            <CardTitle className="text-2xl">{performanceMetrics.totalQueries.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Queries executed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Success Rate</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              {performanceMetrics.successRate}%
              <CheckCircle className="h-5 w-5 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={performanceMetrics.successRate} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cache Hit Rate</CardDescription>
            <CardTitle className="text-2xl">{performanceMetrics.cacheHitRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={performanceMetrics.cacheHitRate} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Cache Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cache Performance
          </CardTitle>
          <CardDescription>Query cache statistics and efficiency</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Cache Size</p>
                  <p className="text-2xl font-bold">{cacheMetrics.currentSize} / {cacheMetrics.maxSize}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Memory Usage</p>
                  <p className="text-2xl font-bold">{cacheMetrics.memoryMB} MB</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Cache Hits</p>
                  <p className="text-2xl font-bold text-green-600">{cacheMetrics.totalHits.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Cache Misses</p>
                  <p className="text-2xl font-bold text-red-600">{cacheMetrics.totalMisses.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div>
              <DonutChart data={cacheHitMissData} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Query Performance by Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Query Performance by Type
          </CardTitle>
          <CardDescription>Execution metrics for different query types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b">
                  <th className="pb-3 font-medium">Query Type</th>
                  <th className="pb-3 font-medium text-right">Executions</th>
                  <th className="pb-3 font-medium text-right">Success Rate</th>
                  <th className="pb-3 font-medium text-right">Avg Time</th>
                  <th className="pb-3 font-medium text-right">P95 Time</th>
                  <th className="pb-3 font-medium text-right">Cache Hit</th>
                </tr>
              </thead>
              <tbody>
                {queryTypeData.map((query) => (
                  <tr key={query.name} className="border-b last:border-0">
                    <td className="py-4 font-medium">{query.name}</td>
                    <td className="py-4 text-right">{query.executions.toLocaleString()}</td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress value={query.successRate} className="w-16 h-2" />
                        <span className="w-12">{query.successRate}%</span>
                      </div>
                    </td>
                    <td className="py-4 text-right">{query.avgTimeMs}ms</td>
                    <td className="py-4 text-right">{query.p95TimeMs}ms</td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress value={query.cacheHitRate} className="w-16 h-2" />
                        <span className="w-12">{query.cacheHitRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Slow Queries and Circuit Breakers */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Slow Queries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Slow Queries (&gt;5 seconds)
            </CardTitle>
            <CardDescription>Recent queries that exceeded threshold</CardDescription>
          </CardHeader>
          <CardContent>
            {slowQueries.length > 0 ? (
              <div className="space-y-3">
                {slowQueries.map((query, index) => (
                  <div key={index} className="p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/20">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{query.query}</p>
                        <p className="text-xs text-muted-foreground">{query.timestamp}</p>
                      </div>
                      <Badge variant="destructive">{query.timeMs}ms</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{query.rows.toLocaleString()} rows returned</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                <p className="text-sm text-muted-foreground">No slow queries detected!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Circuit Breakers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Circuit Breakers
            </CardTitle>
            <CardDescription>Service connection health status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {circuitBreakers.map((cb) => (
                <div key={cb.name} className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{getStateEmoji(cb.state)}</span>
                      <span className="font-medium">{cb.name}</span>
                    </div>
                    <Badge 
                      variant={cb.state === "closed" ? "default" : "destructive"}
                      className={cb.state === "closed" ? "bg-green-500" : ""}
                    >
                      {cb.state.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Failures</p>
                      <p className="font-medium">{cb.failureCount} / {cb.threshold}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Threshold</p>
                      <p className="font-medium">{cb.threshold}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Timeout</p>
                      <p className="font-medium">{cb.timeout}s</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Actions
          </CardTitle>
          <CardDescription>Administrative actions for cache and metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="outline" onClick={handleClearCache} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Clear Query Cache
            </Button>
            <Button variant="outline" onClick={handleResetMetrics} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reset Metrics
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
