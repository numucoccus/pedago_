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
    <div className="space-y-6">
      <PageHeader
        sectionNumber="03.1 // MISCONCEPTION DIAGNOSTICS"
        title="Post-Exam Misconception Diagnostics"
        description="Pinpoint systemic conceptual failure modes from itemized score sheets. Generates visual question heatmaps and 15-minute high-yield remedial lesson designs."
      >
        {step === "results" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep("input")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Analyze Another Exam</span>
            </button>
            <ExportMenu title="Exam Misconception Remedial Dossier" data={data} />
          </div>
        )}
      </PageHeader>

      {/* STEP 1: INPUT */}
      {step === "input" && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-5 shadow-xs max-w-4xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Upload Exam Question Paper & Itemized Student Responses
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Exam Title</label>
              <input
                defaultValue="CSE 2201: Midterm Examination"
                className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Course Syllabus Module</label>
              <input
                defaultValue="Data Structures (Binary & Balanced Search Trees)"
                className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="text-xs font-semibold text-foreground block">
              1. Question Paper & Answer Rubric (PDF)
            </label>
            <DocumentDropzone helperText="Upload official exam paper and scoring guide." />

            <label className="text-xs font-semibold text-foreground block pt-2">
              2. Student Itemized Marks & Distractor Frequency (CSV / XLSX)
            </label>
            <DocumentDropzone helperText="Upload student marks itemized by question (Q1, Q2, etc.). Names will be redacted." />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleLaunchAnalysis}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
            >
              <FileCheck2 className="h-4 w-4" />
              <span>Compute Misconception Diagnostics</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PROCESSING */}
      {step === "processing" && (
        <div className="max-w-3xl mx-auto py-8">
          <ProcessingTimeline
            status="analyzing"
            currentStepMessage="Correlating 142 student itemized answer patterns against rubric tree invariants..."
            progressPercent={78}
          />
        </div>
      )}

      {/* STEP 3: RESULTS */}
      {step === "results" && (
        <div className="space-y-6">
          {/* Executive Overview Banner */}
          <div className="rounded-xl border border-border bg-card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
            <div>
              <span className="swiss-header-tag text-primary">COHORT OVERVIEW</span>
              <h3 className="text-base font-bold text-foreground mt-0.5">{data.examTitle}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Evaluated across {data.totalStudents} student submissions.
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="font-mono text-2xl font-bold text-foreground">
                  {data.overallAverage}%
                </span>
                <p className="text-[0.625rem] uppercase tracking-wider text-muted-foreground">
                  Mean Exam Score
                </p>
              </div>

              <div className="text-right">
                <span className="font-mono text-2xl font-bold text-rose-600 dark:text-rose-400">
                  Q3
                </span>
                <p className="text-[0.625rem] uppercase tracking-wider text-muted-foreground">
                  Severe Friction Point
                </p>
              </div>
            </div>
          </div>

          {/* Question-Level Heatmap Bar */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="swiss-header-tag text-primary">QUESTION-LEVEL ERROR HEATMAP</span>
                <h3 className="text-base font-bold text-foreground mt-0.5">
                  Click a Question to Inspect Root-Cause Diagnostic
                </h3>
              </div>
              <span className="text-xs text-muted-foreground">Threshold: &lt; 60% requires remediation</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {data.questionDiagnostics.map((q) => {
                const isSelected = q.questionNumber === selectedQuestion;
                const isCritical = q.averageScorePercent < 50;
                const isWarning = q.averageScorePercent >= 50 && q.averageScorePercent < 70;

                return (
                  <button
                    key={q.questionNumber}
                    onClick={() => setSelectedQuestion(q.questionNumber)}
                    className={cn(
                      "p-3.5 rounded-xl border text-left space-y-1.5 transition-all cursor-pointer",
                      isSelected ? "ring-2 ring-primary border-transparent" : "border-border",
                      isCritical
                        ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                        : isWarning
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{q.questionNumber}</span>
                      <span className="font-mono text-xs font-bold">{q.averageScorePercent}%</span>
                    </div>
                    <p className="text-[0.6875rem] font-medium truncate text-foreground">{q.topic}</p>
                    <div className="h-1 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
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
          <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div>
                <span className="swiss-header-tag text-rose-600 dark:text-rose-400">
                  DIAGNOSTIC DEEP DIVE: {activeQuestion.questionNumber}
                </span>
                <h3 className="text-base font-bold text-foreground mt-0.5">
                  Topic: {activeQuestion.topic}
                </h3>
              </div>
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                Avg Score: {activeQuestion.averageScorePercent}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-lg border border-border/80 bg-background/60 space-y-1">
                <span className="font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider text-[0.6875rem]">
                  Primary Misconception
                </span>
                <p className="text-foreground font-medium">{activeQuestion.primaryMisconception}</p>
                <p className="text-muted-foreground pt-1 leading-relaxed">
                  {activeQuestion.commonDistractorOrError}
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-border/80 bg-background/60 space-y-1">
                <span className="font-semibold text-primary uppercase tracking-wider text-[0.6875rem]">
                  Root-Cause Mechanism
                </span>
                <p className="text-foreground font-medium">{activeQuestion.rootCause}</p>
                <p className="text-muted-foreground pt-1 leading-relaxed">
                  Remedial strategy: {activeQuestion.remedialConcept}
                </p>
              </div>
            </div>
          </div>

          {/* 15-Minute Remedial Lesson Plan */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">
                  15-Minute In-Class Remedial Lesson: {data.remedialLessonPlan.title}
                </h3>
              </div>
              <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                15 Minutes Fixed
              </span>
            </div>

            <ol className="space-y-2 pt-1">
              {data.remedialLessonPlan.steps.map((stepText, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg border border-primary/20 bg-background/80 text-xs text-foreground font-medium"
                >
                  <span className="font-mono text-primary font-bold">{idx + 1}.</span>
                  <span className="leading-relaxed">{stepText}</span>
                </li>
              ))}
            </ol>

            {/* Alternative Analogy */}
            <div className="mt-4 p-4 rounded-lg border border-border bg-background space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span>Recommended Alternative Analogy for Live Delivery:</span>
              </div>
              <p className="text-muted-foreground italic leading-relaxed pt-1">
                {data.remedialLessonPlan.alternativeAnalogy}
              </p>
            </div>
          </div>

          {/* Follow-Up Diagnostic Questions */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
            <span className="swiss-header-tag text-emerald-600 dark:text-emerald-400">
              REMEDIATION VERIFICATION
            </span>
            <h3 className="text-base font-bold text-foreground">
              Follow-Up Diagnostic Drill Questions
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {data.followUpDiagnosticQuestions.map((diag, i) => (
                <div
                  key={diag.id}
                  className="p-4 rounded-lg border border-border/80 bg-background/60 space-y-2 text-xs"
                >
                  <p className="font-bold text-foreground">Drill {i + 1}: {diag.question}</p>
                  <span className="text-[0.6875rem] font-medium text-primary block">
                    Target: {diag.focusMisconception}
                  </span>
                  <p className="text-[0.6875rem] text-muted-foreground italic">
                    Rationale: {diag.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Findings */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Diagnostic Verification Findings ({data.findings.length})
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
