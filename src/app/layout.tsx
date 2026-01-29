import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { GlobalSearch } from "@/components/global-search";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { QueryProvider } from "@/components/query-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { SkipToContent } from "@/lib/accessibility";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GitHub Learning ROI Dashboard",
  description: "Track and analyze GitHub Learning program ROI metrics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <SkipToContent />
            <SidebarProvider>
              <DashboardSidebar />
              <SidebarInset>
                <header className="flex h-14 items-center gap-4 border-b bg-background px-6 lg:hidden">
                  <SidebarTrigger aria-label="Toggle navigation sidebar" />
                  <span className="font-semibold">Learning Journey Analytics</span>
                </header>
                <main id="main-content" className="flex-1 p-6 bg-muted/40" role="main" tabIndex={-1}>
                  <Breadcrumbs />
                  <ErrorBoundary>
                    {children}
                  </ErrorBoundary>
                </main>
              </SidebarInset>
            </SidebarProvider>
            <GlobalSearch />
            <Toaster richColors position="bottom-right" />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
