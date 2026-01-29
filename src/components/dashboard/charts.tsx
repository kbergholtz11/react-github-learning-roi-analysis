"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";

// Helper to format large numbers
function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}

// Hook to get theme-aware colors
function useChartColors() {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState({
    text: "#6b7280",
    grid: "#e5e7eb",
    background: "#ffffff",
    border: "#e5e7eb",
  });

  useEffect(() => {
    if (resolvedTheme === "dark") {
      setColors({
        text: "#9ca3af",
        grid: "#374151",
        background: "#1f2937",
        border: "#374151",
      });
    } else {
      setColors({
        text: "#6b7280",
        grid: "#e5e7eb",
        background: "#ffffff",
        border: "#e5e7eb",
      });
    }
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
  const colors = useChartColors();
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
  
  return (
    <div className="h-[280px] w-full flex flex-col justify-center">
      {/* Stacked horizontal bar */}
      <div className="h-8 w-full rounded-lg overflow-hidden flex mb-4">
        {data.map((item, index) => {
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
}

export function SimpleBarChart({
  data,
  dataKey,
  secondaryDataKey,
  color = "#3b82f6",
  secondaryColor = "#22c55e",
}: BarChartProps) {
  const colors = useChartColors();
  
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
            contentStyle={{
              backgroundColor: colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: "8px",
              color: colors.text,
            }}
            formatter={(value) => formatNumber(Number(value))}
          />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
          {secondaryDataKey && (
            <Bar dataKey={secondaryDataKey} fill={secondaryColor} radius={[4, 4, 0, 0]} />
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
}

export function SimpleAreaChart({
  data,
  dataKey,
  secondaryDataKey,
  color = "#3b82f6",
  secondaryColor = "#22c55e",
}: AreaChartProps) {
  const colors = useChartColors();
  
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
            contentStyle={{
              backgroundColor: colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: "8px",
              color: colors.text,
            }}
            formatter={(value) => formatNumber(Number(value))}
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
          />
          {secondaryDataKey && (
            <Area
              type="monotone"
              dataKey={secondaryDataKey}
              stroke={secondaryColor}
              fill={`url(#gradient-${secondaryDataKey})`}
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
