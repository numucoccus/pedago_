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
    <div className="space-y-8">
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
      <div className="futuristic-card p-7 sm:p-8 border-primary/40 bg-gradient-to-r from-primary/15 via-indigo-950/40 to-card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 text-primary font-bold text-base sm:text-lg">
            <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <span>Optimal Empirical Candidate: {topCandidate?.title}</span>
          </div>
          <span className="text-xs font-mono font-bold bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 rounded-lg shrink-0">
            Weighted Score: {topCandidate?.totalWeightedScore} / 10
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed pl-12">
          {data.recommendationRationale}
        </p>
      </div>

      {/* Editable Criteria Weights */}
      <div className="futuristic-card p-7 sm:p-8 space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <h3 className="text-base font-bold text-foreground">
              Interactive Decision Criteria Weights
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Adjust weights dynamically to conduct sensitivity analysis across faculty priorities.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-1">
          {criteria.map((crit) => (
            <div
              key={crit.id}
              className="p-4 rounded-xl border border-border/80 bg-background/80 space-y-3"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="font-bold">{crit.name}</span>
                <span className="font-mono text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">
                  {Math.round(crit.weight * 100)}%
                </span>
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
              <p className="text-xs text-muted-foreground leading-relaxed">
                {crit.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Candidate Directions Comparison Matrix */}
      <div className="futuristic-card p-7 sm:p-8 space-y-6">
        <div>
          <span className="swiss-header-tag text-primary">CANDIDATE COMPARISON MATRIX</span>
          <h3 className="text-lg font-bold text-foreground mt-0.5">
            Detailed Criteria Breakdown by Research Path
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
          {candidates.map((cand) => {
            const isWinner = cand.id === topCandidate.id;

            return (
              <div
                key={cand.id}
                className={cn(
                  "rounded-xl border p-6 space-y-5 transition-all flex flex-col justify-between shadow-xs",
                  isWinner
                    ? "border-primary/60 bg-gradient-to-b from-primary/15 via-card to-card shadow-md glow-primary"
                    : "border-border bg-background"
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-base font-bold text-foreground leading-snug">{cand.title}</h4>
                    <span
                      className={cn(
                        "font-mono text-sm font-bold px-3 py-1 rounded-lg shrink-0",
                        isWinner
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {cand.totalWeightedScore} / 10
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {cand.description}
                  </p>
                </div>

                {/* Criteria bars */}
                <div className="space-y-3 pt-3 border-t border-border/70">
                  {criteria.map((crit) => {
                    const score = cand.scores[crit.id] || 0;
                    return (
                      <div key={crit.id} className="text-xs space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground font-medium">
                          <span>{crit.name}</span>
                          <span className="font-mono font-semibold text-foreground">{score}/10</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
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
                  <div className="pt-3 border-t border-border/70 space-y-2 text-xs sm:text-sm">
                    <span className="font-semibold text-foreground block">Cited Ground-Truth Evidence:</span>
                    {cand.evidenceCitations.map((ev) => (
                      <div key={ev.id} className="bg-background p-3.5 rounded-xl border border-border space-y-1 shadow-2xs">
                        <p className="font-semibold text-foreground">{ev.title}</p>
                        <p className="italic text-muted-foreground leading-relaxed">“{ev.excerpt}”</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Risks */}
                {cand.risks.length > 0 && (
                  <div className="pt-3 border-t border-border/70 text-xs sm:text-sm text-amber-500 dark:text-amber-400">
                    <strong>Primary Risk:</strong> {cand.risks.join("; ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Findings */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Decision Copilot Syntheses ({data.findings.length})
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
