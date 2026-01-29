"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Database, Server, Clock, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";

const systemStatus = [
  { name: "Kusto Database", status: "healthy", latency: "45ms", lastCheck: "1 min ago" },
  { name: "Data Sync Service", status: "healthy", latency: "120ms", lastCheck: "2 min ago" },
  { name: "API Gateway", status: "healthy", latency: "23ms", lastCheck: "1 min ago" },
  { name: "Cache Layer", status: "warning", latency: "250ms", lastCheck: "1 min ago" },
];

const dataMetrics = [
  { name: "Learner Records", count: "4,586", lastUpdated: "5 min ago", status: "synced" },
  { name: "Event Logs", count: "1.2M", lastUpdated: "2 min ago", status: "synced" },
  { name: "Certification Data", count: "1,256", lastUpdated: "10 min ago", status: "synced" },
  { name: "Usage Analytics", count: "850K", lastUpdated: "1 hour ago", status: "stale" },
];

const recentSyncs = [
  { source: "learner_journey.csv", records: 4586, duration: "2.3s", status: "success", time: "5 min ago" },
  { source: "certified_users.csv", records: 1256, duration: "1.1s", status: "success", time: "10 min ago" },
  { source: "events.csv", records: 12450, duration: "4.8s", status: "success", time: "15 min ago" },
  { source: "product_usage.csv", records: 8920, duration: "3.2s", status: "warning", time: "1 hour ago" },
];

export default function HealthCheckPage() {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'success':
      case 'synced':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
      case 'stale':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'success':
      case 'synced':
        return <Badge className="bg-green-100 text-green-700">Healthy</Badge>;
      case 'warning':
      case 'stale':
        return <Badge className="bg-yellow-100 text-yellow-700">Warning</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-700">Error</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground">
            Monitor system status and data synchronization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            All Systems Operational
          </Badge>
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Server className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">99.9%</div>
                <p className="text-xs text-muted-foreground">Uptime (30d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">45ms</div>
                <p className="text-xs text-muted-foreground">Avg Latency</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <Database className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">1.2M</div>
                <p className="text-xs text-muted-foreground">Total Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Wifi className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">4/4</div>
                <p className="text-xs text-muted-foreground">Services Online</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Service health and latency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemStatus.map((system) => (
                <div key={system.name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(system.status)}
                    <div>
                      <p className="font-medium">{system.name}</p>
                      <p className="text-xs text-muted-foreground">Last check: {system.lastCheck}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">{system.latency}</span>
                    {getStatusBadge(system.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Data Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Data Metrics</CardTitle>
            <CardDescription>Record counts and sync status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dataMetrics.map((metric) => (
                <div key={metric.name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(metric.status)}
                    <div>
                      <p className="font-medium">{metric.name}</p>
                      <p className="text-xs text-muted-foreground">Updated: {metric.lastUpdated}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-medium">{metric.count}</p>
                    <p className="text-xs text-muted-foreground">records</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Syncs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Data Syncs</CardTitle>
          <CardDescription>Latest synchronization operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-5 gap-4 p-4 bg-muted/50 text-sm font-medium">
              <div>Source</div>
              <div className="text-right">Records</div>
              <div className="text-right">Duration</div>
              <div>Status</div>
              <div className="text-right">Time</div>
            </div>
            {recentSyncs.map((sync, index) => (
              <div key={index} className="grid grid-cols-5 gap-4 p-4 border-t items-center">
                <div className="font-mono text-sm">{sync.source}</div>
                <div className="text-right font-mono">{sync.records.toLocaleString()}</div>
                <div className="text-right text-muted-foreground">{sync.duration}</div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(sync.status)}
                  <span className="text-sm capitalize">{sync.status}</span>
                </div>
                <div className="text-right text-sm text-muted-foreground">{sync.time}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
