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
  Sparkles,
  LogOut,
  ChevronDown,
  Activity,
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
      <header className="sticky top-0 z-20 flex h-18 w-full items-center justify-between border-b border-border bg-card px-5 sm:px-8 shadow-xs">
        {/* Left: Workspace dropdown switcher */}
        <div className="flex items-center gap-3.5 pl-10 lg:pl-0">
          <div className="relative">
            <button
              onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-border bg-background hover:border-primary/50 text-sm font-medium text-foreground transition-all shadow-2xs cursor-pointer"
            >
              <Building2 className="h-4.5 w-4.5 text-primary" />
              <span className="max-w-[140px] sm:max-w-[220px] truncate">{activeWorkspace.name}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            {workspaceMenuOpen && (
              <div
                className="absolute top-full left-0 mt-2 w-80 rounded-2xl border border-border bg-popover p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setWorkspaceMenuOpen(false)}
              >
                <div className="px-3.5 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Select Workspace Context
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setActiveWorkspace(ws);
                      setWorkspaceMenuOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer",
                      ws.id === activeWorkspace.id
                        ? "bg-primary/15 text-primary font-bold shadow-2xs"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <div className="truncate">
                      <p className="truncate font-semibold">{ws.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{ws.description}</p>
                    </div>
                    {ws.id === activeWorkspace.id && <Check className="h-4 w-4 text-primary shrink-0 ml-2" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Running Analysis Activity Indicator */}
          {runningAnalysesCount > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-xs text-sky-600 dark:text-sky-400 font-bold glow-cyan animate-pulse">
              <Activity className="h-3.5 w-3.5 animate-spin" />
              <span>{runningAnalysesCount} Active Analysis Running</span>
            </div>
          )}
        </div>

        {/* Center: Search / Command Palette trigger */}
        <div className="flex-1 max-w-md mx-6 hidden md:block">
          <button
            onClick={() => setCommandOpen(true)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-2 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all shadow-xs cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Search className="h-4 w-4 text-primary" />
              <span>Search analyses, evidence, documents...</span>
            </span>
            <kbd className="pointer-events-none rounded border border-border bg-muted/90 px-2 py-0.5 text-xs font-bold text-muted-foreground font-mono">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2.5">
          {/* Explicit Demo Mode Indicator & Toggle */}
          <button
            onClick={toggleDemoMode}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer",
              isDemoMode
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40 glow-amber hover:bg-amber-500/20"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 glow-emerald hover:bg-emerald-500/20"
            )}
            title="Click to toggle Demo Mode vs Live API Mode"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {isDemoMode ? "DEMO MODE (SYNTHETIC FIXTURES)" : "LIVE API"}
            </span>
            <span className="sm:hidden">{isDemoMode ? "DEMO" : "LIVE"}</span>
          </button>

          {/* Theme switcher */}
          <div className="relative">
            <button
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              className="p-2.5 rounded-xl border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-all shadow-2xs"
              title="Toggle Theme"
            >
              <Sun className="h-4 w-4 dark:hidden text-amber-500" />
              <Moon className="hidden h-4 w-4 dark:block text-indigo-400" />
            </button>

            {themeMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-40 rounded-2xl border border-border bg-popover p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setThemeMenuOpen(false)}
              >
                <button
                  onClick={() => {
                    setTheme("light");
                    setThemeMenuOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-sm rounded-xl hover:bg-muted transition-colors cursor-pointer",
                    theme === "light" && "text-primary font-bold bg-primary/10"
                  )}
                >
                  <Sun className="h-4 w-4 text-amber-500" /> Light
                </button>
                <button
                  onClick={() => {
                    setTheme("dark");
                    setThemeMenuOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-sm rounded-xl hover:bg-muted transition-colors cursor-pointer",
                    theme === "dark" && "text-primary font-bold bg-primary/10"
                  )}
                >
                  <Moon className="h-4 w-4 text-indigo-400" /> Dark
                </button>
                <button
                  onClick={() => {
                    setTheme("system");
                    setThemeMenuOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-sm rounded-xl hover:bg-muted transition-colors cursor-pointer",
                    theme === "system" && "text-primary font-bold bg-primary/10"
                  )}
                >
                  <Laptop className="h-4 w-4" /> System
                </button>
              </div>
            )}
          </div>

          {/* User profile menu */}
          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-primary/40 transition-all cursor-pointer"
            >
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary to-cyan-500 text-white flex items-center justify-center font-bold text-xs shadow-md glow-primary">
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
            </button>

            {profileMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-72 rounded-2xl border border-border bg-popover p-2.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setProfileMenuOpen(false)}
              >
                <div className="px-3 py-2.5 border-b border-border/80">
                  <p className="text-sm font-bold text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                  <p className="text-xs text-primary font-semibold mt-1">{user.department}</p>
                </div>
                <div className="p-1 space-y-1 mt-1">
                  <Link
                    href="/settings"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-xl text-foreground hover:bg-muted font-medium transition-colors"
                  >
                    Settings & Preferences
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-xl text-destructive hover:bg-destructive/10 font-medium transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <CommandPalette open={commandOpen} setOpen={setCommandOpen} />
    </>
  );
}
