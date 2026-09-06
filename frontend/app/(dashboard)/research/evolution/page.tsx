"use client";

import React, { useState } from "react";
import {
  LineChart as LineChartIcon,
  TrendingUp,
  TrendingDown,
  Filter,
  Calendar,
  Layers,
  FileText,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { FindingCard } from "@/components/evidence/finding-card";
import { LimitationNotice } from "@/components/evidence/limitation-notice";
import { HumanReviewBanner } from "@/components/evidence/human-review-banner";
import { ExportMenu } from "@/components/artifacts/export-menu";
import { DEMO_RESEARCH_EVOLUTION_RESULT } from "@/lib/constants/demo-data";
import { cn } from "@/lib/utils";

export default function ResearchEvolutionPage() {
  const [selectedMethod, setSelectedMethod] = useState<string>("all");
  const [data] = useState(DEMO_RESEARCH_EVOLUTION_RESULT);

  const chartData = data.timeline.map((point) => ({
    year: point.year,
    "Quadratic Attention": point.methods["Quadratic Attention"] || 0,
    "Sparse Attention": point.methods["Sparse Attention"] || 0,
    "State Space": point.methods["State Space"] || 0,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        sectionNumber="01.2 // EVOLUTION & TRENDS"
        title="Research Evolution Tracker"
        description="Temporal shifts in algorithmic methodologies, inflection points in sequence modeling architectures, and empirical decline signals."
      >
        <ExportMenu title="Research Evolution Trend Report" data={data} />
      </PageHeader>

      {/* Filters Bar */}
      <div className="futuristic-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-xs font-semibold text-foreground">
          <Filter className="h-4 w-4 text-primary" />
          <span>Filter Paradigm:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {["all", "Quadratic Attention", "Sparse Attention", "State Space"].map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMethod(m)}
              className={cn(
                "px-4 py-1.5 text-xs rounded-xl transition-all font-medium cursor-pointer",
                selectedMethod === m
                  ? "bg-primary text-primary-foreground font-semibold shadow-md glow-primary border border-primary/60"
                  : "bg-background/80 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/80"
              )}
            >
              {m === "all" ? "All Methods Combined" : m}
            </button>
          ))}
        </div>
      </div>

      {/* Method Frequency Stacked Chart */}
      <div className="futuristic-card p-7 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/80 pb-4">
          <div>
            <span className="swiss-header-tag text-primary">TEMPORAL METHOD DISTRIBUTION (2020 - 2025)</span>
            <h3 className="text-lg font-bold text-foreground mt-0.5">
              Sequence Modeling Architecture Share in Top-Tier Venues
            </h3>
          </div>
          <span className="text-xs font-mono text-muted-foreground bg-muted/40 px-3 py-1 rounded-lg border border-border/60">
            Corpus: NeurIPS, ICLR, ICML, ACL
          </span>
        </div>

        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="year" stroke="#888888" fontSize={12} tickLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "0.75rem",
                  fontSize: "0.75rem",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: "0.75rem" }} />
              {(selectedMethod === "all" || selectedMethod === "Quadratic Attention") && (
                <Bar dataKey="Quadratic Attention" stackId="a" fill="#475569" radius={[0, 0, 0, 0]} />
              )}
              {(selectedMethod === "all" || selectedMethod === "Sparse Attention") && (
                <Bar dataKey="Sparse Attention" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
              )}
              {(selectedMethod === "all" || selectedMethod === "State Space") && (
                <Bar dataKey="State Space" stackId="a" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Emerging vs Declining Topic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data.topics.map((topic) => {
          const isEmerging = topic.status === "emerging";
          const isDeclining = topic.status === "declining";

          return (
            <div
              key={topic.topic}
              className="futuristic-card p-6 sm:p-7 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider",
                      isEmerging
                        ? "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30"
                        : isDeclining
                        ? "bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/30"
                        : "bg-sky-500/15 text-sky-500 dark:text-sky-400 border border-sky-500/30"
                    )}
                  >
                    {isEmerging ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : isDeclining ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : (
                      <Layers className="h-4 w-4" />
                    )}
                    {topic.status}
                  </span>

                  <span className="font-mono text-sm font-bold text-foreground">
                    {topic.growthRate > 0 ? `+${topic.growthRate}%` : `${topic.growthRate}%`}
                  </span>
                </div>

                <h4 className="text-base font-bold text-foreground leading-snug">
                  {topic.topic}
                </h4>
              </div>

              {topic.evidence.length > 0 && (
                <div className="pt-3 border-t border-border/70 text-xs sm:text-sm text-muted-foreground space-y-1.5">
                  <p className="font-semibold text-foreground">{topic.evidence[0].title}</p>
                  <p className="italic leading-relaxed">“{topic.evidence[0].excerpt}”</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Findings */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Empirical Trend Syntheses ({data.findings.length})
        </h3>
        <div className="space-y-4">
          {data.findings.map((finding) => (
            <FindingCard key={finding.id} finding={finding} />
          ))}
        </div>
      </div>

      <LimitationNotice limitations={data.limitations} />
      <HumanReviewBanner />
    </div>
  );
}
