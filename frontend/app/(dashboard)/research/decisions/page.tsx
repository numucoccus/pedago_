"use client";

import React, { useState } from "react";
import {
  Sliders,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FindingCard } from "@/components/evidence/finding-card";
import { LimitationNotice } from "@/components/evidence/limitation-notice";
import { HumanReviewBanner } from "@/components/evidence/human-review-banner";
import { ExportMenu } from "@/components/artifacts/export-menu";
import { DEMO_RESEARCH_DECISION_RESULT } from "@/lib/constants/demo-data";
import type { DecisionCriterion, CandidateDirection } from "@pedago/shared";
import { cn } from "@/lib/utils";

export default function ResearchDecisionsPage() {
  const [data] = useState(DEMO_RESEARCH_DECISION_RESULT);
  const [criteria, setCriteria] = useState<DecisionCriterion[]>(data.criteria);
  const [candidates, setCandidates] = useState<CandidateDirection[]>(data.candidates);

  const handleWeightChange = (criterionId: string, newWeight: number) => {
    const updatedCriteria = criteria.map((c) =>
      c.id === criterionId ? { ...c, weight: newWeight } : c
    );
    setCriteria(updatedCriteria);

    // Recalculate candidate total weighted scores
    const updatedCandidates = candidates.map((cand) => {
      let total = 0;
      let weightSum = 0;
      for (const c of updatedCriteria) {
        const score = cand.scores[c.id] || 0;
        total += score * c.weight;
        weightSum += c.weight;
      }
      return {
        ...cand,
        totalWeightedScore: Number((total / (weightSum || 1)).toFixed(2)),
      };
    });

    setCandidates(updatedCandidates);
  };

  const topCandidate = [...candidates].sort(
    (a, b) => b.totalWeightedScore - a.totalWeightedScore
  )[0];

  return (
    <div className="space-y-6">
      <PageHeader
        sectionNumber="01.4 // DECISION COPILOT"
        title="Research Decision Copilot"
        description="Multi-attribute decision matrix comparing candidate project directions. Fully transparent criteria weights, sensitivity testing, and cited evidence."
      >
        <ExportMenu
          title="Research Decision Matrix Audit"
          data={{ criteria, candidates, topCandidate }}
        />
      </PageHeader>

      {/* Top Recommendation Banner */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold text-sm sm:text-base">
            <Sparkles className="h-5 w-5" />
            <span>Optimal Empirical Candidate: {topCandidate?.title}</span>
          </div>
          <span className="text-[0.6875rem] font-mono font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-md">
            Score: {topCandidate?.totalWeightedScore} / 10
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {data.recommendationRationale}
        </p>
      </div>

      {/* Editable Criteria Weights */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Interactive Decision Criteria Weights
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Adjust weights dynamically to conduct sensitivity analysis across faculty priorities.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {criteria.map((crit) => (
            <div
              key={crit.id}
              className="p-3.5 rounded-lg border border-border/80 bg-background/60 space-y-2"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span>{crit.name}</span>
                <span className="font-mono text-primary">{Math.round(crit.weight * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.05"
                value={crit.weight}
                onChange={(e) => handleWeightChange(crit.id, parseFloat(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <p className="text-[0.625rem] text-muted-foreground leading-tight">
                {crit.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Candidate Directions Comparison Matrix */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
        <span className="swiss-header-tag text-primary">CANDIDATE COMPARISON MATRIX</span>
        <h3 className="text-base font-bold text-foreground">
          Detailed Criteria Breakdown by Research Path
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {candidates.map((cand) => {
            const isWinner = cand.id === topCandidate.id;

            return (
              <div
                key={cand.id}
                className={cn(
                  "rounded-xl border p-5 space-y-4 transition-all flex flex-col justify-between",
                  isWinner
                    ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-sm"
                    : "border-border bg-card"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-foreground">{cand.title}</h4>
                    <span
                      className={cn(
                        "font-mono text-xs font-bold px-2.5 py-1 rounded-md shrink-0",
                        isWinner
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {cand.totalWeightedScore} / 10
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {cand.description}
                  </p>
                </div>

                {/* Criteria bars */}
                <div className="space-y-2 pt-2 border-t border-border/60">
                  {criteria.map((crit) => {
                    const score = cand.scores[crit.id] || 0;
                    return (
                      <div key={crit.id} className="text-xs">
                        <div className="flex justify-between text-[0.6875rem] text-muted-foreground mb-0.5">
                          <span>{crit.name}</span>
                          <span className="font-mono font-semibold text-foreground">{score}/10</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              score >= 8
                                ? "bg-emerald-500"
                                : score >= 6
                                ? "bg-sky-500"
                                : "bg-amber-500"
                            )}
                            style={{ width: `${score * 10}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Evidence citations */}
                {cand.evidenceCitations.length > 0 && (
                  <div className="pt-2 border-t border-border/60 space-y-1 text-[0.6875rem]">
                    <span className="font-semibold text-foreground">Cited Ground-Truth Evidence:</span>
                    {cand.evidenceCitations.map((ev) => (
                      <div key={ev.id} className="bg-background/80 p-2 rounded border border-border/50">
                        <p className="font-medium text-foreground">{ev.title}</p>
                        <p className="italic text-muted-foreground">“{ev.excerpt}”</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Risks */}
                {cand.risks.length > 0 && (
                  <div className="pt-2 text-[0.6875rem] text-amber-700 dark:text-amber-400">
                    <strong>Primary Risk:</strong> {cand.risks.join("; ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Findings */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
          Decision Copilot Syntheses ({data.findings.length})
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
