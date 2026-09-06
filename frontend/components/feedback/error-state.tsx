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
        "futuristic-card border-rose-500/40 bg-rose-500/10 p-7 sm:p-8 text-center space-y-5",
        className
      )}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
        <AlertTriangle className="h-6 w-6" />
      </div>

      <div className="space-y-1">
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        {code && (
          <p className="font-mono text-xs text-rose-600 dark:text-rose-400 font-bold">
            ERROR CODE: {code}
          </p>
        )}
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          {message}
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go Back</span>
          </button>
        )}

        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry Action</span>
          </button>
        )}
      </div>
    </div>
  );
}
