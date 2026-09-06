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
    <div className="space-y-6">
      <PageHeader
        sectionNumber="01.2 // EVOLUTION & TRENDS"
        title="Research Evolution Tracker"
        description="Temporal shifts in algorithmic methodologies, inflection points in sequence modeling architectures, and empirical decline signals."
      >
        <ExportMenu title="Research Evolution Trend Report" data={data} />
      </PageHeader>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Filter className="h-4 w-4 text-primary" />
          <span>Filter Paradigm:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {["all", "Quadratic Attention", "Sparse Attention", "State Space"].map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMethod(m)}
              className={cn(
                "px-3 py-1 text-xs rounded-lg transition-colors font-medium",
                selectedMethod === m
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {m === "all" ? "All Methods Combined" : m}
            </button>
          ))}
        </div>
      </div>

      {/* Method Frequency Stacked Chart */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="swiss-header-tag text-primary">TEMPORAL METHOD DISTRIBUTION (2020 - 2025)</span>
            <h3 className="text-base font-bold text-foreground mt-0.5">
              Sequence Modeling Architecture Share in Top-Tier Venues
            </h3>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            Corpus: NeurIPS, ICLR, ICML, ACL
          </span>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="year" stroke="#888888" fontSize={12} tickLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "0.5rem",
                  fontSize: "0.75rem",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: "0.5rem" }} />
              {(selectedMethod === "all" || selectedMethod === "Quadratic Attention") && (
                <Bar dataKey="Quadratic Attention" stackId="a" fill="#64748b" />
              )}
              {(selectedMethod === "all" || selectedMethod === "Sparse Attention") && (
                <Bar dataKey="Sparse Attention" stackId="a" fill="#3b82f6" />
              )}
              {(selectedMethod === "all" || selectedMethod === "State Space") && (
                <Bar dataKey="State Space" stackId="a" fill="#10b981" />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Emerging vs Declining Topic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {data.topics.map((topic) => {
          const isEmerging = topic.status === "emerging";
          const isDeclining = topic.status === "declining";

          return (
            <div
              key={topic.topic}
              className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-xs flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[0.625rem] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                      isEmerging
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : isDeclining
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                    )}
                  >
                    {isEmerging ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : isDeclining ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : (
                      <Layers className="h-3 w-3" />
                    )}
                    {topic.status}
                  </span>

                  <span className="font-mono text-xs font-bold text-foreground">
                    {topic.growthRate > 0 ? `+${topic.growthRate}%` : `${topic.growthRate}%`}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-foreground leading-snug">
                  {topic.topic}
                </h4>
              </div>

              {topic.evidence.length > 0 && (
                <div className="pt-2 border-t border-border/60 text-[0.6875rem] text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">{topic.evidence[0].title}</p>
                  <p className="italic">“{topic.evidence[0].excerpt}”</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Findings */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
          Empirical Trend Syntheses ({data.findings.length})
        </h3>
        {data.findings.map((finding) => (
          <FindingCard key={finding.id} finding={finding} />
        ))}
      </div>

      <LimitationNotice limitations={data.limitations} />
      <HumanReviewBanner />
    </div>
  );
}
