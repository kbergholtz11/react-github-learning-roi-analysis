"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

/**
 * DataFreshness - Shows when data was last updated
 * 
 * Provides visual feedback about data freshness following
 * GitHub Data principles for transparency.
 */

interface DataFreshnessResponse {
  is_fresh: boolean;
  last_modified: string | null;
  last_sync: string | null;
  hours_since_update: number | null;
  freshness_message: string;
  record_count: number | null;
}

async function fetchDataFreshness(): Promise<DataFreshnessResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const response = await fetch(`${baseUrl}/api/data-freshness`);
  if (!response.ok) {
    throw new Error("Failed to fetch data freshness");
  }
  return response.json();
}

interface DataFreshnessProps {
  variant?: "badge" | "inline" | "detailed";
  className?: string;
  showRecordCount?: boolean;
}

export function DataFreshness({ 
  variant = "inline",
  className,
  showRecordCount = false,
}: DataFreshnessProps) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["data-freshness"],
    queryFn: fetchDataFreshness,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-1.5 text-muted-foreground", className)}>
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-1.5 text-muted-foreground cursor-help", className)}>
              <AlertCircle className="h-3.5 w-3.5" />
              <span className="text-xs">Data status unknown</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Unable to determine data freshness</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const { is_fresh, freshness_message, hours_since_update, record_count } = data;

  // Determine status color
  const getStatusColor = () => {
    if (hours_since_update === null) return "text-muted-foreground";
    if (hours_since_update < 4) return "text-green-600 dark:text-green-400";
    if (hours_since_update < 24) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getIcon = () => {
    if (!is_fresh) return <AlertCircle className="h-3.5 w-3.5" />;
    return <CheckCircle className="h-3.5 w-3.5" />;
  };

  if (variant === "badge") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={is_fresh ? "outline" : "destructive"}
              className={cn("gap-1 cursor-help", className)}
            >
              {getIcon()}
              <span>{freshness_message}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="space-y-1">
              <p className="text-xs font-medium">
                {is_fresh ? "Data is fresh" : "Data may be stale"}
              </p>
              {record_count && (
                <p className="text-xs text-muted-foreground">
                  {record_count.toLocaleString()} learner records
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "detailed") {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className={cn("h-4 w-4", getStatusColor())} />
            <span className="text-sm font-medium">Data Freshness</span>
          </div>
          <button 
            onClick={() => refetch()}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="text-sm text-muted-foreground">
          {freshness_message}
        </div>
        {showRecordCount && record_count && (
          <div className="text-xs text-muted-foreground">
            {record_count.toLocaleString()} total learner records
          </div>
        )}
      </div>
    );
  }

  // Default: inline variant
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-1.5 cursor-help",
            getStatusColor(),
            className
          )}>
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs">{freshness_message}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="space-y-1">
            <p className="text-xs">
              {is_fresh 
                ? "Data is up to date" 
                : "Data may be outdated. Syncs run every 4-6 hours."
              }
            </p>
            {record_count && (
              <p className="text-xs text-muted-foreground">
                {record_count.toLocaleString()} learner records
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * DataQualityIndicator - Shows data quality status
 */
interface DataQualityResponse {
  available: boolean;
  timestamp?: string;
  summary?: {
    total_checks: number;
    passed: number;
    failed: number;
    errors: number;
    warnings: number;
  };
  overall_status?: string;
}

async function fetchDataQuality(): Promise<DataQualityResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const response = await fetch(`${baseUrl}/api/data-quality`);
  if (!response.ok) {
    throw new Error("Failed to fetch data quality");
  }
  return response.json();
}

interface DataQualityIndicatorProps {
  className?: string;
}

export function DataQualityIndicator({ className }: DataQualityIndicatorProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["data-quality"],
    queryFn: fetchDataQuality,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading || !data?.available) {
    return null;
  }

  const { summary, overall_status } = data;
  if (!summary) return null;

  const isHealthy = overall_status === "healthy" || summary.errors === 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={isHealthy ? "outline" : "destructive"}
            className={cn("gap-1 cursor-help", className)}
          >
            {isHealthy ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            <span>
              {summary.passed}/{summary.total_checks} checks passed
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="space-y-1">
            <p className="text-xs font-medium">Data Quality Report</p>
            <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4">
              <span>Passed:</span>
              <span className="text-green-600">{summary.passed}</span>
              <span>Warnings:</span>
              <span className="text-yellow-600">{summary.warnings}</span>
              <span>Errors:</span>
              <span className="text-red-600">{summary.errors}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
