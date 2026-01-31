"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const labelVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-medium text-xs px-2.5 py-0.5 border",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground border-transparent",
        // GitHub Issue/PR label colors
        blue: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
        green: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800",
        purple: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800",
        orange: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800",
        red: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800",
        yellow: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800",
        pink: "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-800",
        gray: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
        // Semantic labels
        success: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800",
        warning: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800",
        danger: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800",
        info: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
        // Special GitHub labels
        bug: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800",
        feature: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800",
        enhancement: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
        documentation: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
      },
      size: {
        sm: "text-[10px] px-1.5 py-0",
        md: "text-xs px-2.5 py-0.5",
        lg: "text-sm px-3 py-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface LabelProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof labelVariants> {
  /** Optional dot indicator */
  dot?: boolean;
  /** Custom dot color (if different from label color) */
  dotColor?: string;
}

/**
 * GitHub Primer-style Label component
 * Used for categorizing issues, PRs, and other items
 */
export function Label({ 
  className, 
  variant, 
  size,
  dot = false,
  dotColor,
  children,
  ...props 
}: LabelProps) {
  return (
    <span
      className={cn(labelVariants({ variant, size }), className)}
      {...props}
    >
      {dot && (
        <span 
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: dotColor }}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

/**
 * GitHub-style issue state label
 */
export function StateLabel({ 
  state, 
  className 
}: { 
  state: "open" | "closed" | "merged" | "draft";
  className?: string;
}) {
  const stateConfig = {
    open: { text: "Open", variant: "green" as const },
    closed: { text: "Closed", variant: "red" as const },
    merged: { text: "Merged", variant: "purple" as const },
    draft: { text: "Draft", variant: "gray" as const },
  };

  const config = stateConfig[state];

  return (
    <Label variant={config.variant} className={className}>
      {config.text}
    </Label>
  );
}
