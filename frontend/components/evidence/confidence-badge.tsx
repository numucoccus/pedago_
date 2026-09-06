import React from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  confidence: "low" | "medium" | "high";
  className?: string;
  showIcon?: boolean;
}

export function ConfidenceBadge({
  confidence,
  className,
  showIcon = true,
}: ConfidenceBadgeProps) {
  const configs = {
    high: {
      label: "High Confidence",
      colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      icon: ShieldCheck,
      tooltip: "Corroborated by multiple peer-reviewed papers or verified course telemetry.",
    },
    medium: {
      label: "Medium Confidence",
      colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      icon: AlertTriangle,
      tooltip: "Supported by primary evidence with minor sample limitations or preprint sources.",
    },
    low: {
      label: "Low Confidence",
      colorClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
      icon: ShieldAlert,
      tooltip: "Sparse empirical evidence or inferred hypothesis requiring direct faculty verification.",
    },
  };

  const config = configs[confidence] || configs.medium;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border tracking-tight",
        config.colorClass,
        className
      )}
      title={config.tooltip}
    >
      {showIcon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
}
