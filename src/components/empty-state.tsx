"use client";

import { FileQuestion, Inbox, Search, AlertCircle, Database, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: "search" | "inbox" | "file" | "error" | "data" | "users";
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const iconMap = {
  search: Search,
  inbox: Inbox,
  file: FileQuestion,
  error: AlertCircle,
  data: Database,
  users: Users,
};

export function EmptyState({ icon = "inbox", title, description, action }: EmptyStateProps) {
  const Icon = iconMap[icon];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Pre-built empty states for common scenarios
export function NoSearchResults({ query }: { query: string }) {
  return (
    <EmptyState
      icon="search"
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try adjusting your search terms.`}
    />
  );
}

export function NoData({ entity = "items" }: { entity?: string }) {
  return (
    <EmptyState
      icon="data"
      title={`No ${entity} yet`}
      description={`There are no ${entity} to display. They will appear here once data is available.`}
    />
  );
}

export function NoLearners() {
  return (
    <EmptyState
      icon="users"
      title="No learners found"
      description="No learners match the current filters. Try adjusting your criteria."
    />
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="error"
      title="Something went wrong"
      description={message || "An error occurred while loading data. Please try again."}
      action={onRetry ? { label: "Try again", onClick: onRetry } : undefined}
    />
  );
}
