"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  GraduationCap,
  FileCheck2,
  Users,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Radio,
  Network,
  GitFork,
  Workflow,
  ChevronRight,
} from "lucide-react";
import { AmbientBackground } from "@/components/ambient/ambient-background";

export default function MarketingLandingPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      {/* Ambient spore and aurora effect strictly on Landing/Auth */}
      <AmbientBackground />

      {/* Top Navigation */}
      <header className="relative z-10 flex h-18 w-full items-center justify-between border-b border-border bg-background px-6 lg:px-12 shadow-xs">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-xs">
            P•AI
          </div>
          <span className="font-bold text-base tracking-tight text-foreground">
            Pedago AI
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="/features" className="hover:text-foreground transition-colors">
            Five Workspaces
          </Link>
          <Link href="/about" className="hover:text-foreground transition-colors">
            Methodology & Ethics
          </Link>
          <Link href="/dashboard" className="text-primary font-semibold hover:underline">
            Live Copilot Demo
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all shadow-xs"
          >
            <span>Open Copilot</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-20 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold">
          <Sparkles className="h-4 w-4" />
          <span>Faculty Intelligence & Decision Copilot</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.1]">
          Turning Academic Evidence into{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-sky-500 to-indigo-500">
            Traceable Decisions.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          The sovereign AI platform engineered for university professors. Verifies research gaps, triages classroom confusion into 15-minute action plans, audits syllabi against industry, and drafts evidence-backed LORs.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all shadow-md"
          >
            <span>Explore Faculty Copilot</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/teaching/pulse"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-all shadow-xs"
          >
            <span>Inspect Flagship Teaching Flow</span>
          </Link>
        </div>
      </section>

      {/* Flagship Teaching-Improvement Journey (Featured Workflow) */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <div className="rounded-2xl border border-primary/30 bg-card p-8 sm:p-10 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/80 pb-4">
            <div>
              <span className="swiss-header-tag text-primary">FLAGSHIP TEACHING LOOP</span>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-0.5">
                From 79% Exit Slip Confusion to Targeted Remediation in 24 Hours
              </h2>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-md border border-emerald-500/20 w-fit">
              Demonstrated Case: CSE 3101
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            <div className="p-5 rounded-xl border border-border bg-background space-y-2.5">
              <span className="font-mono text-xs font-bold text-primary">01 // INGESTION</span>
              <h3 className="text-sm font-bold text-foreground">Anonymous Exit Slips</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                72 exit slips uploaded after Lecture 8. Acute confusion peak detected at minute 55 regarding 1D Knapsack loop reversal.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-background space-y-2.5">
              <span className="font-mono text-xs font-bold text-primary">02 // DISENTANGLEMENT</span>
              <h3 className="text-sm font-bold text-foreground">Direct vs AI Hypothesis</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Separates student verbatim feedback from instructor observations and formulated root causes. No hallucinations.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-background space-y-2.5">
              <span className="font-mono text-xs font-bold text-primary">03 // ACTION PLAN</span>
              <h3 className="text-sm font-bold text-foreground">3-Bullet Strategy</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Concrete next-class intervention: 8-minute trace on a 2-item example before introducing Longest Common Subsequence.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-background space-y-2.5">
              <span className="font-mono text-xs font-bold text-primary">04 // VERIFICATION</span>
              <h3 className="text-sm font-bold text-foreground">Diagnostic Warm-Up</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Turnkey diagnostic multiple-choice drill to verify loop invariant mastery prior to lecture start.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Five Intelligence Workspaces Bento Grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-12 space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="swiss-header-tag text-primary">THE FIVE INTELLIGENCE WORKSPACES</span>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
            Complete Faculty Lifecycle Support
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Designed under Swiss typographic restraint. High-contrast, solid cards and verifiable evidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4">
          {/* 1. Research Intelligence */}
          <div className="md:col-span-7 rounded-2xl border border-border bg-card p-6 sm:p-7 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                01. Research Intelligence
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Empirical gap verification, method evolution tracking across top venues, 9-dimensional research question stress testing, and multi-attribute candidate decision matrices.
              </p>
            </div>
            <Link
              href="/research/gap-verification"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline pt-2"
            >
              <span>Explore Research Tools</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* 2. Teaching Intelligence */}
          <div className="md:col-span-5 rounded-2xl border border-border bg-card p-6 sm:p-7 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <GraduationCap className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                02. Teaching Intelligence
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                PulseAI micro-feedback synthesis, office-hour clustering (conceptual vs administrative triage), and auto-generated revision announcements.
              </p>
            </div>
            <Link
              href="/teaching/pulse"
              className="inline-flex items-center gap-2 text-sm font-semibold text-sky-600 dark:text-sky-400 hover:underline pt-2"
            >
              <span>Explore Teaching Tools</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* 3. Assessment Intelligence */}
          <div className="md:col-span-4 rounded-2xl border border-border bg-card p-6 sm:p-7 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                03. Assessment Intelligence
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Itemized question heatmaps, root-cause misconception diagnosis, and 15-minute remedial lesson plans with alternative analogies.
              </p>
            </div>
            <Link
              href="/assessment/misconception-diagnostics"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline pt-2"
            >
              <span>Explore Assessment</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* 4. Student Intelligence */}
          <div className="md:col-span-4 rounded-2xl border border-border bg-card p-6 sm:p-7 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                04. Student Intelligence
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Co-curricular evidence extraction, 360 competency profiles, neutral workload stress signals, and fact-checked TipTap LOR dossiers.
              </p>
            </div>
            <Link
              href="/students/lor"
              className="inline-flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-400 hover:underline pt-2"
            >
              <span>Explore Student Tools</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* 5. Curriculum Intelligence */}
          <div className="md:col-span-4 rounded-2xl border border-border bg-card p-6 sm:p-7 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                05. Curriculum Intelligence
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Syllabus-to-industry alignment against thousands of verified job postings. Current, legacy, and missing skill taxonomies and lab kits.
              </p>
            </div>
            <Link
              href="/curriculum/alignment"
              className="inline-flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline pt-2"
            >
              <span>Explore Curriculum</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border bg-card py-8 px-6 lg:px-12 text-sm text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <span>Pedago AI</span>
          <span>•</span>
          <span>Faculty Intelligence & Decision Copilot</span>
        </div>
        <p className="text-xs sm:text-sm">
          Strict human-in-the-loop guarantee. AI output is never an automatic final academic decision.
        </p>
      </footer>
    </div>
  );
}
