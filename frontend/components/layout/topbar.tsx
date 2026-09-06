"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Moon,
  Sun,
  Laptop,
  Check,
  Building2,
  Bell,
  Sparkles,
  LogOut,
  ChevronDown,
  Activity,
  AlertCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useDemo } from "@/lib/store/demo-context";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./command-palette";

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const { isDemoMode, toggleDemoMode, workspaces, activeWorkspace, setActiveWorkspace, user, runningAnalysesCount } =
    useDemo();

  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border bg-card/85 backdrop-blur-md px-4 sm:px-6">
        {/* Left: Workspace dropdown switcher */}
        <div className="flex items-center gap-3 pl-10 lg:pl-0">
          <div className="relative">
            <button
              onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background/80 hover:bg-muted text-xs font-medium text-foreground transition-colors"
            >
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span className="max-w-[140px] sm:max-w-[200px] truncate">{activeWorkspace.name}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {workspaceMenuOpen && (
              <div
                className="absolute top-full left-0 mt-1.5 w-72 rounded-xl border border-border bg-popover p-1 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setWorkspaceMenuOpen(false)}
              >
                <div className="px-3 py-2 text-[0.6875rem] font-semibold text-muted-foreground uppercase tracking-wider">
                  Select Workspace
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setActiveWorkspace(ws);
                      setWorkspaceMenuOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors text-left",
                      ws.id === activeWorkspace.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <div className="truncate">
                      <p className="truncate font-medium">{ws.name}</p>
                      <p className="text-[0.625rem] text-muted-foreground truncate">{ws.description}</p>
                    </div>
                    {ws.id === activeWorkspace.id && <Check className="h-4 w-4 text-primary shrink-0 ml-2" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Running Analysis Activity Indicator */}
          {runningAnalysesCount > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-[0.6875rem] text-sky-600 dark:text-sky-400 animate-pulse font-medium">
              <Activity className="h-3 w-3 animate-spin" />
              <span>{runningAnalysesCount} running analysis</span>
            </div>
          )}
        </div>

        {/* Center: Search / Command Palette trigger */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <button
            onClick={() => setCommandOpen(true)}
            className="flex w-full items-center justify-between rounded-lg border border-border/80 bg-background/50 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:bg-background transition-all shadow-xs"
          >
            <span className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Search analyses, evidence, documents...</span>
            </span>
            <kbd className="pointer-events-none rounded border border-border bg-muted/80 px-1.5 py-0.5 text-[0.625rem] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Explicit Demo Mode Indicator & Toggle */}
          <button
            onClick={toggleDemoMode}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.6875rem] font-semibold border transition-all cursor-pointer",
              isDemoMode
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
            )}
            title="Click to toggle Demo Mode vs Live API Mode"
          >
            <Sparkles className="h-3 w-3" />
            <span className="hidden sm:inline">
              {isDemoMode ? "DEMO MODE (SYNTHETIC FIXTURES)" : "LIVE API"}
            </span>
            <span className="sm:hidden">{isDemoMode ? "DEMO" : "LIVE"}</span>
          </button>

          {/* Theme switcher */}
          <div className="relative">
            <button
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Toggle Theme"
            >
              <Sun className="h-4 w-4 dark:hidden" />
              <Moon className="hidden h-4 w-4 dark:block" />
            </button>

            {themeMenuOpen && (
              <div
                className="absolute right-0 mt-1.5 w-36 rounded-xl border border-border bg-popover p-1 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setThemeMenuOpen(false)}
              >
                <button
                  onClick={() => {
                    setTheme("light");
                    setThemeMenuOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-xs rounded-lg hover:bg-muted transition-colors",
                    theme === "light" && "text-primary font-semibold"
                  )}
                >
                  <Sun className="h-3.5 w-3.5" /> Light
                </button>
                <button
                  onClick={() => {
                    setTheme("dark");
                    setThemeMenuOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-xs rounded-lg hover:bg-muted transition-colors",
                    theme === "dark" && "text-primary font-semibold"
                  )}
                >
                  <Moon className="h-3.5 w-3.5" /> Dark
                </button>
                <button
                  onClick={() => {
                    setTheme("system");
                    setThemeMenuOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-xs rounded-lg hover:bg-muted transition-colors",
                    theme === "system" && "text-primary font-semibold"
                  )}
                >
                  <Laptop className="h-3.5 w-3.5" /> System
                </button>
              </div>
            )}
          </div>

          {/* User profile menu */}
          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-primary/20 transition-all"
            >
              <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-xs border border-primary/30">
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
            </button>

            {profileMenuOpen && (
              <div
                className="absolute right-0 mt-1.5 w-64 rounded-xl border border-border bg-popover p-2 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setProfileMenuOpen(false)}
              >
                <div className="px-3 py-2 border-b border-border/60">
                  <p className="text-xs font-semibold text-foreground">{user.name}</p>
                  <p className="text-[0.6875rem] text-muted-foreground truncate">{user.email}</p>
                  <p className="text-[0.625rem] text-primary mt-0.5">{user.department}</p>
                </div>
                <div className="p-1">
                  <Link
                    href="/settings"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs rounded-lg text-foreground hover:bg-muted"
                  >
                    Settings & Profile
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs rounded-lg text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Command Palette Modal */}
      <CommandPalette open={commandOpen} setOpen={setCommandOpen} />
    </>
  );
}
