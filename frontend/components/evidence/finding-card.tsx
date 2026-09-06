"use client";

import React, { useState } from "react";
import type { Finding } from "@pedago/shared";
import { ConfidenceBadge } from "./confidence-badge";
import { EvidenceDrawer } from "./evidence-drawer";
import { LimitationNotice } from "./limitation-notice";
import { FileText, UserCheck, ChevronDown, Sparkles } from "lucide-react";
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
          "futuristic-card p-6 sm:p-7 space-y-4 shadow-sm hover:border-primary/50 transition-all",
          className
        )}
      >
        {/* Header: Title & Confidence Badge */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-snug">
            {finding.title}
          </h3>
          <div className="flex items-center gap-2.5 shrink-0">
            <ConfidenceBadge confidence={finding.confidence} />
            {finding.requiresHumanReview && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 glow-amber">
                <UserCheck className="h-3.5 w-3.5" />
                Review Required
              </span>
            )}
          </div>
        </div>

        {/* Summary */}
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          {finding.summary}
        </p>

        {/* Evidence button & Limitations toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/80">
          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-cyan-400 transition-colors py-1 cursor-pointer"
          >
            <FileText className="h-4.5 w-4.5" />
            <span>
              {finding.evidence.length > 0
                ? `Inspect ${finding.evidence.length} Cited Primary Source${finding.evidence.length > 1 ? "s" : ""}`
                : "Inspect Evidence"}
            </span>
          </button>

          {finding.limitations.length > 0 && (
            <button
              onClick={() => setShowLimitations(!showLimitations)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground py-1 transition-colors cursor-pointer"
            >
              <span>{showLimitations ? "Hide" : "Show"} Limitations ({finding.limitations.length})</span>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform duration-200", showLimitations && "rotate-180")}
              />
            </button>
          )}
        </div>

        {/* Collapsible Limitations Notice */}
        {showLimitations && (
          <LimitationNotice limitations={finding.limitations} className="mt-3" />
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
