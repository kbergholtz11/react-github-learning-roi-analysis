"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, AlertCircle, AlertTriangle, HelpCircle } from "lucide-react";
import type { DataQualityLevel } from "@/types/data";

interface DataQualityBadgeProps {
  score: number;
  level: DataQualityLevel;
  showScore?: boolean;
  size?: "sm" | "md" | "lg";
}

const levelConfig: Record<DataQualityLevel, {
  label: string;
  className: string;
  icon: typeof CheckCircle2;
  description: string;
}> = {
  high: {
    label: "High",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800",
    icon: CheckCircle2,
    description: "Complete identity, company, and learning data",
  },
  medium: {
    label: "Medium",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
    icon: AlertTriangle,
    description: "Partial data - some fields may be missing",
  },
  low: {
    label: "Low",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-800",
    icon: AlertCircle,
    description: "Limited data available - many fields missing",
  },
};

const sizeClasses = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-sm px-2 py-0.5",
  lg: "text-base px-3 py-1",
};

/**
 * Data Quality Badge - shows the quality level of a learner's data
 */
export function DataQualityBadge({ score, level, showScore = true, size = "sm" }: DataQualityBadgeProps) {
  const config = levelConfig[level] || levelConfig.medium;
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`${config.className} ${sizeClasses[size]} gap-1 font-medium cursor-help`}
          >
            <Icon className={size === "sm" ? "h-3 w-3" : size === "md" ? "h-3.5 w-3.5" : "h-4 w-4"} />
            {showScore ? `${score}%` : config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">Data Quality: {config.label} ({score}%)</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            <div className="text-xs mt-2">
              <p className="font-medium mb-1">Score breakdown:</p>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                <li>Identity (email, handle, name): 40 pts</li>
                <li>Company resolution: 25 pts</li>
                <li>Learning data: 20 pts</li>
                <li>Product usage: 15 pts</li>
              </ul>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Data Quality Dot - minimal indicator for tables
 */
export function DataQualityDot({ level }: { level: DataQualityLevel }) {
  const colors: Record<DataQualityLevel, string> = {
    high: "bg-green-500",
    medium: "bg-yellow-500",
    low: "bg-red-500",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-block w-2 h-2 rounded-full ${colors[level]} cursor-help`} />
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Data Quality: {level.charAt(0).toUpperCase() + level.slice(1)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Data Quality Progress - shows score as a progress bar
 */
export function DataQualityProgress({ score, level, showLabel = true }: { 
  score: number; 
  level: DataQualityLevel;
  showLabel?: boolean;
}) {
  const colors: Record<DataQualityLevel, string> = {
    high: "bg-green-500",
    medium: "bg-yellow-500",
    low: "bg-red-500",
  };

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Data Quality</span>
          <span>{score}%</span>
        </div>
      )}
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full ${colors[level]} transition-all duration-300`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
