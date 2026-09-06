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
        "rounded-lg border border-amber-500/25 bg-amber-500/5 p-3.5 text-xs text-foreground",
        className
      )}
    >
      <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400 mb-1.5">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{title}</span>
      </div>
      <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-1 leading-relaxed">
        {limitations.map((lim, idx) => (
          <li key={idx} className="text-[0.75rem]">
            {lim}
          </li>
        ))}
      </ul>
    </div>
  );
}
