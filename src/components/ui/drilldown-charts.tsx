"use client";

/**
 * Drill-down Charts
 * Interactive charts that allow clicking segments to filter/explore data
 */

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Filter, X } from "lucide-react";

// Types
interface DrilldownItem {
  name: string;
  value: number;
  color?: string;
  children?: DrilldownItem[];
  filterKey?: string;
  filterValue?: string;
}

interface DrilldownState {
  path: DrilldownItem[];
  current: DrilldownItem[] | null;
}

// Colors for chart segments
const COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
];

// Helper to format large numbers
function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}

// Custom tooltip component for drilldown charts
function DrilldownTooltip({
  active,
  payload,
  total,
  isDark,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: DrilldownItem }>;
  total: number;
  isDark: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const item = payload[0];
  const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
  const bgColor = isDark ? "#1f2937" : "#ffffff";
  const borderColor = isDark ? "#374151" : "#e5e7eb";
  const textColor = isDark ? "#f3f4f6" : "#111827";
  const mutedColor = isDark ? "#9ca3af" : "#6b7280";

  return (
    <div
      className="rounded-lg shadow-lg border backdrop-blur-sm"
      style={{
        backgroundColor: `${bgColor}f5`,
        borderColor,
        padding: "12px 16px",
        minWidth: "160px",
      }}
    >
      <div className="flex items-center gap-2 mb-2 pb-2 border-b" style={{ borderColor }}>
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: item.payload.color || COLORS[0] }}
        />
        <span className="font-semibold text-sm" style={{ color: textColor }}>
          {item.name}
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between items-center gap-4">
          <span className="text-xs" style={{ color: mutedColor }}>Value</span>
          <span className="text-sm font-bold" style={{ color: textColor }}>
            {item.value.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-xs" style={{ color: mutedColor }}>Share</span>
          <span className="text-sm font-medium" style={{ color: textColor }}>
            {percentage}%
          </span>
        </div>
      </div>
      {item.payload.children && item.payload.children.length > 0 && (
        <div className="mt-2 pt-2 border-t text-xs" style={{ borderColor, color: mutedColor }}>
          Click to drill down →
        </div>
      )}
    </div>
  );
}

// ============================================
// Drilldown Pie Chart
// ============================================

interface DrilldownPieChartProps {
  data: DrilldownItem[];
  title?: string;
  onDrilldown?: (item: DrilldownItem, path: DrilldownItem[]) => void;
  onFilter?: (filterKey: string, filterValue: string) => void;
  height?: number;
}

export function DrilldownPieChart({
  data,
  title = "Distribution",
  onDrilldown,
  onFilter,
  height = 300,
}: DrilldownPieChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const [drilldownState, setDrilldownState] = useState<DrilldownState>({
    path: [],
    current: null,
  });

  const currentData = drilldownState.current || data;
  const total = currentData.reduce((sum, item) => sum + item.value, 0);

  const handleClick = useCallback(
    (item: DrilldownItem, index: number) => {
      // If item has children, drill down
      if (item.children && item.children.length > 0) {
        setDrilldownState((prev) => ({
          path: [...prev.path, item],
          current: item.children!,
        }));
        setActiveIndex(undefined);
        onDrilldown?.(item, [...drilldownState.path, item]);
      } 
      // If item has filter, apply filter
      else if (item.filterKey && item.filterValue) {
        onFilter?.(item.filterKey, item.filterValue);
      }
    },
    [drilldownState.path, onDrilldown, onFilter]
  );

  const handleBack = useCallback(() => {
    setDrilldownState((prev) => {
      const newPath = prev.path.slice(0, -1);
      const parent = newPath[newPath.length - 1];
      return {
        path: newPath,
        current: parent?.children || null,
      };
    });
    setActiveIndex(undefined);
  }, []);

  const handleReset = useCallback(() => {
    setDrilldownState({ path: [], current: null });
    setActiveIndex(undefined);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {drilldownState.path.length > 0 && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          {drilldownState.path.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <X className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
        </div>
        {drilldownState.path.length > 0 && (
          <div className="flex gap-1 mt-2">
            {drilldownState.path.map((item, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {item.name}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={currentData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)}
                onClick={(_, index) => handleClick(currentData[index], index)}
                style={{ cursor: "pointer" }}
                label={({ name, percent }: { name?: string; percent?: number }) => 
                  `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`
                }
                labelLine={{ stroke: isDark ? "#6b7280" : "#9ca3af", strokeWidth: 1 }}
              >
                {currentData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || COLORS[index % COLORS.length]}
                    opacity={activeIndex === undefined || activeIndex === index ? 1 : 0.6}
                  />
                ))}
              </Pie>
              <Tooltip
                content={<DrilldownTooltip total={total} isDark={isDark} />}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-xs text-center text-muted-foreground mt-2">
          Click a segment to {currentData[0]?.children ? "drill down" : "filter"}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Drilldown Bar Chart
// ============================================

interface DrilldownBarChartProps {
  data: DrilldownItem[];
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  onDrilldown?: (item: DrilldownItem, path: DrilldownItem[]) => void;
  onFilter?: (filterKey: string, filterValue: string) => void;
  height?: number;
  layout?: "horizontal" | "vertical";
}

export function DrilldownBarChart({
  data,
  title = "Distribution",
  xAxisLabel,
  yAxisLabel,
  onDrilldown,
  onFilter,
  height = 300,
  layout = "vertical",
}: DrilldownBarChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [drilldownState, setDrilldownState] = useState<DrilldownState>({
    path: [],
    current: null,
  });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const currentData = drilldownState.current || data;
  const total = currentData.reduce((sum, item) => sum + item.value, 0);

  const colors = {
    text: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280",
    grid: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
    background: resolvedTheme === "dark" ? "#1f2937" : "#ffffff",
    border: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
  };

  const handleClick = useCallback(
    (item: DrilldownItem) => {
      if (item.children && item.children.length > 0) {
        setDrilldownState((prev) => ({
          path: [...prev.path, item],
          current: item.children!,
        }));
        onDrilldown?.(item, [...drilldownState.path, item]);
      } else if (item.filterKey && item.filterValue) {
        onFilter?.(item.filterKey, item.filterValue);
      }
    },
    [drilldownState.path, onDrilldown, onFilter]
  );

  const handleBack = useCallback(() => {
    setDrilldownState((prev) => {
      const newPath = prev.path.slice(0, -1);
      const parent = newPath[newPath.length - 1];
      return {
        path: newPath,
        current: parent?.children || null,
      };
    });
  }, []);

  const handleReset = useCallback(() => {
    setDrilldownState({ path: [], current: null });
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {drilldownState.path.length > 0 && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          {drilldownState.path.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <X className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
        </div>
        {drilldownState.path.length > 0 && (
          <div className="flex gap-1 mt-2">
            {drilldownState.path.map((item, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {item.name}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={currentData}
              layout={layout}
              margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              {layout === "vertical" ? (
                <>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: colors.text, fontSize: 12 }}
                    axisLine={{ stroke: colors.grid }}
                  />
                  <YAxis
                    tick={{ fill: colors.text, fontSize: 12 }}
                    axisLine={{ stroke: colors.grid }}
                    label={
                      yAxisLabel
                        ? {
                            value: yAxisLabel,
                            angle: -90,
                            position: "insideLeft",
                            fill: colors.text,
                          }
                        : undefined
                    }
                  />
                </>
              ) : (
                <>
                  <XAxis
                    type="number"
                    tick={{ fill: colors.text, fontSize: 12 }}
                    axisLine={{ stroke: colors.grid }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fill: colors.text, fontSize: 12 }}
                    axisLine={{ stroke: colors.grid }}
                    width={100}
                  />
                </>
              )}
              <Tooltip
                content={<DrilldownTooltip total={total} isDark={isDark} />}
              />
              <Bar
                dataKey="value"
                radius={[4, 4, 4, 4]}
                onClick={(data) => handleClick(data as unknown as DrilldownItem)}
                style={{ cursor: "pointer" }}
                onMouseEnter={(_, index) => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {currentData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || COLORS[index % COLORS.length]}
                    opacity={hoveredIndex === null || hoveredIndex === index ? 1 : 0.5}
                  />
                ))}
                <LabelList
                  dataKey="value"
                  position={layout === "vertical" ? "top" : "right"}
                  formatter={(value) => formatNumber(Number(value ?? 0))}
                  fill={colors.text}
                  fontSize={11}
                  fontWeight={500}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="text-xs text-center text-muted-foreground mt-2">
          Click a bar to {currentData[0]?.children ? "drill down" : "filter"}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// URL-Synced Drilldown Chart
// ============================================

interface UrlDrilldownChartProps {
  data: DrilldownItem[];
  title: string;
  filterParam: string;
  chartType?: "pie" | "bar";
  height?: number;
}

export function UrlDrilldownChart({
  data,
  title,
  filterParam,
  chartType = "pie",
  height = 300,
}: UrlDrilldownChartProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentFilter = searchParams.get(filterParam);

  const handleFilter = useCallback(
    (filterKey: string, filterValue: string) => {
      const params = new URLSearchParams(searchParams.toString());
      
      // Toggle filter if same value clicked
      if (params.get(filterKey) === filterValue) {
        params.delete(filterKey);
      } else {
        params.set(filterKey, filterValue);
      }
      
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleClearFilter = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(filterParam);
    router.push(`?${params.toString()}`);
  }, [router, searchParams, filterParam]);

  // Add filterKey and filterValue to data items
  const enrichedData = data.map((item) => ({
    ...item,
    filterKey: filterParam,
    filterValue: item.name.toLowerCase().replace(/\s+/g, "-"),
  }));

  const Chart = chartType === "pie" ? DrilldownPieChart : DrilldownBarChart;

  return (
    <div className="relative">
      {currentFilter && (
        <div className="absolute top-2 right-2 z-10">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClearFilter}
            className="h-7"
          >
            <Filter className="h-3 w-3 mr-1" />
            {currentFilter}
            <X className="h-3 w-3 ml-1" />
          </Button>
        </div>
      )}
      <Chart
        data={enrichedData}
        title={title}
        onFilter={handleFilter}
        height={height}
      />
    </div>
  );
}
