"use client";

import React, { useState } from "react";
import {
  Workflow,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Layers,
  Clock,
  Terminal,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentDropzone } from "@/components/forms/document-dropzone";
import { ProcessingTimeline } from "@/components/feedback/processing-timeline";
import { FindingCard } from "@/components/evidence/finding-card";
import { LimitationNotice } from "@/components/evidence/limitation-notice";
import { HumanReviewBanner } from "@/components/evidence/human-review-banner";
import { ExportMenu } from "@/components/artifacts/export-menu";
import { DEMO_CURRICULUM_ALIGNMENT_RESULT } from "@/lib/constants/demo-data";
import { cn } from "@/lib/utils";

export default function CurriculumAlignmentPage() {
  const [step, setStep] = useState<"input" | "processing" | "results">("results");
  const [data, setData] = useState(DEMO_CURRICULUM_ALIGNMENT_RESULT);

  const radarData = data.radarDimensions.map((d) => ({
    dimension: d.dimension,
    "Syllabus Depth": d.syllabusScore,
    "Industry Demand": d.industryNeed,
    fullMark: 100,
  }));

  const handleLaunchAudit = () => {
    setStep("processing");
    setTimeout(() => {
      setStep("results");
    }, 1700);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        sectionNumber="05.1 // CURRICULUM ALIGNMENT"
        title="Syllabus-to-Industry Alignment Audit"
        description="Benchmark course learning outcomes against thousands of real-world job market requirements. Identifies obsolete topics, emerging skills, and provides turnkey lab modules."
      >
        {step === "results" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep("input")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Audit Another Syllabus</span>
            </button>
            <ExportMenu title="Curriculum Industry Alignment Audit" data={data} />
          </div>
        )}
      </PageHeader>

      {/* INPUT FORM */}
      {step === "input" && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-5 shadow-xs max-w-4xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Configure Syllabus & Target Industry
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Course Title</label>
              <input
                defaultValue="CSE 4201: Cloud Computing Architecture"
                className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Target Industry Sector / Role</label>
              <input
                defaultValue="Cloud-Native Infrastructure & Site Reliability Engineering"
                className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="text-xs font-semibold text-foreground mb-2 block">
              Upload Official Syllabus (PDF, DOCX)
            </label>
            <DocumentDropzone helperText="Upload syllabus detailing week-by-week lecture modules and lab assignments." />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleLaunchAudit}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
            >
              <Workflow className="h-4 w-4" />
              <span>Run Alignment Audit</span>
            </button>
          </div>
        </div>
      )}

      {/* PROCESSING STATE */}
      {step === "processing" && (
        <div className="max-w-3xl mx-auto py-8">
          <ProcessingTimeline
            status="analyzing"
            currentStepMessage="Cross-referencing 24 syllabus outcomes against 3,840 verified cloud infrastructure job postings..."
            progressPercent={82}
          />
        </div>
      )}

      {/* RESULTS VIEW */}
      {step === "results" && (
        <div className="space-y-6">
          {/* Executive Alignment Score Card */}
          <div className="rounded-xl border border-border bg-card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
            <div className="space-y-1">
              <span className="swiss-header-tag text-primary">SECTOR AUDIT</span>
              <h3 className="text-base font-bold text-foreground">{data.courseTitle}</h3>
              <p className="text-xs text-muted-foreground">{data.targetIndustrySector}</p>
              <div className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground pt-1" title={data.methodologyDescription}>
                <Info className="h-3.5 w-3.5 text-primary" />
                <span>Evidence retrieval: {data.retrievalDate} (Hover for methodology)</span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="flex items-baseline justify-end gap-1">
                <span className="font-mono text-4xl font-bold text-primary">
                  {data.alignmentScorePercent}%
                </span>
              </div>
              <p className="text-[0.625rem] uppercase tracking-wider text-muted-foreground">
                Composite Industry Match Index
              </p>
            </div>
          </div>

          {/* Radar Chart: Syllabus Depth vs Industry Need */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
              <div>
                <span className="swiss-header-tag text-primary">COMPETENCY OVERLAY</span>
                <h3 className="text-base font-bold text-foreground mt-0.5">
                  Syllabus Coverage vs. Industry Demand
                </h3>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: "currentColor" }} />
                    <PolarRadiusAxis domain={[0, 100]} stroke="#888888" fontSize={9} />
                    <Radar
                      name="Syllabus Depth"
                      dataKey="Syllabus Depth"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.25}
                    />
                    <Radar
                      name="Industry Demand"
                      dataKey="Industry Demand"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.25}
                    />
                    <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: "0.5rem" }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Current vs Legacy vs Missing Skills Matrix */}
            <div className="lg:col-span-6 rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs flex flex-col justify-between">
              <div>
                <span className="swiss-header-tag text-primary">SKILLS TAXONOMY</span>
                <h3 className="text-base font-bold text-foreground mt-0.5">
                  Technology Stack Classification
                </h3>
              </div>

              <div className="space-y-2.5 overflow-y-auto max-h-64 pr-1">
                {data.skillsMatrix.map((item) => {
                  const isCurrent = item.status === "current";
                  const isMissing = item.status === "missing";
                  const isLegacy = item.status === "legacy";

                  return (
                    <div
                      key={item.skillName}
                      className="p-3 rounded-lg border border-border/80 bg-background/60 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-foreground">{item.skillName}</p>
                        <p className="text-[0.625rem] text-muted-foreground font-mono">
                          Demand: {item.industryDemandIndex}/100 • Evidenced in {item.evidenceJobCount} job postings
                        </p>
                      </div>

                      <span
                        className={cn(
                          "text-[0.625rem] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0",
                          isCurrent
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : isMissing
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        )}
                      >
                        {item.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Prioritized Micro-Updates */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
            <span className="swiss-header-tag text-primary">CURRICULUM ACTION ITEMS</span>
            <h3 className="text-base font-bold text-foreground">
              Prioritized Micro-Updates for Next Semester Syllabus
            </h3>

            <div className="space-y-3">
              {data.prioritizedMicroUpdates.map((update, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-border/80 bg-background/60 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[0.6875rem] font-bold text-primary">
                      {update.targetModule}
                    </span>
                    <span
                      className={cn(
                        "text-[0.625rem] font-bold px-2 py-0.5 rounded uppercase",
                        update.priority === "high"
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {update.priority} Priority
                    </span>
                  </div>
                  <p className="font-semibold text-foreground text-sm leading-snug">
                    {update.recommendation}
                  </p>
                  <p className="text-muted-foreground leading-relaxed italic">
                    Rationale: {update.rationale}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Turnkey Plug-and-Play Labs */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">
                Turnkey Plug-and-Play Laboratory Exercises
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Directly replaces legacy lab assignments with modern tooling.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {data.plugAndPlayLabs.map((lab, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-primary/20 bg-background/80 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-foreground">{lab.title}</h4>
                    <span className="font-mono text-[0.625rem] text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {lab.estimatedHours} Hours
                    </span>
                  </div>

                  <p className="text-muted-foreground leading-relaxed">{lab.description}</p>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {lab.modernTools.map((t) => (
                      <span
                        key={t}
                        className="text-[0.625rem] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Findings */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Curricular Findings ({data.findings.length})
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
