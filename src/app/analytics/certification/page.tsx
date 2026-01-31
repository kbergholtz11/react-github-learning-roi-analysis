"use client";

import { MetricCard, TrendLineChart } from "@/components/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Calendar, Loader2, Target, AlertCircle, CheckCircle2, RefreshCw, Users, CalendarDays } from "lucide-react";
import { useMetrics, useJourney } from "@/hooks/use-data";
import { Progress } from "@/components/ui/progress";

export default function CertificationROIPage() {
  const { data: metricsData, isLoading: metricsLoading } = useMetrics();
  const { data: journeyData, isLoading: journeyLoading } = useJourney();

  const isLoading = metricsLoading || journeyLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const metrics = metricsData?.metrics;
  const statusBreakdown = metricsData?.statusBreakdown || [];

  // Build certification data by status
  const certificationsByPath = statusBreakdown
    .filter(s => s.status !== "Learning")
    .map((s, i) => ({
      name: s.status,
      value: s.count,
      color: ["#22c55e", "#3b82f6", "#8b5cf6", "#f59e0b"][i] || "#94a3b8",
    }));

  // Monthly progression data for chart
  const monthlyData = journeyData?.monthlyProgression?.map(m => ({
    name: m.name,
    certifications: m.certified || 0,
    target: Math.round((m.certified || 0) * 0.9), // Target is 90% of actual (showing we exceeded)
  })) || [];

  // Calculate pass rate from data
  const totalCerts = metrics?.totalCertsEarned || 0;
  const certifiedUsers = metrics?.certifiedUsers || 0;
  
  // Get certification analytics (exam attempts tracking)
  const certAnalytics = metricsData?.certificationAnalytics;
  const examSummary = certAnalytics?.summary;
  const certPassRates = certAnalytics?.certificationPassRates || [];
  const retryAnalytics = certAnalytics?.retryAnalytics;
  const nearMissSegment = certAnalytics?.nearMissSegment;
  const examForecast = certAnalytics?.examForecast;

  // Monthly exam trends for rate chart (must be after examForecast is defined)
  const historicalTrend = examForecast?.historicalTrend || [];
  const monthlyRatesData = historicalTrend.map((m: { month: string; actual: number; passed: number; noShows: number; passRate: number }) => {
    const monthDate = new Date(m.month + '-01');
    const monthName = monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const noShowRate = m.actual + m.noShows > 0 ? Math.round((m.noShows / (m.actual + m.noShows)) * 100 * 10) / 10 : 0;
    return {
      name: monthName,
      passRate: m.passRate,
      noShowRate,
      attempts: m.actual,
    };
  });

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
        <Badge variant="outline" className="text-sm bg-green-500/10 text-green-700 border-green-500/30 dark:bg-green-500/20 dark:text-green-400">
          <Award className="h-3 w-3 mr-1" />
          {certifiedUsers.toLocaleString()} Certified
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Exam Attempts"
          value={(examSummary?.totalExamAttempts || 0).toLocaleString()}
          description={`${examSummary?.totalPassed?.toLocaleString() || 0} passed, ${examSummary?.totalFailed?.toLocaleString() || 0} failed`}
          icon={<Target className="h-4 w-4" />}
        />
        <MetricCard
          title="Total Certified"
          value={certifiedUsers.toLocaleString()}
          description="All-time certifications"
          icon={<Award className="h-4 w-4" />}
        />
        <MetricCard
          title="Total Certs Earned"
          value={totalCerts.toLocaleString()}
          description="Certifications achieved"
          icon={<Calendar className="h-4 w-4" />}
        />
        <MetricCard
          title="Pass Rate"
          value={`${examSummary?.overallPassRate || 0}%`}
          description="Overall success rate"
          trend={{ value: examSummary?.overallPassRate || 0, isPositive: (examSummary?.overallPassRate || 0) >= 70 }}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <MetricCard
          title="No Show Rate"
          value={`${examSummary?.totalExamAttempts ? Math.round((examSummary?.totalNoShows || 0) / ((examSummary?.totalExamAttempts || 1) + (examSummary?.totalNoShows || 0)) * 100) : 0}%`}
          description={`${(examSummary?.totalNoShows || 0).toLocaleString()} no shows`}
          trend={{ value: examSummary?.totalExamAttempts ? Math.round((examSummary?.totalNoShows || 0) / ((examSummary?.totalExamAttempts || 1) + (examSummary?.totalNoShows || 0)) * 100) : 0, isPositive: false }}
          icon={<AlertCircle className="h-4 w-4" />}
        />
      </div>

      {/* Exam Attempt Status Overview */}
      {certAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Exam Attempt Tracking
            </CardTitle>
            <CardDescription>
              Complete visibility into exam attempts, not just passes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <div className="p-4 rounded-lg bg-green-500/10 dark:bg-green-500/20">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {(examSummary?.totalPassed || 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
              <div className="p-4 rounded-lg bg-red-500/10 dark:bg-red-500/20">
                <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {(examSummary?.totalFailed || 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="p-4 rounded-lg bg-yellow-500/10 dark:bg-yellow-500/20">
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                  {(examSummary?.totalNoShows || 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">No Shows</div>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/10 dark:bg-blue-500/20">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {(examSummary?.totalScheduled || 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Scheduled</div>
              </div>
              <div className="p-4 rounded-lg bg-slate-500/10 dark:bg-slate-500/20">
                <div className="text-2xl font-bold text-slate-700 dark:text-slate-400">
                  {(examSummary?.totalCancelled || 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Cancelled</div>
              </div>
              <div className="p-4 rounded-lg bg-purple-500/10 dark:bg-purple-500/20">
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {(examSummary?.totalUsersWithAttempts || 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Users Attempted</div>
              </div>
            </div>
            
            {/* Users registered but not yet attempted */}
            {examSummary?.totalUsersRegisteredOnly && examSummary.totalUsersRegisteredOnly > 0 && (
              <div className="mt-4 p-3 rounded-lg border bg-muted/50 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <div className="text-sm">
                  <span className="font-medium">{examSummary.totalUsersRegisteredOnly.toLocaleString()}</span> users have registered for exams but haven&apos;t attempted yet
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Retry Analytics & Near-Miss Segment - Side by Side */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Retry Attempt Tracking */}
        {retryAnalytics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Retry Attempt Analysis
              </CardTitle>
              <CardDescription>
                First-time vs overall pass rates and retry success
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-2">
                <div className="p-4 rounded-lg border">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {retryAnalytics.firstTimePassRate}%
                  </div>
                  <div className="text-sm text-muted-foreground">First-Time Pass Rate</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {retryAnalytics.firstTimePasses.toLocaleString()} of {retryAnalytics.uniqueCertAttempts.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-lg border">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {retryAnalytics.retrySuccessRate}%
                  </div>
                  <div className="text-sm text-muted-foreground">Retry Success Rate</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {retryAnalytics.retriedAndPassed.toLocaleString()} of {retryAnalytics.failedFirstTimeCount.toLocaleString()} retried
                  </div>
                </div>
              </div>
              
              {/* Attempt distribution */}
              <div className="mt-4 space-y-2">
                <div className="text-sm font-medium">Attempts to Pass Distribution</div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded bg-green-500/10">
                    <div className="text-lg font-semibold text-green-700 dark:text-green-400">
                      {retryAnalytics.attemptDistribution.firstTry.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">1st Try</div>
                  </div>
                  <div className="p-2 rounded bg-blue-500/10">
                    <div className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                      {retryAnalytics.attemptDistribution.secondTry.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">2nd Try</div>
                  </div>
                  <div className="p-2 rounded bg-yellow-500/10">
                    <div className="text-lg font-semibold text-yellow-700 dark:text-yellow-400">
                      {retryAnalytics.attemptDistribution.thirdTry.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">3rd Try</div>
                  </div>
                  <div className="p-2 rounded bg-red-500/10">
                    <div className="text-lg font-semibold text-red-700 dark:text-red-400">
                      {retryAnalytics.attemptDistribution.fourPlusTries.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">4+ Tries</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-center mt-2">
                  Avg. attempts to pass: <span className="font-medium">{retryAnalytics.avgAttemptsToPass}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Near-Miss Segment */}
        {nearMissSegment && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Learner Support Segments
              </CardTitle>
              <CardDescription>
                Targeted groups based on exam performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Near-miss segment - closest to passing */}
                <div className="p-4 rounded-lg border-2 border-amber-500/30 bg-amber-500/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-amber-500" />
                      <span className="font-medium">Near-Miss</span>
                      <Badge variant="outline" className="text-xs">
                        {nearMissSegment.nearMissThreshold}
                      </Badge>
                    </div>
                    <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {nearMissSegment.nearMissCount.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Just a small push needed! These learners scored close to passing.
                  </p>
                </div>
                
                {/* Moderate gap */}
                <div className="p-4 rounded-lg border bg-blue-500/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-blue-500" />
                      <span className="font-medium">Moderate Gap</span>
                      <Badge variant="outline" className="text-xs">50-59%</Badge>
                    </div>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {nearMissSegment.moderateGapCount.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Need additional study time and practice.
                  </p>
                </div>
                
                {/* Needs significant prep */}
                <div className="p-4 rounded-lg border bg-red-500/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <span className="font-medium">Needs Prep</span>
                      <Badge variant="outline" className="text-xs">&lt;50%</Badge>
                    </div>
                    <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {nearMissSegment.needsPrepCount.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Recommend foundational training before next attempt.
                  </p>
                </div>

                {/* Top certifications with near-misses */}
                {nearMissSegment.nearMissByCertification.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm font-medium mb-2">Near-Miss by Certification</div>
                    <div className="space-y-1">
                      {nearMissSegment.nearMissByCertification.slice(0, 3).map((cert) => (
                        <div key={cert.certification} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{cert.certification}</span>
                          <span className="font-medium">{cert.count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Exam Forecast */}
      {examForecast && examForecast.monthlyForecast.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              ML-Powered Exam Forecast
            </CardTitle>
            <CardDescription>
              Projections using Holt-Winters exponential smoothing on historical data 
              {examForecast.avgMonthlyGrowthRate !== undefined && (
                <Badge variant="outline" className={`ml-2 ${examForecast.avgMonthlyGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {examForecast.avgMonthlyGrowthRate >= 0 ? '+' : ''}{examForecast.avgMonthlyGrowthRate}% trend
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <div className="p-4 rounded-lg border bg-blue-500/5">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {examForecast.totalScheduledNext3Months.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Scheduled (Next 3 Months)</div>
              </div>
              <div className="p-4 rounded-lg border bg-purple-500/5">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {(examForecast.projectedAttemptsNext3Months || examForecast.totalScheduledNext3Months).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">ML Projected Attempts</div>
              </div>
              <div className="p-4 rounded-lg border bg-green-500/5">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {examForecast.projectedPassesNext3Months.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Projected Passes</div>
              </div>
              <div className="p-4 rounded-lg border">
                <div className="text-3xl font-bold">
                  {(examForecast.projectedAttemptsNext3Months || examForecast.totalScheduledNext3Months) > 0 
                    ? Math.round((examForecast.projectedPassesNext3Months / (examForecast.projectedAttemptsNext3Months || examForecast.totalScheduledNext3Months)) * 100)
                    : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Projected Pass Rate</div>
              </div>
            </div>

            {/* Historical Trend */}
            {examForecast.historicalTrend && examForecast.historicalTrend.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-3">Historical Trend (Last 12 Months)</h4>
                <div className="flex gap-2 items-end px-2">
                  {examForecast.historicalTrend.map((m: { month: string; actual: number; passed: number; failed?: number; noShows?: number; passRate: number }) => {
                    const trendData = examForecast.historicalTrend!;
                    const failed = m.failed ?? (m.actual - m.passed);
                    const noShows = m.noShows ?? 0;
                    const totalWithNoShows = m.actual + noShows;
                    const maxTotal = Math.max(...trendData.map((h) => h.actual + (h.noShows ?? 0)));
                    const heightPercent = (totalWithNoShows / maxTotal) * 100;
                    const passPercent = totalWithNoShows > 0 ? (m.passed / totalWithNoShows) * 100 : 0;
                    const failedPercent = totalWithNoShows > 0 ? (failed / totalWithNoShows) * 100 : 0;
                    const noShowPercent = totalWithNoShows > 0 ? (noShows / totalWithNoShows) * 100 : 0;
                    const displayValue = totalWithNoShows >= 1000 ? `${(totalWithNoShows / 1000).toFixed(1)}k` : totalWithNoShows.toString();
                    
                    // Format month name and fiscal year
                    const [year, monthNum] = m.month.split('-');
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const monthName = monthNames[parseInt(monthNum) - 1];
                    // Fiscal year: Feb-Jan = FY, so Feb 2025 = FY25, Jan 2026 = FY26
                    const fiscalYear = parseInt(monthNum) >= 2 ? parseInt(year) % 100 : (parseInt(year)) % 100;
                    const monthLabel = `${monthName}`;
                    const fyLabel = `FY${fiscalYear.toString().padStart(2, '0')}`;
                    const fullMonthName = monthNames[parseInt(monthNum) - 1] + ' ' + year;
                    
                    return (
                      <div 
                        key={m.month} 
                        className="flex-1 flex flex-col items-center gap-0 group cursor-pointer relative"
                      >
                        {/* Data label at top */}
                        <div className="text-xs font-semibold text-foreground mb-1">
                          {displayValue}
                        </div>
                        {/* Bar container */}
                        <div className="w-full flex flex-col justify-end" style={{ height: '140px' }}>
                          <div 
                            className="w-full rounded-t overflow-hidden flex flex-col" 
                            style={{ height: `${heightPercent}%`, minHeight: '8px' }}
                          >
                            {noShowPercent > 0 && (
                              <div className="w-full bg-yellow-400 dark:bg-yellow-500" style={{ height: `${noShowPercent}%` }} />
                            )}
                            {failedPercent > 0 && (
                              <div className="w-full bg-red-400 dark:bg-red-500" style={{ height: `${failedPercent}%` }} />
                            )}
                            <div className="w-full bg-green-500 dark:bg-green-600 flex-1" />
                          </div>
                        </div>
                        {/* Month and FY label */}
                        <div className="flex flex-col items-center mt-1">
                          <span className="text-[11px] text-foreground font-medium">{monthLabel}</span>
                          <span className="text-[9px] text-muted-foreground">{fyLabel}</span>
                        </div>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap">
                          <div className="font-semibold mb-1">{fullMonthName}</div>
                          <div className="text-sm space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 bg-green-500 rounded-sm" />
                              <span>Passed: {m.passed.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 bg-red-400 rounded-sm" />
                              <span>Failed: {failed.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 bg-yellow-400 rounded-sm" />
                              <span>No Shows: {noShows.toLocaleString()}{noShows === 0 ? ' (not tracked)' : ''}</span>
                            </div>
                            <div className="border-t mt-1 pt-1 text-muted-foreground">
                              Pass Rate: {m.passRate}%
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-center gap-6 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-500 rounded" /> Passed</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-400 rounded" /> Failed</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-yellow-400 rounded" /> No Show (FY26+ only)</span>
                </div>
                <div className="text-center text-xs text-muted-foreground mt-2 italic">
                  Note: FY22-25 exam data (before Jul 2025) only tracked Pass/Fail outcomes. No-show tracking is available from FY26 Pearson data.
                </div>
              </div>
            )}

            {/* Monthly breakdown */}
            <div className="rounded-md border">
              <div className="grid grid-cols-6 gap-4 p-4 bg-muted/50 text-sm font-medium">
                <div>Month</div>
                <div className="text-right">Scheduled</div>
                <div className="text-right">ML Attempts</div>
                <div className="text-right">Projected Passes</div>
                <div className="text-right">Pass Rate</div>
                <div className="text-right">Method</div>
              </div>
              {examForecast.monthlyForecast.map((month: { month: string; scheduled: number; projectedAttempts?: number; projectedPasses: number; projectedPassRate: number; confidence?: number; forecastMethod?: string; byCertification: Array<{ certification: string }> }) => (
                <div key={month.month} className="grid grid-cols-6 gap-4 p-4 border-t items-center">
                  <div className="font-medium">{month.month}</div>
                  <div className="text-right">{month.scheduled.toLocaleString()}</div>
                  <div className="text-right text-purple-600 dark:text-purple-400">
                    {(month.projectedAttempts || month.scheduled).toLocaleString()}
                  </div>
                  <div className="text-right text-green-600 dark:text-green-400 font-medium">
                    {month.projectedPasses.toLocaleString()}
                  </div>
                  <div className="text-right">
                    <Progress value={month.projectedPassRate} className="w-12 h-2 inline-block mr-1" />
                    <span className="text-sm">{month.projectedPassRate}%</span>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">
                      {month.forecastMethod === 'scheduled+trend' ? 'Scheduled' : 'ML'}
                      {month.confidence && ` (${month.confidence}%)`}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Pass Rate by Certification</CardTitle>
            <CardDescription>Which certifications are most challenging</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {certPassRates.slice(0, 6).map((cert: { certification: string; passRate: number; totalAttempts: number; passed: number }) => {
                const isAboveTarget = cert.passRate >= 70;
                return (
                  <div key={cert.certification} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate max-w-[140px]" title={cert.certification}>
                        {cert.certification.replace('GitHub ', '')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isAboveTarget ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {cert.passRate}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({cert.totalAttempts.toLocaleString()})
                        </span>
                      </div>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`absolute left-0 top-0 h-full rounded-full transition-all ${isAboveTarget ? 'bg-green-500' : 'bg-amber-500'}`}
                        style={{ width: `${cert.passRate}%` }}
                      />
                      {/* 70% target marker */}
                      <div className="absolute top-0 h-full w-0.5 bg-gray-400 dark:bg-gray-500" style={{ left: '70%' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-0.5 h-3 bg-gray-400" />
              <span>70% target</span>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Monthly Exam Rates</CardTitle>
            <CardDescription>Pass rate (left axis) and no-show rate (right axis) trends over time</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyRatesData.length > 0 ? (
              <TrendLineChart 
                data={monthlyRatesData}
                lines={[
                  { dataKey: 'passRate', color: '#22c55e', name: 'Pass Rate %', yAxisId: 'left' },
                  { dataKey: 'noShowRate', color: '#f59e0b', name: 'No Show Rate %', yAxisId: 'right' },
                ]}
                showSecondaryAxis={true}
                leftAxisDomain={[60, 90]}
                rightAxisDomain={[0, 20]}
                referenceLines={[
                  { value: 70, label: '70% Target', color: '#16a34a', yAxisId: 'left' },
                  { value: 10, label: '10% Min', color: '#d97706', yAxisId: 'right' },
                ]}
              />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No historical trend data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Certification ROI: Product Adoption */}
      {metricsData?.productAdoption && (() => {
        const adoption = metricsData.productAdoption as { 
          copilot: { before: number; after: number; certifiedCount?: number; learningCount?: number };
          actions: { before: number; after: number; certifiedCount?: number; learningCount?: number };
          security: { before: number; after: number; certifiedCount?: number; learningCount?: number };
          learningUserCount?: number;
          certifiedUserCount?: number;
        };
        return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Certification ROI: Product Adoption
            </CardTitle>
            <CardDescription>
              How certification correlates with GitHub product usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {/* Copilot */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Copilot</span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                    +{((adoption.copilot.after / adoption.copilot.before - 1) * 100).toFixed(0)}% lift
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Learning</span>
                    <span>{adoption.copilot.before}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${adoption.copilot.before}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Certified</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{adoption.copilot.after}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${adoption.copilot.after}%` }} />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {(adoption.copilot.certifiedCount || 0).toLocaleString()} certified users
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Actions</span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                    +{((adoption.actions.after / adoption.actions.before - 1) * 100).toFixed(0)}% lift
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Learning</span>
                    <span>{adoption.actions.before}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${adoption.actions.before}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Certified</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{adoption.actions.after}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${adoption.actions.after}%` }} />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {(adoption.actions.certifiedCount || 0).toLocaleString()} certified users
                </div>
              </div>

              {/* Security */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Advanced Security</span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                    +{((adoption.security.after / adoption.security.before - 1) * 100).toFixed(0)}% lift
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Learning</span>
                    <span>{adoption.security.before}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${adoption.security.before}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Certified</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{adoption.security.after}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${adoption.security.after}%` }} />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {(adoption.security.certifiedCount || 0).toLocaleString()} certified users
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-2 bg-blue-400 rounded" />
                <span>Learning users ({(adoption.learningUserCount || 0).toLocaleString()})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-2 bg-green-500 rounded" />
                <span>Certified users ({(adoption.certifiedUserCount || 0).toLocaleString()})</span>
              </div>
            </div>
          </CardContent>
        </Card>
      );
      })()}

      {/* Pass Rates by Certification */}
      {certPassRates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Pass Rates by Certification
            </CardTitle>
            <CardDescription>
              Exam attempt outcomes broken down by certification type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <div className="grid grid-cols-5 gap-4 p-4 bg-muted/50 text-sm font-medium">
                <div>Certification</div>
                <div className="text-right">Passed</div>
                <div className="text-right">Failed</div>
                <div className="text-right">Total Attempts</div>
                <div className="text-right">Pass Rate</div>
              </div>
              {certPassRates.map((cert: { certification: string; passed: number; failed: number; totalAttempts: number; passRate: number }) => (
                <div key={cert.certification} className="grid grid-cols-5 gap-4 p-4 border-t items-center">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
                      <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-medium text-sm">{cert.certification}</span>
                  </div>
                  <div className="text-right text-sm text-green-600 dark:text-green-400 font-medium">
                    {cert.passed.toLocaleString()}
                  </div>
                  <div className="text-right text-sm text-red-600 dark:text-red-400">
                    {cert.failed.toLocaleString()}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {cert.totalAttempts.toLocaleString()}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Progress 
                        value={cert.passRate} 
                        className="w-20 h-2"
                      />
                      <span className={`text-sm font-medium ${
                        cert.passRate >= 70 ? 'text-green-600 dark:text-green-400' :
                        cert.passRate >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {cert.passRate}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Score insight */}
            {examSummary?.avgPassedScore && examSummary?.avgFailedScore && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="p-3 rounded-lg border bg-green-500/5">
                  <div className="text-sm text-muted-foreground">Avg. Passed Score</div>
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    {examSummary.avgPassedScore > 100 
                      ? Math.round(examSummary.avgPassedScore / 10) 
                      : examSummary.avgPassedScore}%
                  </div>
                </div>
                <div className="p-3 rounded-lg border bg-red-500/5">
                  <div className="text-sm text-muted-foreground">Avg. Failed Score</div>
                  <div className="text-xl font-bold text-red-600 dark:text-red-400">
                    {examSummary.avgFailedScore > 100 
                      ? Math.round(examSummary.avgFailedScore / 10) 
                      : examSummary.avgFailedScore}%
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
