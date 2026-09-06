import React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface LimitationNoticeProps {
  limitations: string[];
  className?: string;
  title?: string;
}

export function LimitationNotice({
  limitations,
  className,
  title = "Evidence Boundaries & Methodological Limitations",
}: LimitationNoticeProps) {
  if (!limitations || limitations.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-foreground",
        className
      )}
    >
      <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400 mb-2">
        <AlertCircle className="h-4.5 w-4.5 shrink-0" />
        <span>{title}</span>
      </div>
      <ul className="list-disc list-inside space-y-1.5 text-muted-foreground pl-1 leading-relaxed text-xs sm:text-sm">
        {limitations.map((lim, idx) => (
          <li key={idx}>
            {lim}
          </li>
        ))}
      </ul>
    </div>
  );
}
