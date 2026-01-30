"use client";

import { AlertCircle, RefreshCw, WifiOff, ServerCrash, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  type?: "error" | "network" | "server" | "not-found" | "empty";
  onRetry?: () => void;
  className?: string;
}

const errorConfig = {
  error: {
    icon: AlertCircle,
    defaultTitle: "Something went wrong",
    defaultMessage: "An unexpected error occurred. Please try again.",
    iconColor: "text-destructive",
  },
  network: {
    icon: WifiOff,
    defaultTitle: "Connection Error",
    defaultMessage: "Unable to connect. Please check your internet connection.",
    iconColor: "text-orange-500",
  },
  server: {
    icon: ServerCrash,
    defaultTitle: "Server Error",
    defaultMessage: "The server is temporarily unavailable. Please try again later.",
    iconColor: "text-destructive",
  },
  "not-found": {
    icon: FileQuestion,
    defaultTitle: "Not Found",
    defaultMessage: "The requested resource could not be found.",
    iconColor: "text-muted-foreground",
  },
  empty: {
    icon: FileQuestion,
    defaultTitle: "No Data",
    defaultMessage: "No data is available to display.",
    iconColor: "text-muted-foreground",
  },
};

export function ErrorState({
  title,
  message,
  type = "error",
  onRetry,
  className,
}: ErrorStateProps) {
  const config = errorConfig[type];
  const Icon = config.icon;

  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <div className={cn("rounded-full bg-muted p-3 mb-4", config.iconColor)}>
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold mb-1">
          {title || config.defaultTitle}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          {message || config.defaultMessage}
        </p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry} size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Inline error message
export function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-destructive">
      <AlertCircle className="h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}

// Empty state component
export function EmptyState({
  title = "No data",
  message = "There's nothing to show here yet.",
  icon: Icon = FileQuestion,
  action,
}: {
  title?: string;
  message?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">{message}</p>
      {action}
    </div>
  );
}

// Data fetch wrapper with loading/error states
interface DataStateProps<T> {
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  data: T | undefined;
  onRetry?: () => void;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  children: (data: T) => React.ReactNode;
}

export function DataState<T>({
  isLoading,
  isError,
  error,
  data,
  onRetry,
  loadingComponent,
  errorComponent,
  emptyComponent,
  children,
}: DataStateProps<T>) {
  if (isLoading) {
    return <>{loadingComponent}</>;
  }

  if (isError) {
    return (
      <>
        {errorComponent || (
          <ErrorState
            message={error?.message}
            onRetry={onRetry}
          />
        )}
      </>
    );
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return <>{emptyComponent || <EmptyState />}</>;
  }

  return <>{children(data)}</>;
}
