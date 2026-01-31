"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  TrendingUp,
  Target,
  GraduationCap,
  Award,
  BarChart2,
  Filter,
  Zap,
  Package,
  Sparkles,
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
import { UserMenu } from "@/components/auth";

const navItems = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", href: "/", icon: Home, prefetch: true },
      { title: "Learning Insights", href: "/insights", icon: Sparkles, prefetch: true },
    ],
  },
  {
    title: "Learning Journey",
    items: [
      { title: "Journey Overview", href: "/journey/overview", icon: Target, prefetch: true },
      { title: "Journey Funnel", href: "/journey/funnel", icon: Filter, prefetch: true },
      { title: "Learner Explorer", href: "/journey/explorer", icon: Users, prefetch: false },
    ],
  },
  {
    title: "Skills & Certifications",
    items: [
      { title: "Skills Analysis", href: "/skills", icon: Zap, prefetch: true },
      { title: "Skills Deep Dive", href: "/skills/analytics", icon: BarChart2, prefetch: false },
      { title: "Certifications", href: "/analytics/certification", icon: Award, prefetch: true },
    ],
  },
  {
    title: "Impact & Adoption",
    items: [
      { title: "Learning Impact", href: "/impact", icon: TrendingUp, prefetch: true },
      { title: "Product Adoption", href: "/adoption", icon: Package, prefetch: true },
      { title: "Learning → Adoption", href: "/insights/adoption", icon: Zap, prefetch: true },
      { title: "Compare Cohorts", href: "/compare", icon: BarChart2, prefetch: false },
    ],
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-border/40" aria-label="Main navigation">
      <SidebarHeader className="border-b border-border/40 px-6 py-4">
        <Link href="/" className="flex items-center gap-3" aria-label="Learning Journey Analytics - Go to home">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white" aria-hidden="true">
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
        <nav aria-label="Primary navigation">
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
                      <Link 
                        href={item.href} 
                        prefetch={item.prefetch}
                        aria-current={pathname === item.href ? 'page' : undefined}
                      >
                        <item.icon className="h-4 w-4" aria-hidden="true" />
                        {item.title}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        </nav>
      </SidebarContent>
      <SidebarFooter className="border-t border-border/40 p-4">
        <div className="flex items-center justify-between">
          <UserMenu />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
