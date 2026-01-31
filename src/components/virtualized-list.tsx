"use client";

import { useRef, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Award, Sparkles, Shield, Calendar } from "lucide-react";
import type { EnrichedLearner } from "@/types/data";

// Helper functions (duplicated from explorer for now - could be moved to shared utils)
function getEmail(user: EnrichedLearner): string {
  return user.email || "";
}

function getHandle(user: EnrichedLearner): string {
  return user.userhandle || "";
}

function getCerts(user: EnrichedLearner): number {
  return user.exams_passed || 0;
}

function getCompany(user: EnrichedLearner): string {
  return user.exam_company || user.company_name || "";
}

function getRegion(user: EnrichedLearner): string {
  return user.region || user.exam_region || "";
}

function getJobRole(user: EnrichedLearner): string {
  return user.job_role || "";
}

function getLastActivity(user: EnrichedLearner): string {
  return user.last_activity || user.last_exam || "";
}

function usesCopilot(user: EnrichedLearner): boolean {
  return user.uses_copilot || false;
}

function usesActions(user: EnrichedLearner): boolean {
  return user.uses_actions || false;
}

const statusColors: Record<string, string> = {
  Mastery: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  "Power User": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  Practitioner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "Active Learner": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  Explorer: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300",
  Champion: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  Specialist: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  "Multi-Certified": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  Certified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  Learning: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

function getStatusColor(status: string | undefined): string {
  return status ? statusColors[status] || statusColors.Learning : statusColors.Learning;
}

function formatActivityDate(lastActivity: string): string {
  if (!lastActivity) return "—";
  try {
    const date = new Date(lastActivity);
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  } catch {
    return "—";
  }
}

interface LearnerRowProps {
  learner: EnrichedLearner;
  onNavigate: (email: string) => void;
}

const LearnerRow = memo(function LearnerRow({ learner, onNavigate }: LearnerRowProps) {
  const email = getEmail(learner);
  const handle = getHandle(learner);
  const activityDisplay = formatActivityDate(getLastActivity(learner));

  return (
    <div
      className="grid grid-cols-12 gap-2 p-3 items-center border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer text-sm"
      onClick={() => onNavigate(email)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onNavigate(email)}
    >
      <div className="col-span-2">
        <p className="font-medium truncate">{handle || "—"}</p>
        <p className="text-xs text-muted-foreground truncate">
          {getJobRole(learner) || email}
        </p>
      </div>
      <div className="col-span-2">
        <Badge className={`${getStatusColor(learner.learner_status)} text-xs`}>
          {learner.learner_status}
        </Badge>
      </div>
      <div className="col-span-1">
        <div className="flex items-center gap-1">
          <Award className="h-3 w-3 text-amber-500" />
          <span className="font-semibold">{getCerts(learner)}</span>
        </div>
      </div>
      <div className="col-span-2 truncate text-muted-foreground">
        {getCompany(learner) || "—"}
      </div>
      <div className="col-span-1 truncate text-muted-foreground">
        {getRegion(learner) || "—"}
      </div>
      <div className="col-span-2 flex gap-1 flex-wrap">
        {usesCopilot(learner) && (
          <Badge
            variant="outline"
            className="text-xs gap-1 bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border-violet-200 px-1.5 py-0"
          >
            <Sparkles className="h-2.5 w-2.5" />
            Copilot
          </Badge>
        )}
        {usesActions(learner) && (
          <Badge
            variant="outline"
            className="text-xs gap-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 px-1.5 py-0"
          >
            <Shield className="h-2.5 w-2.5" />
            Actions
          </Badge>
        )}
      </div>
      <div className="col-span-2 flex items-center gap-1 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" />
        {activityDisplay}
      </div>
    </div>
  );
});

interface VirtualizedLearnerListProps {
  learners: EnrichedLearner[];
  estimatedRowHeight?: number;
  containerHeight?: number;
}

export function VirtualizedLearnerList({
  learners,
  estimatedRowHeight = 64,
  containerHeight = 600,
}: VirtualizedLearnerListProps) {
  const router = useRouter();
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: learners.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 10, // Render 10 extra rows above/below viewport
  });

  const handleNavigate = (email: string) => {
    router.push(`/journey/profile?email=${encodeURIComponent(email)}`);
  };

  if (learners.length === 0) {
    return null;
  }

  return (
    <div
      ref={parentRef}
      style={{ height: containerHeight, overflow: "auto" }}
      className="rounded-md border"
    >
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50 text-xs font-medium border-b sticky top-0 z-10">
        <div className="col-span-2">Learner</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-1">Certs</div>
        <div className="col-span-2">Company</div>
        <div className="col-span-1">Region</div>
        <div className="col-span-2">Products</div>
        <div className="col-span-2">Last Active</div>
      </div>

      {/* Virtual list */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const learner = learners[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <LearnerRow learner={learner} onNavigate={handleNavigate} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Simple non-virtualized version for smaller lists (< 100 items)
export function LearnerList({ learners }: { learners: EnrichedLearner[] }) {
  const router = useRouter();

  const handleNavigate = (email: string) => {
    router.push(`/journey/profile?email=${encodeURIComponent(email)}`);
  };

  return (
    <div className="rounded-md border">
      <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50 text-xs font-medium border-b">
        <div className="col-span-2">Learner</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-1">Certs</div>
        <div className="col-span-2">Company</div>
        <div className="col-span-1">Region</div>
        <div className="col-span-2">Products</div>
        <div className="col-span-2">Last Active</div>
      </div>
      {learners.map((learner, idx) => (
        <LearnerRow
          key={`${getHandle(learner) || getEmail(learner)}-${idx}`}
          learner={learner}
          onNavigate={handleNavigate}
        />
      ))}
    </div>
  );
}

// Smart list that switches between virtualized and non-virtualized based on item count
export function SmartLearnerList({
  learners,
  virtualizationThreshold = 100,
}: {
  learners: EnrichedLearner[];
  virtualizationThreshold?: number;
}) {
  if (learners.length > virtualizationThreshold) {
    return <VirtualizedLearnerList learners={learners} />;
  }
  return <LearnerList learners={learners} />;
}
