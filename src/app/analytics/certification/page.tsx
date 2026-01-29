"use client";

import { MetricCard, DonutChart, SimpleBarChart } from "@/components/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, TrendingUp, Calendar, Clock } from "lucide-react";

// Sample certification data
const certificationsByPath = [
  { name: "GitHub Foundations", value: 456, color: "#22c55e" },
  { name: "GitHub Actions", value: 324, color: "#3b82f6" },
  { name: "GitHub Copilot", value: 287, color: "#8b5cf6" },
  { name: "Advanced Security", value: 189, color: "#f59e0b" },
];

const monthlyData = [
  { name: "Jul", certifications: 85, target: 100 },
  { name: "Aug", certifications: 112, target: 100 },
  { name: "Sep", certifications: 98, target: 110 },
  { name: "Oct", certifications: 145, target: 120 },
  { name: "Nov", certifications: 168, target: 130 },
  { name: "Dec", certifications: 192, target: 140 },
];

const recentCertifications = [
  { name: "Lisa Anderson", certification: "GitHub Actions", date: "Jan 28, 2026", score: 92 },
  { name: "Mike Johnson", certification: "GitHub Copilot", date: "Jan 27, 2026", score: 88 },
  { name: "Sarah Chen", certification: "GitHub Foundations", date: "Jan 26, 2026", score: 95 },
  { name: "David Kim", certification: "Advanced Security", date: "Jan 25, 2026", score: 91 },
  { name: "Emily Davis", certification: "GitHub Actions", date: "Jan 24, 2026", score: 86 },
];

export default function CertificationROIPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Certification Analytics</h1>
          <p className="text-muted-foreground">
            Track certification progress and ROI metrics
          </p>
        </div>
        <Badge variant="outline" className="text-sm bg-green-50 text-green-700 border-green-200">
          <Award className="h-3 w-3 mr-1" />
          1,256 Certified
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Certified"
          value="1,256"
          description="All-time certifications"
          trend={{ value: 23.1, isPositive: true }}
          icon={<Award className="h-4 w-4" />}
        />
        <MetricCard
          title="This Month"
          value="192"
          description="New certifications"
          trend={{ value: 14.3, isPositive: true }}
          icon={<Calendar className="h-4 w-4" />}
        />
        <MetricCard
          title="Pass Rate"
          value="87%"
          description="First attempt success"
          trend={{ value: 3.2, isPositive: true }}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          title="Avg. Study Time"
          value="18 days"
          description="To certification"
          trend={{ value: 2.1, isPositive: false }}
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Certifications by Path</CardTitle>
            <CardDescription>Distribution across programs</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={certificationsByPath} />
          </CardContent>
        </Card>

        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Monthly Certifications</CardTitle>
            <CardDescription>Actual vs target</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart 
              data={monthlyData} 
              dataKey="certifications"
              secondaryDataKey="target"
              color="#22c55e"
              secondaryColor="#94a3b8"
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Certifications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Certifications</CardTitle>
          <CardDescription>Latest achievements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 text-sm font-medium">
              <div>Learner</div>
              <div>Certification</div>
              <div>Date</div>
              <div className="text-right">Score</div>
            </div>
            {recentCertifications.map((cert) => (
              <div key={`${cert.name}-${cert.date}`} className="grid grid-cols-4 gap-4 p-4 border-t items-center">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Award className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="font-medium">{cert.name}</span>
                </div>
                <div className="text-sm">{cert.certification}</div>
                <div className="text-sm text-muted-foreground">{cert.date}</div>
                <div className="text-right">
                  <Badge variant="secondary" className="text-green-600">{cert.score}%</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
