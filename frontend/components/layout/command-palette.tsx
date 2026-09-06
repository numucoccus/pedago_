"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Compass,
  Sparkles,
  GraduationCap,
  FileCheck2,
  Users,
  BookOpen,
  FolderArchive,
  Settings,
  ArrowRight,
  FileText,
  Sliders,
  LineChart,
} from "lucide-react";
import { useDemo } from "@/lib/store/demo-context";

interface CommandPaletteProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function CommandPalette({ open, setOpen }: CommandPaletteProps) {
  const router = useRouter();
  const { toggleDemoMode, isDemoMode } = useDemo();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  const navigateTo = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 animate-in fade-in-0 duration-150 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-popover shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="flex flex-col w-full">
          <div className="flex items-center border-b border-border px-3">
            <Command.Input
              autoFocus
              placeholder="Type a command or jump to workspace..."
              className="flex h-13 w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No matching modules, documents, or actions found.
            </Command.Empty>

            <Command.Group heading="Intelligence Workspaces" className="text-xs font-bold text-muted-foreground px-2.5 py-2 uppercase tracking-wider">
              <Command.Item
                onSelect={() => navigateTo("/dashboard")}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                <Compass className="h-4.5 w-4.5 text-primary" />
                <span>Executive Overview Dashboard</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/research/gap-verification")}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                <Sparkles className="h-4.5 w-4.5 text-primary" />
                <span>Research Gap Verification</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/research/evolution")}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                <LineChart className="h-4.5 w-4.5 text-primary" />
                <span>Research Evolution Tracker</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/research/question-stress-test")}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                <Sparkles className="h-4.5 w-4.5 text-primary" />
                <span>Research Question Stress Tester</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/research/decisions")}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                <Sliders className="h-4.5 w-4.5 text-primary" />
                <span>Research Decision Copilot</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/teaching/pulse")}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                <GraduationCap className="h-4.5 w-4.5 text-primary" />
                <span>Teaching: PulseAI Micro-Feedback</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/teaching/query-clusters")}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                <GraduationCap className="h-4.5 w-4.5 text-primary" />
                <span>Teaching: Query Clustering & Triage</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/assessment/misconception-diagnostics")}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                <FileCheck2 className="h-4.5 w-4.5 text-primary" />
                <span>Assessment: Misconception Diagnostics</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/students")}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                <Users className="h-4.5 w-4.5 text-primary" />
                <span>Student Portfolios & Merit Scoring</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/students/lor")}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                <FileText className="h-4.5 w-4.5 text-primary" />
                <span>Student LOR Evidence Dossier</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/curriculum/alignment")}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                <BookOpen className="h-4.5 w-4.5 text-primary" />
                <span>Curriculum: Syllabus-to-Industry Alignment</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Data & System" className="text-xs font-bold text-muted-foreground px-2.5 py-2 uppercase tracking-wider mt-2">
              <Command.Item
                onSelect={() => navigateTo("/documents")}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                <FolderArchive className="h-4.5 w-4.5 text-muted-foreground" />
                <span>Document Repository</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/settings")}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                <Settings className="h-4.5 w-4.5 text-muted-foreground" />
                <span>Workspace & API Settings</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  toggleDemoMode();
                  setOpen(false);
                }}
                className="flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-3">
                  <Sparkles className="h-4.5 w-4.5" />
                  <span>Toggle Demo Mode ({isDemoMode ? "Active" : "Disabled"})</span>
                </span>
                <ArrowRight className="h-4 w-4" />
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground bg-muted/30">
            <span>Use ↑↓ to navigate, Enter to select, ESC to exit</span>
            <span className="swiss-mono font-medium">Pedago Command</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
