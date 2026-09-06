"use client";

import React from "react";
import Link from "next/link";
import {
  BookOpen,
  Workflow,
  ArrowRight,
  TrendingUp,
  Layers,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAnalyses } from "@/lib/api/endpoints";
import { formatDate } from "@/lib/utils";

export default function CurriculumHubPage() {
  const { data: analyses = [] } = useAnalyses(undefined, "curriculum_alignment");

  return (
    <div className="space-y-6">
      <PageHeader
        sectionNumber="05 // CURRICULUM INTELLIGENCE"
        title="Curriculum Intelligence & Industry Alignment"
        description="Audit university course syllabi against real-world engineering job telemetry, uncover legacy technologies, and generate plug-and-play modern lab modules."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Workflow className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              Syllabus-to-Industry Alignment Audit
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Quantify alignment scores against thousands of active job market postings. Classifies skills into Current, Legacy, and Missing, and generates ready-to-adopt labs.
            </p>
          </div>
          <Link
            href="/curriculum/alignment"
            className="inline-flex items-center justify-between text-xs font-semibold text-primary hover:underline pt-3 border-t border-border/60"
          >
            <span>Run Alignment Audit</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Recent Curriculum Audits */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
          Recent Syllabus Audits
        </h3>

        <div className="divide-y divide-border/60">
          {analyses.map((ana) => (
            <div key={ana.id} className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-foreground">{ana.title}</p>
                <p className="text-[0.6875rem] text-muted-foreground mt-0.5">
                  Audited on {formatDate(ana.createdAt)}
                </p>
              </div>
              <Link
                href={`/analyses/${ana.id}`}
                className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
              >
                Inspect Skill Matrix →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
