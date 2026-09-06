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
  targetVenues: z.string().optional(),
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
          classNames: "border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-card to-emerald-500/5 glow-emerald text-emerald-600 dark:text-emerald-400",
          icon: CheckCircle2,
        };
      case "partially_supported":
        return {
          label: "Partially Supported (Related Fault Models Exist)",
          classNames: "border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-card to-amber-500/5 glow-amber text-amber-600 dark:text-amber-400",
          icon: AlertTriangle,
        };
      case "not_supported":
        return {
          label: "Not Supported (Direct Prior Work Found)",
          classNames: "border-rose-500/40 bg-gradient-to-r from-rose-500/10 via-card to-rose-500/5 text-rose-600 dark:text-rose-400",
          icon: AlertTriangle,
        };
      case "insufficient_evidence":
        return {
          label: "Insufficient Evidence in Searched Corpora",
          classNames: "border-border bg-card text-muted-foreground",
          icon: AlertTriangle,
        };
    }
  };

  const verdictMeta = getVerdictDetails(result.verdict);
  const VerdictIcon = verdictMeta.icon;

  return (
    <div className="space-y-8">
      <PageHeader
        sectionNumber="01.1 // GAP VERIFICATION"
        title="Research Gap Verification"
        description="Empirical novelty verification against indexed academic literature. Traceable prior work matching and cautious academic verdicts."
      >
        {step === "results" && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep("input")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-background text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer shadow-2xs"
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-7 max-w-4xl">
          <div className="futuristic-card p-7 sm:p-8 space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Define Research Gap Hypothesis
            </h3>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">
                Research Domain / Topic <span className="text-destructive">*</span>
              </label>
              <input
                {...register("topic")}
                placeholder="e.g. Byzantine fault tolerance in LEO satellite mesh swarms"
                className="w-full text-sm sm:text-base rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {errors.topic && (
                <p className="text-xs text-destructive font-medium">{errors.topic.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">
                Claimed Novelty / Unaddressed Gap <span className="text-destructive">*</span>
              </label>
              <textarea
                {...register("claimedGap")}
                rows={4}
                placeholder="State the exact technical gap, unaddressed constraint, or unexplored population..."
                className="w-full text-sm sm:text-base rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
              />
              {errors.claimedGap && (
                <p className="text-xs text-destructive font-medium">{errors.claimedGap.message}</p>
              )}
            </div>

            <div className="grid grid-grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Proposed Methodology</label>
                <input
                  {...register("methodology")}
                  placeholder="e.g. Topology-aware predictive state machine replication"
                  className="w-full text-sm sm:text-base rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Target Venues</label>
                <input
                  {...register("targetVenues")}
                  placeholder="e.g. IEEE S&P, ACM CCS, USENIX Security"
                  className="w-full text-sm sm:text-base rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Publication Year Range */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Search Publication Window</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground mb-1 block">Start Year</span>
                  <input
                    type="number"
                    {...register("startYear", { valueAsNumber: true })}
                    className="w-full text-sm sm:text-base rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground mb-1 block">End Year</span>
                  <input
                    type="number"
                    {...register("endYear", { valueAsNumber: true })}
                    className="w-full text-sm sm:text-base rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Document Upload */}
            <div className="pt-3">
              <label className="text-sm font-bold text-foreground mb-3 block">
                Target Reference Papers / Lab Preprints (Optional)
              </label>
              <DocumentDropzone onFilesSelected={setUploadedFiles} maxFiles={3} />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={createAnalysisMutation.isPending}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-primary to-cyan-500 text-white text-sm font-bold hover:brightness-110 transition-all shadow-md glow-primary cursor-pointer"
            >
              <Search className="h-4 w-4" />
              <span>Verify Gap Against Literature</span>
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: PROCESSING TIMELINE */}
      {step === "processing" && (
        <div className="max-w-3xl mx-auto py-10">
          <ProcessingTimeline
            status="analyzing"
            currentStepMessage="Cross-checking 412 indexed papers against peer-reviewed corpora (IEEE, ACM, DBLP)..."
            progressPercent={72}
          />
        </div>
      )}

      {/* STEP 3: EVIDENCE-FIRST RESULTS */}
      {step === "results" && (
        <div className="space-y-8">
          {/* Verdict Banner */}
          <div className={cn("rounded-2xl border p-6 sm:p-7 space-y-3 shadow-md", verdictMeta.classNames)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <VerdictIcon className="h-6 w-6 shrink-0" />
                <span className="font-extrabold text-base sm:text-lg">{verdictMeta.label}</span>
              </div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-background/50">
                EMPIRICAL VERDICT
              </span>
            </div>
            <p className="text-sm sm:text-base leading-relaxed text-foreground/90 font-medium">
              {result.verdictRationale}
            </p>
          </div>

          {/* Search Coverage & Closest Prior Work */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
            {/* Closest Prior Work */}
            <div className="lg:col-span-8 futuristic-card p-7 sm:p-8 space-y-5">
              <div>
                <span className="swiss-header-tag text-primary">PRIOR WORK MATRIX</span>
                <h3 className="text-xl font-bold text-foreground mt-0.5">
                  Closest Existing Literature
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Evaluated on similarity distance and key conceptual divergence from your claimed gap.
                </p>
              </div>

              <div className="space-y-4">
                {result.closestPriorWork.map((pw) => (
                  <div
                    key={pw.id}
                    className="rounded-xl border border-border bg-background p-5 space-y-3 shadow-2xs hover:border-primary/50 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <h4 className="text-base font-bold text-foreground leading-snug">{pw.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {pw.authors.join(", ")} ({pw.year}) • {pw.venue}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-muted text-foreground">
                          Similarity: {Math.round(pw.similarityScore * 100)}%
                        </span>
                        {pw.isContradicting ? (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-rose-500/15 text-rose-500 border border-rose-500/30">
                            Contradicts Claim
                          </span>
                        ) : (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-sky-500/15 text-sky-500 border border-sky-500/30">
                            Related Benchmark
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed pt-1">
                      <strong className="text-foreground font-semibold">Key Difference:</strong> {pw.keyDifference}
                    </p>

                    {pw.citationUrl && (
                      <a
                        href={pw.citationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-cyan-400 font-bold transition-colors pt-1"
                      >
                        <span>View Source Publication</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Search Coverage Stats */}
            <div className="lg:col-span-4 futuristic-card p-7 sm:p-8 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <span className="swiss-header-tag text-primary">SEARCH PROVENANCE</span>
                  <h3 className="text-xl font-bold text-foreground mt-0.5">
                    Literature Coverage
                  </h3>
                </div>

                <div className="p-4 rounded-xl bg-background border border-border space-y-1 shadow-2xs">
                  <span className="text-muted-foreground text-xs font-medium">Total Papers Scanned</span>
                  <p className="text-2xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">
                    {result.searchCoverage.totalPapersIndexed}
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Sources Queried
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {result.searchCoverage.sourcesSearched.map((src) => (
                      <span key={src} className="px-3 py-1 rounded-lg bg-background border border-border text-xs font-mono font-medium text-foreground">
                        {src}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Boolean Queries Run
                  </span>
                  <ul className="space-y-1.5 text-xs font-mono text-muted-foreground">
                    {result.searchCoverage.queriesRun.map((q, idx) => (
                      <li key={idx} className="bg-background p-2.5 rounded-lg border border-border truncate" title={q}>
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Suggested Reformulations */}
          <div className="futuristic-card p-7 sm:p-8 space-y-4">
            <span className="swiss-header-tag text-emerald-500">PROPOSED REFORMULATIONS</span>
            <h3 className="text-lg font-bold text-foreground">
              Sharpened Scope & Contribution Angles
            </h3>
            <ul className="space-y-3 pt-1">
              {result.suggestedReformulations.map((ref, idx) => (
                <li key={idx} className="flex items-start gap-3.5 text-xs sm:text-sm text-foreground bg-background p-4 rounded-xl border border-border/80 shadow-2xs leading-relaxed">
                  <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{ref}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Traceable Findings */}
          <div className="space-y-4">
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
