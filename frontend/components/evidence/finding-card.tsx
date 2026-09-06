"use client";

import React, { useState } from "react";
import type { Finding } from "@pedago/shared";
import { ConfidenceBadge } from "./confidence-badge";
import { EvidenceDrawer } from "./evidence-drawer";
import { LimitationNotice } from "./limitation-notice";
import { FileText, UserCheck, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FindingCardProps {
  finding: Finding;
  className?: string;
}

export function FindingCard({ finding, className }: FindingCardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showLimitations, setShowLimitations] = useState(false);

  return (
    <>
      <div
        className={cn(
          "rounded-xl border border-border bg-card p-5 space-y-3.5 shadow-xs transition-all hover:border-border-strong",
          className
        )}
      >
        {/* Header: Title & Confidence Badge */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5">
          <h3 className="text-sm sm:text-base font-semibold text-foreground tracking-tight leading-snug">
            {finding.title}
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            <ConfidenceBadge confidence={finding.confidence} />
            {finding.requiresHumanReview && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.625rem] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <UserCheck className="h-3 w-3" />
                Review Required
              </span>
            )}
          </div>
        </div>

        {/* Summary */}
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {finding.summary}
        </p>

        {/* Evidence button & Limitations toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60">
          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline py-1"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>
              {finding.evidence.length > 0
                ? `Inspect ${finding.evidence.length} Cited Evidence Source${finding.evidence.length > 1 ? "s" : ""}`
                : "Inspect Evidence"}
            </span>
          </button>

          {finding.limitations.length > 0 && (
            <button
              onClick={() => setShowLimitations(!showLimitations)}
              className="inline-flex items-center gap-1 text-[0.6875rem] font-medium text-muted-foreground hover:text-foreground py-1"
            >
              <span>{showLimitations ? "Hide" : "Show"} Limitations ({finding.limitations.length})</span>
              <ChevronDown
                className={cn("h-3 w-3 transition-transform duration-150", showLimitations && "rotate-180")}
              />
            </button>
          )}
        </div>

        {/* Collapsible Limitations Notice */}
        {showLimitations && (
          <LimitationNotice limitations={finding.limitations} className="mt-2" />
        )}
      </div>

      <EvidenceDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        evidence={finding.evidence}
        title={`Evidence for: ${finding.title}`}
      />
    </>
  );
}
