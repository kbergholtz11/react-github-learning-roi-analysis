"use client";

import { Suspense, lazy, memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Chart loading skeleton
function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div style={{ height }} className="w-full">
      <Skeleton className="w-full h-full rounded-lg" />
    </div>
  );
}

// Donut chart skeleton - circular
function DonutSkeleton() {
  return (
    <div className="flex items-center justify-center h-[200px]">
      <Skeleton className="w-40 h-40 rounded-full" />
    </div>
  );
}

// Props types (re-export from charts for type safety)
interface ChartDataItem {
  name: string;
  value?: number;
  color?: string;
  [key: string]: string | number | undefined;
}

interface DonutChartProps {
  data: ChartDataItem[];
  centerLabel?: string;
  showLegend?: boolean;
}

interface SimpleAreaChartProps {
  data: ChartDataItem[];
  dataKey: string;
  secondaryDataKey?: string;
  color?: string;
  secondaryColor?: string;
  useSecondaryAxis?: boolean;
}

interface TrendLineChartProps {
  data: ChartDataItem[];
  lines: {
    dataKey: string;
    color: string;
    name?: string;
    showTrend?: boolean;
  }[];
  showReferenceLine?: boolean;
  referenceValue?: number;
  referenceLabel?: string;
}

interface BarChartProps {
  data: ChartDataItem[];
  dataKey: string;
  secondaryDataKey?: string;
  color?: string;
  secondaryColor?: string;
  layout?: "horizontal" | "vertical";
}

// Lazy load individual chart components
const LazyDonutChartInner = lazy(() => 
  import("./charts").then(mod => ({ default: mod.DonutChart }))
);

const LazyAreaChartInner = lazy(() => 
  import("./charts").then(mod => ({ default: mod.SimpleAreaChart }))
);

const LazyTrendLineChartInner = lazy(() => 
  import("./charts").then(mod => ({ default: mod.TrendLineChart }))
);

const LazyBarChartInner = lazy(() => 
  import("./charts").then(mod => ({ default: mod.SimpleBarChart }))
);

// Wrapped components with Suspense boundaries
export const LazyDonutChart = memo(function LazyDonutChart(props: DonutChartProps) {
  return (
    <Suspense fallback={<DonutSkeleton />}>
      <LazyDonutChartInner {...props} />
    </Suspense>
  );
});

export const LazyAreaChart = memo(function LazyAreaChart(props: SimpleAreaChartProps) {
  return (
    <Suspense fallback={<ChartSkeleton height={200} />}>
      <LazyAreaChartInner {...props} />
    </Suspense>
  );
});

export const LazyTrendLineChart = memo(function LazyTrendLineChart(props: TrendLineChartProps) {
  return (
    <Suspense fallback={<ChartSkeleton height={300} />}>
      <LazyTrendLineChartInner {...props} />
    </Suspense>
  );
});

export const LazyBarChart = memo(function LazyBarChart(props: BarChartProps) {
  return (
    <Suspense fallback={<ChartSkeleton height={300} />}>
      <LazyBarChartInner {...props} />
    </Suspense>
  );
});
