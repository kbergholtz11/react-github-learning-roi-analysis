"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Database, FileJson, Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataSourceIndicatorProps {
  source?: "kusto" | "aggregated" | "csv" | "cached";
  generatedAt?: string;
  className?: string;
  showLabel?: boolean;
}

const sourceConfig = {
  kusto: {
    icon: Database,
    label: "Live Data",
    description: "Real-time from Azure Data Explorer",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    dotColor: "bg-green-500",
  },
  aggregated: {
    icon: FileJson,
    label: "Aggregated",
    description: "Pre-computed from last sync",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    dotColor: "bg-blue-500",
  },
  csv: {
    icon: FileJson,
    label: "CSV Data",
    description: "From local CSV files",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    dotColor: "bg-yellow-500",
  },
  cached: {
    icon: Clock,
    label: "Cached",
    description: "From cache, may be stale",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    dotColor: "bg-gray-500",
  },
};

export function DataSourceIndicator({
  source = "aggregated",
  generatedAt,
  className,
  showLabel = true,
}: DataSourceIndicatorProps) {
  const config = sourceConfig[source] || sourceConfig.aggregated;
  const Icon = config.icon;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return null;
    }
  };

  const timeAgo = formatDate(generatedAt);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 font-normal cursor-help",
              config.color,
              className
            )}
          >
            <span className={cn("h-2 w-2 rounded-full animate-pulse", config.dotColor)} />
            <Icon className="h-3 w-3" />
            {showLabel && <span>{config.label}</span>}
            {timeAgo && <span className="text-xs opacity-75">• {timeAgo}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{config.description}</p>
            {generatedAt && (
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(generatedAt).toLocaleString()}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact version for use in headers/cards
 */
export function DataSourceDot({
  source = "aggregated",
  className,
}: {
  source?: "kusto" | "aggregated" | "csv" | "cached";
  className?: string;
}) {
  const config = sourceConfig[source] || sourceConfig.aggregated;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full cursor-help",
              config.dotColor,
              source === "kusto" && "animate-pulse",
              className
            )}
          />
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Backend health indicator
 */
export function BackendStatusIndicator({
  isAvailable,
  className,
}: {
  isAvailable: boolean;
  className?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 font-normal cursor-help",
              isAvailable
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
              className
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isAvailable ? "bg-green-500 animate-pulse" : "bg-red-500"
              )}
            />
            {isAvailable ? "Live" : "Offline"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {isAvailable
              ? "FastAPI backend connected - using live Kusto data"
              : "Backend unavailable - using aggregated data"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
