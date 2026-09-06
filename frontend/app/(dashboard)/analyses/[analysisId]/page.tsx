"use client";

import React, { use } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Sparkles, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ProcessingTimeline } from "@/components/feedback/processing-timeline";
import { FindingCard } from "@/components/evidence/finding-card";
import { LimitationNotice } from "@/components/evidence/limitation-notice";
import { HumanReviewBanner } from "@/components/evidence/human-review-banner";
import { ExportMenu } from "@/components/artifacts/export-menu";
import { SkeletonState } from "@/components/feedback/skeleton-state";
import { ErrorState } from "@/components/feedback/error-state";
import { useAnalysis, useApproveAnalysis } from "@/lib/api/endpoints";
import { formatDate } from "@/lib/utils";

export default function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ analysisId: string }>;
}) {
  const resolvedParams = use(params);
  const { data: analysis, isLoading, isError } = useAnalysis(resolvedParams.analysisId);
  const approveMutation = useApproveAnalysis();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonState rows={6} />
      </div>
    );
  }

  if (isError || !analysis) {
    return (
      <div className="space-y-6">
        <ErrorState
          title="Analysis Not Found"
          message={`Unable to retrieve analysis ID "${resolvedParams.analysisId}". It may have been archived or belongs to another workspace.`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Return to Dashboard</span>
      </Link>

      <PageHeader
        sectionNumber="AUDIT RECORD"
        title={analysis.title}
        description={`Analysis type: ${analysis.type.replace(/_/g, " ").toUpperCase()} • Created on ${formatDate(
          analysis.createdAt
        )}`}
      >
        <ExportMenu title={analysis.title} data={analysis} />
      </PageHeader>

      {/* Processing Status */}
      <ProcessingTimeline
        status={analysis.status}
        progressPercent={analysis.progressPercent}
        currentStepMessage={analysis.currentStep}
      />

      {/* Findings */}
      {analysis.findings && analysis.findings.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Audited Findings ({analysis.findings.length})
          </h3>
          {analysis.findings.map((f) => (
            <FindingCard key={f.id} finding={f} />
          ))}
        </div>
      )}

      {/* Limitations */}
      {analysis.limitations && analysis.limitations.length > 0 && (
        <LimitationNotice limitations={analysis.limitations} />
      )}

      {/* Human Review Banner */}
      <HumanReviewBanner
        isApproved={analysis.humanReviewApproved}
        onApprove={(notes) =>
          approveMutation.mutate({
            analysisId: analysis.id,
            notes,
          })
        }
      />
    </div>
  );
}
