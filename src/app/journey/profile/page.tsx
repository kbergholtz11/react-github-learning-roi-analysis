"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SimpleAreaChart } from "@/components/dashboard";
import { User, Mail, Building, Award, Calendar, TrendingUp, BookOpen, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";

// Sample learner profile data
const learnerData = {
  name: "Sarah Chen",
  email: "sarah.chen@company.com",
  department: "Engineering",
  role: "Senior Developer",
  joinedDate: "November 15, 2025",
  manager: "Alex Rivera",
  location: "San Francisco, CA",
};

const certifications = [
  { name: "GitHub Actions", date: "Jan 15, 2026", score: 94, status: "certified" },
  { name: "GitHub Foundations", date: "Dec 5, 2025", score: 91, status: "certified" },
];

const currentCourses = [
  { name: "GitHub Copilot Mastery", progress: 85, started: "Jan 10, 2026", estimatedCompletion: "Feb 1, 2026" },
  { name: "Advanced Security", progress: 32, started: "Jan 20, 2026", estimatedCompletion: "Feb 15, 2026" },
];

const activityData = [
  { name: "Week 1", hours: 4.5 },
  { name: "Week 2", hours: 6.2 },
  { name: "Week 3", hours: 3.8 },
  { name: "Week 4", hours: 7.1 },
  { name: "Week 5", hours: 5.5 },
  { name: "Week 6", hours: 8.2 },
];

const recentActivity = [
  { action: "Completed module", detail: "GitHub Copilot - Chat Features", time: "2 hours ago" },
  { action: "Passed quiz", detail: "Actions Workflows - 95%", time: "Yesterday" },
  { action: "Started course", detail: "Advanced Security", time: "3 days ago" },
  { action: "Earned badge", detail: "Quick Learner", time: "1 week ago" },
];

export default function LearnerProfilePage() {
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
              <AvatarFallback className="text-2xl bg-primary/10">SC</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{learnerData.name}</h1>
                <Badge variant="secondary" className="bg-green-100 text-green-700">Active Learner</Badge>
              </div>
              <p className="text-muted-foreground">{learnerData.role} • {learnerData.department}</p>
              <div className="flex items-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{learnerData.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{learnerData.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Joined {learnerData.joinedDate}</span>
                </div>
              </div>
            </div>
            <Button variant="outline">Edit Profile</Button>
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
                <div className="text-2xl font-bold">{certifications.length}</div>
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
                <div className="text-2xl font-bold">{currentCourses.length}</div>
                <p className="text-xs text-muted-foreground">Active Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">35.3</div>
                <p className="text-xs text-muted-foreground">Hours Learned</p>
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
                <div className="text-2xl font-bold">92%</div>
                <p className="text-xs text-muted-foreground">Avg. Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current Courses */}
        <Card>
          <CardHeader>
            <CardTitle>Current Courses</CardTitle>
            <CardDescription>In-progress learning</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentCourses.map((course) => (
                <div key={course.name} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{course.name}</p>
                    <Badge variant="outline">{course.progress}%</Badge>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Started: {course.started}</span>
                    <span>Est. completion: {course.estimatedCompletion}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Certifications */}
        <Card>
          <CardHeader>
            <CardTitle>Certifications</CardTitle>
            <CardDescription>Earned credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {certifications.map((cert) => (
                <div key={cert.name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Award className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{cert.name}</p>
                      <p className="text-xs text-muted-foreground">{cert.date}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-green-600">{cert.score}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Learning Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Learning Activity</CardTitle>
            <CardDescription>Hours spent learning per week</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleAreaChart 
              data={activityData}
              dataKey="hours"
              color="#8b5cf6"
            />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest learning events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="h-2 w-2 mt-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.detail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
