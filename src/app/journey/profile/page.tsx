"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SimpleBarChart } from "@/components/dashboard";
import { Mail, Award, TrendingUp, BookOpen, ArrowLeft, Loader2, User, Calendar, Clock, Target, CheckCircle, XCircle, Building2, MapPin, Sparkles, Shield, Activity, Zap } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLearners, useMetrics } from "@/hooks/use-data";
import { useEnrichedLearner } from "@/hooks/use-unified-data";
import { useQuery } from "@tanstack/react-query";
import { fetchLearnerExams, type IndividualExam } from "@/lib/backend-client";
import { DataQualityBadge } from "@/components/ui/data-quality-badge";
import { formatDate, daysBetween } from "@/lib/utils";

export default function LearnerProfilePage() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  
  // Search for specific learner if email provided, otherwise get top learners
  const { data: learnersData, isLoading: learnersLoading } = useLearners({ 
    search: emailParam || undefined,
    pageSize: emailParam ? 1 : 10 
  });
  const { data: metricsData, isLoading: metricsLoading } = useMetrics();
  
  // Get enriched data from DuckDB
  const { data: enrichedLearner, isLoading: enrichedLoading } = useEnrichedLearner(emailParam);
  
  // Get the learner first to use their email for exams query
  const topLearners = learnersData?.learners || [];
  const featuredLearner = topLearners[0];
  const learnerEmail = featuredLearner && 'email' in featuredLearner ? featuredLearner.email : '';
  
  // Fetch individual exam records when we have a learner email
  const { data: examsData, isLoading: examsLoading } = useQuery({
    queryKey: ['learner-exams', learnerEmail],
    queryFn: () => fetchLearnerExams(learnerEmail),
    enabled: !!learnerEmail,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const isLoading = learnersLoading || metricsLoading;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!featuredLearner) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No learner data available</p>
      </div>
    );
  }

  // Extract learner info
  const email = learnerEmail;
  const handle = 'user_handle' in featuredLearner ? featuredLearner.user_handle : email.split('@')[0];
  const status = 'learner_status' in featuredLearner ? featuredLearner.learner_status : 'Active';
  const stage = 'journey_stage' in featuredLearner ? featuredLearner.journey_stage : '';
  const certs = 'cert_titles' in featuredLearner ? (featuredLearner.cert_titles as string[]) : [];
  const totalCerts = 'total_certs' in featuredLearner ? (featuredLearner.total_certs as number) : 0;
  const totalAttempts = 'total_attempts' in featuredLearner ? (featuredLearner.total_attempts as number) : 0;
  const firstCertDate = 'first_cert_date' in featuredLearner ? (featuredLearner.first_cert_date as string) : null;
  const latestCertDate = 'latest_cert_date' in featuredLearner ? (featuredLearner.latest_cert_date as string) : null;
  const daysSinceCert = 'days_since_cert' in featuredLearner ? (featuredLearner.days_since_cert as number) : 0;
  const initials = handle.slice(0, 2).toUpperCase();
  
  // Calculate certification journey span
  const certJourneyDays = daysBetween(firstCertDate, latestCertDate);
  
  // Build certification data for chart
  const certChartData = certs.map((cert: string) => ({
    name: cert,
    value: 1,
  }));

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/journey/explorer" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Explorer
      </Link>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl bg-primary/10">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">@{handle}</h1>
                <Badge variant="secondary" className="bg-green-100 text-green-700">{status}</Badge>
                {enrichedLearner && (
                  <DataQualityBadge 
                    score={enrichedLearner.data_quality_score} 
                    level={enrichedLearner.data_quality_level} 
                  />
                )}
              </div>
              <p className="text-muted-foreground">{stage}</p>
              <div className="flex items-center gap-6 mt-4 text-sm flex-wrap">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span>{totalCerts} certification{totalCerts !== 1 ? 's' : ''}</span>
                </div>
                {enrichedLearner?.company_name && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{enrichedLearner.company_name}</span>
                  </div>
                )}
                {enrichedLearner?.country && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{enrichedLearner.country}</span>
                  </div>
                )}
              </div>
              {/* Product usage badges */}
              {enrichedLearner && (enrichedLearner.uses_copilot || enrichedLearner.uses_actions || enrichedLearner.uses_security) && (
                <div className="flex items-center gap-2 mt-3">
                  {enrichedLearner.uses_copilot && (
                    <Badge variant="outline" className="gap-1 bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border-violet-200">
                      <Sparkles className="h-3 w-3" />
                      Copilot ({enrichedLearner.copilot_days}d)
                    </Badge>
                  )}
                  {enrichedLearner.uses_actions && (
                    <Badge variant="outline" className="gap-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200">
                      <Zap className="h-3 w-3" />
                      Actions ({enrichedLearner.actions_days}d)
                    </Badge>
                  )}
                  {enrichedLearner.uses_security && (
                    <Badge variant="outline" className="gap-1 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200">
                      <Shield className="h-3 w-3" />
                      Security ({enrichedLearner.security_days}d)
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Award className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalCerts}</div>
                <p className="text-xs text-muted-foreground">Certifications</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stage.split(':')[0] || 'Active'}</div>
                <p className="text-xs text-muted-foreground">Journey Stage</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <User className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{status}</div>
                <p className="text-xs text-muted-foreground">Learner Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full dark:bg-yellow-900/30">
                <Target className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalAttempts}</div>
                <p className="text-xs text-muted-foreground">Total Attempts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Certification Timeline */}
      {firstCertDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Certification Timeline
            </CardTitle>
            <CardDescription>Journey from first to latest certification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full dark:bg-blue-900/30">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">First Certification</p>
                  <p className="font-semibold">{formatDate(firstCertDate)}</p>
                </div>
              </div>
              {latestCertDate && latestCertDate !== firstCertDate && (
                <>
                  <div className="flex-1 h-0.5 bg-gradient-to-r from-blue-500 to-green-500 min-w-[50px] max-w-[200px]" />
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full dark:bg-green-900/30">
                      <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Latest Certification</p>
                      <p className="font-semibold">{formatDate(latestCertDate)}</p>
                    </div>
                  </div>
                </>
              )}
              {certJourneyDays !== null && certJourneyDays > 0 && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-full dark:bg-purple-900/30">
                    <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Journey Span</p>
                    <p className="font-semibold">{certJourneyDays} days</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-full dark:bg-orange-900/30">
                  <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Days Since Last Cert</p>
                  <p className="font-semibold">{daysSinceCert} days</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Certifications / Exam History */}
        <Card>
          <CardHeader>
            <CardTitle>Exam History</CardTitle>
            <CardDescription>
              {examsData?.passed_count ?? totalCerts} passed
              {examsData?.failed_count ? `, ${examsData.failed_count} failed` : ''}
              {examsData ? ` of ${examsData.total_exams} total` : 
               totalAttempts > totalCerts ? ` (${totalAttempts} total attempts)` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {examsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : examsData?.exams && examsData.exams.length > 0 ? (
                // Show individual exam records when available
                examsData.exams.map((exam: IndividualExam, index: number) => {
                  // Determine status styling - comprehensive status support
                  const statusConfig: Record<string, { bg: string; text: string; icon: 'check' | 'x' | 'clock' | 'ban' | 'alert' }> = {
                    'Passed': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', icon: 'check' },
                    'Failed': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', icon: 'x' },
                    'Absent': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400', icon: 'ban' },
                    'No Show': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400', icon: 'ban' },
                    'Scheduled': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', icon: 'clock' },
                    'Rescheduled': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', icon: 'clock' },
                    'Registered': { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', icon: 'clock' },
                    'Expired Registration': { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-500 dark:text-gray-500', icon: 'alert' },
                    'Cancelled': { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-600 dark:text-gray-400', icon: 'ban' },
                    'Canceled': { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-600 dark:text-gray-400', icon: 'ban' },
                  };
                  const config = statusConfig[exam.exam_status] || statusConfig['Failed'];
                  
                  return (
                  <div key={`${exam.exam_code}-${exam.exam_date}-${index}`} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${config.bg}`}>
                        {config.icon === 'check' ? (
                          <CheckCircle className={`h-5 w-5 ${config.text}`} />
                        ) : config.icon === 'clock' ? (
                          <Clock className={`h-5 w-5 ${config.text}`} />
                        ) : config.icon === 'alert' ? (
                          <Clock className={`h-5 w-5 ${config.text} opacity-50`} />
                        ) : (
                          <XCircle className={`h-5 w-5 ${config.text}`} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{exam.exam_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDate(exam.exam_date)}</span>
                          <span className={exam.score_percent !== null && exam.score_percent > 0 
                            ? "font-medium text-purple-600 dark:text-purple-400" 
                            : "text-muted-foreground/60"}>
                            {exam.score_percent !== null && exam.score_percent > 0 
                              ? `${Math.round(exam.score_percent)}%` 
                              : "No score"}
                          </span>
                          {exam.days_since_previous !== null && exam.days_since_previous > 0 && (
                            <span className="text-blue-600 dark:text-blue-400">
                              (+{exam.days_since_previous}d)
                            </span>
                          )}
                          <span className="text-muted-foreground/50">•</span>
                          <span>{exam.exam_code}</span>
                        </div>
                      </div>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`${config.bg} ${config.text.replace('text-', 'text-')}`}
                    >
                      {exam.exam_status}
                    </Badge>
                  </div>
                )})
              ) : certs.length > 0 ? (
                // Fallback to aggregated cert data
                certs.map((cert: string, index: number) => (
                <div key={cert} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full dark:bg-green-900/30">
                      <Award className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium">{cert}</p>
                      <p className="text-xs text-muted-foreground">
                        {index === 0 && firstCertDate ? `First earned ${formatDate(firstCertDate)}` : 
                         index === certs.length - 1 && latestCertDate && certs.length > 1 ? `Latest earned ${formatDate(latestCertDate)}` :
                         "GitHub Certification"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Passed
                  </Badge>
                </div>
              ))) : (
                <p className="text-muted-foreground text-center py-4">No certifications yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Exam Performance Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Exam Performance</CardTitle>
            <CardDescription>
              {examsData ? `${examsData.passed_count} of ${examsData.total_exams} exams passed` : 'Performance summary'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {examsData?.exams && examsData.exams.length > 0 ? (
              <div className="space-y-4">
                {/* Pass Rate */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Pass Rate</span>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {Math.round((examsData.passed_count / examsData.total_exams) * 100)}%
                  </span>
                </div>
                
                {/* Average Score (if scores available) */}
                {(() => {
                  const scoresWithData = examsData.exams.filter((e: IndividualExam) => e.score_percent !== null && e.score_percent > 0);
                  if (scoresWithData.length > 0) {
                    const avgScore = scoresWithData.reduce((sum: number, e: IndividualExam) => sum + (e.score_percent || 0), 0) / scoresWithData.length;
                    return (
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm font-medium">Average Score</span>
                        <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {Math.round(avgScore)}%
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                {/* Certification Journey Duration */}
                {certJourneyDays !== null && certJourneyDays > 0 && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Journey Duration</span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {certJourneyDays < 30 ? `${certJourneyDays}d` : 
                       certJourneyDays < 365 ? `${Math.round(certJourneyDays / 30)}mo` :
                       `${(certJourneyDays / 365).toFixed(1)}yr`}
                    </span>
                  </div>
                )}
                
                {/* Exam Breakdown by Type */}
                <div className="pt-2">
                  <p className="text-sm font-medium mb-2">By Certification</p>
                  <div className="space-y-2">
                    {Object.entries(
                      examsData.exams.reduce((acc: Record<string, {passed: number, total: number}>, exam: IndividualExam) => {
                        const name = exam.exam_name;
                        if (!acc[name]) acc[name] = { passed: 0, total: 0 };
                        acc[name].total++;
                        if (exam.passed) acc[name].passed++;
                        return acc;
                      }, {})
                    ).map(([name, stats]) => (
                      <div key={name} className="flex items-center justify-between text-sm">
                        <span className="truncate mr-2">{name}</span>
                        <Badge variant="outline" className={stats.passed > 0 ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600'}>
                          {stats.passed}/{stats.total}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No exam performance data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Other Top Learners */}
      <Card>
        <CardHeader>
          <CardTitle>Other Top Learners</CardTitle>
          <CardDescription>Learners with similar achievements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topLearners.slice(1, 6).map((learner, index) => {
              const learnerEmail = 'email' in learner ? learner.email : '';
              const learnerHandle = 'user_handle' in learner ? learner.user_handle : learnerEmail.split('@')[0];
              const learnerStatus = 'learner_status' in learner ? learner.learner_status : '';
              const learnerCerts = 'total_certs' in learner ? (learner.total_certs as number) : 0;
              return (
                <Link 
                  key={index} 
                  href={`/journey/profile?email=${encodeURIComponent(learnerEmail)}`}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-sm">{learnerHandle.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">@{learnerHandle}</p>
                      <p className="text-xs text-muted-foreground">{learnerEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{learnerStatus}</Badge>
                    <Badge className="bg-green-600">{learnerCerts} certs</Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
