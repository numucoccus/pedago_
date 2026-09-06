"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertCircle, Edit3, Download, Sparkles, ShieldCheck } from "lucide-react";
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
        "rounded-2xl border p-6 sm:p-7 transition-all shadow-md",
        approved
          ? "border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-card to-emerald-500/5 glow-emerald"
          : "border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-card to-amber-500/5 glow-amber",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            {approved ? (
              <ShieldCheck className="h-6 w-6 text-emerald-500" />
            ) : (
              <AlertCircle className="h-6 w-6 text-amber-500" />
            )}
            <h4 className="text-lg font-bold text-foreground">
              {approved ? "Faculty Sign-Off Completed" : "Faculty Review & Judgment Required"}
            </h4>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
            {approved
              ? "You have verified the cited empirical evidence and authorized this recommendation for downstream academic action."
              : "Pedago AI synthesizes traceable evidence to assist your faculty judgment. AI output is never an automatic final decision."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {!approved ? (
            <>
              <button
                onClick={() => setShowNotes(!showNotes)}
                className="px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold text-foreground hover:bg-muted transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <Edit3 className="h-4.5 w-4.5" />
                <span>{showNotes ? "Hide Notes" : "Add Faculty Note"}</span>
              </button>

              <button
                onClick={handleApprove}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-600 text-white text-sm font-bold transition-all shadow-md glow-primary flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="h-4.5 w-4.5" />
                <span>Approve & Sign Off</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-emerald-500 bg-emerald-500/15 px-3.5 py-1.5 rounded-lg border border-emerald-500/30 glow-emerald">
                Decision: Approved
              </span>
              {onExport && (
                <button
                  onClick={onExport}
                  className="px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold text-foreground hover:bg-muted transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
                >
                  <Download className="h-4.5 w-4.5" />
                  <span>Export Report</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showNotes && !approved && (
        <div className="mt-4 pt-4 border-t border-amber-500/30 space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Faculty Evaluation Notes (Logged in Institutional Audit Record)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add context, qualifications, or department-specific constraints before approving..."
            className="w-full text-xs rounded-xl border border-border bg-background p-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px]"
          />
        </div>
      )}
    </div>
  );
}
