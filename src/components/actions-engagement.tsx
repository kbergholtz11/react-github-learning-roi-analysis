"use client";

/**
 * Actions Engagement Level Visualization
 * 
 * Displays Actions engagement levels (0-5) based on the github/data 
 * Actions engagement metric framework.
 * 
 * Documentation: github/data/team-docs/trust_compute_data/docs/how_to_guides/actions_engagement_metric_user_guide.md
 * 
 * Levels are data-driven based on clustering algorithm:
 *   Level 0: No Actions usage
 *   Level 1: 1-4 days usage in L28, 1+ workflow executions
 *   Level 2: 5-9 days usage in L28, 1+ workflow executions  
 *   Level 3: 10-17 days usage in L28, 1+ workflow executions
 *   Level 4: 18+ days usage in L28, 1-59 workflow executions
 *   Level 5: 18+ days usage in L28, 60+ workflow executions (power users)
 */

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Zap, Rocket, Crown, Star, Circle } from "lucide-react";

interface ActionsEngagementLevelProps {
  level: number;
  workflowExecutions?: number;
  daysWithActivity?: number;
  showDetails?: boolean;
  className?: string;
}

interface LevelConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ElementType;
  minDays: number;
  maxDays: number | null;
  minExecutions: number;
  maxExecutions: number | null;
}

const LEVEL_CONFIGS: Record<number, LevelConfig> = {
  0: {
    label: "Inactive",
    description: "No Actions usage in last 28 days",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    borderColor: "border-gray-200",
    icon: Circle,
    minDays: 0,
    maxDays: 0,
    minExecutions: 0,
    maxExecutions: 0,
  },
  1: {
    label: "Getting Started",
    description: "1-4 days with workflow activity",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: Play,
    minDays: 1,
    maxDays: 4,
    minExecutions: 1,
    maxExecutions: null,
  },
  2: {
    label: "Occasional",
    description: "5-9 days with workflow activity",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    icon: Star,
    minDays: 5,
    maxDays: 9,
    minExecutions: 1,
    maxExecutions: null,
  },
  3: {
    label: "Regular",
    description: "10-17 days with workflow activity",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    icon: Zap,
    minDays: 10,
    maxDays: 17,
    minExecutions: 1,
    maxExecutions: null,
  },
  4: {
    label: "Heavy",
    description: "18+ days with 1-59 workflow executions",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    icon: Rocket,
    minDays: 18,
    maxDays: null,
    minExecutions: 1,
    maxExecutions: 59,
  },
  5: {
    label: "Power User",
    description: "18+ days with 60+ workflow executions",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: Crown,
    minDays: 18,
    maxDays: null,
    minExecutions: 60,
    maxExecutions: null,
  },
};

/**
 * Visual representation of a single Actions engagement level
 */
export function ActionsEngagementLevel({
  level,
  workflowExecutions,
  daysWithActivity,
  showDetails = false,
  className,
}: ActionsEngagementLevelProps) {
  const config = LEVEL_CONFIGS[level] ?? LEVEL_CONFIGS[0];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border",
              config.bgColor,
              config.borderColor,
              className
            )}
          >
            <Icon className={cn("h-4 w-4", config.color)} />
            <span className={cn("text-sm font-medium", config.color)}>
              Level {level}
            </span>
            {showDetails && (
              <span className="text-xs text-muted-foreground ml-1">
                ({config.label})
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{config.label}</p>
            <p className="text-sm text-muted-foreground">{config.description}</p>
            {daysWithActivity !== undefined && (
              <p className="text-xs">
                Days with activity: <strong>{daysWithActivity}</strong>
              </p>
            )}
            {workflowExecutions !== undefined && (
              <p className="text-xs">
                Workflow executions: <strong>{workflowExecutions}</strong>
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ActionsEngagementDistributionProps {
  /** Distribution of users per level: { 0: count, 1: count, ... } */
  distribution: Record<number, number>;
  /** Whether to show as certified vs uncertified comparison */
  comparisonData?: {
    certified: Record<number, number>;
    uncertified: Record<number, number>;
  };
  className?: string;
}

/**
 * Distribution chart showing user counts at each engagement level
 */
export function ActionsEngagementDistribution({
  distribution,
  comparisonData,
  className,
}: ActionsEngagementDistributionProps) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);

  if (comparisonData) {
    const certifiedTotal = Object.values(comparisonData.certified).reduce((a, b) => a + b, 0);
    const uncertifiedTotal = Object.values(comparisonData.uncertified).reduce((a, b) => a + b, 0);

    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-500" />
            Actions Engagement by Certification Status
          </CardTitle>
          <CardDescription>
            Comparing engagement levels between certified and uncertified users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[0, 1, 2, 3, 4, 5].map((level) => {
              const config = LEVEL_CONFIGS[level];
              const certPct = certifiedTotal > 0 
                ? ((comparisonData.certified[level] || 0) / certifiedTotal) * 100 
                : 0;
              const uncertPct = uncertifiedTotal > 0 
                ? ((comparisonData.uncertified[level] || 0) / uncertifiedTotal) * 100 
                : 0;

              return (
                <div key={level} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn(config.bgColor, config.color)}>
                        L{level}
                      </Badge>
                      <span>{config.label}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-green-600">
                        Certified: {certPct.toFixed(1)}%
                      </span>
                      <span className="text-gray-500">
                        Other: {uncertPct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 h-3">
                    <div 
                      className="bg-green-500 rounded-l" 
                      style={{ width: `${certPct}%` }}
                    />
                    <div 
                      className="bg-gray-300 rounded-r" 
                      style={{ width: `${uncertPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-purple-500" />
          Actions Engagement Distribution
        </CardTitle>
        <CardDescription>
          User distribution across engagement levels (last 28 days)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[5, 4, 3, 2, 1, 0].map((level) => {
            const config = LEVEL_CONFIGS[level];
            const count = distribution[level] || 0;
            const percentage = total > 0 ? (count / total) * 100 : 0;
            const Icon = config.icon;

            return (
              <div key={level} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", config.color)} />
                    <span className="font-medium">{config.label}</span>
                    <span className="text-muted-foreground text-xs">
                      (Level {level})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{count.toLocaleString()}</span>
                    <span className="text-muted-foreground text-xs">
                      ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <Progress 
                  value={percentage} 
                  className="h-2"
                />
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Total users: {total.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}

interface ActionsEngagementSummaryProps {
  /** Average engagement level */
  averageLevel: number;
  /** Percentage of users at level 4+ */
  powerUserPercentage: number;
  /** Total users with any Actions activity */
  activeUsers: number;
  /** Total users analyzed */
  totalUsers: number;
  className?: string;
}

/**
 * Summary card showing key Actions engagement metrics
 */
export function ActionsEngagementSummary({
  averageLevel,
  powerUserPercentage,
  activeUsers,
  totalUsers,
  className,
}: ActionsEngagementSummaryProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-purple-500" />
          Actions Engagement Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Average Level</p>
            <p className="text-2xl font-bold text-purple-600">
              {averageLevel.toFixed(1)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Power Users (L4-5)</p>
            <p className="text-2xl font-bold text-amber-600">
              {powerUserPercentage.toFixed(1)}%
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Active Users</p>
            <p className="text-2xl font-bold text-green-600">
              {activeUsers.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Adoption Rate</p>
            <p className="text-2xl font-bold text-blue-600">
              {totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Helper function to calculate engagement level from raw data
 */
export function calculateActionsEngagementLevel(
  workflowExecutions: number,
  daysWithActivity: number
): number {
  if (workflowExecutions === 0 || daysWithActivity === 0) return 0;
  if (daysWithActivity <= 4) return 1;
  if (daysWithActivity <= 9) return 2;
  if (daysWithActivity <= 17) return 3;
  if (daysWithActivity >= 18 && workflowExecutions < 60) return 4;
  if (daysWithActivity >= 18 && workflowExecutions >= 60) return 5;
  return 0;
}

/**
 * Helper to get level configuration
 */
export function getLevelConfig(level: number): LevelConfig {
  return LEVEL_CONFIGS[level] ?? LEVEL_CONFIGS[0];
}
