"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  TrendingUp,
  Target,
  Settings,
  GraduationCap,
  Bot,
  Award,
  FileText,
  Activity,
  Bell,
  UserCircle,
  Calendar,
  MessageSquare,
  BarChart2,
  Filter,
  Zap,
  LineChart,
  Package,
  Download,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { SearchTrigger } from "@/components/global-search";

const navItems = [
  {
    title: "Dashboard",
    items: [
      { title: "Home", href: "/", icon: Home },
      { title: "Events", href: "/events", icon: Calendar },
    ],
  },
  {
    title: "Learner Journey",
    items: [
      { title: "Overview", href: "/journey/overview", icon: Target },
      { title: "Funnel", href: "/journey/funnel", icon: Filter },
      { title: "Explorer", href: "/journey/explorer", icon: Users },
      { title: "Profile", href: "/journey/profile", icon: UserCircle },
      { title: "Progression", href: "/progression", icon: LineChart },
    ],
  },
  {
    title: "Analytics",
    items: [
      { title: "Copilot", href: "/analytics/copilot", icon: Bot },
      { title: "Insights & ROI", href: "/analytics/insights", icon: TrendingUp },
      { title: "Certifications", href: "/analytics/certification", icon: Award },
      { title: "Skills", href: "/skills", icon: Zap },
      { title: "Product Alignment", href: "/alignment", icon: Package },
      { title: "Compare", href: "/compare", icon: BarChart2 },
    ],
  },
  {
    title: "Tools",
    items: [
      { title: "Ask AI", href: "/query", icon: MessageSquare },
      { title: "Reports", href: "/reports", icon: Download },
    ],
  },
  {
    title: "Executive",
    items: [
      { title: "Summary", href: "/executive/summary", icon: FileText },
      { title: "Health Check", href: "/executive/health", icon: Activity },
    ],
  },
  {
    title: "Admin",
    items: [
      { title: "Alerts", href: "/admin/alerts", icon: Bell },
      { title: "Performance", href: "/admin/performance", icon: Gauge },
      { title: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-border/40">
      <SidebarHeader className="border-b border-border/40 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Learning Journey</span>
            <span className="text-xs text-muted-foreground">Analytics</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4">
        {/* Search */}
        <div className="px-2 mb-4">
          <SearchTrigger />
        </div>
        {navItems.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      className={cn(
                        "w-full justify-start gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                        pathname === item.href
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        {item.title}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-border/40 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
