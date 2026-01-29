"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Database, Bell, Palette, Shield, RefreshCw, Save, User } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage application preferences and configurations
          </p>
        </div>
        <Button className="gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Data Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Sources
            </CardTitle>
            <CardDescription>Configure data connections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kusto Cluster URL</label>
              <Input placeholder="https://your-cluster.kusto.windows.net" defaultValue="https://learning-cluster.kusto.windows.net" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Database Name</label>
              <Input placeholder="database-name" defaultValue="LearningAnalytics" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-sync Data</p>
                <p className="text-xs text-muted-foreground">Sync data every 15 minutes</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Button variant="outline" className="w-full gap-2">
              <RefreshCw className="h-4 w-4" />
              Test Connection
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Alert and notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-muted-foreground">Receive alerts via email</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Slack Integration</p>
                <p className="text-xs text-muted-foreground">Send alerts to Slack</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Weekly Reports</p>
                <p className="text-xs text-muted-foreground">Automated weekly summaries</p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Milestone Alerts</p>
                <p className="text-xs text-muted-foreground">Notify on target achievements</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize the look and feel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Use dark color scheme</p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Compact View</p>
                <p className="text-xs text-muted-foreground">Reduce spacing and padding</p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Show Animations</p>
                <p className="text-xs text-muted-foreground">Enable chart animations</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Access and authentication settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Two-Factor Authentication</p>
                <p className="text-xs text-muted-foreground">Extra layer of security</p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700">Enabled</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">SSO Provider</p>
                <p className="text-xs text-muted-foreground">Azure Active Directory</p>
              </div>
              <Badge variant="outline">Connected</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">API Key</p>
                <p className="text-xs text-muted-foreground">For external integrations</p>
              </div>
              <Button variant="outline" size="sm">Regenerate</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Session Timeout</p>
                <p className="text-xs text-muted-foreground">Auto-logout after inactivity</p>
              </div>
              <Badge variant="outline">30 minutes</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profile
          </CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Display Name</label>
              <Input defaultValue="Admin User" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input defaultValue="admin@company.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Input defaultValue="Administrator" disabled />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <Input defaultValue="Learning & Development" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
