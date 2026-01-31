"use client";

import { useDataSource } from "@/hooks/use-unified-data";
import { DataSourceIndicator, BackendStatusIndicator } from "@/components/ui/data-source-indicator";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface GlobalStatusBarProps {
  className?: string;
}

export function GlobalStatusBar({ className }: GlobalStatusBarProps) {
  const { isBackendAvailable, dataSource, isLoading } = useDataSource();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries();
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <BackendStatusIndicator isAvailable={isBackendAvailable} />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleRefresh}
        title="Refresh all data"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        <span className="sr-only">Refresh data</span>
      </Button>
    </div>
  );
}

/**
 * Minimal version for embedding in cards
 */
export function DataSourceBadge({ className }: { className?: string }) {
  const { dataSource, isLoading } = useDataSource();

  if (isLoading) return null;

  return (
    <DataSourceIndicator
      source={dataSource === "none" ? "aggregated" : dataSource}
      className={className}
      showLabel={false}
    />
  );
}
