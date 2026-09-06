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
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex h-16 w-full items-center justify-between border-b border-border px-6 lg:px-12 bg-card/60 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 font-bold text-sm">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs">
            P•AI
          </div>
          <span>Pedago AI</span>
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
        >
          <span>Open Dashboard</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-12">
        <PageHeader
          sectionNumber="ARCHITECTURE OVERVIEW"
          title="The Five Intelligence Workspaces"
          description="Detailed breakdown of how Pedago AI converts unstructured academic data into traceable, verified faculty recommendations."
        />

        <div className="space-y-8 divide-y divide-border/60">
          {/* Research */}
          <section className="pt-6 space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Sparkles className="h-5 w-5" />
              <h2 className="text-xl">1. Research Intelligence</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Assists faculty in literature reviews, grant preparation, and research direction planning without making unsubstantiated claims of novelty.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-lg border border-border bg-card">
                <strong className="text-foreground block mb-1">Gap Verification:</strong>
                Validates claimed research gaps against indexed databases, generating closest prior work and reformulations.
              </div>
              <div className="p-3.5 rounded-lg border border-border bg-card">
                <strong className="text-foreground block mb-1">Question Stress Tester:</strong>
                Audits questions across 9 empirical dimensions to prevent grant rejections due to overbreadth.
              </div>
            </div>
          </section>

          {/* Teaching */}
          <section className="pt-6 space-y-4">
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold">
              <GraduationCap className="h-5 w-5" />
              <h2 className="text-xl">2. Teaching Intelligence</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Closes the feedback loop between classroom instruction and student comprehension through formative telemetry.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-lg border border-border bg-card">
                <strong className="text-foreground block mb-1">PulseAI Micro-Feedback:</strong>
                Synthesizes exit slips and notes into concrete 3-bullet next-class action plans and warm-up questions.
              </div>
              <div className="p-3.5 rounded-lg border border-border bg-card">
                <strong className="text-foreground block mb-1">Query Triage:</strong>
                Clusters office-hour queues into conceptual vs logistics categories with draft announcements.
              </div>
            </div>
          </section>

          {/* Assessment */}
          <section className="pt-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
              <FileCheck2 className="h-5 w-5" />
              <h2 className="text-xl">3. Assessment Intelligence</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Diagnoses post-exam misconception clusters directly from itemized score sheets and provides high-yield 15-minute remedial lesson plans.
            </p>
          </section>

          {/* Student */}
          <section className="pt-6 space-y-4">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold">
              <Users className="h-5 w-5" />
              <h2 className="text-xl">4. Student Intelligence</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Holistic portfolios with strict badges for verified vs unverified achievements, objective workload stress observations, and fact-checked TipTap LOR draft generation.
            </p>
          </section>

          {/* Curriculum */}
          <section className="pt-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
              <BookOpen className="h-5 w-5" />
              <h2 className="text-xl">5. Curriculum Intelligence</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Audits syllabus learning outcomes against thousands of real-world job postings to identify obsolete topics and supply plug-and-play modern lab assignments.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
