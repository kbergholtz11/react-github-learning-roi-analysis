"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Award, TrendingUp, Users, Target, Clock, ArrowRight } from "lucide-react";
import { useState } from "react";

// Skills data
const skillsOverview = {
  avgOverallProficiency: 68,
  expertLearners: 423,
  expertPercentage: 8.5,
  certifiedActive: 892,
  avgGrowthRate: 2.3,
};

// Skills heatmap data
const skillsHeatmap = [
  { product: "GitHub Copilot", beginner: 1250, intermediate: 1875, advanced: 625, expert: 250 },
  { product: "GitHub Actions", beginner: 875, intermediate: 1125, advanced: 475, expert: 175 },
  { product: "Advanced Security", beginner: 625, intermediate: 750, advanced: 250, expert: 100 },
  { product: "Admin & Platform", beginner: 450, intermediate: 425, advanced: 125, expert: 50 },
];

// Top skill gaps
const skillGaps = [
  { skill: "Security Best Practices", avgProficiency: 42, recommendation: "Add more security training modules" },
  { skill: "CI/CD Pipeline Design", avgProficiency: 48, recommendation: "Expand Actions workflow tutorials" },
  { skill: "Code Review with Copilot", avgProficiency: 55, recommendation: "Create Copilot review guides" },
  { skill: "GHAS Configuration", avgProficiency: 38, recommendation: "Hands-on security labs needed" },
  { skill: "Self-Hosted Runners", avgProficiency: 45, recommendation: "Add infrastructure documentation" },
];

// Individual learner data
const sampleLearners = [
  { 
    id: "L001", 
    name: "Alex Johnson", 
    copilot: 85, 
    actions: 72, 
    security: 45, 
    admin: 60, 
    overall: 66,
    level: "Advanced"
  },
  { 
    id: "L002", 
    name: "Sarah Chen", 
    copilot: 92, 
    actions: 88, 
    security: 78, 
    admin: 70, 
    overall: 82,
    level: "Expert"
  },
  { 
    id: "L003", 
    name: "Mike Wilson", 
    copilot: 55, 
    actions: 45, 
    security: 30, 
    admin: 25, 
    overall: 39,
    level: "Beginner"
  },
];

function getCompetencyLevel(score: number): string {
  if (score >= 80) return "Expert";
  if (score >= 60) return "Advanced";
  if (score >= 40) return "Intermediate";
  return "Beginner";
}

function getCompetencyColor(level: string): string {
  switch (level) {
    case "Expert": return "text-purple-600 bg-purple-100";
    case "Advanced": return "text-blue-600 bg-blue-100";
    case "Intermediate": return "text-green-600 bg-green-100";
    default: return "text-gray-600 bg-gray-100";
  }
}

function SkillBar({ skill, score }: { skill: string; score: number }) {
  const level = getCompetencyLevel(score);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{skill}</span>
        <span className="font-medium">{score}%</span>
      </div>
      <Progress value={score} className="h-2" />
      <p className="text-xs text-muted-foreground">{level}</p>
    </div>
  );
}

export default function SkillsDashboardPage() {
  const [selectedLearner, setSelectedLearner] = useState(sampleLearners[0]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Skills Development Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive view of learner skills growth and product proficiency across the cohort
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Overall Proficiency</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              {skillsOverview.avgOverallProficiency}%
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={skillsOverview.avgOverallProficiency} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expert Learners</CardDescription>
            <CardTitle className="text-2xl">{skillsOverview.expertLearners.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {skillsOverview.expertPercentage}% of total learners
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Certified & Active</CardDescription>
            <CardTitle className="text-2xl">{skillsOverview.certifiedActive.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Using products actively
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Growth Rate</CardDescription>
            <CardTitle className="text-2xl">{skillsOverview.avgGrowthRate} pts/day</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Proficiency growth per active day
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Skills Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Skills Distribution Heatmap
          </CardTitle>
          <CardDescription>Number of learners at each competency level by product</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b">
                  <th className="pb-3 font-medium">Product</th>
                  <th className="pb-3 font-medium text-center">Beginner</th>
                  <th className="pb-3 font-medium text-center">Intermediate</th>
                  <th className="pb-3 font-medium text-center">Advanced</th>
                  <th className="pb-3 font-medium text-center">Expert</th>
                </tr>
              </thead>
              <tbody>
                {skillsHeatmap.map((row) => (
                  <tr key={row.product} className="border-b last:border-0">
                    <td className="py-4 font-medium">{row.product}</td>
                    <td className="py-4">
                      <div className="flex justify-center">
                        <div className="w-20 h-12 rounded flex items-center justify-center text-sm font-bold bg-gray-100 text-gray-700">
                          {row.beginner.toLocaleString()}
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex justify-center">
                        <div className="w-20 h-12 rounded flex items-center justify-center text-sm font-bold bg-green-100 text-green-700">
                          {row.intermediate.toLocaleString()}
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex justify-center">
                        <div className="w-20 h-12 rounded flex items-center justify-center text-sm font-bold bg-blue-100 text-blue-700">
                          {row.advanced.toLocaleString()}
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex justify-center">
                        <div className="w-20 h-12 rounded flex items-center justify-center text-sm font-bold bg-purple-100 text-purple-700">
                          {row.expert.toLocaleString()}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Skill Gaps and Individual Profile */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Skill Gaps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Skill Gaps & Recommendations
            </CardTitle>
            <CardDescription>Areas needing improvement across the cohort</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {skillGaps.map((gap) => (
                <div key={gap.skill} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">{gap.skill}</span>
                    <span className="text-sm text-muted-foreground">{gap.avgProficiency}%</span>
                  </div>
                  <Progress value={gap.avgProficiency} className="h-2" />
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <ArrowRight className="h-3 w-3" />
                    {gap.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Individual Learner Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Individual Learner Skill Profile
            </CardTitle>
            <CardDescription>Select a learner to view their detailed skill profile</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Select 
                value={selectedLearner.id} 
                onValueChange={(value) => {
                  const learner = sampleLearners.find(l => l.id === value);
                  if (learner) setSelectedLearner(learner);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a learner" />
                </SelectTrigger>
                <SelectContent>
                  {sampleLearners.map((learner) => (
                    <SelectItem key={learner.id} value={learner.id}>
                      {learner.name} ({learner.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold">{selectedLearner.name}</h4>
                    <p className="text-sm text-muted-foreground">{selectedLearner.id}</p>
                  </div>
                  <Badge className={getCompetencyColor(selectedLearner.level)}>
                    {selectedLearner.level}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <SkillBar skill="GitHub Copilot" score={selectedLearner.copilot} />
                  <SkillBar skill="GitHub Actions" score={selectedLearner.actions} />
                  <SkillBar skill="Advanced Security" score={selectedLearner.security} />
                  <SkillBar skill="Admin & Platform" score={selectedLearner.admin} />
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="font-medium">Overall Proficiency</span>
                    <span className="font-bold text-lg">{selectedLearner.overall}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Learning Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Personalized Learning Recommendations
          </CardTitle>
          <CardDescription>Based on skill gaps for {selectedLearner.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {selectedLearner.security < 60 && (
              <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                <Badge variant="destructive" className="mb-2">High Priority</Badge>
                <h4 className="font-semibold">Advanced Security Fundamentals</h4>
                <p className="text-sm text-muted-foreground mt-1">2 hours • Online Course</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Security skills below 60%. Critical for role advancement.
                </p>
              </div>
            )}
            {selectedLearner.actions < 70 && (
              <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <Badge className="bg-amber-500 mb-2">Medium Priority</Badge>
                <h4 className="font-semibold">CI/CD with GitHub Actions</h4>
                <p className="text-sm text-muted-foreground mt-1">3 hours • Hands-on Lab</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Improve workflow automation skills.
                </p>
              </div>
            )}
            <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
              <Badge className="bg-green-500 mb-2">Recommended</Badge>
              <h4 className="font-semibold">GitHub Copilot Certification</h4>
              <p className="text-sm text-muted-foreground mt-1">1 hour • Certification Exam</p>
              <p className="text-xs text-muted-foreground mt-2">
                Ready to certify based on current proficiency.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
