import { defaultPortfolioWeights, portfolioWeightsSchema, type PortfolioWeights, type VerificationStatus } from "@pedago/shared";
import type { AchievementRow, StudentActivityMetricRow, StudentRow } from "@pedago/shared/database";
import { round } from "../../utils/text.js";

export const PORTFOLIO_SCORE_VERSION = "portfolio-score.v1";

export type PortfolioDimension = keyof PortfolioWeights;

export interface DimensionBreakdown {
  dimension: PortfolioDimension;
  weight: number;
  rawScore: number;
  weightedScore: number;
  contributingAchievementIds: string[];
  explanation: string;
}

export interface PortfolioScore {
  version: string;
  weights: PortfolioWeights;
  totalScore: number;
  breakdown: DimensionBreakdown[];
  verificationSummary: Record<VerificationStatus, number>;
}

/** Verification affects credit: unverified/extracted items count for less than verified ones. */
export const VERIFICATION_CREDIT: Record<VerificationStatus, number> = {
  issuer_verified: 1,
  faculty_verified: 1,
  student_submitted: 0.7,
  extracted: 0.6,
  unverified: 0.4,
};

const LEVEL_CREDIT: Record<string, number> = { international: 1, national: 0.85, regional: 0.7, institutional: 0.55, unspecified: 0.5 };

const CATEGORY_TO_DIMENSION: Record<string, PortfolioDimension> = {
  academic: "academic",
  technical: "technical",
  leadership: "leadership",
  service: "service",
  sports_cultural: "sportsCultural",
  sportsCultural: "sportsCultural",
};

export function resolveWeights(candidate: unknown): PortfolioWeights {
  return portfolioWeightsSchema.parse(candidate ?? defaultPortfolioWeights);
}

/**
 * Deterministic merit score on a 0–100 scale. Each dimension raw score is 0–1:
 *  - academic: 60% CGPA (normalised to 4.0 or 10.0 scale) + 40% academic achievements saturation
 *  - other categories: saturating sum of level × verification credits (3 strong items ≈ 1.0)
 *  - consistency: share of the last 6 half-year periods with at least one dated achievement/activity
 */
export function computePortfolioScore(student: StudentRow, achievements: AchievementRow[], metrics: StudentActivityMetricRow[], weights: PortfolioWeights, now = new Date()): PortfolioScore {
  const byDimension = new Map<PortfolioDimension, AchievementRow[]>();
  for (const achievement of achievements) {
    const dimension = CATEGORY_TO_DIMENSION[achievement.category];
    if (!dimension) continue;
    byDimension.set(dimension, [...(byDimension.get(dimension) ?? []), achievement]);
  }
  const credit = (achievement: AchievementRow): number => (LEVEL_CREDIT[achievement.level ?? "unspecified"] ?? 0.5) * (VERIFICATION_CREDIT[achievement.verification_status] ?? 0.4);
  const saturate = (items: AchievementRow[]): number => Math.min(1, items.reduce((sum, item) => sum + credit(item), 0) / 2.4);

  const breakdown: DimensionBreakdown[] = [];
  for (const dimension of Object.keys(weights) as PortfolioDimension[]) {
    const items = byDimension.get(dimension) ?? [];
    let rawScore: number;
    let explanation: string;
    if (dimension === "academic") {
      const cgpaScale = student.cgpa !== null && student.cgpa > 4.0 ? 10 : 4;
      const cgpaScore = student.cgpa !== null ? Math.min(1, student.cgpa / cgpaScale) : 0;
      const achievementScore = saturate(items);
      rawScore = student.cgpa !== null ? 0.6 * cgpaScore + 0.4 * achievementScore : achievementScore;
      explanation = student.cgpa !== null ? `CGPA ${student.cgpa}/${cgpaScale} (${round(cgpaScore * 100)}%) weighted 60%, ${items.length} academic achievements weighted 40%.` : `No CGPA on record; ${items.length} academic achievements only.`;
    } else if (dimension === "consistency") {
      const periods = 6;
      const active = new Set<number>();
      const dates = [...achievements.map((item) => item.achievement_date), ...metrics.map((metric) => metric.period_start)].filter((date): date is string => Boolean(date));
      for (const date of dates) {
        const months = (now.getUTCFullYear() - new Date(date).getUTCFullYear()) * 12 + (now.getUTCMonth() - new Date(date).getUTCMonth());
        const period = Math.floor(months / 6);
        if (period >= 0 && period < periods) active.add(period);
      }
      rawScore = active.size / periods;
      explanation = `${active.size} of the last ${periods} half-year periods show dated activity.`;
    } else {
      rawScore = saturate(items);
      explanation = `${items.length} achievements (verification-weighted credit ${round(items.reduce((sum, item) => sum + credit(item), 0), 2)} of 2.4 for full marks).`;
    }
    breakdown.push({ dimension, weight: weights[dimension], rawScore: round(rawScore, 4), weightedScore: round(weights[dimension] * rawScore, 3), contributingAchievementIds: items.map((item) => item.id), explanation });
  }
  const verificationSummary: Record<VerificationStatus, number> = { extracted: 0, student_submitted: 0, issuer_verified: 0, faculty_verified: 0, unverified: 0 };
  for (const achievement of achievements) verificationSummary[achievement.verification_status] += 1;
  return { version: PORTFOLIO_SCORE_VERSION, weights, totalScore: round(breakdown.reduce((sum, item) => sum + item.weightedScore, 0), 2), breakdown, verificationSummary };
}

export interface WorkloadSignal {
  signalType: string;
  severity: "low" | "medium" | "high";
  description: string;
  evidence: Record<string, unknown>;
}

/** Non-diagnostic workload observations for human review; never medical or psychological claims. */
export function detectWorkloadSignals(achievements: AchievementRow[], metrics: StudentActivityMetricRow[], now = new Date()): WorkloadSignal[] {
  const signals: WorkloadSignal[] = [];
  const recentCutoff = new Date(now.getTime());
  recentCutoff.setUTCMonth(recentCutoff.getUTCMonth() - 6);
  const recent = achievements.filter((item) => item.achievement_date && new Date(item.achievement_date) >= recentCutoff);
  if (recent.length >= 6) {
    signals.push({ signalType: "high_activity_density", severity: recent.length >= 10 ? "medium" : "low", description: `${recent.length} recorded activities in the last six months. This is an observation about recorded workload, not a judgement about wellbeing; a faculty conversation may be appropriate.`, evidence: { recentCount: recent.length, achievementIds: recent.map((item) => item.id) } });
  }
  const declining = metrics.filter((metric) => metric.metric === "attendance_rate" || metric.metric === "assignment_completion_rate").sort((a, b) => (a.period_start < b.period_start ? -1 : 1));
  if (declining.length >= 2) {
    const first = declining[0]!;
    const last = declining[declining.length - 1]!;
    if (last.value < first.value - 0.15) {
      signals.push({ signalType: "declining_engagement_metric", severity: last.value < first.value - 0.3 ? "medium" : "low", description: `${last.metric} moved from ${round(first.value * 100)}% to ${round(last.value * 100)}% across recorded periods. Review context with the student before drawing conclusions.`, evidence: { metric: last.metric, from: first.value, to: last.value, periods: declining.length } });
    }
  }
  return signals;
}
