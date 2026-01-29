"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleBarChart, SimpleAreaChart } from "@/components/dashboard";
import { ExportButton } from "@/components/export-button";
import { Calendar, Filter, Users, BookOpen, Award, Clock, Search } from "lucide-react";

// Sample events data
const events = [
  { id: 1, type: "enrollment", user: "Sarah Chen", course: "GitHub Actions", timestamp: "2026-01-29 14:32", department: "Engineering" },
  { id: 2, type: "completion", user: "Mike Johnson", course: "GitHub Copilot", timestamp: "2026-01-29 13:15", department: "DevOps" },
  { id: 3, type: "certification", user: "Lisa Anderson", course: "GitHub Admin", timestamp: "2026-01-29 11:42", department: "Platform" },
  { id: 4, type: "enrollment", user: "David Kim", course: "Advanced Security", timestamp: "2026-01-29 10:28", department: "Security" },
  { id: 5, type: "progress", user: "Emily Davis", course: "GitHub Foundations", timestamp: "2026-01-29 09:55", department: "Engineering" },
  { id: 6, type: "completion", user: "James Wilson", course: "GitHub Actions", timestamp: "2026-01-28 16:42", department: "DevOps" },
  { id: 7, type: "enrollment", user: "Amanda Foster", course: "GitHub Copilot", timestamp: "2026-01-28 15:18", department: "QA" },
  { id: 8, type: "certification", user: "Robert Taylor", course: "GitHub Foundations", timestamp: "2026-01-28 14:05", department: "Engineering" },
];

const hourlyActivityData = [
  { name: "6am", events: 12 },
  { name: "8am", events: 45 },
  { name: "10am", events: 78 },
  { name: "12pm", events: 56 },
  { name: "2pm", events: 89 },
  { name: "4pm", events: 67 },
  { name: "6pm", events: 34 },
  { name: "8pm", events: 23 },
];

const dailyTrendData = [
  { name: "Mon", enrollments: 45, completions: 23, certifications: 8 },
  { name: "Tue", enrollments: 52, completions: 28, certifications: 12 },
  { name: "Wed", enrollments: 38, completions: 31, certifications: 15 },
  { name: "Thu", enrollments: 61, completions: 35, certifications: 11 },
  { name: "Fri", enrollments: 55, completions: 29, certifications: 9 },
  { name: "Sat", enrollments: 18, completions: 12, certifications: 4 },
  { name: "Sun", enrollments: 15, completions: 8, certifications: 2 },
];

export default function EventsDashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.course.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !selectedType || event.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'enrollment': return <BookOpen className="h-4 w-4 text-blue-500" />;
      case 'completion': return <Clock className="h-4 w-4 text-green-500" />;
      case 'certification': return <Award className="h-4 w-4 text-purple-500" />;
      default: return <Users className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'enrollment': return <Badge className="bg-blue-100 text-blue-700">Enrollment</Badge>;
      case 'completion': return <Badge className="bg-green-100 text-green-700">Completion</Badge>;
      case 'certification': return <Badge className="bg-purple-100 text-purple-700">Certification</Badge>;
      default: return <Badge variant="outline">Progress</Badge>;
    }
  };

  const exportData = {
    title: "Learning Events",
    headers: ["Type", "User", "Course", "Department", "Timestamp"],
    rows: filteredEvents.map(e => [e.type, e.user, e.course, e.department, e.timestamp]),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time learning activity and event stream
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Calendar className="h-3 w-3 mr-1" />
            Last 7 days
          </Badge>
          <ExportButton data={exportData} filename="learning-events" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{events.filter(e => e.type === 'enrollment').length * 15}</div>
                <p className="text-xs text-muted-foreground">Enrollments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{events.filter(e => e.type === 'completion').length * 12}</div>
                <p className="text-xs text-muted-foreground">Completions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{events.filter(e => e.type === 'certification').length * 8}</div>
                <p className="text-xs text-muted-foreground">Certifications</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Users className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{events.length * 5}</div>
                <p className="text-xs text-muted-foreground">Total Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hourly Activity</CardTitle>
            <CardDescription>Events by hour today</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={hourlyActivityData} dataKey="events" color="#8b5cf6" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Daily Trends</CardTitle>
            <CardDescription>Event types over the week</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleAreaChart 
              data={dailyTrendData} 
              dataKey="enrollments" 
              secondaryDataKey="completions"
              color="#3b82f6"
              secondaryColor="#22c55e"
            />
          </CardContent>
        </Card>
      </div>

      {/* Event Stream */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Event Stream</CardTitle>
              <CardDescription>Recent learning activities</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  className="pl-10 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-muted rounded-full">
                    {getEventIcon(event.type)}
                  </div>
                  <div>
                    <p className="font-medium">{event.user}</p>
                    <p className="text-sm text-muted-foreground">{event.course}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline">{event.department}</Badge>
                  {getEventBadge(event.type)}
                  <span className="text-sm text-muted-foreground w-32 text-right">{event.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
