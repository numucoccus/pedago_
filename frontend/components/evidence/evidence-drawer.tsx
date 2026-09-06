"use client";

import React from "react";
import type { EvidenceReference } from "@pedago/shared";
import { X, FileText, ExternalLink, Bookmark, Calendar } from "lucide-react";

interface EvidenceDrawerProps {
  open: boolean;
  onClose: () => void;
  evidence: EvidenceReference[];
  title?: string;
}

export function EvidenceDrawer({
  open,
  onClose,
  evidence,
  title = "Cited Primary Evidence",
}: EvidenceDrawerProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-lg border-l border-border bg-card p-6 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {evidence.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No specific primary document excerpts are linked to this finding.
            </p>
          ) : (
            evidence.map((item, idx) => (
              <div
                key={item.id || idx}
                className="rounded-xl border border-border bg-background p-4 space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4.5 w-4.5 text-primary shrink-0" />
                    <span className="text-sm font-semibold text-foreground leading-snug">
                      {item.title}
                    </span>
                  </div>
                  {item.publishedYear && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 bg-muted px-2.5 py-0.5 rounded font-medium">
                      <Calendar className="h-3.5 w-3.5" />
                      {item.publishedYear}
                    </span>
                  )}
                </div>

                {item.locator && (
                  <div className="text-xs font-mono font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded w-fit">
                    Locator: {item.locator}
                  </div>
                )}

                <blockquote className="border-l-2 border-primary/50 pl-3 text-sm italic text-muted-foreground leading-relaxed">
                  “{item.excerpt}”
                </blockquote>

                {item.sourceUrl && (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold pt-1"
                  >
                    <span>View Primary Source</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
