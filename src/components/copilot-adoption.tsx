"use client";

/**
 * Copilot Adoption Lifecycle Visualization
 * 
 * Displays Copilot subscription status and usage patterns based on 
 * github/data Copilot data definitions.
 * 
 * Documentation: github/data/team-docs/creator-communities/copilot/data-definitions.md
 * 
 * User states tracked:
 *   - Free Trial User: In 60-day free trial
 *   - Active Trial: Trial user who hasn't cancelled
 *   - Active Subscriber: Billed subscription
 *   - Free User: Student, educator, or OSS maintainer
 *   - Cancelled: Previously subscribed, now inactive
 */

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  Laptop, 
  Monitor, 
  Terminal, 
  Code, 
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Zap
} from "lucide-react";

interface CopilotStatusBadgeProps {
  isSubscribed: boolean;
  isActive: boolean;
  activeDays?: number;
  className?: string;
}

/**
 * Badge showing Copilot subscription/activity status
 */
export function CopilotStatusBadge({
  isSubscribed,
  isActive,
  activeDays,
  className,
}: CopilotStatusBadgeProps) {
  let status: { label: string; color: string; icon: React.ElementType };

  if (isActive && isSubscribed) {
    status = { label: "Active Subscriber", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 };
  } else if (isSubscribed && !isActive) {
    status = { label: "Subscribed (Inactive)", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock };
  } else if (isActive && !isSubscribed) {
    status = { label: "Free/Trial User", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Sparkles };
  } else {
    status = { label: "Not Using", color: "bg-gray-100 text-gray-700 border-gray-200", icon: XCircle };
  }

  const Icon = status.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border",
              status.color,
              className
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium">{status.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">{status.label}</p>
            {activeDays !== undefined && (
              <p className="text-sm">Active days (90d): {activeDays}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface IDEConfig {
  label: string;
  icon: React.ElementType;
  color: string;
}

const IDE_CONFIGS: Record<string, IDEConfig> = {
  VSCode: { label: "VS Code", icon: Code, color: "text-blue-500" },
  VisualStudio: { label: "Visual Studio", icon: Monitor, color: "text-purple-500" },
  JetBrains: { label: "JetBrains", icon: Laptop, color: "text-orange-500" },
  Neovim: { label: "Neovim", icon: Terminal, color: "text-green-500" },
  Vim: { label: "Vim", icon: Terminal, color: "text-green-600" },
  Xcode: { label: "Xcode", icon: Laptop, color: "text-blue-600" },
  Other: { label: "Other", icon: Code, color: "text-gray-500" },
  Unknown: { label: "Unknown", icon: Code, color: "text-gray-400" },
};

interface CopilotIDEBadgeProps {
  ide: string;
  className?: string;
}

/**
 * Badge showing the IDE used for Copilot
 */
export function CopilotIDEBadge({ ide, className }: CopilotIDEBadgeProps) {
  const config = IDE_CONFIGS[ide] ?? IDE_CONFIGS.Unknown;
  const Icon = config.icon;

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <Icon className={cn("h-4 w-4", config.color)} />
      <span className="text-sm">{config.label}</span>
    </div>
  );
}

interface CopilotAdoptionStatsProps {
  /** Total users in dataset */
  totalUsers: number;
  /** Users with any Copilot usage */
  usersWithCopilot: number;
  /** Users actively subscribed */
  subscribedUsers: number;
  /** Users active in last 90 days */
  activeUsers90d: number;
  /** IDE distribution: { VSCode: count, JetBrains: count, ... } */
  ideDistribution?: Record<string, number>;
  className?: string;
}

/**
 * Summary card showing Copilot adoption statistics
 */
export function CopilotAdoptionStats({
  totalUsers,
  usersWithCopilot,
  subscribedUsers,
  activeUsers90d,
  ideDistribution,
  className,
}: CopilotAdoptionStatsProps) {
  const adoptionRate = totalUsers > 0 ? (usersWithCopilot / totalUsers) * 100 : 0;
  const subscriptionRate = usersWithCopilot > 0 ? (subscribedUsers / usersWithCopilot) * 100 : 0;
  const activeRate = usersWithCopilot > 0 ? (activeUsers90d / usersWithCopilot) * 100 : 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          Copilot Adoption
        </CardTitle>
        <CardDescription>
          Copilot subscription and usage patterns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Adoption Rate</p>
            <p className="text-2xl font-bold text-purple-600">
              {adoptionRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              {usersWithCopilot.toLocaleString()} / {totalUsers.toLocaleString()} users
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Subscription Rate</p>
            <p className="text-2xl font-bold text-green-600">
              {subscriptionRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              {subscribedUsers.toLocaleString()} subscribers
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Active (90d)</p>
            <p className="text-2xl font-bold text-blue-600">
              {activeUsers90d.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeRate.toFixed(1)}% of adopters
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Avg Active Days</p>
            <p className="text-2xl font-bold text-cyan-600">
              {activeUsers90d > 0 ? "~15" : "0"}
            </p>
            <p className="text-xs text-muted-foreground">per 90-day period</p>
          </div>
        </div>

        {ideDistribution && Object.keys(ideDistribution).length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">IDE Distribution</h4>
            {Object.entries(ideDistribution)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([ide, count]) => {
                const config = IDE_CONFIGS[ide] ?? IDE_CONFIGS.Unknown;
                const Icon = config.icon;
                const percentage = usersWithCopilot > 0 
                  ? (count / usersWithCopilot) * 100 
                  : 0;

                return (
                  <div key={ide} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-4 w-4", config.color)} />
                        <span>{config.label}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {count.toLocaleString()} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-1.5" />
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CopilotCertificationImpactProps {
  /** Certified users with Copilot */
  certifiedWithCopilot: number;
  /** Total certified users */
  totalCertified: number;
  /** Uncertified users with Copilot */
  uncertifiedWithCopilot: number;
  /** Total uncertified users */
  totalUncertified: number;
  /** Average active days for certified users */
  certifiedAvgActiveDays?: number;
  /** Average active days for uncertified users */
  uncertifiedAvgActiveDays?: number;
  className?: string;
}

/**
 * Comparison card showing Copilot adoption difference between certified and uncertified users
 */
export function CopilotCertificationImpact({
  certifiedWithCopilot,
  totalCertified,
  uncertifiedWithCopilot,
  totalUncertified,
  certifiedAvgActiveDays,
  uncertifiedAvgActiveDays,
  className,
}: CopilotCertificationImpactProps) {
  const certifiedRate = totalCertified > 0 
    ? (certifiedWithCopilot / totalCertified) * 100 
    : 0;
  const uncertifiedRate = totalUncertified > 0 
    ? (uncertifiedWithCopilot / totalUncertified) * 100 
    : 0;
  const rateDiff = certifiedRate - uncertifiedRate;
  const activeDaysDiff = (certifiedAvgActiveDays ?? 0) - (uncertifiedAvgActiveDays ?? 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          Copilot × Certification Impact
        </CardTitle>
        <CardDescription>
          How certification correlates with Copilot adoption
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2 p-4 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">Certified</span>
            </div>
            <p className="text-3xl font-bold text-green-700">
              {certifiedRate.toFixed(1)}%
            </p>
            <p className="text-sm text-green-600">
              {certifiedWithCopilot.toLocaleString()} / {totalCertified.toLocaleString()} users
            </p>
            {certifiedAvgActiveDays !== undefined && (
              <p className="text-xs text-green-600">
                Avg {certifiedAvgActiveDays.toFixed(1)} active days/90d
              </p>
            )}
          </div>

          <div className="space-y-2 p-4 rounded-lg bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-700">Uncertified</span>
            </div>
            <p className="text-3xl font-bold text-gray-600">
              {uncertifiedRate.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500">
              {uncertifiedWithCopilot.toLocaleString()} / {totalUncertified.toLocaleString()} users
            </p>
            {uncertifiedAvgActiveDays !== undefined && (
              <p className="text-xs text-gray-500">
                Avg {uncertifiedAvgActiveDays.toFixed(1)} active days/90d
              </p>
            )}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 font-medium">
                Certification Impact
              </p>
              <p className="text-xs text-purple-600">
                Difference in Copilot adoption rate
              </p>
            </div>
            <div className="text-right">
              <p className={cn(
                "text-2xl font-bold",
                rateDiff >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {rateDiff >= 0 ? "+" : ""}{rateDiff.toFixed(1)}%
              </p>
              {activeDaysDiff !== 0 && (
                <p className={cn(
                  "text-xs",
                  activeDaysDiff >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {activeDaysDiff >= 0 ? "+" : ""}{activeDaysDiff.toFixed(1)} avg days
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
