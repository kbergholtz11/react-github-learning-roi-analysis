"use client";

import { Children, cloneElement, isValidElement, ReactNode, ReactElement, CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface AnimatableProps {
  className?: string;
  style?: CSSProperties;
}

interface AnimatedListProps {
  children: ReactNode;
  animation?: "fade-in-up" | "fade-in" | "slide-in-right" | "scale-in";
  staggerDelay?: number;
  className?: string;
}

export function AnimatedList({
  children,
  animation = "fade-in-up",
  staggerDelay = 50,
  className,
}: AnimatedListProps) {
  const childArray = Children.toArray(children);

  return (
    <div className={className}>
      {childArray.map((child, index) => {
        if (!isValidElement<AnimatableProps>(child)) return child;

        const animationClass = `animate-${animation}`;
        const style: CSSProperties = {
          opacity: 0,
          animationDelay: `${index * staggerDelay}ms`,
          animationFillMode: "forwards",
        };

        return cloneElement(child as ReactElement<AnimatableProps>, {
          className: cn(child.props.className, animationClass),
          style: { ...child.props.style, ...style },
          key: child.key ?? index,
        });
      })}
    </div>
  );
}

// Grid variant with stagger
interface AnimatedGridProps extends AnimatedListProps {
  cols?: 1 | 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
}

export function AnimatedGrid({
  children,
  animation = "scale-in",
  staggerDelay = 75,
  cols = 4,
  gap = "md",
  className,
}: AnimatedGridProps) {
  const colsClass = {
    1: "grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  };

  const gapClass = {
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
  };

  return (
    <AnimatedList
      animation={animation}
      staggerDelay={staggerDelay}
      className={cn("grid", colsClass[cols], gapClass[gap], className)}
    >
      {children}
    </AnimatedList>
  );
}

// Fade in wrapper for single elements
interface FadeInProps {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  className?: string;
}

export function FadeIn({
  children,
  delay = 0,
  direction = "up",
  className,
}: FadeInProps) {
  const animations = {
    up: "animate-fade-in-up",
    down: "animate-fade-in-down",
    left: "animate-slide-in-left",
    right: "animate-slide-in-right",
    none: "animate-fade-in",
  };

  return (
    <div
      className={cn(animations[direction], className)}
      style={{
        opacity: 0,
        animationDelay: `${delay}ms`,
        animationFillMode: "forwards",
      }}
    >
      {children}
    </div>
  );
}
