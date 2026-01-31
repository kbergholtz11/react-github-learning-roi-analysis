"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface BlankslateProps {
  icon?: React.ReactNode;
  heading: string;
  description?: string;
  primaryAction?: {
    text: string;
    onClick?: () => void;
    href?: string;
  };
  secondaryAction?: {
    text: string;
    onClick?: () => void;
    href?: string;
  };
  border?: boolean;
  spacious?: boolean;
  narrow?: boolean;
  className?: string;
}

/**
 * GitHub Primer-style Blankslate component
 * Used for empty states, onboarding, and placeholder content
 */
export function Blankslate({
  icon,
  heading,
  description,
  primaryAction,
  secondaryAction,
  border = true,
  spacious = false,
  narrow = false,
  className,
}: BlankslateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        spacious ? "py-20 px-8" : "py-12 px-6",
        narrow && "max-w-md mx-auto",
        border && "border border-dashed rounded-xl bg-muted/30",
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-muted-foreground [&>svg]:h-12 [&>svg]:w-12">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-semibold mb-2">{heading}</h3>
      {description && (
        <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      )}
      {(primaryAction || secondaryAction) && (
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {primaryAction && (
            primaryAction.href ? (
              <Button asChild>
                <Link href={primaryAction.href}>{primaryAction.text}</Link>
              </Button>
            ) : (
              <Button onClick={primaryAction.onClick}>
                {primaryAction.text}
              </Button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <Button variant="outline" asChild>
                <Link href={secondaryAction.href}>{secondaryAction.text}</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.text}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact blankslate for smaller containers
 */
export function BlankslateCompact({
  icon,
  heading,
  description,
  className,
}: Pick<BlankslateProps, "icon" | "heading" | "description" | "className">) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-8 px-4", className)}>
      {icon && (
        <div className="mb-3 text-muted-foreground [&>svg]:h-8 [&>svg]:w-8">
          {icon}
        </div>
      )}
      <h4 className="text-sm font-medium mb-1">{heading}</h4>
      {description && (
        <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
      )}
    </div>
  );
}
