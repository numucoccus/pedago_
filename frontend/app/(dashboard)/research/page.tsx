"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  LineChart,
  BrainCircuit,
  Sliders,
  ArrowRight,
  CheckCircle2,
  FileText,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAnalyses } from "@/lib/api/endpoints";
import { formatDate } from "@/lib/utils";

export default function ResearchHubPage() {
  const { data: analyses = [] } = useAnalyses(undefined, "research_gap");

  return (
    <div className="space-y-6">
      <PageHeader
        sectionNumber="01 // RESEARCH INTELLIGENCE"
        title="Research Decision & Literature Copilot"
        description="Verify literature gaps against indexed peer-reviewed sources, track algorithmic method evolution, stress-test research questions, and compare candidate directions."
      />

      {/* 4 Core Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Tool 1: Gap Verification */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              Research Gap Verification
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Verify novelty claims against indexed peer-reviewed databases and target venue proceedings. Generates closest prior work matrices and reformulations.
            </p>
          </div>
          <Link
            href="/research/gap-verification"
            className="inline-flex items-center justify-between text-sm font-semibold text-primary hover:underline pt-3 border-t border-border/60"
          >
            <span>Launch Gap Verification</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Tool 2: Evolution Tracker */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <LineChart className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              Research Evolution & Trend Detector
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Visualize method-frequency timelines, emerging architectural paradigms, declining techniques, and citation velocities across venues.
            </p>
          </div>
          <Link
            href="/research/evolution"
            className="inline-flex items-center justify-between text-sm font-semibold text-primary hover:underline pt-3 border-t border-border/60"
          >
            <span>Explore Evolution Timelines</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Tool 3: Question Stress Tester */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              Research Question Stress Tester
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Evaluate research questions across 9 empirical dimensions (specificity, measurability, novelty evidence). Offers side-by-side improved reformulations.
            </p>
          </div>
          <Link
            href="/research/question-stress-test"
            className="inline-flex items-center justify-between text-sm font-semibold text-primary hover:underline pt-3 border-t border-border/60"
          >
            <span>Stress Test a Question</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Tool 4: Decision Copilot */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sliders className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              Research Decision Matrix Copilot
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Compare candidate research directions using a transparent weighted decision model (novelty, feasibility, data availability, method fit, expected impact).
            </p>
          </div>
          <Link
            href="/research/decisions"
            className="inline-flex items-center justify-between text-sm font-semibold text-primary hover:underline pt-3 border-t border-border/60"
          >
            <span>Open Decision Matrix</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Recent Research Analyses */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Recent Research Audits & Verifications
        </h3>

        <div className="divide-y divide-border/60">
          {analyses.map((ana) => (
            <div key={ana.id} className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{ana.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Verified on {formatDate(ana.createdAt)}
                </p>
              </div>
              <Link
                href={`/analyses/${ana.id}`}
                className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
              >
                Inspect Report →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
