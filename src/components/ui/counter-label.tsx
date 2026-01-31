"use client";

import { cn } from "@/lib/utils";

interface CounterLabelProps {
  count: number;
  variant?: "default" | "primary" | "secondary" | "muted";
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * GitHub Primer-style CounterLabel component
 * Used for displaying counts in navigation, tabs, and lists
 */
export function CounterLabel({ 
  count, 
  variant = "default",
  size = "md",
  className 
}: CounterLabelProps) {
  const formatCount = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return n.toString();
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-semibold rounded-full tabular-nums",
        // Size variants
        size === "sm" && "min-w-[18px] px-1.5 py-0 text-[10px]",
        size === "md" && "min-w-[20px] px-2 py-0.5 text-xs",
        size === "lg" && "min-w-[24px] px-2.5 py-1 text-sm",
        // Color variants
        variant === "default" && "bg-muted text-muted-foreground",
        variant === "primary" && "bg-[var(--github-blue)] text-white",
        variant === "secondary" && "bg-[var(--github-green)] text-white",
        variant === "muted" && "bg-transparent text-muted-foreground border border-border",
        className
      )}
    >
      {formatCount(count)}
    </span>
  );
}
