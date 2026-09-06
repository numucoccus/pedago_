"use client";

import React, { useState } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Check,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { FindingCard } from "@/components/evidence/finding-card";
import { LimitationNotice } from "@/components/evidence/limitation-notice";
import { HumanReviewBanner } from "@/components/evidence/human-review-banner";
import { ExportMenu } from "@/components/artifacts/export-menu";
import { DEMO_RESEARCH_QUESTION_RESULT } from "@/lib/constants/demo-data";
import { cn } from "@/lib/utils";

export default function ResearchQuestionStressTestPage() {
  const [question, setQuestion] = useState(DEMO_RESEARCH_QUESTION_RESULT.originalQuestion);
  const [activeAlternative, setActiveAlternative] = useState<string | null>(null);
  const [data, setData] = useState(DEMO_RESEARCH_QUESTION_RESULT);

  const handleAcceptAlternative = (altText: string) => {
    setQuestion(altText);
    toast.success("Accepted improved formulation", {
      description: "Research question updated. Rubric will recalibrate on save.",
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        sectionNumber="01.3 // QUESTION STRESS TESTER"
        title="Research Question Stress Tester"
        description="Rigorous rubric-based stress testing across 9 empirical dimensions. Identifies vagueness, missing variables, and generates peer-reviewed alternatives."
      >
        <ExportMenu title="Research Question Stress Test Rubric" data={data} />
      </PageHeader>

      {/* Input Section */}
      <div className="futuristic-card p-7 sm:p-8 space-y-4">
        <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
          Candidate Research Question for Empirical Audit
        </label>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="flex-1 text-xs sm:text-sm rounded-xl border border-border/80 bg-background/90 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
          />
          <button
            onClick={() => {
              toast.info("Calibrating question across 9 rubric dimensions...");
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary via-indigo-600 to-cyan-500 text-white text-xs font-bold hover:brightness-110 transition-all shadow-md glow-primary shrink-0 cursor-pointer"
          >
            <BrainCircuit className="h-4 w-4" />
            <span>Re-Stress Test</span>
          </button>
        </div>
      </div>

      {/* Overall Score & Issues */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 futuristic-card p-7 sm:p-8 flex flex-col justify-between">
          <div>
            <span className="swiss-header-tag text-primary">COMPOSITE RIGOR SCORE</span>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="font-mono text-5xl font-bold text-foreground">
                {data.overallScore}
              </span>
              <span className="text-sm font-mono text-muted-foreground">/ 10</span>
            </div>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              Based on empirical computer science standards (ACM SIGCSE & IEEE TLT). Below 6.0 indicates high rejection risk.
            </p>
          </div>

          <div className="pt-4 border-t border-border/80 mt-4">
            <span className="text-xs font-semibold text-rose-500 dark:text-rose-400 uppercase tracking-wider block">
              {data.identifiedIssues.length} Structural Deficiencies Flagged
            </span>
          </div>
        </div>

        <div className="md:col-span-8 futuristic-card p-7 sm:p-8 space-y-4">
          <div>
            <span className="swiss-header-tag text-rose-500 dark:text-rose-400">IDENTIFIED PITFALLS</span>
            <h3 className="text-lg font-bold text-foreground mt-0.5">
              Core Conceptual & Methodological Vulnerabilities
            </h3>
          </div>
          <ul className="space-y-3">
            {data.identifiedIssues.map((issue, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 text-sm text-foreground bg-rose-500/10 p-4 rounded-xl border border-rose-500/25"
              >
                <AlertTriangle className="h-4.5 w-4.5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 9-Dimensional Rubric Grid */}
      <div className="futuristic-card p-7 sm:p-8 space-y-6">
        <div>
          <span className="swiss-header-tag text-primary">RUBRIC BREAKDOWN</span>
          <h3 className="text-lg font-bold text-foreground mt-0.5">
            Evaluation Across 9 Empirical Scientific Dimensions
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
          {data.rubric.map((dim) => {
            const isPass = dim.status === "pass";
            const isCritique = dim.status === "critique";

            return (
              <div
                key={dim.key}
                className="rounded-xl border border-border bg-background p-5 space-y-3 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-2xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">{dim.name}</span>
                    <span
                      className={cn(
                        "font-mono text-xs font-bold px-2.5 py-0.5 rounded",
                        isPass
                          ? "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30"
                          : isCritique
                          ? "bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/30"
                          : "bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30"
                      )}
                    >
                      {dim.score}/10
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {dim.assessment}
                  </p>
                </div>

                {dim.recommendation && (
                  <p className="text-xs text-primary font-semibold border-t border-border/60 pt-2">
                    Rec: {dim.recommendation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Improved Alternatives with Side-by-Side Accept */}
      <div className="futuristic-card p-7 sm:p-8 space-y-6">
        <div>
          <span className="swiss-header-tag text-emerald-500 dark:text-emerald-400">IMPROVED ALTERNATIVES</span>
          <h3 className="text-lg font-bold text-foreground mt-0.5">
            Peer-Reviewed Standard Reformulations
          </h3>
        </div>

        <div className="space-y-5">
          {data.alternatives.map((alt) => (
            <div
              key={alt.id}
              className="rounded-xl border border-border bg-background p-5 sm:p-6 space-y-3.5 shadow-2xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
                  “{alt.text}”
                </p>
                <button
                  onClick={() => handleAcceptAlternative(alt.text)}
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors shadow-sm glow-emerald cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>Accept Formulation</span>
                </button>
              </div>

              <p className="text-sm text-muted-foreground italic leading-relaxed">
                <strong className="not-italic text-foreground">Rationale:</strong> {alt.rationale}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground font-semibold">Elevates:</span>
                {alt.improvedDimensions.map((d) => (
                  <span
                    key={d}
                    className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Findings */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Audit Findings ({data.findings.length})
        </h3>
        <div className="space-y-4">
          {data.findings.map((f) => (
            <FindingCard key={f.id} finding={f} />
          ))}
        </div>
      </div>

      <LimitationNotice limitations={data.limitations} />
      <HumanReviewBanner />
    </div>
  );
}
