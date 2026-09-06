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
    <div className="space-y-8">
      <PageHeader
        sectionNumber="02.2 // QUERY CLUSTERING & TRIAGE"
        title="Office-Hour Query Clustering & Triage"
        description="Cluster dozens of student inquiries, separate conceptual misconceptions from course logistics, map questions to the syllabus, and draft targeted broadcast announcements."
      >
        {step === "results" && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep("input")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border/80 bg-background/80 hover:bg-muted text-xs font-semibold text-foreground transition-all hover:border-border cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-primary" />
              <span>Import Inquiries</span>
            </button>
            <ExportMenu title="Query Clustering & Broadcast Triage Report" data={data} />
          </div>
        )}
      </PageHeader>

      {/* INPUT STEP */}
      {step === "input" && (
        <div className="futuristic-card p-7 sm:p-8 space-y-6 max-w-4xl">
          <div className="space-y-1">
            <span className="swiss-header-tag text-primary">QUERY INGESTION</span>
            <h3 className="text-base font-bold text-foreground">
              Ingest Student Queries (Forum / Piazza / Discord / LMS)
            </h3>
            <p className="text-xs text-muted-foreground">
              Student identities are automatically anonymized prior to semantic clustering.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Paste Inquiries (One per line)</label>
            <textarea
              value={pastedQueries}
              onChange={(e) => setPastedQueries(e.target.value)}
              rows={6}
              placeholder="Paste raw student inquiries here. System will automatically redact student names..."
              className="w-full text-xs rounded-xl border border-border/80 bg-background/90 p-4 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium leading-relaxed"
            />
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-foreground block">
              Or Upload CSV / TXT Queue Export
            </label>
            <DocumentDropzone />
          </div>

          <div className="flex justify-end pt-4 border-t border-border/60">
            <button
              onClick={handleLaunchClustering}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary via-indigo-600 to-cyan-500 text-white text-xs font-bold hover:brightness-110 transition-all shadow-md glow-primary cursor-pointer"
            >
              <Network className="h-4 w-4" />
              <span>Cluster & Triage Inquiries</span>
            </button>
          </div>
        </div>
      )}

      {/* PROCESSING STATE */}
      {step === "processing" && (
        <div className="max-w-3xl mx-auto py-12">
          <ProcessingTimeline
            status="analyzing"
            currentStepMessage="Clustering 48 inquiries across semantic embedding spaces and syllabus topic mapping..."
            progressPercent={70}
          />
        </div>
      )}

      {/* RESULTS VIEW */}
      {step === "results" && (
        <div className="space-y-8">
          {/* Cluster Summary Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {data.clusters.map((cluster) => {
              const isSelected = cluster.id === selectedClusterId;
              const isConceptual = cluster.intentType === "conceptual";

              return (
                <button
                  key={cluster.id}
                  onClick={() => setSelectedClusterId(cluster.id)}
                  className={cn(
                    "p-5 rounded-xl border text-left space-y-3 transition-all cursor-pointer",
                    isSelected
                      ? "border-primary/60 bg-gradient-to-b from-primary/15 via-card to-card shadow-md glow-primary"
                      : "border-border/80 bg-card hover:border-primary/40 hover:bg-card/90"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider",
                        isConceptual
                          ? "bg-purple-500/15 text-purple-500 dark:text-purple-400 border border-purple-500/30"
                          : "bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30"
                      )}
                    >
                      {cluster.intentType}
                    </span>
                    <span className="font-mono text-sm font-bold text-foreground">
                      {cluster.count} queries ({Math.round((cluster.count / data.totalQueriesProcessed) * 100)}%)
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-foreground leading-snug line-clamp-2">
                    {cluster.label}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate font-mono">
                    Map: {cluster.syllabusTopicMap}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active Cluster Detail Bento */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Representative Quotes & Root Cause */}
            <div className="lg:col-span-7 futuristic-card p-7 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/80 pb-4">
                <div>
                  <span className="swiss-header-tag text-primary">CLUSTER DEEP DIVE</span>
                  <h3 className="text-xl font-bold text-foreground mt-0.5">
                    {activeCluster.label}
                  </h3>
                </div>
                <span className="text-xs font-mono px-3 py-1 rounded-lg bg-muted/60 text-muted-foreground border border-border/60 font-semibold">
                  {activeCluster.syllabusTopicMap}
                </span>
              </div>

              {/* Root Cause Hypothesis */}
              <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 text-sm text-foreground space-y-1.5">
                <span className="font-bold text-primary block text-xs uppercase tracking-wider">
                  Root-Cause Hypothesis
                </span>
                <p className="leading-relaxed font-medium">{activeCluster.rootCauseHypothesis}</p>
              </div>

              {/* Representative Quotes */}
              <div className="space-y-3">
                <span className="text-sm font-bold text-foreground uppercase tracking-wider block">
                  Representative Anonymized Inquiries ({activeCluster.representativeQuotes.length})
                </span>
                <ul className="space-y-3">
                  {activeCluster.representativeQuotes.map((quote, idx) => (
                    <li
                      key={idx}
                      className="p-4 rounded-xl border border-border bg-background text-sm italic text-muted-foreground leading-relaxed"
                    >
                      “{quote}”
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right: Broadcast Response & Slide Outline */}
            <div className="lg:col-span-5 futuristic-card p-7 sm:p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                  <span className="swiss-header-tag text-emerald-500 dark:text-emerald-400">
                    SUGGESTED BROADCAST
                  </span>
                  <button
                    onClick={() => handleCopyBroadcast(broadcastDrafts[activeCluster.id])}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    <Copy className="h-4 w-4" />
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
                  className="w-full text-sm rounded-xl border border-border bg-background p-4 text-foreground leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary font-medium shadow-2xs"
                />

                {activeCluster.revisionSlideOutline && (
                  <div className="pt-3 border-t border-border/70 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Presentation className="h-4.5 w-4.5 text-primary" />
                      <span>Recommended 2-Slide In-Class Mini-Recap</span>
                    </div>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 pl-1">
                      {activeCluster.revisionSlideOutline.map((slide, i) => (
                        <li key={i}>{slide}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border/70">
                <button
                  onClick={() => handleCopyBroadcast(broadcastDrafts[activeCluster.id])}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary via-indigo-600 to-cyan-500 text-white text-sm font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-md glow-primary cursor-pointer"
                >
                  <Send className="h-4.5 w-4.5" />
                  <span>Send Broadcast to LMS & Forum</span>
                </button>
              </div>
            </div>
          </div>

          {/* Findings */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Query Triage Findings ({data.findings.length})
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
      )}
    </div>
  );
}
