"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  FileText,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DEMO_STUDENT_PORTFOLIO } from "@/lib/constants/demo-data";

export default function StudentsDirectoryPage() {
  const students = [DEMO_STUDENT_PORTFOLIO];

  return (
    <div className="space-y-6">
      <PageHeader
        sectionNumber="04 // STUDENT INTELLIGENCE"
        title="Student Portfolios & LOR Dossier Copilot"
        description="Extract co-curricular evidence, evaluate holistic student trajectories with configurable merit scoring, track workload stress, and generate verifiable recommendation letters."
      >
        <Link
          href="/students/lor"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs"
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Draft LOR Dossier</span>
        </Link>
      </PageHeader>

      {/* Directory Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="p-5 border-b border-border/80 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Enrolled & Advised Students
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Holistic portfolios with verifiable co-curricular evidence badges.
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-muted-foreground">
            {students.length} STUDENT RECORD
          </span>
        </div>

        <div className="divide-y divide-border/60">
          {students.map((std) => (
            <div
              key={std.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm border border-primary/20">
                  {std.studentName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-foreground">{std.studentName}</h4>
                    <span className="text-xs font-mono text-muted-foreground">
                      ({std.studentIdNumber})
                    </span>
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {std.reviewStatus}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {std.department} • Cumulative GPA: <strong className="text-foreground">{std.gpa}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={`/students/portfolios/${std.id}`}
                  className="px-3.5 py-2 rounded-xl border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <span>View 360° Portfolio</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/students/lor"
                  className="px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-sm font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span>Generate LOR</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
