"use client";

import React, { useState } from "react";
import {
  Network,
  MessageSquare,
  Sparkles,
  Send,
  BookOpen,
  Copy,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Presentation,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentDropzone } from "@/components/forms/document-dropzone";
import { ProcessingTimeline } from "@/components/feedback/processing-timeline";
import { FindingCard } from "@/components/evidence/finding-card";
import { LimitationNotice } from "@/components/evidence/limitation-notice";
import { HumanReviewBanner } from "@/components/evidence/human-review-banner";
import { ExportMenu } from "@/components/artifacts/export-menu";
import { DEMO_QUERY_CLUSTERING_RESULT } from "@/lib/constants/demo-data";
import { cn } from "@/lib/utils";

export default function QueryClustersPage() {
  const [step, setStep] = useState<"input" | "processing" | "results">("results");
  const [data, setData] = useState(DEMO_QUERY_CLUSTERING_RESULT);
  const [pastedQueries, setPastedQueries] = useState("");
  const [selectedClusterId, setSelectedClusterId] = useState<string>(data.clusters[0].id);
  const [broadcastDrafts, setBroadcastDrafts] = useState<Record<string, string>>({
    cl_01: data.clusters[0].suggestedBroadcast,
    cl_02: data.clusters[1].suggestedBroadcast,
    cl_03: data.clusters[2].suggestedBroadcast,
  });

  const handleLaunchClustering = () => {
    setStep("processing");
    setTimeout(() => {
      setStep("results");
    }, 1500);
  };

  const handleCopyBroadcast = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied broadcast announcement to clipboard");
  };

  const activeCluster = data.clusters.find((c) => c.id === selectedClusterId) || data.clusters[0];

  return (
    <div className="space-y-6">
      <PageHeader
        sectionNumber="02.2 // QUERY CLUSTERING & TRIAGE"
        title="Office-Hour Query Clustering & Triage"
        description="Cluster dozens of student inquiries, separate conceptual misconceptions from course logistics, map questions to the syllabus, and draft targeted broadcast announcements."
      >
        {step === "results" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep("input")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Import Inquiries</span>
            </button>
            <ExportMenu title="Query Clustering & Broadcast Triage Report" data={data} />
          </div>
        )}
      </PageHeader>

      {/* INPUT STEP */}
      {step === "input" && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-5 shadow-xs max-w-4xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Ingest Student Queries (Forum / Piazza / Discord / LMS)
          </h3>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Paste Inquiries (One per line)</label>
            <textarea
              value={pastedQueries}
              onChange={(e) => setPastedQueries(e.target.value)}
              rows={6}
              placeholder="Paste raw student inquiries here. System will automatically redact student names..."
              className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="pt-2">
            <label className="text-xs font-semibold text-foreground mb-2 block">
              Or Upload CSV / TXT Queue Export
            </label>
            <DocumentDropzone />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleLaunchClustering}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
            >
              <Network className="h-4 w-4" />
              <span>Cluster & Triage Inquiries</span>
            </button>
          </div>
        </div>
      )}

      {/* PROCESSING STATE */}
      {step === "processing" && (
        <div className="max-w-3xl mx-auto py-8">
          <ProcessingTimeline
            status="analyzing"
            currentStepMessage="Clustering 48 inquiries across semantic embedding spaces and syllabus topic mapping..."
            progressPercent={70}
          />
        </div>
      )}

      {/* RESULTS VIEW */}
      {step === "results" && (
        <div className="space-y-6">
          {/* Cluster Summary Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {data.clusters.map((cluster) => {
              const isSelected = cluster.id === selectedClusterId;
              const isConceptual = cluster.intentType === "conceptual";

              return (
                <button
                  key={cluster.id}
                  onClick={() => setSelectedClusterId(cluster.id)}
                  className={cn(
                    "rounded-xl border p-4 text-left space-y-2 transition-all cursor-pointer",
                    isSelected
                      ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-sm"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-[0.625rem] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                        isConceptual
                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      )}
                    >
                      {cluster.intentType}
                    </span>
                    <span className="font-mono text-xs font-bold text-foreground">
                      {cluster.count} queries ({Math.round((cluster.count / data.totalQueriesProcessed) * 100)}%)
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-foreground leading-snug line-clamp-2">
                    {cluster.label}
                  </h4>
                  <p className="text-[0.6875rem] text-muted-foreground truncate">
                    Map: {cluster.syllabusTopicMap}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active Cluster Detail Bento */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Representative Quotes & Root Cause */}
            <div className="lg:col-span-7 rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="swiss-header-tag text-primary">CLUSTER DEEP DIVE</span>
                  <h3 className="text-base font-bold text-foreground mt-0.5">
                    {activeCluster.label}
                  </h3>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  {activeCluster.syllabusTopicMap}
                </span>
              </div>

              {/* Root Cause Hypothesis */}
              <div className="p-3.5 rounded-lg border border-primary/25 bg-primary/5 text-xs text-foreground space-y-1">
                <span className="font-semibold text-primary block">Root-Cause Hypothesis:</span>
                <p className="leading-relaxed">{activeCluster.rootCauseHypothesis}</p>
              </div>

              {/* Representative Quotes */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Representative Anonymized Inquiries ({activeCluster.representativeQuotes.length})
                </span>
                <ul className="space-y-2">
                  {activeCluster.representativeQuotes.map((quote, idx) => (
                    <li
                      key={idx}
                      className="p-3 rounded-lg border border-border/80 bg-background/60 text-xs italic text-muted-foreground leading-relaxed"
                    >
                      {quote}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right: Broadcast Response & Slide Outline */}
            <div className="lg:col-span-5 rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="swiss-header-tag text-emerald-600 dark:text-emerald-400">
                    SUGGESTED BROADCAST
                  </span>
                  <button
                    onClick={() => handleCopyBroadcast(broadcastDrafts[activeCluster.id])}
                    className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-primary hover:underline"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copy Text</span>
                  </button>
                </div>

                <textarea
                  value={broadcastDrafts[activeCluster.id]}
                  onChange={(e) =>
                    setBroadcastDrafts({
                      ...broadcastDrafts,
                      [activeCluster.id]: e.target.value,
                    })
                  }
                  rows={6}
                  className="w-full text-xs rounded-lg border border-border bg-background p-3 text-foreground leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary"
                />

                {activeCluster.revisionSlideOutline && (
                  <div className="pt-2 border-t border-border/60 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Presentation className="h-3.5 w-3.5 text-primary" />
                      <span>Recommended 2-Slide In-Class Mini-Recap</span>
                    </div>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 pl-1">
                      {activeCluster.revisionSlideOutline.map((slide, i) => (
                        <li key={i}>{slide}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border/60">
                <button
                  onClick={() => handleCopyBroadcast(broadcastDrafts[activeCluster.id])}
                  className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Broadcast to LMS & Forum</span>
                </button>
              </div>
            </div>
          </div>

          {/* Findings */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Query Triage Findings ({data.findings.length})
            </h3>
            {data.findings.map((f) => (
              <FindingCard key={f.id} finding={f} />
            ))}
          </div>

          <LimitationNotice limitations={data.limitations} />
          <HumanReviewBanner />
        </div>
      )}
    </div>
  );
}
