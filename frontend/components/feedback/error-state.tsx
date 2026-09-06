import React from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onBack?: () => void;
  className?: string;
  code?: string;
}

export function ErrorState({
  title = "Analysis or Request Failed",
  message,
  onRetry,
  onBack,
  className,
  code,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 sm:p-8 text-center space-y-4",
        className
      )}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
        <AlertTriangle className="h-6 w-6" />
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        {code && (
          <p className="font-mono text-[0.6875rem] text-rose-600 dark:text-rose-400 font-semibold">
            ERROR CODE: {code}
          </p>
        )}
        <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
          {message}
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Go Back</span>
          </button>
        )}

        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Action</span>
          </button>
        )}
      </div>
    </div>
  );
}
