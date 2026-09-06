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
    <div className="space-y-8">
      <PageHeader
        sectionNumber="05.1 // CURRICULUM ALIGNMENT"
        title="Syllabus-to-Industry Alignment Audit"
        description="Benchmark course learning outcomes against thousands of real-world job market requirements. Identifies obsolete topics, emerging skills, and provides turnkey lab modules."
      >
        {step === "results" && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep("input")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted text-sm font-medium text-foreground transition-all cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 text-primary" />
              <span>Audit Another Syllabus</span>
            </button>
            <ExportMenu title="Curriculum Industry Alignment Audit" data={data} />
          </div>
        )}
      </PageHeader>

      {/* INPUT FORM */}
      {step === "input" && (
        <div className="futuristic-card p-7 sm:p-8 space-y-6 max-w-4xl">
          <div className="space-y-1">
            <span className="swiss-header-tag text-primary">AUDIT CONFIGURATION</span>
            <h3 className="text-lg font-bold text-foreground">
              Configure Syllabus & Target Industry
            </h3>
            <p className="text-sm text-muted-foreground">
              Provide course parameters to calibrate the live vacancy web indexing corpus.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Course Title</label>
              <input
                defaultValue="CSE 4201: Cloud Computing Architecture"
                className="w-full text-sm rounded-xl border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Target Industry Sector / Role</label>
              <input
                defaultValue="Cloud-Native Infrastructure & Site Reliability Engineering"
                className="w-full text-sm rounded-xl border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-sm font-semibold text-foreground block">
              Upload Official Syllabus (PDF, DOCX)
            </label>
            <DocumentDropzone helperText="Upload syllabus detailing week-by-week lecture modules and lab assignments." />
          </div>

          <div className="flex justify-end pt-4 border-t border-border/60">
            <button
              onClick={handleLaunchAudit}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary via-indigo-600 to-cyan-500 text-white text-sm font-bold hover:brightness-110 transition-all shadow-md cursor-pointer"
            >
              <Workflow className="h-4 w-4" />
              <span>Run Alignment Audit</span>
            </button>
          </div>
        </div>
      )}

      {/* PROCESSING STATE */}
      {step === "processing" && (
        <div className="max-w-3xl mx-auto py-12">
          <ProcessingTimeline
            status="analyzing"
            currentStepMessage="Cross-referencing 24 syllabus outcomes against 3,840 verified cloud infrastructure job postings..."
            progressPercent={82}
          />
        </div>
      )}

      {/* RESULTS VIEW */}
      {step === "results" && (
        <div className="space-y-8">
          {/* Executive Alignment Score Card */}
          <div className="futuristic-card p-7 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-2">
              <span className="swiss-header-tag text-primary">SECTOR AUDIT</span>
              <h3 className="text-xl font-bold text-foreground">{data.courseTitle}</h3>
              <p className="text-sm text-muted-foreground">{data.targetIndustrySector}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1" title={data.methodologyDescription}>
                <Info className="h-4 w-4 text-primary shrink-0" />
                <span>Evidence retrieval: {data.retrievalDate} • Cross-referenced against 3,840 vacancies</span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="flex items-baseline justify-end gap-1">
                <span className="font-mono text-4xl sm:text-5xl font-bold text-primary">
                  {data.alignmentScorePercent}%
                </span>
              </div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                Composite Industry Match Index
              </p>
            </div>
          </div>

          {/* Radar Chart: Syllabus Depth vs Industry Need */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 futuristic-card p-7 sm:p-8 space-y-6">
              <div>
                <span className="swiss-header-tag text-primary">COMPETENCY OVERLAY</span>
                <h3 className="text-lg font-bold text-foreground mt-0.5">
                  Syllabus Coverage vs. Industry Demand
                </h3>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <PolarAngleAxis
                      dataKey="dimension"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 100]}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    />
                    <Radar
                      name="Syllabus Depth"
                      dataKey="Syllabus Depth"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.4}
                    />
                    <Radar
                      name="Industry Demand"
                      dataKey="Industry Demand"
                      stroke="#06b6d4"
                      fill="#06b6d4"
                      fillOpacity={0.4}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Current vs Missing Skills Matrix */}
            <div className="lg:col-span-6 futuristic-card p-7 sm:p-8 space-y-6">
              <div>
                <span className="swiss-header-tag text-primary">SKILLS TAXONOMY</span>
                <h3 className="text-lg font-bold text-foreground mt-0.5">
                  Technology Stack Classification
                </h3>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-72 pr-1">
                {data.skillsMatrix.map((item) => {
                  const isCurrent = item.status === "current";
                  const isMissing = item.status === "missing";

                  return (
                    <div
                      key={item.skillName}
                      className="p-4 rounded-xl border border-border bg-background flex items-center justify-between text-sm"
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <p className="text-sm font-bold text-foreground truncate">{item.skillName}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          Demand: {item.industryDemandIndex}/100 • Evidenced in {item.evidenceJobCount} postings
                        </p>
                      </div>

                      <span
                        className={cn(
                          "text-xs font-semibold px-2.5 py-1 rounded-md uppercase tracking-wider shrink-0",
                          isCurrent
                            ? "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30"
                            : isMissing
                            ? "bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/30"
                            : "bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30"
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
          <div className="futuristic-card p-7 sm:p-8 space-y-6">
            <div>
              <span className="swiss-header-tag text-primary">CURRICULUM ACTION ITEMS</span>
              <h3 className="text-lg font-bold text-foreground mt-0.5">
                Prioritized Micro-Updates for Next Semester Syllabus
              </h3>
            </div>

            <div className="space-y-4">
              {data.prioritizedMicroUpdates.map((update, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-xl border border-border bg-background space-y-2.5 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-primary">
                      {update.targetModule}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-semibold px-2.5 py-1 rounded uppercase tracking-wider",
                        update.priority === "high"
                          ? "bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/30"
                          : "bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30"
                      )}
                    >
                      {update.priority} Priority
                    </span>
                  </div>
                  <p className="font-semibold text-foreground text-base leading-snug">
                    {update.recommendation}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">
                    Rationale: {update.rationale}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Turnkey Plug-and-Play Labs */}
          <div className="futuristic-card p-7 sm:p-8 border-primary/40 bg-card space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <Terminal className="h-5 w-5" />
              </div>
              <div>
                <span className="swiss-header-tag text-primary">LABORATORY BLUEPRINTS</span>
                <h3 className="text-lg font-bold text-foreground">
                  Turnkey Plug-and-Play Laboratory Exercises
                </h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Directly replaces legacy lab assignments with modern cloud tooling.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
              {data.plugAndPlayLabs.map((lab, i) => (
                <div
                  key={i}
                  className="p-5 rounded-xl border border-primary/25 bg-background space-y-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-foreground text-base">{lab.title}</h4>
                    <span className="font-mono text-xs font-semibold text-primary bg-primary/15 border border-primary/30 px-2.5 py-1 rounded-md shrink-0">
                      {lab.estimatedHours} Hours
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">{lab.description}</p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {lab.modernTools.map((t) => (
                      <span
                        key={t}
                        className="text-xs font-mono px-2.5 py-1 rounded bg-muted/60 text-muted-foreground border border-border/50"
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
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Curricular Findings ({data.findings.length})
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
