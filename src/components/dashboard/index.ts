export { MetricCard } from "./metric-card";
export {
  DonutChart,
  SimpleBarChart,
  SimpleAreaChart,
  ScatterPlot,
  TrendLineChart,
  Heatmap,
  CorrelationMatrix,
} from "./charts";
export { DashboardSidebar } from "./sidebar-nav";

// Lazy-loaded chart components with Suspense boundaries (for performance-critical pages)
export {
  LazyDonutChart,
  LazyAreaChart,
  LazyTrendLineChart,
  LazyBarChart,
} from "./lazy-charts";
