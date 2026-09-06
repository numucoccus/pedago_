"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  GraduationCap,
  FileCheck2,
  Users,
  BookOpen,
  ArrowUpRight,
  FolderArchive,
  ChevronRight,
  Activity,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { useDemo } from "@/lib/store/demo-context";
import { useAnalyses, useDocuments } from "@/lib/api/endpoints";

const CONFUSION_CHART_DATA = [
  { time: "Session 1", confusion: 14, sentiment: 82 },
  { time: "Session 2", confusion: 22, sentiment: 78 },
  { time: "Session 3", confusion: 58, sentiment: 54 },
  { time: "Session 4", confusion: 79, sentiment: 38 },
  { time: "Session 5", confusion: 44, sentiment: 68 },
  { time: "Session 6", confusion: 32, sentiment: 75 },
];

export default function DashboardPage() {
  const { activeWorkspace } = useDemo();
  const { data: analyses = [] } = useAnalyses();
  const { data: documents = [] } = useDocuments();

  const pendingReviews = analyses.filter((a) => !a.humanReviewApproved);

  return (
    <div className="space-y-8">
      <PageHeader
        sectionNumber="00 // EXECUTIVE OVERVIEW"
        title="Faculty Intelligence & Decision Copilot"
        description="Unified, evidence-backed command center across research literature, classroom telemetry, exam misconceptions, and curriculum alignment."
      >
        <Link
          href="/research/gap-verification"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary via-indigo-500 to-cyan-500 text-white text-xs font-bold hover:brightness-110 transition-all shadow-md glow-primary cursor-pointer"
        >
          <Sparkles className="h-4 w-4" />
          <span>Launch Analysis</span>
        </Link>
      </PageHeader>

      {/* De-compacted Bento Grid Layer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Card 1: Action Required (Pending Faculty Reviews) */}
        <div className="lg:col-span-8 futuristic-card p-7 sm:p-8 space-y-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="swiss-header-tag text-amber-500">ACTION REQUIRED</span>
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse glow-amber" />
              </div>
              <span className="text-xs font-mono font-bold text-muted-foreground px-2.5 py-1 rounded-md bg-muted">
                {pendingReviews.length} PENDING DECISION{pendingReviews.length !== 1 ? "S" : ""}
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-foreground">
                Analyses Requiring Sovereign Faculty Judgment
              </h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Review primary cited evidence, inspect confidence bounds, and sign off on downstream actions.
              </p>
            </div>
          </div>

          <div className="divide-y divide-border/80 space-y-2">
            {pendingReviews.slice(0, 3).map((item) => (
              <div key={item.id} className="pt-4 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-bold text-foreground truncate hover:text-primary transition-colors">
                      {item.title}
                    </span>
                    <span className="text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                      {item.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate leading-relaxed">
                    {item.findings?.[0]?.summary || "Evidence synthesis ready for faculty evaluation."}
                  </p>
                </div>

                <Link
                  href={`/analyses/${item.id}`}
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-semibold transition-colors"
                >
                  <span>Inspect Audit</span>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            ))}

            {pendingReviews.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                All analyses have received faculty sign-off.
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Workspace Snapshot */}
        <div className="lg:col-span-4 futuristic-card p-7 sm:p-8 space-y-6 flex flex-col justify-between">
          <div>
            <span className="swiss-header-tag text-primary">ACTIVE CONTEXT</span>
            <h3 className="text-xl font-bold text-foreground mt-1 truncate">
              {activeWorkspace.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {activeWorkspace.description || "Current academic evidence scope."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="rounded-xl border border-border bg-background p-4 space-y-1 shadow-2xs">
              <span className="text-3xl font-extrabold font-mono text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">
                {analyses.length}
              </span>
              <p className="text-xs text-muted-foreground font-semibold">Total Analyses</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4 space-y-1 shadow-2xs">
              <span className="text-3xl font-extrabold font-mono text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                {documents.length}
              </span>
              <p className="text-xs text-muted-foreground font-semibold">Indexed Docs</p>
            </div>
          </div>

          <Link
            href="/documents"
            className="flex items-center justify-between text-xs font-bold text-foreground hover:text-primary pt-3 border-t border-border/80 transition-colors"
          >
            <span className="flex items-center gap-2">
              <FolderArchive className="h-4 w-4 text-primary" />
              Manage Evidence Repository
            </span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Card 3: Teaching Friction & Confusion Trend */}
        <div className="lg:col-span-7 futuristic-card p-7 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="swiss-header-tag text-sky-500">PULSEAI CLASSROOM TELEMETRY</span>
              <h3 className="text-lg font-bold text-foreground mt-0.5">
                Cohort Confusion vs. Sentiment Trajectory
              </h3>
            </div>
            <Link href="/teaching/pulse" className="text-xs text-primary hover:text-cyan-400 font-bold transition-colors">
              Open PulseAI →
            </Link>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CONFUSION_CHART_DATA}>
                <defs>
                  <linearGradient id="confusionGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="sentimentGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "0.75rem",
                    fontSize: "0.75rem",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="confusion"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#confusionGlow)"
                  name="Confusion Rate (%)"
                />
                <Area
                  type="monotone"
                  dataKey="sentiment"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#sentimentGlow)"
                  name="Sentiment Score"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Acute friction peak recorded in Session 4 (1D Knapsack state compression). Targeted remediation successfully resolved comprehension gap in Session 5.
          </p>
        </div>

        {/* Card 4: Intelligence Launchpads */}
        <div className="lg:col-span-5 futuristic-card p-7 sm:p-8 space-y-5 flex flex-col justify-between">
          <div>
            <span className="swiss-header-tag text-primary">DECISION WORKSPACES</span>
            <h3 className="text-lg font-bold text-foreground mt-0.5">
              Intelligence Launchpads
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <Link
              href="/research/gap-verification"
              className="flex items-start gap-3.5 p-4 rounded-xl border border-border bg-background hover:border-primary/60 hover:shadow-md transition-all group"
            >
              <div className="p-2.5 rounded-xl bg-primary/15 text-primary group-hover:scale-105 transition-transform glow-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">Research Gap</p>
                <p className="text-xs text-muted-foreground truncate">Literature novelty</p>
              </div>
            </Link>

            <Link
              href="/assessment/misconception-diagnostics"
              className="flex items-start gap-3.5 p-4 rounded-xl border border-border bg-background hover:border-emerald-500/60 hover:shadow-md transition-all group"
            >
              <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-500 group-hover:scale-105 transition-transform glow-emerald">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">Exam Diagnostics</p>
                <p className="text-xs text-muted-foreground truncate">Error heatmaps</p>
              </div>
            </Link>

            <Link
              href="/students/lor"
              className="flex items-start gap-3.5 p-4 rounded-xl border border-border bg-background hover:border-purple-500/60 hover:shadow-md transition-all group"
            >
              <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 group-hover:scale-105 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">LOR Dossier</p>
                <p className="text-xs text-muted-foreground truncate">TipTap letter draft</p>
              </div>
            </Link>

            <Link
              href="/curriculum/alignment"
              className="flex items-start gap-3.5 p-4 rounded-xl border border-border bg-background hover:border-cyan-500/60 hover:shadow-md transition-all group"
            >
              <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 group-hover:scale-105 transition-transform glow-cyan">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">Curriculum Audit</p>
                <p className="text-xs text-muted-foreground truncate">Industry skill matrix</p>
              </div>
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">Looking for office-hour inquiry triage?</span>
            <Link href="/teaching/query-clusters" className="font-bold text-primary hover:text-cyan-400 transition-colors">
              Query Clusters →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
