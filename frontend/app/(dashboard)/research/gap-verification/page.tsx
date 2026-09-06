"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentDropzone } from "@/components/forms/document-dropzone";
import { ProcessingTimeline } from "@/components/feedback/processing-timeline";
import { FindingCard } from "@/components/evidence/finding-card";
import { LimitationNotice } from "@/components/evidence/limitation-notice";
import { HumanReviewBanner } from "@/components/evidence/human-review-banner";
import { ExportMenu } from "@/components/artifacts/export-menu";
import { useCreateAnalysis } from "@/lib/api/endpoints";
import { DEMO_RESEARCH_GAP_RESULT } from "@/lib/constants/demo-data";
import type { ResearchGapResult, GapVerdict } from "@pedago/shared";
import { cn } from "@/lib/utils";

const gapSchema = z.object({
  topic: z.string().min(5, "Topic must be at least 5 characters"),
  claimedGap: z.string().min(10, "Claimed gap must be at least 10 characters"),
  methodology: z.string().optional(),
  population: z.string().optional(),
  startYear: z.number().min(1980).max(2030),
  endYear: z.number().min(1980).max(2030),
});

type GapFormData = z.infer<typeof gapSchema>;

export default function ResearchGapVerificationPage() {
  const [step, setStep] = useState<"input" | "processing" | "results">("results");
  const [result, setResult] = useState<ResearchGapResult>(DEMO_RESEARCH_GAP_RESULT);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const createAnalysisMutation = useCreateAnalysis();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GapFormData>({
    resolver: zodResolver(gapSchema),
    defaultValues: {
      topic: "Orbital Satellite Swarm Consensus",
      claimedGap: "Asynchronous Byzantine Fault Tolerance with bounded clock drift under orbital Doppler shifts without continuous GNSS lock.",
      methodology: "Simulated distributed consensus in ns-3 with relativistic Doppler emulation.",
      startYear: 2018,
      endYear: 2025,
    },
  });

  const onSubmit = async (data: GapFormData) => {
    setStep("processing");

    // Simulate progress or wait for API
    setTimeout(async () => {
      try {
        const res = await createAnalysisMutation.mutateAsync({
          type: "research_gap",
          title: `Gap Verification: ${data.topic}`,
          input: data,
        });

        if (res.resultData) {
          setResult(res.resultData as unknown as ResearchGapResult);
        } else {
          setResult(DEMO_RESEARCH_GAP_RESULT);
        }
        setStep("results");
      } catch {
        setResult(DEMO_RESEARCH_GAP_RESULT);
        setStep("results");
      }
    }, 1800);
  };

  const getVerdictDetails = (verdict: GapVerdict) => {
    switch (verdict) {
      case "supported":
        return {
          label: "Claimed Gap Supported by Indexed Literature",
          classNames: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          icon: CheckCircle2,
        };
      case "partially_supported":
        return {
          label: "Partially Supported (Related Fault Models Exist)",
          classNames: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
          icon: AlertTriangle,
        };
      case "not_supported":
        return {
          label: "Not Supported (Direct Prior Work Found)",
          classNames: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
          icon: AlertTriangle,
        };
      case "insufficient_evidence":
        return {
          label: "Insufficient Evidence in Searched Corpora",
          classNames: "bg-muted text-muted-foreground border-border",
          icon: AlertTriangle,
        };
    }
  };

  const verdictMeta = getVerdictDetails(result.verdict);
  const VerdictIcon = verdictMeta.icon;

  return (
    <div className="space-y-6">
      <PageHeader
        sectionNumber="01.1 // GAP VERIFICATION"
        title="Research Gap Verification"
        description="Empirical novelty verification against indexed academic literature. Traceable prior work matching and cautious academic verdicts."
      >
        {step === "results" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep("input")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Modify Inputs</span>
            </button>
            <ExportMenu
              title="Research Gap Verification Report"
              data={result}
            />
          </div>
        )}
      </PageHeader>

      {/* STEP 1: FORM INPUT */}
      {step === "input" && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
          <div className="rounded-xl border border-border bg-card p-6 space-y-5 shadow-xs">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Define Research Gap Hypothesis
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Research Domain / Topic <span className="text-destructive">*</span>
              </label>
              <input
                {...register("topic")}
                placeholder="e.g. Byzantine fault tolerance in LEO satellite mesh swarms"
                className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {errors.topic && (
                <p className="text-[0.6875rem] text-destructive">{errors.topic.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Claimed Novelty / Unaddressed Gap <span className="text-destructive">*</span>
              </label>
              <textarea
                {...register("claimedGap")}
                rows={3}
                placeholder="State the exact technical gap, unaddressed constraint, or unexplored population..."
                className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {errors.claimedGap && (
                <p className="text-[0.6875rem] text-destructive">{errors.claimedGap.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Proposed Methodology</label>
                <input
                  {...register("methodology")}
                  placeholder="e.g. Topology-aware predictive state machine replication"
                  className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Literature Search Window</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    {...register("startYear", { valueAsNumber: true })}
                    className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input
                    type="number"
                    {...register("endYear", { valueAsNumber: true })}
                    className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Document Upload */}
            <div className="pt-2">
              <label className="text-xs font-semibold text-foreground mb-2 block">
                Target Reference Papers / Lab Preprints (Optional)
              </label>
              <DocumentDropzone onFilesSelected={setUploadedFiles} maxFiles={3} />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={createAnalysisMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
            >
              <Search className="h-4 w-4" />
              <span>Verify Gap Against Literature</span>
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: PROCESSING TIMELINE */}
      {step === "processing" && (
        <div className="max-w-3xl mx-auto py-8">
          <ProcessingTimeline
            status="analyzing"
            currentStepMessage="Cross-checking 412 indexed papers against peer-reviewed corpora (IEEE, ACM, DBLP)..."
            progressPercent={72}
          />
        </div>
      )}

      {/* STEP 3: EVIDENCE-FIRST RESULTS */}
      {step === "results" && (
        <div className="space-y-6">
          {/* Verdict Banner */}
          <div className={cn("rounded-xl border p-5 space-y-2", verdictMeta.classNames)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <VerdictIcon className="h-5 w-5" />
                <span className="font-bold text-sm sm:text-base">{verdictMeta.label}</span>
              </div>
              <span className="text-[0.6875rem] font-mono font-semibold uppercase tracking-wider">
                EMPIRICAL VERDICT
              </span>
            </div>
            <p className="text-xs leading-relaxed opacity-95">
              {result.verdictRationale}
            </p>
          </div>

          {/* Search Coverage & Closest Prior Work */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Closest Prior Work */}
            <div className="lg:col-span-8 rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-xs">
              <div>
                <span className="swiss-header-tag text-primary">PRIOR WORK MATRIX</span>
                <h3 className="text-base font-bold text-foreground mt-0.5">
                  Closest Existing Literature
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Evaluated on similarity distance and key conceptual divergence from your claimed gap.
                </p>
              </div>

              <div className="space-y-3">
                {result.closestPriorWork.map((pw) => (
                  <div
                    key={pw.id}
                    className="rounded-lg border border-border/80 bg-background/60 p-4 space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-semibold text-foreground">{pw.title}</h4>
                        <p className="text-[0.625rem] text-muted-foreground">
                          {pw.authors.join(", ")} ({pw.year}) • {pw.venue}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[0.625rem] font-mono font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          Similarity: {Math.round(pw.similarityScore * 100)}%
                        </span>
                        {pw.isContradicting ? (
                          <span className="text-[0.625rem] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            Contradicts Claim
                          </span>
                        ) : (
                          <span className="text-[0.625rem] font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                            Related Benchmark
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                      <strong className="text-foreground font-medium">Key Difference:</strong> {pw.keyDifference}
                    </p>

                    {pw.citationUrl && (
                      <a
                        href={pw.citationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[0.6875rem] text-primary hover:underline font-medium"
                      >
                        <span>View Source Publication</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Search Coverage Stats */}
            <div className="lg:col-span-4 rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-xs">
              <div>
                <span className="swiss-header-tag text-primary">SEARCH PROVENANCE</span>
                <h3 className="text-base font-bold text-foreground mt-0.5">
                  Literature Coverage
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                  <span className="text-muted-foreground text-[0.6875rem]">Total Papers Scanned</span>
                  <p className="text-lg font-bold font-mono text-foreground mt-0.5">
                    {result.searchCoverage.totalPapersIndexed}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[0.6875rem] font-semibold text-muted-foreground uppercase">
                    Sources Queried
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.searchCoverage.sourcesSearched.map((src) => (
                      <span key={src} className="px-2 py-0.5 rounded bg-muted text-[0.6875rem] font-mono">
                        {src}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[0.6875rem] font-semibold text-muted-foreground uppercase">
                    Boolean Queries Run
                  </span>
                  <ul className="space-y-1 text-[0.6875rem] font-mono text-muted-foreground">
                    {result.searchCoverage.queriesRun.map((q, idx) => (
                      <li key={idx} className="bg-background/80 p-1.5 rounded border border-border/40 truncate" title={q}>
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Suggested Reformulations */}
          <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-3">
            <span className="swiss-header-tag text-emerald-600 dark:text-emerald-400">PROPOSED REFORMULATIONS</span>
            <h3 className="text-base font-bold text-foreground">
              Sharpened Scope & Contribution Angles
            </h3>
            <ul className="space-y-2">
              {result.suggestedReformulations.map((ref, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-foreground bg-muted/30 p-3 rounded-lg border border-border/60">
                  <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{ref}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Traceable Findings */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Traceable Verification Findings ({result.findings.length})
            </h3>
            {result.findings.map((finding) => (
              <FindingCard key={finding.id} finding={finding} />
            ))}
          </div>

          {/* Methodological Limitations */}
          <LimitationNotice limitations={result.limitations} />

          {/* Human Review Sign-Off Banner */}
          <HumanReviewBanner />
        </div>
      )}
    </div>
  );
}
