"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  animate?: boolean;
}

export function AnimatedCounter({
  value,
  duration = 1000,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  animate = true,
}: AnimatedCounterProps) {
  // Initialize with value if not animating
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);
  const animationRef = useRef<number | undefined>(undefined);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip animation on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    if (!animate) {
      // Use timeout to avoid synchronous setState in effect
      const timer = setTimeout(() => setDisplayValue(value), 0);
      return () => clearTimeout(timer);
    }

    const startValue = previousValue.current;
    const endValue = value;
    const startTime = performance.now();

    const animateValue = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out-cubic)
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValue + (endValue - startValue) * easeOutCubic;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animateValue);
      } else {
        previousValue.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animateValue);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration, animate]);

  const formattedValue = displayValue.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}{formattedValue}{suffix}
    </span>
  );
}

// Percentage counter with color coding
interface AnimatedPercentageProps extends Omit<AnimatedCounterProps, "suffix"> {
  showSign?: boolean;
  colorCode?: boolean;
}

export function AnimatedPercentage({
  value,
  showSign = false,
  colorCode = false,
  ...props
}: AnimatedPercentageProps) {
  const sign = showSign && value > 0 ? "+" : "";
  const colorClass = colorCode
    ? value > 0
      ? "text-green-600 dark:text-green-400"
      : value < 0
      ? "text-red-600 dark:text-red-400"
      : ""
    : "";

  return (
    <AnimatedCounter
      value={value}
      suffix="%"
      prefix={sign}
      decimals={1}
      className={cn(colorClass, props.className)}
      {...props}
    />
  );
}

// Currency counter
export function AnimatedCurrency({
  value,
  currency = "USD",
  ...props
}: AnimatedCounterProps & { currency?: string }) {
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // Extract prefix (currency symbol)
  const prefix = formatter.format(0).replace(/[\d.,]/g, "").trim();

  return (
    <AnimatedCounter
      value={value}
      prefix={prefix}
      {...props}
    />
  );
}
