"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SimpleBarChart } from "@/components/dashboard";
import { Mail, Award, TrendingUp, BookOpen, ArrowLeft, Loader2, User } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLearners, useMetrics } from "@/hooks/use-data";

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
  const initials = handle.slice(0, 2).toUpperCase();
  
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
              <div className="p-3 bg-yellow-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{metricsData?.metrics.totalLearners.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">Total Learners</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Certifications */}
        <Card>
          <CardHeader>
            <CardTitle>Certifications Earned</CardTitle>
            <CardDescription>Credentials achieved by this learner</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {certs.length > 0 ? certs.map((cert: string) => (
                <div key={cert} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Award className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{cert}</p>
                      <p className="text-xs text-muted-foreground">GitHub Certification</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-green-600">Certified</Badge>
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
