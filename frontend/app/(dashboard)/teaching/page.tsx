"use client";

import React from "react";
import Link from "next/link";
import {
  GraduationCap,
  Radio,
  Network,
  ArrowRight,
  TrendingDown,
  MessageSquare,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAnalyses } from "@/lib/api/endpoints";
import { formatDate } from "@/lib/utils";

export default function TeachingHubPage() {
  const { data: analyses = [] } = useAnalyses(undefined, "teaching_pulse");

  return (
    <div className="space-y-6">
      <PageHeader
        sectionNumber="02 // TEACHING INTELLIGENCE"
        title="Teaching Intelligence & Classroom Copilot"
        description="Transform raw exit slips, audio notes, and office-hour queues into actionable next-class instructional plans and targeted warm-up diagnostic drills."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* PulseAI */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Radio className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              PulseAI Micro-Feedback Analysis
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Synthesize student exit slips and in-class lecture notes. Distinguishes direct feedback from AI hypotheses, generates 3-bullet action plans, and builds warm-up diagnostic questions.
            </p>
          </div>
          <Link
            href="/teaching/pulse"
            className="inline-flex items-center justify-between text-sm font-semibold text-primary hover:underline pt-3 border-t border-border/60"
          >
            <span>Analyze Session Micro-Feedback</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Query Clustering */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Network className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              Office-Hour Query Clustering & Triage
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cluster student forum and office-hour inquiries. Disentangles conceptual confusion from administrative questions, maps to syllabus learning modules, and drafts broadcast announcements.
            </p>
          </div>
          <Link
            href="/teaching/query-clusters"
            className="inline-flex items-center justify-between text-sm font-semibold text-primary hover:underline pt-3 border-t border-border/60"
          >
            <span>Triage Inquiries & Clusters</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Recent Teaching Sessions */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
          Recent Course Micro-Audits
        </h3>

        <div className="divide-y divide-border/60">
          {analyses.map((ana) => (
            <div key={ana.id} className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{ana.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Processed on {formatDate(ana.createdAt)}
                </p>
              </div>
              <Link
                href={`/analyses/${ana.id}`}
                className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
              >
                Inspect Action Plan →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
