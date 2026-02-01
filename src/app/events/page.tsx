"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard, SimpleBarChart, SimpleAreaChart } from "@/components/dashboard";
import { ExportButton } from "@/components/export-button";
import { 
  Calendar, 
  Users, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  Award,
  AlertCircle,
  BarChart3,
  Target
} from "lucide-react";
import { useEvents } from "@/hooks/use-unified-data";

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
      <Skeleton className="h-64" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Failed to load events data</h2>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <p className="text-sm text-muted-foreground">
        Run <code className="bg-muted px-1 rounded">npm run aggregate-data</code> to generate events data.
      </p>
    </div>
  );
}

export default function EventsDashboardPage() {
  const { data, isLoading, error } = useEvents();

  // Prepare chart data
  const monthlyChartData = useMemo(() => {
    if (!data?.monthlyTrends) return [];
    return data.monthlyTrends.slice(-12).map(m => ({
      name: m.month.slice(5), // MM format
      registered: m.registered,
      attended: m.attended,
      attendanceRate: m.attendanceRate,
    }));
  }, [data?.monthlyTrends]);

  const categoryChartData = useMemo(() => {
    if (!data?.categoryBreakdown) return [];
    return data.categoryBreakdown.slice(0, 8).map(c => ({
      name: c.category || "Other",
      users: c.users,
      attendanceRate: c.attendanceRate,
    }));
  }, [data?.categoryBreakdown]);

  // Export data preparation
  const exportData = useMemo(() => {
    if (!data) return { title: "", headers: [], rows: [] };
    return {
      title: "Events Analytics",
      headers: ["Handle", "Registered", "Attended", "No Shows", "Categories", "First Event"],
      rows: (data.topAttendees || []).map(a => [
        a.handle,
        a.registered.toString(),
        a.attended.toString(),
        a.noShows.toString(),
        a.categories.join(", "),
        a.firstEvent?.split("T")[0] || "",
      ]),
    };
  }, [data]);

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error as Error} />;
  if (!data) return null;

  const { summary, impact, categoryBreakdown, topAttendees } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events & Engagement</h1>
          <p className="text-muted-foreground">
            Bootcamps, workshops, and partner events driving learning engagement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Calendar className="h-3 w-3 mr-1" />
            {summary.totalUsers.toLocaleString()} Attendees
          </Badge>
          <ExportButton data={exportData} filename="events-analytics" />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Registrations"
          value={summary.totalRegistrations.toLocaleString()}
          description="Event sign-ups"
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="Total Attended"
          value={summary.totalAttended.toLocaleString()}
          description="Actual attendance"
          icon={<CheckCircle2 className="h-4 w-4" />}
          trend={{ value: summary.attendanceRate, isPositive: summary.attendanceRate > 70 }}
        />
        <MetricCard
          title="Attendance Rate"
          value={`${summary.attendanceRate}%`}
          description="Show-up rate"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          title="No Shows"
          value={summary.totalNoShows.toLocaleString()}
          description="Missed events"
          icon={<XCircle className="h-4 w-4" />}
        />
      </div>

      {/* Impact on Certification */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Event Attendance → Certification Impact
          </CardTitle>
          <CardDescription>
            How event attendance correlates with certification success
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {impact.eventAttendeesInLearnerPool.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Event Attendees in Learning Pool
              </div>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {impact.eventAttendeesWhoCertified.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Attendees Who Certified
              </div>
            </div>
            <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20 text-center">
              <div className="text-3xl font-bold text-violet-600 dark:text-violet-400">
                {impact.certificationRateOfAttendees}%
              </div>
              <div className="text-sm text-muted-foreground">
                Certification Rate
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Event Trends</CardTitle>
            <CardDescription>Registration vs attendance over time</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyChartData.length > 0 ? (
              <SimpleAreaChart 
                data={monthlyChartData}
                dataKey="registered"
                secondaryDataKey="attended"
                color="#3b82f6"
                secondaryColor="#22c55e"
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No monthly trend data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Events by Category</CardTitle>
            <CardDescription>User participation by event type</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryChartData.length > 0 ? (
              <SimpleBarChart 
                data={categoryChartData}
                dataKey="users"
                color="#8b5cf6"
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No category data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Event Category Performance
          </CardTitle>
          <CardDescription>Attendance rates by event category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryBreakdown.map((cat) => (
              <div key={cat.category || "other"} className="flex items-center gap-4">
                <div className="w-32 font-medium truncate capitalize">
                  {cat.category || "Other"}
                </div>
                <div className="flex-1">
                  <Progress 
                    value={cat.attendanceRate} 
                    className="h-2"
                  />
                </div>
                <div className="w-20 text-right text-sm text-muted-foreground">
                  {cat.attendanceRate}%
                </div>
                <div className="w-24 text-right text-xs text-muted-foreground">
                  {cat.attended}/{cat.registrations}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Attendees */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Top Event Attendees
          </CardTitle>
          <CardDescription>Most engaged event participants</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">User</th>
                  <th className="text-center p-3 font-medium">Registered</th>
                  <th className="text-center p-3 font-medium">Attended</th>
                  <th className="text-center p-3 font-medium">Rate</th>
                  <th className="text-left p-3 font-medium">Categories</th>
                </tr>
              </thead>
              <tbody>
                {topAttendees.slice(0, 10).map((attendee, idx) => {
                  const rate = attendee.registered > 0 
                    ? Math.round(attendee.attended / attendee.registered * 100) 
                    : 0;
                  return (
                    <tr key={attendee.handle} className="border-b last:border-0">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-sm w-4">
                            {idx + 1}
                          </span>
                          <span className="font-medium">{attendee.handle}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">{attendee.registered}</td>
                      <td className="p-3 text-center">{attendee.attended}</td>
                      <td className="p-3 text-center">
                        <Badge variant={rate >= 80 ? "default" : rate >= 50 ? "secondary" : "outline"}>
                          {rate}%
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {attendee.categories.slice(0, 3).map((cat) => (
                            <Badge key={cat} variant="outline" className="text-xs capitalize">
                              {cat}
                            </Badge>
                          ))}
                          {attendee.categories.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{attendee.categories.length - 3}
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
