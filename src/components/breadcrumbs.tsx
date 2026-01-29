"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

// Map paths to readable names
const pathLabels: Record<string, string> = {
  "": "Home",
  "journey": "Learner Journey",
  "overview": "Overview",
  "funnel": "Funnel",
  "explorer": "Explorer",
  "profile": "Profile",
  "analytics": "Analytics",
  "copilot": "Copilot",
  "insights": "Insights & ROI",
  "certification": "Certifications",
  "skills": "Skills",
  "alignment": "Product Alignment",
  "compare": "Compare",
  "progression": "Progression",
  "events": "Events",
  "query": "Ask AI",
  "reports": "Reports",
  "executive": "Executive",
  "summary": "Summary",
  "health": "Health Check",
  "admin": "Admin",
  "alerts": "Alerts",
  "performance": "Performance",
  "settings": "Settings",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  
  // Split path and filter empty strings
  const segments = pathname.split("/").filter(Boolean);
  
  // Build breadcrumb items
  const breadcrumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const label = pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    const isLast = index === segments.length - 1;
    
    return { href, label, isLast };
  });
  
  // Don't show breadcrumbs on home page
  if (pathname === "/") {
    return null;
  }

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      <Link 
        href="/" 
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      {breadcrumbs.map((crumb) => (
        <div key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link 
              href={crumb.href}
              className="hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
