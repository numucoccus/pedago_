"use client";

import React, { useState } from "react";
import {
  Radio,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  MessageSquare,
  User,
  Activity,
  Bot,
  ListOrdered,
  HelpCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentDropzone } from "@/components/forms/document-dropzone";
import { ProcessingTimeline } from "@/components/feedback/processing-timeline";
import { FindingCard } from "@/components/evidence/finding-card";
import { LimitationNotice } from "@/components/evidence/limitation-notice";
import { HumanReviewBanner } from "@/components/evidence/human-review-banner";
import { ExportMenu } from "@/components/artifacts/export-menu";
import { DEMO_TEACHING_PULSE_RESULT } from "@/lib/constants/demo-data";
import { cn } from "@/lib/utils";

export default function TeachingPulsePage() {
  const [step, setStep] = useState<"input" | "processing" | "results">("results");
  const [data, setData] = useState(DEMO_TEACHING_PULSE_RESULT);
  const [courseContext, setCourseContext] = useState("CSE 3101: Design & Analysis of Algorithms");
  const [teacherNotes, setTeacherNotes] = useState(
    "Students appeared hesitant during the in-class live coding checkpoint for the 1D Knapsack array."
  );

  const handleLaunchAnalysis = () => {
    setStep("processing");
    setTimeout(() => {
      setStep("results");
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        sectionNumber="02.1 // PULSEAI MICRO-FEEDBACK"
        title="PulseAI Micro-Feedback Analysis"
        description="Continuous formative classroom telemetry. Separates direct student quotes from inferred AI hypotheses, generates 3-bullet action plans, and builds diagnostic warm-up questions."
      >
        {step === "results" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep("input")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Input Another Session</span>
            </button>
            <ExportMenu title="PulseAI Teaching Micro-Feedback Report" data={data} />
          </div>
        )}
      </PageHeader>

      {/* INPUT FORM */}
      {step === "input" && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-5 shadow-xs max-w-4xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Ingest Classroom Session Feedback
          </h3>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Course & Module Context</label>
            <input
              value={courseContext}
              onChange={(e) => setCourseContext(e.target.value)}
              className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Teacher Observation / Audio Dictation</label>
            <textarea
              value={teacherNotes}
              onChange={(e) => setTeacherNotes(e.target.value)}
              rows={3}
              placeholder="Paste observation notes, audio transcriptions, or in-class poll summaries..."
              className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="pt-2">
            <label className="text-xs font-semibold text-foreground mb-2 block">
              Student Anonymous Exit Slips or In-Class Chat Logs (TXT, CSV)
            </label>
            <DocumentDropzone />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleLaunchAnalysis}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
            >
              <Radio className="h-4 w-4" />
              <span>Synthesize Feedback & Formulate Plan</span>
            </button>
          </div>
        </div>
      )}

      {/* PROCESSING STATE */}
      {step === "processing" && (
        <div className="max-w-3xl mx-auto py-8">
          <ProcessingTimeline
            status="analyzing"
            currentStepMessage="Clustering anonymous exit slips and isolating direct student feedback..."
            progressPercent={65}
          />
        </div>
      )}

      {/* RESULTS VIEW */}
      {step === "results" && (
        <div className="space-y-6">
          {/* Lecture Timeline Trajectory Chart */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span className="swiss-header-tag text-sky-600 dark:text-sky-400">SESSION TELEMETRY</span>
                <h3 className="text-base font-bold text-foreground mt-0.5">
                  Minute-by-Minute Confusion vs. Sentiment Trajectory
                </h3>
              </div>
              <span className="text-xs font-mono font-medium text-foreground bg-muted px-2.5 py-1 rounded-md">
                {data.courseName} • {data.sessionDate}
              </span>
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.timeline}>
                  <defs>
                    <linearGradient id="pulseConfusion" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="pulseSentiment" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="topic" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.5rem",
                      fontSize: "0.75rem",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="confusionRate"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#pulseConfusion)"
                    name="Confusion Rate (%)"
                  />
                  <Area
                    type="monotone"
                    dataKey="sentimentScore"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#pulseSentiment)"
                    name="Sentiment Score"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Three-Bullet Next-Class Action Plan */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 space-y-3 shadow-xs">
            <div className="flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-primary" />
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Three-Bullet Next-Class Action Plan
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Directly addresses the verified friction window before progressing into new syllabus concepts.
            </p>

            <ol className="space-y-2 pt-1">
              {data.actionPlan.map((action, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 text-xs sm:text-sm font-medium text-foreground bg-background/80 p-3 rounded-lg border border-primary/20 shadow-2xs"
                >
                  <span className="font-mono text-primary font-bold">{idx + 1}.</span>
                  <span className="leading-relaxed">{action}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Explicitly Labeled Topic Friction Cards */}
          <div className="space-y-4">
            <span className="swiss-header-tag text-primary">DISENTANGLED FRICTION ANALYSIS</span>
            <h3 className="text-base font-bold text-foreground">
              Traceable Topic Obstacles
            </h3>

            {data.frictions.map((fric) => (
              <div
                key={fric.id}
                className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm sm:text-base font-bold text-foreground">
                    Topic Friction: {fric.topic}
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    {fric.frictionLevel} Friction
                  </span>
                </div>

                {/* 4 Explicit Categories Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* Category 1: Direct Student Feedback */}
                  <div className="rounded-lg border border-border/80 bg-background/60 p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <MessageSquare className="h-3.5 w-3.5 text-sky-500" />
                      <span>Direct Student Feedback (Verbatim Excerpts)</span>
                    </div>
                    <ul className="space-y-1 text-xs text-muted-foreground italic leading-relaxed">
                      {fric.studentFeedbackDirect.map((quote, i) => (
                        <li key={i}>“{quote}”</li>
                      ))}
                    </ul>
                  </div>

                  {/* Category 2: Teacher Observation */}
                  <div className="rounded-lg border border-border/80 bg-background/60 p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <User className="h-3.5 w-3.5 text-amber-500" />
                      <span>Teacher Observation</span>
                    </div>
                    <ul className="space-y-1 text-xs text-muted-foreground leading-relaxed">
                      {fric.teacherObservations.map((obs, i) => (
                        <li key={i}>{obs}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Category 3: Data-Derived Pattern */}
                  <div className="rounded-lg border border-border/80 bg-background/60 p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Activity className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Data-Derived Pattern</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {fric.dataDerivedPattern}
                    </p>
                  </div>

                  {/* Category 4: AI Hypothesis */}
                  <div className="rounded-lg border border-border/80 bg-background/60 p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Bot className="h-3.5 w-3.5 text-purple-500" />
                      <span>AI-Generated Hypothesis</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {fric.aiHypothesis}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Editable Warm-Up Diagnostic Questions */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Targeted Warm-Up Questions for Next Session Checkpoint
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Export or project these questions to directly test the identified loop dependency invariant.
            </p>

            <div className="space-y-3 pt-1">
              {data.warmUpQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="rounded-lg border border-border/80 bg-background/60 p-4 space-y-2"
                >
                  <p className="text-xs font-bold text-foreground">
                    Q{idx + 1}: {q.question}
                  </p>

                  {q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                      {q.options.map((opt) => {
                        const isCorrect = opt.startsWith(q.correctAnswer || "XYZ");
                        return (
                          <div
                            key={opt}
                            className={cn(
                              "p-2 rounded-md border",
                              isCorrect
                                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 font-semibold"
                                : "border-border/60 bg-muted/20 text-muted-foreground"
                            )}
                          >
                            {opt}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-[0.6875rem] text-muted-foreground pt-1 italic">
                    <strong>Explanation:</strong> {q.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Findings */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Formative Findings ({data.findings.length})
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
