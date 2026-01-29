"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  Home, 
  Users, 
  Target, 
  Bot, 
  Award, 
  FileText, 
  Settings, 
  Bell, 
  Search,
  Calendar,
  TrendingUp,
  Zap,
  Package,
  BarChart2,
  MessageSquare,
  Download,
  Activity,
  Gauge,
  Filter,
  LineChart,
  UserCircle,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

const searchItems = [
  // Dashboard
  { title: "Home", href: "/", icon: Home, category: "Dashboard" },
  { title: "Events", href: "/events", icon: Calendar, category: "Dashboard" },
  
  // Learner Journey
  { title: "Journey Overview", href: "/journey/overview", icon: Target, category: "Learner Journey" },
  { title: "Journey Funnel", href: "/journey/funnel", icon: Filter, category: "Learner Journey" },
  { title: "Learner Explorer", href: "/journey/explorer", icon: Users, category: "Learner Journey" },
  { title: "Learner Profile", href: "/journey/profile", icon: UserCircle, category: "Learner Journey" },
  { title: "Progression Tracking", href: "/progression", icon: LineChart, category: "Learner Journey" },
  
  // Analytics
  { title: "Copilot Analytics", href: "/analytics/copilot", icon: Bot, category: "Analytics" },
  { title: "Insights & ROI", href: "/analytics/insights", icon: TrendingUp, category: "Analytics" },
  { title: "Certifications", href: "/analytics/certification", icon: Award, category: "Analytics" },
  { title: "Skills Dashboard", href: "/skills", icon: Zap, category: "Analytics" },
  { title: "Product Alignment", href: "/alignment", icon: Package, category: "Analytics" },
  { title: "Compare", href: "/compare", icon: BarChart2, category: "Analytics" },
  
  // Tools
  { title: "Ask AI", href: "/query", icon: MessageSquare, category: "Tools" },
  { title: "Reports & Export", href: "/reports", icon: Download, category: "Tools" },
  
  // Executive
  { title: "Executive Summary", href: "/executive/summary", icon: FileText, category: "Executive" },
  { title: "Health Check", href: "/executive/health", icon: Activity, category: "Executive" },
  
  // Admin
  { title: "Alerts", href: "/admin/alerts", icon: Bell, category: "Admin" },
  { title: "Performance", href: "/admin/performance", icon: Gauge, category: "Admin" },
  { title: "Settings", href: "/admin/settings", icon: Settings, category: "Admin" },
];

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  // Group items by category
  const groupedItems = searchItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof searchItems>);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, learners, or type a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {Object.entries(groupedItems).map(([category, items]) => (
          <React.Fragment key={category}>
            <CommandGroup heading={category}>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.href}
                    value={item.title}
                    onSelect={() => runCommand(() => router.push(item.href))}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{item.title}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

// Search trigger button for the sidebar
export function SearchTrigger() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-muted-foreground rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      <Search className="h-4 w-4" />
      <span className="flex-1 text-left">Search...</span>
      <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}
