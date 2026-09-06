import React from "react";
import type { AnalysisStatus } from "@pedago/shared";
import { CheckCircle2, CircleDot, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessingTimelineProps {
  status: AnalysisStatus;
  currentStepMessage?: string;
  progressPercent?: number;
  className?: string;
}

const STEPS: Array<{ key: AnalysisStatus; label: string }> = [
  { key: "queued", label: "Queued & Ingested" },
  { key: "extracting", label: "Extracting Text & Schemas" },
  { key: "indexing", label: "Vector & Evidence Indexing" },
  { key: "analyzing", label: "Cross-Correlating & Synthesizing" },
  { key: "completed", label: "Evidence Verified" },
];

export function ProcessingTimeline({
  status,
  currentStepMessage,
  progressPercent = 0,
  className,
}: ProcessingTimelineProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === status);
  const isFailed = status === "failed";
  const isCancelled = status === "cancelled";

  return (
    <div className={cn("futuristic-card p-7 sm:p-8 space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <span className="swiss-header-tag text-primary">PROCESSING TIMELINE</span>
          <h3 className="text-base sm:text-lg font-bold text-foreground mt-0.5">
            {isFailed
              ? "Analysis Halted With Error"
              : isCancelled
              ? "Analysis Cancelled"
              : status === "completed"
              ? "Evidence Synthesis Complete"
              : "Verifying Academic Telemetry & Evidence..."}
          </h3>
          {currentStepMessage && (
            <p className="text-sm text-muted-foreground mt-1">{currentStepMessage}</p>
          )}
        </div>

        <div className="text-right">
          <span className="font-mono text-2xl font-bold text-foreground">
            {progressPercent}%
          </span>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mt-0.5 font-semibold">Progress</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2.5 w-full bg-muted/60 rounded-full overflow-hidden p-0.5">
        <div
          className={cn(
            "h-full transition-all duration-500 rounded-full",
            isFailed
              ? "bg-rose-500"
              : status === "completed"
              ? "bg-gradient-to-r from-emerald-500 to-teal-400 glow-emerald"
              : "bg-gradient-to-r from-primary via-indigo-500 to-cyan-400 glow-primary"
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
        {STEPS.map((step, idx) => {
          const isDone = currentIndex > idx || status === "completed";
          const isCurrent = currentIndex === idx && status !== "completed";

          return (
            <div key={step.key} className="flex sm:flex-col items-center sm:items-start gap-2.5 text-sm">
              <div className="flex items-center justify-center">
                {isDone ? (
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 className="h-4.5 w-4.5 text-primary animate-spin" />
                ) : (
                  <CircleDot className="h-4.5 w-4.5 text-muted-foreground/40" />
                )}
              </div>
              <span
                className={cn(
                  "font-medium leading-tight",
                  isDone
                    ? "text-foreground"
                    : isCurrent
                    ? "text-primary font-semibold"
                    : "text-muted-foreground/60"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
