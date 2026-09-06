import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonStateProps {
  className?: string;
  rows?: number;
}

export function SkeletonState({ className, rows = 4 }: SkeletonStateProps) {
  return (
    <div className={cn("space-y-4 p-6 rounded-xl border border-border bg-card animate-pulse", className)}>
      <div className="flex items-center justify-between">
        <div className="h-5 w-1/3 bg-muted rounded-md" />
        <div className="h-4 w-20 bg-muted rounded-md" />
      </div>

      <div className="space-y-2.5 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-3.5 bg-muted/70 rounded-md"
            style={{ width: `${100 - (i % 3) * 15}%` }}
          />
        ))}
      </div>

      <div className="flex items-center gap-3 pt-3 border-t border-border/50">
        <div className="h-8 w-24 bg-muted rounded-lg" />
        <div className="h-8 w-32 bg-muted rounded-lg" />
      </div>
    </div>
  );
}
