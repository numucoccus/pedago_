"use client";

import React, { useState } from "react";
import {
  FileCheck2,
  GitFork,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  BookOpen,
  Clock,
  Layers,
  Lightbulb,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentDropzone } from "@/components/forms/document-dropzone";
import { ProcessingTimeline } from "@/components/feedback/processing-timeline";
import { FindingCard } from "@/components/evidence/finding-card";
import { LimitationNotice } from "@/components/evidence/limitation-notice";
import { HumanReviewBanner } from "@/components/evidence/human-review-banner";
import { ExportMenu } from "@/components/artifacts/export-menu";
import { DEMO_EXAM_MISCONCEPTION_RESULT } from "@/lib/constants/demo-data";
import { cn } from "@/lib/utils";

export default function MisconceptionDiagnosticsPage() {
  const [step, setStep] = useState<"input" | "processing" | "results">("results");
  const [data, setData] = useState(DEMO_EXAM_MISCONCEPTION_RESULT);
  const [selectedQuestion, setSelectedQuestion] = useState<string>("Q3");

  const activeQuestion =
    data.questionDiagnostics.find((q) => q.questionNumber === selectedQuestion) ||
    data.questionDiagnostics[2];

  const handleLaunchAnalysis = () => {
    setStep("processing");
    setTimeout(() => {
      setStep("results");
    }, 1600);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        sectionNumber="03.1 // MISCONCEPTION DIAGNOSTICS"
        title="Post-Exam Misconception Diagnostics"
        description="Pinpoint systemic conceptual failure modes from itemized score sheets. Generates visual question heatmaps and 15-minute high-yield remedial lesson designs."
      >
        {step === "results" && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep("input")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted text-sm font-medium text-foreground transition-all cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 text-primary" />
              <span>Analyze Another Exam</span>
            </button>
            <ExportMenu title="Exam Misconception Remedial Dossier" data={data} />
          </div>
        )}
      </PageHeader>

      {/* STEP 1: INPUT */}
      {step === "input" && (
        <div className="futuristic-card p-7 sm:p-8 space-y-6 max-w-4xl">
          <div className="space-y-1">
            <span className="swiss-header-tag text-primary">EXAM INGESTION</span>
            <h3 className="text-lg font-bold text-foreground">
              Upload Exam Question Paper & Itemized Student Responses
            </h3>
            <p className="text-sm text-muted-foreground">
              Provide the official rubric and student score matrix to trigger automated root-cause clustering.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Exam Title</label>
              <input
                defaultValue="CSE 2201: Midterm Examination"
                className="w-full text-sm rounded-xl border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Course Syllabus Module</label>
              <input
                defaultValue="Data Structures (Binary & Balanced Search Trees)"
                className="w-full text-sm rounded-xl border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              />
            </div>
          </div>

          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground block">
                1. Question Paper & Answer Rubric (PDF)
              </label>
              <DocumentDropzone helperText="Upload official exam paper and scoring guide." />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground block">
                2. Student Itemized Marks & Distractor Frequency (CSV / XLSX)
              </label>
              <DocumentDropzone helperText="Upload student marks itemized by question (Q1, Q2, etc.). Names will be redacted." />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border/60">
            <button
              onClick={handleLaunchAnalysis}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary via-indigo-600 to-cyan-500 text-white text-sm font-bold hover:brightness-110 transition-all shadow-md cursor-pointer"
            >
              <FileCheck2 className="h-4 w-4" />
              <span>Compute Misconception Diagnostics</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PROCESSING */}
      {step === "processing" && (
        <div className="max-w-3xl mx-auto py-12">
          <ProcessingTimeline
            status="analyzing"
            currentStepMessage="Correlating 142 student itemized answer patterns against rubric tree invariants..."
            progressPercent={78}
          />
        </div>
      )}

      {/* STEP 3: RESULTS */}
      {step === "results" && (
        <div className="space-y-8">
          {/* Executive Overview Banner */}
          <div className="futuristic-card p-7 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-2">
              <span className="swiss-header-tag text-primary">COHORT OVERVIEW</span>
              <h3 className="text-xl font-bold text-foreground">{data.examTitle}</h3>
              <p className="text-sm text-muted-foreground">
                Evaluated across <span className="font-mono text-foreground font-semibold">{data.totalStudents}</span> verified student submissions.
              </p>
            </div>

            <div className="flex items-center gap-8">
              <div className="text-right">
                <span className="font-mono text-3xl font-bold text-foreground">
                  {data.overallAverage}%
                </span>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mt-0.5">
                  Mean Exam Score
                </p>
              </div>

              <div className="h-10 w-px bg-border/80" />

              <div className="text-right">
                <span className="font-mono text-3xl font-bold text-rose-500 dark:text-rose-400">
                  Q3
                </span>
                <p className="text-xs uppercase tracking-wider text-rose-500/90 mt-0.5">
                  Severe Friction Point
                </p>
              </div>
            </div>
          </div>

          {/* Question-Level Heatmap Bar */}
          <div className="futuristic-card p-7 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span className="swiss-header-tag text-primary">QUESTION-LEVEL ERROR HEATMAP</span>
                <h3 className="text-lg font-bold text-foreground mt-0.5">
                  Click a Question to Inspect Root-Cause Diagnostic
                </h3>
              </div>
              <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-lg border border-border">
                Threshold: &lt; 60% requires remediation
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
              {data.questionDiagnostics.map((q) => {
                const isSelected = q.questionNumber === selectedQuestion;
                const isCritical = q.averageScorePercent < 50;
                const isWarning = q.averageScorePercent >= 50 && q.averageScorePercent < 70;

                return (
                  <button
                    key={q.questionNumber}
                    onClick={() => setSelectedQuestion(q.questionNumber)}
                    className={cn(
                      "p-4 rounded-xl border text-left space-y-2.5 transition-all cursor-pointer relative overflow-hidden",
                      isSelected
                        ? "ring-2 ring-primary border-primary/50 bg-primary/10 shadow-md"
                        : "border-border bg-background hover:border-primary/40",
                      isCritical && !isSelected && "hover:border-rose-500/50",
                      isWarning && !isSelected && "hover:border-amber-500/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground tracking-wide">{q.questionNumber}</span>
                      <span
                        className={cn(
                          "font-mono text-xs font-semibold px-2 py-0.5 rounded",
                          isCritical
                            ? "bg-rose-500/15 text-rose-500 dark:text-rose-400"
                            : isWarning
                            ? "bg-amber-500/15 text-amber-500 dark:text-amber-400"
                            : "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400"
                        )}
                      >
                        {q.averageScorePercent}%
                      </span>
                    </div>
                    <p className="text-xs font-medium truncate text-foreground">{q.topic}</p>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          isCritical ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${q.averageScorePercent}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Question Diagnostic Card */}
          <div className="futuristic-card p-7 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
              <div>
                <span className="swiss-header-tag text-rose-500 dark:text-rose-400">
                  DIAGNOSTIC DEEP DIVE: {activeQuestion.questionNumber}
                </span>
                <h3 className="text-xl font-bold text-foreground mt-0.5">
                  Topic: {activeQuestion.topic}
                </h3>
              </div>
              <span className="font-mono text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/30">
                Avg Score: {activeQuestion.averageScorePercent}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div className="p-5 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-2">
                <span className="font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider text-xs block">
                  Primary Misconception
                </span>
                <p className="text-foreground font-semibold text-base">{activeQuestion.primaryMisconception}</p>
                <p className="text-muted-foreground pt-1 leading-relaxed text-sm">
                  {activeQuestion.commonDistractorOrError}
                </p>
              </div>

              <div className="p-5 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
                <span className="font-bold text-primary uppercase tracking-wider text-xs block">
                  Root-Cause Mechanism
                </span>
                <p className="text-foreground font-semibold text-base">{activeQuestion.rootCause}</p>
                <p className="text-muted-foreground pt-1 leading-relaxed text-sm">
                  Remedial strategy: {activeQuestion.remedialConcept}
                </p>
              </div>
            </div>
          </div>

          {/* 15-Minute Remedial Lesson Plan */}
          <div className="futuristic-card p-7 sm:p-8 border-primary/40 bg-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <span className="swiss-header-tag text-primary">INTERVENTION PROTOCOL</span>
                  <h3 className="text-xl font-bold text-foreground">
                    15-Minute Remedial Lesson: {data.remedialLessonPlan.title}
                  </h3>
                </div>
              </div>
              <span className="font-mono text-xs font-semibold text-primary bg-primary/15 border border-primary/30 px-3 py-1.5 rounded-lg">
                15 Minutes Fixed
              </span>
            </div>

            <ol className="space-y-3 pt-1">
              {data.remedialLessonPlan.steps.map((stepText, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 p-4 rounded-xl border border-primary/20 bg-background text-sm text-foreground font-medium"
                >
                  <span className="font-mono text-primary font-bold text-base">{idx + 1}.</span>
                  <span className="leading-relaxed">{stepText}</span>
                </li>
              ))}
            </ol>

            {/* Alternative Analogy */}
            <div className="p-5 rounded-xl border border-border bg-background space-y-2.5 text-sm">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Lightbulb className="h-4 w-4 text-amber-400" />
                <span>Recommended Alternative Analogy for Live Delivery:</span>
              </div>
              <p className="text-muted-foreground italic leading-relaxed pt-1 text-sm">
                {data.remedialLessonPlan.alternativeAnalogy}
              </p>
            </div>
          </div>

          {/* Follow-Up Diagnostic Questions */}
          <div className="futuristic-card p-7 sm:p-8 space-y-6">
            <div>
              <span className="swiss-header-tag text-emerald-500 dark:text-emerald-400">
                REMEDIATION VERIFICATION
              </span>
              <h3 className="text-lg font-bold text-foreground mt-0.5">
                Follow-Up Diagnostic Drill Questions
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
              {data.followUpDiagnosticQuestions.map((diag, i) => (
                <div
                  key={diag.id}
                  className="p-5 rounded-xl border border-border bg-background space-y-3 text-sm"
                >
                  <p className="font-bold text-foreground text-base leading-snug">Drill {i + 1}: {diag.question}</p>
                  <span className="text-xs font-semibold text-primary block">
                    Target: {diag.focusMisconception}
                  </span>
                  <p className="text-sm text-muted-foreground italic leading-relaxed">
                    Rationale: {diag.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Findings */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Diagnostic Verification Findings ({data.findings.length})
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
