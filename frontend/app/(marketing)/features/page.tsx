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
      <header className="flex h-18 w-full items-center justify-between border-b border-border px-6 lg:px-12 bg-card shadow-xs">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xs">
            P•AI
          </div>
          <span>Pedago AI</span>
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-xs"
        >
          <span>Open Dashboard</span>
          <ArrowRight className="h-4 w-4" />
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
            <div className="flex items-center gap-2.5 text-primary font-bold">
              <Sparkles className="h-6 w-6" />
              <h2 className="text-2xl font-bold">1. Research Intelligence</h2>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Assists faculty in literature reviews, grant preparation, and research direction planning without making unsubstantiated claims of novelty.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-5 rounded-xl border border-border bg-card shadow-xs">
                <strong className="text-foreground text-base block mb-1.5 font-bold">Gap Verification:</strong>
                <p className="text-muted-foreground leading-relaxed">
                  Validates claimed research gaps against indexed databases, generating closest prior work and reformulations.
                </p>
              </div>
              <div className="p-5 rounded-xl border border-border bg-card shadow-xs">
                <strong className="text-foreground text-base block mb-1.5 font-bold">Question Stress Tester:</strong>
                <p className="text-muted-foreground leading-relaxed">
                  Audits questions across 9 empirical dimensions to prevent grant rejections due to overbreadth.
                </p>
              </div>
            </div>
          </section>

          {/* Teaching */}
          <section className="pt-6 space-y-4">
            <div className="flex items-center gap-2.5 text-sky-600 dark:text-sky-400 font-bold">
              <GraduationCap className="h-6 w-6" />
              <h2 className="text-2xl font-bold">2. Teaching Intelligence</h2>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Closes the feedback loop between classroom instruction and student comprehension through formative telemetry.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-5 rounded-xl border border-border bg-card shadow-xs">
                <strong className="text-foreground text-base block mb-1.5 font-bold">PulseAI Micro-Feedback:</strong>
                <p className="text-muted-foreground leading-relaxed">
                  Synthesizes exit slips and notes into concrete 3-bullet next-class action plans and warm-up questions.
                </p>
              </div>
              <div className="p-5 rounded-xl border border-border bg-card shadow-xs">
                <strong className="text-foreground text-base block mb-1.5 font-bold">Query Triage:</strong>
                <p className="text-muted-foreground leading-relaxed">
                  Clusters office-hour queues into conceptual vs logistics categories with draft announcements.
                </p>
              </div>
            </div>
          </section>

          {/* Assessment */}
          <section className="pt-6 space-y-4">
            <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold">
              <FileCheck2 className="h-6 w-6" />
              <h2 className="text-2xl font-bold">3. Assessment Intelligence</h2>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Diagnoses post-exam misconception clusters directly from itemized score sheets and provides high-yield 15-minute remedial lesson plans.
            </p>
          </section>

          {/* Student */}
          <section className="pt-6 space-y-4">
            <div className="flex items-center gap-2.5 text-purple-600 dark:text-purple-400 font-bold">
              <Users className="h-6 w-6" />
              <h2 className="text-2xl font-bold">4. Student Intelligence</h2>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Holistic portfolios with strict badges for verified vs unverified achievements, objective workload stress observations, and fact-checked TipTap LOR draft generation.
            </p>
          </section>

          {/* Curriculum */}
          <section className="pt-6 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400 font-bold">
              <BookOpen className="h-6 w-6" />
              <h2 className="text-2xl font-bold">5. Curriculum Intelligence</h2>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Audits syllabus learning outcomes against thousands of real-world job postings to identify obsolete topics and supply plug-and-play modern lab assignments.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
