"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SimpleBarChart } from "@/components/dashboard";
import { Mail, Award, TrendingUp, BookOpen, ArrowLeft, Loader2, User, Calendar, Clock, Target, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLearners, useMetrics } from "@/hooks/use-data";
import { useQuery } from "@tanstack/react-query";
import { fetchLearnerExams, type IndividualExam } from "@/lib/backend-client";

// Format date for display
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "short", 
      day: "numeric" 
    });
  } catch {
    return "—";
  }
}

// Calculate days between two dates
function daysBetween(date1: string | null, date2: string | null): number | null {
  if (!date1 || !date2) return null;
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.round(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

export default function LearnerProfilePage() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  
  // Search for specific learner if email provided, otherwise get top learners
  const { data: learnersData, isLoading: learnersLoading } = useLearners({ 
    search: emailParam || undefined,
    pageSize: emailParam ? 1 : 10 
  });
  const { data: metricsData, isLoading: metricsLoading } = useMetrics();
  
  const isLoading = learnersLoading || metricsLoading;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Get learner - first match if searching, or first top learner
  const topLearners = learnersData?.learners || [];
  const featuredLearner = topLearners[0];
  
  if (!featuredLearner) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No learner data available</p>
      </div>
    );
  }

  // Extract learner info
  const email = 'email' in featuredLearner ? featuredLearner.email : '';
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
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">@{handle}</h1>
                <Badge variant="secondary" className="bg-green-100 text-green-700">{status}</Badge>
              </div>
              <p className="text-muted-foreground">{stage}</p>
              <div className="flex items-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span>{totalCerts} certification{totalCerts !== 1 ? 's' : ''}</span>
                </div>
              </div>
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
        {/* Certifications */}
        <Card>
          <CardHeader>
            <CardTitle>Certifications Earned</CardTitle>
            <CardDescription>
              {totalCerts} certification{totalCerts !== 1 ? 's' : ''} passed
              {totalAttempts > totalCerts && ` (${totalAttempts} total attempts)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {certs.length > 0 ? certs.map((cert: string, index: number) => (
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
              )) : (
                <p className="text-muted-foreground text-center py-4">No certifications yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Certification Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Certification Types</CardTitle>
            <CardDescription>Distribution of certifications</CardDescription>
          </CardHeader>
          <CardContent>
            {certChartData.length > 0 ? (
              <SimpleBarChart 
                data={certChartData}
                dataKey="value"
                color="#22c55e"
              />
            ) : (
              <p className="text-muted-foreground text-center py-8">No certification data to display</p>
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
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
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
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
