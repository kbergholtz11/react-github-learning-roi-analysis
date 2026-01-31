"use client";

import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";

type FlashVariant = "default" | "success" | "warning" | "danger";

interface FlashProps {
  variant?: FlashVariant;
  children: React.ReactNode;
  title?: string;
  onDismiss?: () => void;
  className?: string;
  full?: boolean;
}

const flashIcons: Record<FlashVariant, React.ComponentType<{ className?: string }>> = {
  default: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  danger: AlertCircle,
};

const flashStyles: Record<FlashVariant, string> = {
  default: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800/50 dark:text-blue-200",
  success: "bg-green-50 border-green-200 text-green-900 dark:bg-green-950/40 dark:border-green-800/50 dark:text-green-200",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950/40 dark:border-yellow-800/50 dark:text-yellow-200",
  danger: "bg-red-50 border-red-200 text-red-900 dark:bg-red-950/40 dark:border-red-800/50 dark:text-red-200",
};

const iconStyles: Record<FlashVariant, string> = {
  default: "text-blue-600 dark:text-blue-400",
  success: "text-green-600 dark:text-green-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  danger: "text-red-600 dark:text-red-400",
};

/**
 * GitHub Primer-style Flash message component
 * Used for alerts, notifications, and system messages
 */
export function Flash({ 
  variant = "default", 
  children, 
  title,
  onDismiss, 
  className,
  full = false,
}: FlashProps) {
  const Icon = flashIcons[variant];
  
  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-4 border",
        full ? "rounded-none" : "rounded-lg",
        flashStyles[variant], 
        className
      )}
      role="alert"
    >
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", iconStyles[variant])} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-1">{title}</p>}
        <div className="text-sm">{children}</div>
      </div>
      {onDismiss && (
        <button 
          onClick={onDismiss} 
          className="shrink-0 p-1 -m-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Flash banner for page-level messages
 */
export function FlashBanner({ 
  variant = "default",
  children,
  onDismiss,
}: Omit<FlashProps, "full">) {
  return (
    <Flash variant={variant} full onDismiss={onDismiss}>
      {children}
    </Flash>
  );
}
