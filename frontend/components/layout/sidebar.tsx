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
    title: "Overview",
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
    title: "Documents",
    href: "/documents",
    icon: FolderArchive,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { activeWorkspace } = useDemo();
  const [collapsed, setCollapsed] = useState(false);
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
      {/* Mobile hamburger button */}
      <div className="lg:hidden fixed top-3 left-3 z-40">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-card/80 backdrop-blur-md border border-border shadow-sm text-foreground hover:bg-muted"
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-background/80 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-30 flex flex-col border-r border-border bg-card/95 backdrop-blur-md transition-all duration-300 ease-in-out",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold shadow-sm">
              <span className="swiss-mono text-sm tracking-tighter">P•AI</span>
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-semibold tracking-tight text-sm text-foreground truncate">
                  Pedago AI
                </span>
                <span className="swiss-header-tag text-[0.625rem] truncate text-muted-foreground">
                  Faculty Intelligence
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronRight
              className={cn("h-4 w-4 transition-transform duration-200", !collapsed && "rotate-180")}
            />
          </button>
        </div>

        {/* Current Active Workspace Indicator */}
        {!collapsed && (
          <div className="px-4 py-2.5 border-b border-border/60 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="swiss-header-tag text-[0.5625rem] text-muted-foreground">ACTIVE WORKSPACE</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-xs font-medium text-foreground truncate mt-0.5" title={activeWorkspace.name}>
              {activeWorkspace.name}
            </p>
          </div>
        )}

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
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
                    "flex h-10 w-10 items-center justify-center rounded-lg mx-auto transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  title={item.title}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              );
            }

            return (
              <div key={item.title} className="space-y-0.5">
                {hasChildren ? (
                  <button
                    onClick={() => toggleSection(item.title)}
                    className={cn(
                      "flex w-full items-center justify-between px-2.5 py-2 text-xs font-medium rounded-lg transition-colors group",
                      active
                        ? "text-primary font-semibold bg-primary/10"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
                      <span className="tracking-tight">{item.title}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground/70 transition-transform duration-200",
                        !isOpen && "-rotate-90"
                      )}
                    />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-lg transition-colors",
                      active
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="tracking-tight">{item.title}</span>
                  </Link>
                )}

                {/* Sub-items */}
                {hasChildren && isOpen && (
                  <div className="ml-4 pl-2 border-l border-border/80 space-y-0.5 my-0.5">
                    {item.children!.map((sub) => {
                      const SubIcon = sub.icon;
                      const subActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors",
                            subActive
                              ? "bg-primary/15 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )}
                        >
                          <SubIcon className="h-3.5 w-3.5 shrink-0" />
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

        {/* Footer / Principle banner */}
        {!collapsed && (
          <div className="p-3 m-3 rounded-lg border border-border/60 bg-muted/40 text-[0.6875rem] text-muted-foreground">
            <p className="font-semibold text-foreground">Evidence-First Guarantee</p>
            <p className="mt-0.5 text-[0.625rem] leading-relaxed">
              AI recommendations must cite verified course or literature evidence and require faculty sign-off.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
