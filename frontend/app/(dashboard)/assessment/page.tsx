"use client";

import React from "react";
import Link from "next/link";
import {
  FileCheck2,
  GitFork,
  ArrowRight,
  TrendingDown,
  Layers,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAnalyses } from "@/lib/api/endpoints";
import { formatDate } from "@/lib/utils";

export default function AssessmentHubPage() {
  const { data: analyses = [] } = useAnalyses(undefined, "exam_misconception");

  return (
    <div className="space-y-6">
      <PageHeader
        sectionNumber="03 // ASSESSMENT INTELLIGENCE"
        title="Assessment Intelligence & Diagnostic Copilot"
        description="Transform post-exam itemized mark sheets into root-cause misconception diagnostics, heatmaps, and structured 15-minute remedial lesson plans."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <GitFork className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              Post-Exam Misconception Diagnostics
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Analyze itemized exam mark distributions to identify systemic student failure modes. Correlates errors with syllabus topics and outlines ready-to-deliver remedial lessons.
            </p>
          </div>
          <Link
            href="/assessment/misconception-diagnostics"
            className="inline-flex items-center justify-between text-sm font-semibold text-primary hover:underline pt-3 border-t border-border/60"
          >
            <span>Analyze Exam Misconceptions</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Recent Exams */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
        <h3 className="text-base font-bold text-foreground">
          Recent Exam Misconception Audits
        </h3>

        <div className="divide-y divide-border/60">
          {analyses.map((ana) => (
            <div key={ana.id} className="py-3.5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{ana.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Analyzed on {formatDate(ana.createdAt)}
                </p>
              </div>
              <Link
                href={`/analyses/${ana.id}`}
                className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
              >
                Inspect Diagnostic Heatmap →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
