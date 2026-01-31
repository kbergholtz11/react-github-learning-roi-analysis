import { cn } from "@/lib/utils"

interface SkeletonProps extends React.ComponentProps<"div"> {
  /** Use shimmer animation instead of pulse */
  shimmer?: boolean;
}

function Skeleton({ className, shimmer = false, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md",
        shimmer ? "skeleton-shimmer" : "bg-muted animate-pulse",
        className
      )}
      {...props}
    />
  )
}

/** Avatar-shaped skeleton */
function AvatarSkeleton({ 
  size = "md",
  className,
}: { 
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: "h-6 w-6",
    md: "h-10 w-10",
    lg: "h-16 w-16",
    xl: "h-24 w-24",
  };

  return (
    <Skeleton className={cn("rounded-full", sizes[size], className)} />
  );
}

/** Text line skeleton */
function TextSkeleton({ 
  lines = 1,
  className,
}: { 
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            "h-4",
            i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
          )} 
        />
      ))}
    </div>
  );
}

/** Card skeleton with header and content */
function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-6 space-y-4", className)}>
      <div className="space-y-2">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-24" />
    </div>
  );
}

/** Metric card skeleton */
function MetricSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-6", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
    </div>
  );
}

/** Table row skeleton */
function TableRowSkeleton({ 
  columns = 4,
  className,
}: { 
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-4 py-3 px-4", className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            "h-4",
            i === 0 ? "w-32" : "flex-1"
          )} 
        />
      ))}
    </div>
  );
}

/** Chart skeleton */
function ChartSkeleton({ 
  type = "bar",
  className,
}: { 
  type?: "bar" | "line" | "pie";
  className?: string;
}) {
  if (type === "pie") {
    return (
      <div className={cn("flex items-center justify-center h-[200px]", className)}>
        <Skeleton className="w-40 h-40 rounded-full" />
      </div>
    );
  }

  return (
    <div className={cn("h-[200px] flex items-end gap-2 p-4", className)}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton 
          key={i} 
          className="flex-1"
          style={{ height: `${Math.random() * 60 + 20}%` }}
        />
      ))}
    </div>
  );
}

export { 
  Skeleton, 
  AvatarSkeleton, 
  TextSkeleton, 
  CardSkeleton, 
  MetricSkeleton,
  TableRowSkeleton,
  ChartSkeleton,
}

