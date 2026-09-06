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
    <div className="space-y-6">
      <PageHeader
        sectionNumber="01.3 // QUESTION STRESS TESTER"
        title="Research Question Stress Tester"
        description="Rigorous rubric-based stress testing across 9 empirical dimensions. Identifies vagueness, missing variables, and generates peer-reviewed alternatives."
      >
        <ExportMenu title="Research Question Stress Test Rubric" data={data} />
      </PageHeader>

      {/* Input Section */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
          Candidate Research Question for Empirical Audit
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="flex-1 text-xs sm:text-sm rounded-lg border border-border bg-background px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
          />
          <button
            onClick={() => {
              toast.info("Calibrating question across 9 rubric dimensions...");
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-xs shrink-0"
          >
            <BrainCircuit className="h-4 w-4" />
            <span>Re-Stress Test</span>
          </button>
        </div>
      </div>

      {/* Overall Score & Issues */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="md:col-span-4 rounded-xl border border-border bg-card p-6 flex flex-col justify-between shadow-xs">
          <div>
            <span className="swiss-header-tag text-primary">COMPOSITE RIGOR SCORE</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-mono text-4xl font-bold text-foreground">
                {data.overallScore}
              </span>
              <span className="text-sm font-mono text-muted-foreground">/ 10</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Based on empirical computer science standards (ACM SIGCSE & IEEE TLT). Below 6.0 indicates high rejection risk.
            </p>
          </div>

          <div className="pt-4 border-t border-border/60">
            <span className="text-[0.6875rem] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              {data.identifiedIssues.length} Structural Deficiencies Flagged
            </span>
          </div>
        </div>

        <div className="md:col-span-8 rounded-xl border border-border bg-card p-6 space-y-3 shadow-xs">
          <span className="swiss-header-tag text-rose-600 dark:text-rose-400">IDENTIFIED PITFALLS</span>
          <h3 className="text-base font-bold text-foreground">
            Core Conceptual & Methodological Vulnerabilities
          </h3>
          <ul className="space-y-2">
            {data.identifiedIssues.map((issue, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-xs text-foreground bg-rose-500/5 dark:bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20"
              >
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 9-Dimensional Rubric Grid */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
        <span className="swiss-header-tag text-primary">RUBRIC BREAKDOWN</span>
        <h3 className="text-base font-bold text-foreground">
          Evaluation Across 9 Empirical Scientific Dimensions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {data.rubric.map((dim) => {
            const isPass = dim.status === "pass";
            const isCritique = dim.status === "critique";

            return (
              <div
                key={dim.key}
                className="rounded-lg border border-border/80 bg-background/60 p-3.5 space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{dim.name}</span>
                    <span
                      className={cn(
                        "font-mono text-xs font-bold px-2 py-0.5 rounded",
                        isPass
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : isCritique
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {dim.score}/10
                    </span>
                  </div>
                  <p className="text-[0.6875rem] text-muted-foreground leading-relaxed">
                    {dim.assessment}
                  </p>
                </div>

                {dim.recommendation && (
                  <p className="text-[0.625rem] text-primary font-medium border-t border-border/50 pt-1.5">
                    Rec: {dim.recommendation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Improved Alternatives with Side-by-Side Accept */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
        <span className="swiss-header-tag text-emerald-600 dark:text-emerald-400">IMPROVED ALTERNATIVES</span>
        <h3 className="text-base font-bold text-foreground">
          Peer-Reviewed Standard Reformulations
        </h3>

        <div className="space-y-4">
          {data.alternatives.map((alt) => (
            <div
              key={alt.id}
              className="rounded-xl border border-border/80 bg-background/80 p-5 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <p className="text-xs sm:text-sm font-semibold text-foreground leading-relaxed">
                  “{alt.text}”
                </p>
                <button
                  onClick={() => handleAcceptAlternative(alt.text)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Accept Formulation</span>
                </button>
              </div>

              <p className="text-xs text-muted-foreground italic leading-relaxed">
                <strong className="not-italic text-foreground">Rationale:</strong> {alt.rationale}
              </p>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[0.625rem] text-muted-foreground">Elevates:</span>
                {alt.improvedDimensions.map((d) => (
                  <span
                    key={d}
                    className="text-[0.625rem] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
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
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
          Audit Findings ({data.findings.length})
        </h3>
        {data.findings.map((f) => (
          <FindingCard key={f.id} finding={f} />
        ))}
      </div>

      <LimitationNotice limitations={data.limitations} />
      <HumanReviewBanner />
    </div>
  );
}
