"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertCircle, Edit3, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HumanReviewBannerProps {
  isApproved?: boolean;
  onApprove?: (notes?: string) => void;
  onExport?: () => void;
  className?: string;
}

export function HumanReviewBanner({
  isApproved = false,
  onApprove,
  onExport,
  className,
}: HumanReviewBannerProps) {
  const [approved, setApproved] = useState(isApproved);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const handleApprove = () => {
    setApproved(true);
    if (onApprove) onApprove(notes);
    toast.success("Faculty decision recorded", {
      description: "Recommendation has been approved and marked in institutional audit logs.",
    });
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-4 sm:p-5 transition-all",
        approved
          ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10"
          : "border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {approved ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            )}
            <h4 className="text-sm font-bold text-foreground">
              {approved ? "Faculty Sign-Off Completed" : "Faculty Review & Judgment Required"}
            </h4>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
            {approved
              ? "You have validated the cited evidence and approved this recommendation for downstream academic action."
              : "Pedago AI synthesizes traceable evidence to assist your faculty judgment. AI output is never an automatic final decision."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {!approved ? (
            <>
              <button
                onClick={() => setShowNotes(!showNotes)}
                className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>{showNotes ? "Hide Notes" : "Add Faculty Note"}</span>
              </button>

              <button
                onClick={handleApprove}
                className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Approve & Sign Off</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                Decision: Approved
              </span>
              {onExport && (
                <button
                  onClick={onExport}
                  className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export Report</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showNotes && !approved && (
        <div className="mt-3 pt-3 border-t border-amber-500/20 space-y-2">
          <label className="text-[0.6875rem] font-semibold text-muted-foreground uppercase tracking-wider">
            Faculty Evaluation Notes (Included in Signed Audit Record)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add context, qualifications, or department-specific constraints before approving..."
            className="w-full text-xs rounded-lg border border-border bg-background p-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px]"
          />
        </div>
      )}
    </div>
  );
}
