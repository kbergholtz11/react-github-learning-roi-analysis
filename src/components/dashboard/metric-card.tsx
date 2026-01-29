import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    isPositive?: boolean;
    label?: string;
  };
  icon?: React.ReactNode;
  className?: string;
}

export function MetricCard({
  title,
  value,
  description,
  trend,
  icon,
  className,
}: MetricCardProps) {
  // Determine if trend is positive: use isPositive if provided, otherwise infer from value
  const isPositive = trend?.isPositive !== undefined ? trend.isPositive : (trend?.value ?? 0) > 0;
  const isNeutral = trend?.value === 0;

  const trendColor = isNeutral
    ? "text-muted-foreground"
    : isPositive
    ? "text-emerald-500"
    : "text-red-500";

  const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {trend && (
              <div className={cn("flex items-center gap-1 text-sm", trendColor)}>
                <TrendIcon className="h-4 w-4" />
                <span className="font-medium">{Math.abs(trend.value)}%</span>
                <span className="text-muted-foreground">{trend.label}</span>
              </div>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {icon && (
            <div className="rounded-lg bg-primary/10 p-3 text-primary">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 opacity-0 transition-opacity group-hover:opacity-100" />
    </Card>
  );
}
