"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MetricCard } from "@/components/dashboard";
import { MessageSquare, Send, Sparkles, History, Lightbulb, HelpCircle, TrendingUp, Users, Award } from "lucide-react";

const suggestedQueries = [
  "How many learners completed courses this month?",
  "What is the certification rate for GitHub Actions?",
  "Show me the top performing departments",
  "Which courses have the highest completion rate?",
  "Compare Copilot adoption vs last quarter",
  "What's the average time to certification?",
];

const recentQueries = [
  { query: "Show certification trends", timestamp: "2 hours ago", results: 156 },
  { query: "Top 5 courses by enrollment", timestamp: "Yesterday", results: 5 },
  { query: "Inactive learners last 30 days", timestamp: "2 days ago", results: 47 },
];

interface QueryResult {
  type: "metric" | "table" | "insight";
  data: unknown;
}

export default function NLPQueryPage() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);

  const handleQuery = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      // Mock response based on query keywords
      if (query.toLowerCase().includes("certification") || query.toLowerCase().includes("certified")) {
        setResult({
          type: "metric",
          data: {
            answer: "Based on your query about certifications:",
            metrics: [
              { title: "Total Certified", value: "1,256", trend: 23.1 },
              { title: "This Month", value: "192", trend: 14.3 },
              { title: "Pass Rate", value: "87%", trend: 3.2 },
            ],
            insight: "Certification rates have increased 23% compared to last quarter, with GitHub Actions being the most popular certification path.",
          },
        });
      } else if (query.toLowerCase().includes("completion") || query.toLowerCase().includes("completed")) {
        setResult({
          type: "metric",
          data: {
            answer: "Here's what I found about course completions:",
            metrics: [
              { title: "Completed Courses", value: "3,892", trend: 18.5 },
              { title: "Avg. Completion Time", value: "18 days", trend: -2.3 },
              { title: "Completion Rate", value: "73%", trend: 5.7 },
            ],
            insight: "Course completions are trending upward. The Engineering department leads with 42% of all completions.",
          },
        });
      } else if (query.toLowerCase().includes("learner") || query.toLowerCase().includes("enrollment")) {
        setResult({
          type: "metric",
          data: {
            answer: "Learner statistics for your query:",
            metrics: [
              { title: "Active Learners", value: "4,586", trend: 12.5 },
              { title: "New This Month", value: "423", trend: 8.2 },
              { title: "Engagement Rate", value: "82%", trend: 4.1 },
            ],
            insight: "Learner engagement is at an all-time high. The GitHub Copilot course has the highest enrollment growth.",
          },
        });
      } else {
        setResult({
          type: "insight",
          data: {
            answer: "I found some relevant information:",
            insight: "Based on your query, here are the key insights: The learning program is performing well above benchmarks with 112% of annual targets achieved. Top areas of focus should be DevOps training completion rates and Security certification programs.",
          },
        });
      }
      setIsLoading(false);
    }, 1500);
  };

  const handleSuggestedQuery = (suggested: string) => {
    setQuery(suggested);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ask Anything</h1>
          <p className="text-muted-foreground">
            Query your learning data using natural language
          </p>
        </div>
        <Badge variant="outline" className="text-sm bg-purple-50 text-purple-700 border-purple-200">
          <Sparkles className="h-3 w-3 mr-1" />
          AI-Powered
        </Badge>
      </div>

      {/* Query Input */}
      <Card className="border-2 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <MessageSquare className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Ask a question about your learning data..."
                className="pl-12 h-14 text-lg"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleQuery()}
              />
            </div>
            <Button 
              size="lg" 
              className="h-14 px-6 gap-2"
              onClick={handleQuery}
              disabled={isLoading || !query.trim()}
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Ask
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <Sparkles className="h-5 w-5" />
              AI Response
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg font-medium">{(result.data as { answer: string }).answer}</p>
            
            {result.type === "metric" && (result.data as { metrics: Array<{ title: string; value: string; trend: number }> }).metrics && (
              <div className="grid gap-4 md:grid-cols-3 mt-4">
                {(result.data as { metrics: Array<{ title: string; value: string; trend: number }> }).metrics.map((metric) => (
                  <MetricCard
                    key={metric.title}
                    title={metric.title}
                    value={metric.value}
                    trend={{ value: metric.trend, isPositive: metric.trend > 0 }}
                    icon={
                      metric.title.includes("Certified") || metric.title.includes("Certification") ? <Award className="h-4 w-4" /> :
                      metric.title.includes("Learner") ? <Users className="h-4 w-4" /> :
                      <TrendingUp className="h-4 w-4" />
                    }
                  />
                ))}
              </div>
            )}
            
            {(result.data as { insight?: string }).insight && (
              <div className="flex items-start gap-3 p-4 bg-background rounded-lg border mt-4">
                <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Key Insight</p>
                  <p className="text-sm text-muted-foreground">{(result.data as { insight: string }).insight}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Suggested Queries & History */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Suggested */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Suggested Questions
            </CardTitle>
            <CardDescription>Try asking one of these</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suggestedQueries.map((suggested) => (
                <Button
                  key={suggested}
                  variant="ghost"
                  className="w-full justify-start text-left h-auto py-3 px-4"
                  onClick={() => handleSuggestedQuery(suggested)}
                >
                  <MessageSquare className="h-4 w-4 mr-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm">{suggested}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Queries
            </CardTitle>
            <CardDescription>Your query history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentQueries.map((recent, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => handleSuggestedQuery(recent.query)}
                >
                  <div>
                    <p className="text-sm font-medium">{recent.query}</p>
                    <p className="text-xs text-muted-foreground">{recent.timestamp}</p>
                  </div>
                  <Badge variant="secondary">{recent.results} results</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
