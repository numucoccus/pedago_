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
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderArchive,
  Layers,
  ChevronRight,
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
import { formatDate, getStatusBadgeClass } from "@/lib/utils";

const CONFUSION_CHART_DATA = [
  { time: "W1", confusion: 14, sentiment: 82 },
  { time: "W2", confusion: 22, sentiment: 78 },
  { time: "W3", confusion: 58, sentiment: 54 },
  { time: "W4", confusion: 79, sentiment: 38 },
  { time: "W5", confusion: 44, sentiment: 68 },
  { time: "W6", confusion: 32, sentiment: 75 },
];

export default function DashboardPage() {
  const { activeWorkspace, isDemoMode } = useDemo();
  const { data: analyses = [] } = useAnalyses();
  const { data: documents = [] } = useDocuments();

  const pendingReviews = analyses.filter((a) => !a.humanReviewApproved);
  const completedAnalyses = analyses.filter((a) => a.status === "completed");

  return (
    <div className="space-y-6">
      <PageHeader
        sectionNumber="00 // EXECUTIVE OVERVIEW"
        title="Faculty Intelligence Copilot"
        description="Traceable, evidence-backed academic synthesis across research literature, teaching telemetry, exam misconceptions, and curriculum alignment."
      >
        <div className="flex items-center gap-2">
          <Link
            href="/research/gap-verification"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>New Analysis</span>
          </Link>
        </div>
      </PageHeader>

      {/* Bento Grid Layer */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Card 1: Pending Faculty Sign-Off (Action Required) */}
        <div className="md:col-span-8 rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="swiss-header-tag text-amber-600 dark:text-amber-400">ACTION REQUIRED</span>
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <span className="text-xs font-mono font-semibold text-muted-foreground">
              {pendingReviews.length} PENDING DECISION{pendingReviews.length !== 1 ? "S" : ""}
            </span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-foreground">
              Analyses Requiring Faculty Judgment
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review cited primary documents, inspect confidence matrices, and sign off on downstream actions.
            </p>
          </div>

          <div className="divide-y divide-border/60">
            {pendingReviews.slice(0, 3).map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground truncate hover:text-primary transition-colors">
                      {item.title}
                    </span>
                    <span className="text-[0.625rem] font-mono uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {item.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-[0.6875rem] text-muted-foreground mt-0.5 truncate">
                    {item.findings?.[0]?.summary || "Evidence synthesis ready for faculty evaluation."}
                  </p>
                </div>

                <Link
                  href={`/analyses/${item.id}`}
                  className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <span>Review</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}

            {pendingReviews.length === 0 && (
              <p className="py-4 text-xs text-muted-foreground text-center">
                All analyses have received faculty sign-off.
              </p>
            )}
          </div>
        </div>

        {/* Card 2: Workspace Snapshot */}
        <div className="md:col-span-4 rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-xs flex flex-col justify-between">
          <div>
            <span className="swiss-header-tag text-primary">WORKSPACE METRICS</span>
            <h3 className="text-lg font-bold text-foreground mt-1 truncate">
              {activeWorkspace.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Current semester scope and evidence corpus.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
              <span className="text-2xl font-bold font-mono text-foreground">
                {analyses.length}
              </span>
              <p className="text-[0.6875rem] text-muted-foreground font-medium mt-0.5">Total Analyses</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
              <span className="text-2xl font-bold font-mono text-foreground">
                {documents.length}
              </span>
              <p className="text-[0.6875rem] text-muted-foreground font-medium mt-0.5">Indexed Docs</p>
            </div>
          </div>

          <Link
            href="/documents"
            className="flex items-center justify-between text-xs font-semibold text-foreground hover:text-primary pt-2 border-t border-border/60"
          >
            <span className="flex items-center gap-1.5">
              <FolderArchive className="h-3.5 w-3.5 text-muted-foreground" />
              Manage Evidence Repository
            </span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Card 3: Teaching Friction & Confusion Trend */}
        <div className="md:col-span-6 rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="swiss-header-tag text-sky-600 dark:text-sky-400">PULSEAI TELEMETRY</span>
              <h3 className="text-base font-bold text-foreground mt-0.5">
                Cohort Confusion vs. Sentiment Trajectory
              </h3>
            </div>
            <Link href="/teaching/pulse" className="text-xs text-primary hover:underline font-medium">
              View PulseAI
            </Link>
          </div>

          <div className="h-48 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CONFUSION_CHART_DATA}>
                <defs>
                  <linearGradient id="confusionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="sentimentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="confusion"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#confusionGrad)"
                  name="Confusion Rate (%)"
                />
                <Area
                  type="monotone"
                  dataKey="sentiment"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#sentimentGrad)"
                  name="Sentiment Score"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[0.6875rem] text-muted-foreground leading-relaxed">
            Acute confusion spike detected at W4 (0/1 Knapsack 1D loop direction). Remediated in W5 recap.
          </p>
        </div>

        {/* Card 4: Intelligence Modules Quick Launcher */}
        <div className="md:col-span-6 rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-xs">
          <div>
            <span className="swiss-header-tag text-primary">DECISION WORKSPACES</span>
            <h3 className="text-base font-bold text-foreground mt-0.5">
              Intelligence Launchpads
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Link
              href="/research/gap-verification"
              className="flex items-start gap-3 p-3 rounded-lg border border-border/80 bg-background/60 hover:border-primary/40 hover:bg-muted/30 transition-all group"
            >
              <div className="p-2 rounded-md bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">Research Gap</p>
                <p className="text-[0.625rem] text-muted-foreground truncate">Novelty verification</p>
              </div>
            </Link>

            <Link
              href="/assessment/misconception-diagnostics"
              className="flex items-start gap-3 p-3 rounded-lg border border-border/80 bg-background/60 hover:border-primary/40 hover:bg-muted/30 transition-all group"
            >
              <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <FileCheck2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">Exam Diagnostics</p>
                <p className="text-[0.625rem] text-muted-foreground truncate">Heatmaps & lessons</p>
              </div>
            </Link>

            <Link
              href="/students/lor"
              className="flex items-start gap-3 p-3 rounded-lg border border-border/80 bg-background/60 hover:border-primary/40 hover:bg-muted/30 transition-all group"
            >
              <div className="p-2 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">LOR Dossier</p>
                <p className="text-[0.625rem] text-muted-foreground truncate">Evidence-backed letter</p>
              </div>
            </Link>

            <Link
              href="/curriculum/alignment"
              className="flex items-start gap-3 p-3 rounded-lg border border-border/80 bg-background/60 hover:border-primary/40 hover:bg-muted/30 transition-all group"
            >
              <div className="p-2 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
                <BookOpen className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">Curriculum Audit</p>
                <p className="text-[0.625rem] text-muted-foreground truncate">Industry skills matrix</p>
              </div>
            </Link>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Looking for student queries?</span>
            <Link href="/teaching/query-clusters" className="font-semibold text-primary hover:underline">
              Query Triage →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
