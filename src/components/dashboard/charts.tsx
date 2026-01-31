"use client";

import { useTheme } from "next-themes";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
  LineChart,
  Line,
  Legend,
  ReferenceLine,
  Cell,
  LabelList,
} from "recharts";

// Helper to format large numbers
function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return Math.round(value).toString();
}

// Helper to format percentage
function formatPercent(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

// Custom styled tooltip component
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value?: number | string;
    name?: string;
    dataKey?: string | number;
    color?: string;
  }>;
  label?: string | number;
  colors: ReturnType<typeof useChartColors>;
  showPercentage?: boolean;
  totalValue?: number;
  labelFormatter?: (label: string) => string;
}

function CustomTooltip({
  active,
  payload,
  label,
  colors,
  showPercentage = false,
  totalValue = 0,
  labelFormatter,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const displayLabel = labelFormatter ? labelFormatter(String(label)) : label;

  return (
    <div
      className="rounded-lg shadow-lg border backdrop-blur-sm"
      style={{
        backgroundColor: `${colors.background}f5`,
        borderColor: colors.border,
        padding: "12px 16px",
        minWidth: "140px",
      }}
    >
      {displayLabel && (
        <p
          className="font-semibold text-sm mb-2 pb-2 border-b"
          style={{ color: colors.text, borderColor: colors.border }}
        >
          {displayLabel}
        </p>
      )}
      <div className="space-y-1.5">
        {payload.map((entry, index) => {
          const value = Number(entry.value);
          const color = entry.color || "#8b5cf6";
          const name = entry.name || entry.dataKey;
          
          return (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs" style={{ color: colors.text }}>
                  {name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold" style={{ color: colors.text }}>
                  {formatNumber(value)}
                </span>
                {showPercentage && totalValue > 0 && (
                  <span className="text-xs ml-1" style={{ color: colors.text, opacity: 0.7 }}>
                    ({formatPercent(value, totalValue)})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Hook to get theme-aware colors
function useChartColors() {
  const { resolvedTheme } = useTheme();
  
  const colors = useMemo(() => {
    if (resolvedTheme === "dark") {
      return {
        text: "#9ca3af",
        grid: "#374151",
        background: "#1f2937",
        border: "#374151",
      };
    }
    return {
      text: "#6b7280",
      grid: "#e5e7eb",
      background: "#ffffff",
      border: "#e5e7eb",
    };
  }, [resolvedTheme]);

  return colors;
}

interface ChartDataItem {
  name: string;
  value?: number;
  color?: string;
  [key: string]: string | number | undefined;
}

interface DonutChartProps {
  data: ChartDataItem[];
}

// Replaced pie/donut chart with horizontal stacked bar for better readability
export function DonutChart({ data }: DonutChartProps) {
  useChartColors(); // Keep hook for potential future use with themed charts
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
  
  return (
    <div className="h-[280px] w-full flex flex-col justify-center">
      {/* Stacked horizontal bar */}
      <div className="h-8 w-full rounded-lg overflow-hidden flex mb-4">
        {data.map((item) => {
          const percentage = total > 0 ? ((item.value || 0) / total) * 100 : 0;
          return (
            <div
              key={item.name}
              className="h-full transition-all duration-300 hover:opacity-80"
              style={{ 
                width: `${percentage}%`, 
                backgroundColor: item.color || "#8b5cf6",
                minWidth: percentage > 0 ? '2px' : '0'
              }}
              title={`${item.name}: ${item.value?.toLocaleString()} (${percentage.toFixed(1)}%)`}
            />
          );
        })}
      </div>
      
      {/* Legend with values */}
      <div className="space-y-2">
        {data.map((item) => {
          const percentage = total > 0 ? ((item.value || 0) / total) * 100 : 0;
          return (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: item.color || "#8b5cf6" }}
                />
                <span className="text-sm">{item.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{item.value?.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground w-12 text-right">{percentage.toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Total */}
      <div className="mt-4 pt-3 border-t flex justify-between">
        <span className="text-sm font-medium">Total</span>
        <span className="text-sm font-bold">{total.toLocaleString()}</span>
      </div>
    </div>
  );
}

interface BarChartProps {
  data: ChartDataItem[];
  dataKey: string;
  secondaryDataKey?: string;
  color?: string;
  secondaryColor?: string;
  showLabels?: boolean;
}

export function SimpleBarChart({
  data,
  dataKey,
  secondaryDataKey,
  color = "#3b82f6",
  secondaryColor = "#22c55e",
  showLabels = true,
}: BarChartProps) {
  const colors = useChartColors();
  
  // Calculate total for percentage display in tooltip
  const total = data.reduce((sum, item) => sum + (Number(item[dataKey]) || 0), 0);
  
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 25, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="name"
            tick={{ fill: colors.text, fontSize: 12 }}
            axisLine={{ stroke: colors.grid }}
            tickLine={{ stroke: colors.grid }}
          />
          <YAxis
            tick={{ fill: colors.text, fontSize: 12 }}
            axisLine={{ stroke: colors.grid }}
            tickLine={{ stroke: colors.grid }}
            tickFormatter={formatNumber}
          />
          <Tooltip
            content={
              <CustomTooltip
                colors={colors}
                showPercentage
                totalValue={total}
              />
            }
          />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]}>
            {showLabels && (
              <LabelList
                dataKey={dataKey}
                position="top"
                fill={colors.text}
                fontSize={11}
                fontWeight={500}
                formatter={(value) => formatNumber(Number(value ?? 0))}
              />
            )}
          </Bar>
          {secondaryDataKey && (
            <Bar dataKey={secondaryDataKey} fill={secondaryColor} radius={[4, 4, 0, 0]}>
              {showLabels && (
                <LabelList
                  dataKey={secondaryDataKey}
                  position="top"
                  fill={colors.text}
                  fontSize={11}
                  fontWeight={500}
                  formatter={(value) => formatNumber(Number(value ?? 0))}
                />
              )}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface AreaChartProps {
  data: ChartDataItem[];
  dataKey: string;
  secondaryDataKey?: string;
  color?: string;
  secondaryColor?: string;
  useSecondaryAxis?: boolean;
}

export function SimpleAreaChart({
  data,
  dataKey,
  secondaryDataKey,
  color = "#3b82f6",
  secondaryColor = "#22c55e",
  useSecondaryAxis = false,
}: AreaChartProps) {
  const colors = useChartColors();
  
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: useSecondaryAxis ? 55 : 10, left: -5, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="name"
            tick={{ fill: colors.text, fontSize: 13, fontWeight: 500 }}
            axisLine={{ stroke: colors.grid }}
            tickLine={{ stroke: colors.grid }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: colors.text, fontSize: 13, fontWeight: 500 }}
            axisLine={{ stroke: colors.grid }}
            tickLine={{ stroke: colors.grid }}
            tickFormatter={formatNumber}
          />
          {useSecondaryAxis && secondaryDataKey && (
            <YAxis
              yAxisId="right"
              orientation="right"
              width={50}
              tick={{ fill: secondaryColor, fontSize: 13, fontWeight: 500 }}
              axisLine={{ stroke: secondaryColor }}
              tickLine={{ stroke: secondaryColor }}
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
            />
          )}
          <Tooltip
            content={<CustomTooltip colors={colors} />}
          />
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            {secondaryDataKey && (
              <linearGradient id={`gradient-${secondaryDataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={secondaryColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={secondaryColor} stopOpacity={0} />
              </linearGradient>
            )}
          </defs>
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fill={`url(#gradient-${dataKey})`}
            strokeWidth={2}
            yAxisId="left"
          />
          {secondaryDataKey && (
            <Area
              type="monotone"
              dataKey={secondaryDataKey}
              stroke={secondaryColor}
              fill={`url(#gradient-${secondaryDataKey})`}
              strokeWidth={2}
              yAxisId={useSecondaryAxis ? "right" : "left"}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// =============================================================================
// Scatter Plot Chart
// =============================================================================

interface ScatterDataItem {
  x: number;
  y: number;
  z?: number; // Optional size dimension
  name?: string;
  color?: string;
}

interface ScatterPlotProps {
  data: ScatterDataItem[];
  xLabel?: string;
  yLabel?: string;
  color?: string;
  showTrendLine?: boolean;
}

export function ScatterPlot({
  data,
  xLabel = "X",
  yLabel = "Y",
  color = "#8b5cf6",
  showTrendLine = false,
}: ScatterPlotProps) {
  const colors = useChartColors();

  // Calculate linear regression for trend line
  const trendLine = useMemo(() => {
    if (!showTrendLine || data.length < 2) return null;

    const n = data.length;
    const sumX = data.reduce((sum, d) => sum + d.x, 0);
    const sumY = data.reduce((sum, d) => sum + d.y, 0);
    const sumXY = data.reduce((sum, d) => sum + d.x * d.y, 0);
    const sumXX = data.reduce((sum, d) => sum + d.x * d.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const minX = Math.min(...data.map((d) => d.x));
    const maxX = Math.max(...data.map((d) => d.x));

    return [
      { x: minX, y: slope * minX + intercept },
      { x: maxX, y: slope * maxX + intercept },
    ];
  }, [data, showTrendLine]);

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            tick={{ fill: colors.text, fontSize: 12 }}
            axisLine={{ stroke: colors.grid }}
            tickLine={{ stroke: colors.grid }}
            label={{ value: xLabel, position: "bottom", fill: colors.text }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel}
            tick={{ fill: colors.text, fontSize: 12 }}
            axisLine={{ stroke: colors.grid }}
            tickLine={{ stroke: colors.grid }}
            label={{ value: yLabel, angle: -90, position: "left", fill: colors.text }}
          />
          <ZAxis type="number" dataKey="z" range={[50, 400]} />
          <Tooltip
            content={
              <CustomTooltip
                colors={colors}
                labelFormatter={(label) => label || "Data Point"}
              />
            }
          />
          <Scatter name="Data" data={data} fill={color}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || color} />
            ))}
          </Scatter>
          {showTrendLine && trendLine && (
            <Scatter
              name="Trend"
              data={trendLine}
              fill="none"
              line={{ stroke: "#ef4444", strokeWidth: 2, strokeDasharray: "5 5" }}
              shape={() => null}
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// =============================================================================
// Line Chart with Trend Lines
// =============================================================================

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

export function TrendLineChart({
  data,
  lines,
  showReferenceLine = false,
  referenceValue,
  referenceLabel = "Target",
}: TrendLineChartProps) {
  const colors = useChartColors();

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="name"
            tick={{ fill: colors.text, fontSize: 12 }}
            axisLine={{ stroke: colors.grid }}
            tickLine={{ stroke: colors.grid }}
          />
          <YAxis
            tick={{ fill: colors.text, fontSize: 12 }}
            axisLine={{ stroke: colors.grid }}
            tickLine={{ stroke: colors.grid }}
            tickFormatter={formatNumber}
          />
          <Tooltip content={<CustomTooltip colors={colors} />} />
          <Legend />
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.color}
              strokeWidth={2}
              dot={{ fill: line.color, strokeWidth: 2 }}
              name={line.name || line.dataKey}
            />
          ))}
          {showReferenceLine && referenceValue !== undefined && (
            <ReferenceLine
              y={referenceValue}
              stroke="#ef4444"
              strokeDasharray="5 5"
              label={{
                value: referenceLabel,
                position: "right",
                fill: "#ef4444",
                fontSize: 12,
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// =============================================================================
// Heatmap Chart
// =============================================================================

interface HeatmapDataItem {
  x: string;
  y: string;
  value: number;
}

interface HeatmapProps {
  data: HeatmapDataItem[];
  xLabels: string[];
  yLabels: string[];
  colorScale?: { min: string; mid: string; max: string };
  showValues?: boolean;
}

function interpolateColor(
  value: number,
  min: number,
  max: number,
  colors: { min: string; mid: string; max: string }
): string {
  const ratio = max === min ? 0.5 : (value - min) / (max - min);

  // Parse hex colors
  const parseHex = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  };

  const minColor = parseHex(colors.min);
  const midColor = parseHex(colors.mid);
  const maxColor = parseHex(colors.max);

  let r, g, b;
  if (ratio < 0.5) {
    const t = ratio * 2;
    r = Math.round(minColor.r + (midColor.r - minColor.r) * t);
    g = Math.round(minColor.g + (midColor.g - minColor.g) * t);
    b = Math.round(minColor.b + (midColor.b - minColor.b) * t);
  } else {
    const t = (ratio - 0.5) * 2;
    r = Math.round(midColor.r + (maxColor.r - midColor.r) * t);
    g = Math.round(midColor.g + (maxColor.g - midColor.g) * t);
    b = Math.round(midColor.b + (maxColor.b - midColor.b) * t);
  }

  return `rgb(${r}, ${g}, ${b})`;
}

export function Heatmap({
  data,
  xLabels,
  yLabels,
  colorScale = { min: "#dbeafe", mid: "#3b82f6", max: "#1e3a8a" },
  showValues = true,
}: HeatmapProps) {
  const values = data.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  // Create a lookup map for quick access
  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((d) => map.set(`${d.x}-${d.y}`, d.value));
    return map;
  }, [data]);

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-fit">
        {/* Column headers */}
        <div className="flex">
          <div className="w-24 shrink-0" /> {/* Empty corner */}
          {xLabels.map((label) => (
            <div
              key={label}
              className="flex-1 min-w-[60px] text-center text-xs font-medium text-muted-foreground p-2 truncate"
              title={label}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Rows */}
        {yLabels.map((yLabel) => (
          <div key={yLabel} className="flex">
            {/* Row header */}
            <div className="w-24 shrink-0 text-xs font-medium text-muted-foreground p-2 flex items-center truncate">
              {yLabel}
            </div>
            {/* Cells */}
            {xLabels.map((xLabel) => {
              const value = dataMap.get(`${xLabel}-${yLabel}`) ?? 0;
              const bgColor = interpolateColor(value, minValue, maxValue, colorScale);
              const textColor = value > (maxValue - minValue) / 2 + minValue ? "#fff" : "#000";

              return (
                <div
                  key={`${xLabel}-${yLabel}`}
                  className="flex-1 min-w-[60px] aspect-square flex items-center justify-center text-xs font-medium border border-background/20 transition-all hover:ring-2 hover:ring-primary/50 cursor-default"
                  style={{ backgroundColor: bgColor, color: textColor }}
                  title={`${xLabel}, ${yLabel}: ${value}`}
                >
                  {showValues && formatNumber(value)}
                </div>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-2 mt-4 justify-center">
          <span className="text-xs text-muted-foreground">{formatNumber(minValue)}</span>
          <div
            className="h-3 w-32 rounded"
            style={{
              background: `linear-gradient(to right, ${colorScale.min}, ${colorScale.mid}, ${colorScale.max})`,
            }}
          />
          <span className="text-xs text-muted-foreground">{formatNumber(maxValue)}</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Correlation Matrix (specialized heatmap)
// =============================================================================

interface CorrelationMatrixProps {
  data: { x: string; y: string; value: number }[];
  labels: string[];
}

export function CorrelationMatrix({ data, labels }: CorrelationMatrixProps) {
  return (
    <Heatmap
      data={data}
      xLabels={labels}
      yLabels={labels}
      colorScale={{ min: "#ef4444", mid: "#fbbf24", max: "#22c55e" }}
      showValues={true}
    />
  );
}
