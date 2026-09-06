"use client";

import React, { useState } from "react";
import {
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  Send,
  Download,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { EditableArtifact } from "@/components/artifacts/editable-artifact";
import { FindingCard } from "@/components/evidence/finding-card";
import { LimitationNotice } from "@/components/evidence/limitation-notice";
import { HumanReviewBanner } from "@/components/evidence/human-review-banner";
import { ExportMenu } from "@/components/artifacts/export-menu";
import { DEMO_LOR_DOSSIER_RESULT } from "@/lib/constants/demo-data";
import { cn } from "@/lib/utils";

export default function LorDossierPage() {
  const [data] = useState(DEMO_LOR_DOSSIER_RESULT);
  const [editedHtml, setEditedHtml] = useState(data.initialDraftHtml);
  const [targetProgram, setTargetProgram] = useState(data.targetProgram);

  return (
    <div className="space-y-8">
      <PageHeader
        sectionNumber="04.2 // LOR EVIDENCE DOSSIER"
        title="Evidence-Backed Letter of Recommendation"
        description="Every superlative claim tied to verifiable student transcripts, lab telemetry, and peer evaluations. Editable TipTap document with strict fact-checking invariants."
      >
        <ExportMenu
          title={`LOR_${data.studentName}_${targetProgram.replace(/\s+/g, "_")}`}
          data={{ ...data, finalHtml: editedHtml }}
          markdownContent={editedHtml.replace(/<[^>]+>/g, "\n")}
        />
      </PageHeader>

      {/* Target Program & Student Header */}
      <div className="futuristic-card p-7 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <span className="swiss-header-tag text-primary">CANDIDATE</span>
            <p className="text-lg font-bold text-foreground">{data.studentName}</p>
            <p className="text-xs text-muted-foreground">
              Undergraduate Senior • Department of Computer Science
            </p>
          </div>

          <div className="space-y-2">
            <span className="swiss-header-tag text-primary">TARGET ADMISSION PROGRAM</span>
            <input
              value={targetProgram}
              onChange={(e) => setTargetProgram(e.target.value)}
              className="w-full text-xs font-semibold rounded-xl border border-border/80 bg-background/90 px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Program Requirement vs Evidence Matrix */}
      <div className="futuristic-card p-7 sm:p-8 space-y-6">
        <div>
          <span className="swiss-header-tag text-primary">ADMISSIONS CRITERIA AUDIT</span>
          <h3 className="text-base font-bold text-foreground mt-0.5">
            Requirement-to-Evidence Matrix
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Maps doctoral selection criteria to direct laboratory achievements and verified grades.
          </p>
        </div>

        <div className="divide-y divide-border/60">
          {data.requirementsMatrix.map((req, i) => (
            <div key={i} className="py-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-foreground text-base">{req.requirement}</span>
                {req.hasDirectEvidence ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/30 shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                    Verified Evidence
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-500 dark:text-amber-400 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30 shrink-0">
                    <AlertTriangle className="h-4 w-4" />
                    Missing Evidence
                  </span>
                )}
              </div>

              <p className="text-muted-foreground leading-relaxed">
                {req.strengthEvidence}
              </p>

              {req.citationReference && (
                <span className="text-xs font-mono text-primary font-medium block">
                  Citation: {req.citationReference}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Missing Evidence Warnings */}
      {data.missingEvidenceWarnings.length > 0 && (
        <div className="futuristic-card p-6 sm:p-7 border-amber-500/40 bg-amber-500/10 space-y-3 text-sm">
          <div className="flex items-center gap-2 font-bold text-amber-500 dark:text-amber-400 text-base">
            <AlertTriangle className="h-4.5 w-4.5" />
            <span>Missing Evidence Warning: Strict Factual Guardrail</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            The AI draft generator will <strong>not</strong> make claims regarding journal acceptance until peer review completes:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-muted-foreground pl-1">
            {data.missingEvidenceWarnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* TipTap Editable LOR Draft */}
      <div className="futuristic-card p-7 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/80 pb-4">
          <div>
            <span className="swiss-header-tag text-emerald-500 dark:text-emerald-400">
              EDITABLE FACULTY DRAFT
            </span>
            <h3 className="text-xl font-bold text-foreground mt-0.5">
              Interactive Recommendation Letter Editor (TipTap)
            </h3>
          </div>
          <span className="text-xs font-mono text-muted-foreground bg-muted/40 px-3 py-1 rounded-lg border border-border/60">
            Formatted for Institutional Letterhead
          </span>
        </div>

        <EditableArtifact
          initialContent={editedHtml}
          onChange={(html) => setEditedHtml(html)}
          className="shadow-md rounded-xl overflow-hidden border border-border bg-background"
        />
      </div>

      {/* Findings */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Fact-Checking Audit Findings ({data.findings.length})
        </h3>
        <div className="space-y-4">
          {data.findings.map((f) => (
            <FindingCard key={f.id} finding={f} />
          ))}
        </div>
      </div>

      <LimitationNotice limitations={data.limitations} />
      <HumanReviewBanner />
    </div>
  );
}
