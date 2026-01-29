"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, AlertTriangle, CheckCircle, Info, XCircle, Settings, Plus, Trash2 } from "lucide-react";

// Sample alerts data
const activeAlerts = [
  { id: 1, type: "warning", title: "Low Course Completion Rate", message: "GitHub Admin course has 32% completion rate, below 50% threshold", timestamp: "2 hours ago", acknowledged: false },
  { id: 2, type: "error", title: "Data Sync Failed", message: "Last sync attempt failed for certified_users.csv", timestamp: "4 hours ago", acknowledged: false },
  { id: 3, type: "info", title: "New Certifications", message: "15 new certifications recorded today", timestamp: "6 hours ago", acknowledged: true },
  { id: 4, type: "success", title: "Target Achieved", message: "Q4 certification target of 1,200 has been exceeded", timestamp: "1 day ago", acknowledged: true },
  { id: 5, type: "warning", title: "Inactive Learners", message: "47 learners have not logged in for 30+ days", timestamp: "1 day ago", acknowledged: false },
];

const alertRules = [
  { id: 1, name: "Low Completion Rate", condition: "Course completion < 50%", enabled: true, notifications: "Email, Slack" },
  { id: 2, name: "Inactive Learners", condition: "No activity for 30 days", enabled: true, notifications: "Email" },
  { id: 3, name: "Certification Milestones", condition: "Target reached or exceeded", enabled: true, notifications: "Email, Slack" },
  { id: 4, name: "Data Sync Failures", condition: "Sync fails 3+ times", enabled: true, notifications: "Slack" },
  { id: 5, name: "New Enrollments", condition: "50+ enrollments in a day", enabled: false, notifications: "Email" },
];

export default function AlertsDashboardPage() {
  const [alerts, setAlerts] = useState(activeAlerts);
  const [rules, setRules] = useState(alertRules);

  const acknowledgeAlert = (id: number) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, acknowledged: true } : alert
    ));
  };

  const toggleRule = (id: number) => {
    setRules(rules.map(rule =>
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />;
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />;
      default: return <Info className="h-5 w-5 text-blue-500 dark:text-blue-400" />;
    }
  };

  const getAlertBg = (type: string) => {
    switch (type) {
      case 'error': return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800';
      case 'success': return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800';
      default: return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
    }
  };

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage system alerts and notifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unacknowledgedCount > 0 && (
            <Badge variant="destructive">
              {unacknowledgedCount} unread
            </Badge>
          )}
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-full">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{alerts.filter(a => a.type === 'error').length}</div>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/40 rounded-full">
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{alerts.filter(a => a.type === 'warning').length}</div>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-full">
                <Info className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{alerts.filter(a => a.type === 'info').length}</div>
                <p className="text-xs text-muted-foreground">Info</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{alerts.filter(a => a.type === 'success').length}</div>
                <p className="text-xs text-muted-foreground">Success</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Active Alerts
            </CardTitle>
            <CardDescription>Recent system notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-4 rounded-lg border ${getAlertBg(alert.type)} ${alert.acknowledged ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{alert.title}</p>
                        <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                    </div>
                    {!alert.acknowledged && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alert Rules */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Alert Rules</CardTitle>
                <CardDescription>Configure notification triggers</CardDescription>
              </div>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Rule
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{rule.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {rule.notifications}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{rule.condition}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch 
                      checked={rule.enabled}
                      onCheckedChange={() => toggleRule(rule.id)}
                    />
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
