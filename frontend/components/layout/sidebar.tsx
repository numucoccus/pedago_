"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  GraduationCap,
  FileCheck2,
  Users,
  BookOpen,
  FolderArchive,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  GitFork,
  LineChart,
  BrainCircuit,
  Sliders,
  Radio,
  Network,
  CheckCircle2,
  FileText,
  Workflow,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDemo } from "@/lib/store/demo-context";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: Array<{
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}

const navSections: NavItem[] = [
  {
    title: "Executive Overview",
    href: "/dashboard",
    icon: Compass,
  },
  {
    title: "Research Intelligence",
    href: "/research",
    icon: Sparkles,
    children: [
      { title: "Gap Verification", href: "/research/gap-verification", icon: CheckCircle2 },
      { title: "Evolution & Trends", href: "/research/evolution", icon: LineChart },
      { title: "Question Stress Test", href: "/research/question-stress-test", icon: BrainCircuit },
      { title: "Decision Copilot", href: "/research/decisions", icon: Sliders },
    ],
  },
  {
    title: "Teaching Intelligence",
    href: "/teaching",
    icon: GraduationCap,
    children: [
      { title: "PulseAI Micro-Feedback", href: "/teaching/pulse", icon: Radio },
      { title: "Query Clusters & Triage", href: "/teaching/query-clusters", icon: Network },
    ],
  },
  {
    title: "Assessment Intelligence",
    href: "/assessment",
    icon: FileCheck2,
    children: [
      { title: "Misconception Diagnostics", href: "/assessment/misconception-diagnostics", icon: GitFork },
    ],
  },
  {
    title: "Student Intelligence",
    href: "/students",
    icon: Users,
    children: [
      { title: "Portfolios & Merit", href: "/students", icon: Users },
      { title: "LOR Evidence Dossier", href: "/students/lor", icon: FileText },
    ],
  },
  {
    title: "Curriculum Intelligence",
    href: "/curriculum",
    icon: BookOpen,
    children: [
      { title: "Syllabus Alignment", href: "/curriculum/alignment", icon: Workflow },
    ],
  },
  {
    title: "Document Repository",
    href: "/documents",
    icon: FolderArchive,
  },
  {
    title: "Settings & Audits",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { activeWorkspace, sidebarCollapsed, setSidebarCollapsed } = useDemo();
  const collapsed = sidebarCollapsed;
  const setCollapsed = setSidebarCollapsed;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "Research Intelligence": true,
    "Teaching Intelligence": true,
    "Assessment Intelligence": true,
    "Student Intelligence": true,
    "Curriculum Intelligence": true,
  });

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isCurrentActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile hamburger */}
      <div className="lg:hidden fixed top-3 left-3 z-40">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2.5 rounded-xl bg-card border border-border shadow-md text-foreground hover:bg-muted"
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar container - 100% solid, no glassmorphism */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-30 flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out shadow-xl",
          collapsed ? "w-18" : "w-72",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand header */}
        <div className="flex h-18 items-center justify-between px-5 border-b border-border bg-card">
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-primary to-cyan-500 text-white font-bold text-sm shadow-md">
              <Zap className="h-5 w-5 fill-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold tracking-tight text-base text-foreground truncate">
                  Pedago AI
                </span>
                <span className="text-xs font-semibold text-primary truncate">
                  Decision Copilot
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronRight
              className={cn("h-4 w-4 transition-transform duration-200", !collapsed && "rotate-180")}
            />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5 [scrollbar-width:thin]">
          {navSections.map((item) => {
            const Icon = item.icon;
            const hasChildren = item.children && item.children.length > 0;
            const isOpen = openSections[item.title];
            const active = isCurrentActive(item.href);

            if (collapsed) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl mx-auto transition-all",
                    active
                      ? "bg-gradient-to-r from-primary to-cyan-500 text-white shadow-md glow-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  title={item.title}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              );
            }

            return (
              <div key={item.title} className="space-y-1">
                {hasChildren ? (
                  <button
                    onClick={() => toggleSection(item.title)}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-all group cursor-pointer",
                      active
                        ? "text-primary bg-primary/10 border border-primary/20 font-semibold"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn("h-4.5 w-4.5", active ? "text-primary" : "text-muted-foreground")} />
                      <span className="tracking-tight">{item.title}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground/70 transition-transform duration-200",
                        !isOpen && "-rotate-90"
                      )}
                    />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all",
                      active
                        ? "bg-gradient-to-r from-primary to-cyan-600 text-white font-semibold shadow-sm glow-primary"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    <span className="tracking-tight">{item.title}</span>
                  </Link>
                )}

                {/* Sub-items */}
                {hasChildren && isOpen && (
                  <div className="ml-5 pl-3 border-l-2 border-primary/30 space-y-1 my-1">
                    {item.children!.map((sub) => {
                      const SubIcon = sub.icon;
                      const subActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-all",
                            subActive
                              ? "bg-primary/20 text-primary font-bold shadow-2xs"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground font-medium"
                          )}
                        >
                          <SubIcon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{sub.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Guarantee Card */}
        {!collapsed && (
          <div className="p-4 m-3.5 rounded-xl border border-primary/25 bg-card text-xs shadow-xs">
            <div className="flex items-center gap-2 font-bold text-foreground text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Evidence Guarantee</span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Every recommendation cites primary empirical telemetry. Faculty judgment remains sovereign.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
