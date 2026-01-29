"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Users, Clock, Award, Zap, TrendingUp, Target, BarChart2 } from "lucide-react";
import { SimpleBarChart, SimpleAreaChart } from "@/components/dashboard/charts";

// Progression metrics
const progressionMetrics = {
  learnersInProgress: 3375,
  inProgressPercentage: 67.5,
  certifiedLast90Days: 487,
  recentCertPercentage: 30,
  medianDaysToCert: 62,
  powerUsers: 423,
  powerUserPercentage: 8.5,
};

// Journey stage distribution
const journeyStageData = [
  { name: "New Learner", value: 875 },
  { name: "Active Learner", value: 1450 },
  { name: "Engaged", value: 1050 },
  { name: "Certified", value: 892 },
  { name: "Power User", value: 423 },
  { name: "Champion", value: 210 },
];

// Days to certification distribution
const certificationTimeData = [
  { name: "0-30", value: 125 },
  { name: "31-60", value: 298 },
  { name: "61-90", value: 312 },
  { name: "91-120", value: 245 },
  { name: "121-150", value: 178 },
  { name: "151-180", value: 134 },
  { name: "180+", value: 333 },
];

// Engagement by stage
const engagementByStage = [
  { name: "New Learner", power: 25, heavy: 125, medium: 725 },
  { name: "Active Learner", power: 145, heavy: 450, medium: 855 },
  { name: "Engaged", power: 210, heavy: 425, medium: 415 },
  { name: "Certified", power: 312, heavy: 380, medium: 200 },
  { name: "Power User", power: 423, heavy: 0, medium: 0 },
];

// Fast track vs steady learners
const progressionPaths = {
  fastTrack: {
    count: 423,
    avgEvents: 89,
    avgROI: 4.2,
    topProducts: [
      { name: "GitHub Copilot", count: 245 },
      { name: "GitHub Actions", count: 125 },
      { name: "Advanced Security", count: 53 },
    ],
  },
  steadyProgress: {
    count: 892,
    avgEvents: 156,
    avgROI: 3.8,
    topProducts: [
      { name: "GitHub Copilot", count: 412 },
      { name: "GitHub Actions", count: 298 },
      { name: "Advanced Security", count: 182 },
    ],
  },
};

// Weekly progression trend
const weeklyTrend = [
  { name: "Week 1", newLearners: 125, certified: 12, active: 890 },
  { name: "Week 2", newLearners: 145, certified: 18, active: 920 },
  { name: "Week 3", newLearners: 112, certified: 24, active: 945 },
  { name: "Week 4", newLearners: 168, certified: 31, active: 985 },
  { name: "Week 5", newLearners: 134, certified: 28, active: 1020 },
  { name: "Week 6", newLearners: 156, certified: 35, active: 1065 },
  { name: "Week 7", newLearners: 142, certified: 42, active: 1098 },
  { name: "Week 8", newLearners: 178, certified: 38, active: 1145 },
];

export default function ProgressionTrackingPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Learner Progression Tracking</h1>
        <p className="text-muted-foreground mt-1">
          Track how learners progress through their journey over time
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Learners In Progress</CardDescription>
            <CardTitle className="text-2xl">{progressionMetrics.learnersInProgress.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {progressionMetrics.inProgressPercentage}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Certified (Last 90d)</CardDescription>
            <CardTitle className="text-2xl">{progressionMetrics.certifiedLast90Days.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {progressionMetrics.recentCertPercentage}% of certified
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Median Days to Cert</CardDescription>
            <CardTitle className="text-2xl">{progressionMetrics.medianDaysToCert} days</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              From first activity
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Power Users</CardDescription>
            <CardTitle className="text-2xl">{progressionMetrics.powerUsers.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {progressionMetrics.powerUserPercentage}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Journey Stage Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              Journey Stage Distribution
            </CardTitle>
            <CardDescription>Current distribution across journey stages</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart 
              data={journeyStageData} 
              dataKey="value" 
              color="#8b5cf6"
            />
          </CardContent>
        </Card>

        {/* Time to Certification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time to Certification Distribution
            </CardTitle>
            <CardDescription>Days from first activity to certification</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart 
              data={certificationTimeData} 
              dataKey="value" 
              color="#3b82f6"
            />
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="w-3 h-0.5 bg-red-500" />
              <span>Median: 62 days</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Weekly Progression Trend
          </CardTitle>
          <CardDescription>New learners, certifications, and active users over time</CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleAreaChart 
            data={weeklyTrend} 
            dataKey="active" 
            secondaryDataKey="newLearners"
            color="#8b5cf6"
            secondaryColor="#22c55e"
          />
          <div className="mt-4 flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-violet-500" />
              <span>Active Users</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>New Learners</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progression Patterns */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fast Track Learners */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Fast Track Learners
            </CardTitle>
            <CardDescription>Certified in less than 60 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{progressionPaths.fastTrack.count}</p>
                  <p className="text-xs text-muted-foreground">Count</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{progressionPaths.fastTrack.avgEvents}</p>
                  <p className="text-xs text-muted-foreground">Avg Events</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{progressionPaths.fastTrack.avgROI}x</p>
                  <p className="text-xs text-muted-foreground">Avg ROI</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Top Learning Focus:</p>
                {progressionPaths.fastTrack.topProducts.map((product) => (
                  <div key={product.name} className="flex justify-between text-sm py-1">
                    <span className="text-muted-foreground">{product.name}</span>
                    <span>{product.count} users</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Steady Progress Learners */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Steady Progress Learners
            </CardTitle>
            <CardDescription>Certified in 60-180 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{progressionPaths.steadyProgress.count}</p>
                  <p className="text-xs text-muted-foreground">Count</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{progressionPaths.steadyProgress.avgEvents}</p>
                  <p className="text-xs text-muted-foreground">Avg Events</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{progressionPaths.steadyProgress.avgROI}x</p>
                  <p className="text-xs text-muted-foreground">Avg ROI</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Top Learning Focus:</p>
                {progressionPaths.steadyProgress.topProducts.map((product) => (
                  <div key={product.name} className="flex justify-between text-sm py-1">
                    <span className="text-muted-foreground">{product.name}</span>
                    <span>{product.count} users</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement by Stage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Engagement Level by Journey Stage
          </CardTitle>
          <CardDescription>Distribution of engagement intensity across stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {engagementByStage.map((stage) => {
              const total = stage.power + stage.heavy + stage.medium;
              return (
                <div key={stage.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{stage.name}</span>
                    <span className="text-muted-foreground">{total.toLocaleString()} users</span>
                  </div>
                  <div className="flex h-4 rounded-full overflow-hidden">
                    {stage.power > 0 && (
                      <div 
                        className="bg-purple-500" 
                        style={{ width: `${(stage.power / total) * 100}%` }}
                        title={`Power: ${stage.power}`}
                      />
                    )}
                    {stage.heavy > 0 && (
                      <div 
                        className="bg-violet-400" 
                        style={{ width: `${(stage.heavy / total) * 100}%` }}
                        title={`Heavy: ${stage.heavy}`}
                      />
                    )}
                    {stage.medium > 0 && (
                      <div 
                        className="bg-violet-200 dark:bg-violet-800" 
                        style={{ width: `${(stage.medium / total) * 100}%` }}
                        title={`Medium: ${stage.medium}`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
            <div className="flex justify-center gap-6 text-sm mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span>Power</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-violet-400" />
                <span>Heavy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-violet-200 dark:bg-violet-800" />
                <span>Medium</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
