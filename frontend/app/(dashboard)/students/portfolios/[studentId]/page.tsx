"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Award,
  Clock,
  ArrowRight,
  FileText,
  AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { FindingCard } from "@/components/evidence/finding-card";
import { LimitationNotice } from "@/components/evidence/limitation-notice";
import { HumanReviewBanner } from "@/components/evidence/human-review-banner";
import { ExportMenu } from "@/components/artifacts/export-menu";
import { DEMO_STUDENT_PORTFOLIO } from "@/lib/constants/demo-data";
import { cn } from "@/lib/utils";

export default function StudentPortfolioPage() {
  const student = DEMO_STUDENT_PORTFOLIO;

  const radarData = Object.entries(student.radarScores).map(([key, val]) => ({
    subject: key,
    score: val,
    fullMark: 100,
  }));

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case "faculty_verified":
        return {
          label: "Faculty Verified",
          className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        };
      case "issuer_verified":
        return {
          label: "Issuer Verified (Registrar)",
          className: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
        };
      case "extracted":
        return {
          label: "Extracted from Transcript",
          className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
        };
      case "student_submitted":
        return {
          label: "Student Submitted (Pending Audit)",
          className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        };
      default:
        return {
          label: "Unverified",
          className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
        };
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        sectionNumber="04.1 // STUDENT PORTFOLIO"
        title={`Holistic Dossier: ${student.studentName}`}
        description={`${student.department} • Student ID: ${student.studentIdNumber} • Cumulative GPA: ${student.gpa}`}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/students/lor"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary via-indigo-600 to-cyan-500 text-white text-xs font-bold hover:brightness-110 transition-all shadow-md glow-primary cursor-pointer"
          >
            <FileText className="h-4 w-4" />
            <span>Generate LOR</span>
          </Link>
          <ExportMenu title={`Portfolio_${student.studentName}`} data={student} />
        </div>
      </PageHeader>

      {/* 360 Radar & Workload Risk Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar Chart */}
        <div className="lg:col-span-6 futuristic-card p-7 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-border/80 pb-4">
            <div>
              <span className="swiss-header-tag text-primary">360° COMPETENCY RADAR</span>
              <h3 className="text-base font-bold text-foreground mt-0.5">
                Multi-Dimensional Faculty Merit Profile
              </h3>
            </div>
            <span className="text-xs font-mono text-muted-foreground bg-muted/40 px-3 py-1 rounded-lg border border-border/60">
              Percentile Basis
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "currentColor" }} />
                <PolarRadiusAxis domain={[0, 100]} stroke="#888888" fontSize={10} />
                <Radar
                  name="Student Metric"
                  dataKey="score"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workload Risk Signals (Neutral Observation Language) */}
        <div className="lg:col-span-6 futuristic-card p-7 sm:p-8 space-y-6 flex flex-col justify-between">
          <div className="space-y-2 border-b border-border/80 pb-4">
            <div className="flex items-center gap-2">
              <span className="swiss-header-tag text-amber-500 dark:text-amber-400">
                WORKLOAD INTENSITY SIGNALS
              </span>
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              Objective Academic Commitments Telemetry
            </h3>
            <p className="text-xs text-muted-foreground">
              Formulated in neutral, non-evaluative language to support faculty advising.
            </p>
          </div>

          <div className="space-y-3.5 pt-1">
            {student.workloadSignals.map((ws, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-border bg-background space-y-2 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">{ws.signal}</span>
                  <span className="text-xs uppercase font-mono font-semibold px-2.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/50">
                    {ws.category.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {ws.neutralObservation}
                </p>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 text-xs text-muted-foreground">
            Academic records verified against department registrar portal. Last updated Spring 2025.
          </div>
        </div>
      </div>

      {/* Categorized Verified / Unverified Achievements */}
      <div className="futuristic-card p-7 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div>
            <span className="swiss-header-tag text-primary">CO-CURRICULAR EVIDENCE LEDGER</span>
            <h3 className="text-xl font-bold text-foreground mt-0.5">
              Verified & Student-Submitted Achievements
            </h3>
          </div>
          <span className="text-xs font-mono font-semibold text-muted-foreground bg-muted/40 px-3 py-1 rounded-lg border border-border/60">
            {student.achievements.length} AUDITED ENTRIES
          </span>
        </div>

        <div className="space-y-4">
          {student.achievements.map((ach) => {
            const badge = getVerificationBadge(ach.verificationStatus);

            return (
              <div
                key={ach.id}
                className="p-5 rounded-xl border border-border bg-background space-y-3 text-sm hover:border-primary/40 transition-colors shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <Award className="h-4.5 w-4.5 text-primary shrink-0" />
                      <h4 className="font-bold text-foreground text-base">
                        {ach.title}
                      </h4>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono block">
                      Category: {ach.category.toUpperCase()} • Recorded: {ach.date}
                    </span>
                  </div>

                  <span
                    className={cn(
                      "text-xs font-bold px-3 py-1 rounded-lg border tracking-tight shrink-0",
                      badge.className
                    )}
                  >
                    {badge.label}
                  </span>
                </div>

                <p className="text-muted-foreground leading-relaxed pt-1">
                  {ach.description}
                </p>

                {ach.evidenceLocator && (
                  <div className="text-xs text-primary bg-primary/10 p-2.5 rounded-lg border border-primary/20 font-mono font-semibold">
                    Audit Locator: {ach.evidenceLocator}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Findings */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Advisory Findings ({student.findings.length})
        </h3>
        <div className="space-y-4">
          {student.findings.map((f) => (
            <FindingCard key={f.id} finding={f} />
          ))}
        </div>
      </div>

      <LimitationNotice limitations={student.limitations} />
      <HumanReviewBanner />
    </div>
  );
}
