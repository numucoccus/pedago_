import { teachingPulseInputSchema, type InsightSourceKind, type TeachingPulseInput } from "@pedago/shared";
import { z } from "zod";
import { teachingPulsePrompt } from "../../prompts/index.js";
import { redactIdentifiers } from "../../utils/redaction.js";
import { keywordOverlap, round, truncate } from "../../utils/text.js";
import { aiFindingsBlock, measuredFinding, metricEvidence, toFindingDraft } from "../analysis/ai-schemas.js";
import { collectDocumentEvidence, runPrompt } from "../analysis/handler-utils.js";
import type { AnalysisContext, AnalysisHandler, CollectedContext, EvidenceCandidate, HandlerResult, PersistContext } from "../analysis/types.js";
import { evidenceKey, overallConfidence } from "../analysis/types.js";

const outputSchema = z.object({
  frictionPoints: z
    .array(
      z.object({
        topic: z.string().min(1).max(160),
        description: z.string().min(1).max(1200),
        sourceKind: z.enum(["direct_student_feedback", "teacher_observation", "data_derived_pattern", "ai_hypothesis"]),
        evidenceKeys: z.array(z.string()).min(1).max(10),
        severity: z.enum(["low", "medium", "high"]),
      }),
    )
    .max(10),
  actionPlan: z.array(z.string().min(1).max(500)).length(3),
  warmupQuestions: z.array(z.object({ topic: z.string().min(1).max(160), question: z.string().min(1).max(600), targetsMisconception: z.string().max(400) })).min(3).max(5),
  ...aiFindingsBlock,
});

export interface TopicSeriesPoint {
  topic: string;
  mentions: number;
  confusionMentions: number;
  averageQuizScore: number | null;
  quizAttempts: number;
  confusionIndex: number;
}

export interface TeachingPulseOutput {
  topicSeries: TopicSeriesPoint[];
  frictionPoints: z.infer<typeof outputSchema>["frictionPoints"];
  actionPlan: string[];
  warmupQuestions: z.infer<typeof outputSchema>["warmupQuestions"];
  sourceBreakdown: Record<InsightSourceKind, number>;
  feedbackCount: number;
}

interface FeedbackItem {
  key: string;
  sourceKind: InsightSourceKind;
  content: string;
  confusionScore: number | null;
  topic: string | null;
}

interface Extra {
  feedback: FeedbackItem[];
  topicSeries: TopicSeriesPoint[];
}

const CONFUSION_TERMS = ["confus", "lost", "don't understand", "dont understand", "unclear", "hard", "difficult", "struggl", "stuck", "not sure", "why", "how does"];

/** Deterministic confusion heuristic: 0..1 based on confusion vocabulary density. */
export function confusionScore(text: string): number {
  const lowered = text.toLowerCase();
  const hits = CONFUSION_TERMS.filter((term) => lowered.includes(term)).length;
  return round(Math.min(1, hits / 3), 2);
}

export function matchTopic(text: string, topics: string[]): string | null {
  let best: { topic: string; score: number } | null = null;
  for (const topic of topics) {
    const score = keywordOverlap(text, topic) + (text.toLowerCase().includes(topic.toLowerCase()) ? 0.5 : 0);
    if (score > 0 && (!best || score > best.score)) best = { topic, score };
  }
  return best && best.score >= 0.2 ? best.topic : null;
}

export function buildTopicSeries(feedback: FeedbackItem[], topics: string[], quiz: TeachingPulseInput["quizSummary"]): TopicSeriesPoint[] {
  const allTopics = [...new Set([...topics, ...quiz.map((entry) => entry.topic), ...feedback.map((item) => item.topic).filter((t): t is string => Boolean(t))])];
  return allTopics.map((topic) => {
    const related = feedback.filter((item) => item.topic === topic);
    const confusionMentions = related.filter((item) => (item.confusionScore ?? 0) >= 0.34).length;
    const quizEntries = quiz.filter((entry) => entry.topic === topic);
    const attempts = quizEntries.reduce((sum, entry) => sum + entry.attempts, 0);
    const averageQuizScore = attempts > 0 ? round(quizEntries.reduce((sum, entry) => sum + entry.averageScore * entry.attempts, 0) / attempts, 1) : quizEntries.length > 0 ? round(quizEntries.reduce((s, e) => s + e.averageScore, 0) / quizEntries.length, 1) : null;
    const confusionIndex = round((related.length > 0 ? confusionMentions / related.length : 0) * 0.6 + (averageQuizScore !== null ? (1 - averageQuizScore / 100) * 0.4 : 0), 2);
    return { topic, mentions: related.length, confusionMentions, averageQuizScore, quizAttempts: attempts, confusionIndex };
  });
}

export class TeachingPulseHandler implements AnalysisHandler<TeachingPulseInput, HandlerResult<TeachingPulseOutput>, Extra> {
  readonly type = "teaching_pulse" as const;
  readonly promptVersion = teachingPulsePrompt.version;
  readonly requiresDocuments = false;

  validateInput(input: unknown): TeachingPulseInput {
    const parsed = teachingPulseInputSchema.parse(input);
    return parsed;
  }

  async collectContext(context: AnalysisContext<TeachingPulseInput>): Promise<CollectedContext<TeachingPulseInput, Extra>> {
    const { input } = context;
    const feedback: FeedbackItem[] = [];
    const evidence: EvidenceCandidate[] = [];
    const redact = context.settings.redactIdentifiers !== false;
    const push = (sourceKind: InsightSourceKind, rawContent: string, index: number) => {
      const content = redact ? redactIdentifiers(rawContent).text : rawContent;
      const key = evidenceKey(evidence.length);
      const item: FeedbackItem = { key, sourceKind, content, confusionScore: sourceKind === "direct_student_feedback" ? confusionScore(content) : null, topic: matchTopic(content, input.topics) };
      feedback.push(item);
      evidence.push({
        key,
        sourceType: "calculated_metric",
        title: sourceKind === "direct_student_feedback" ? `Exit slip #${index + 1}` : `Teacher observation #${index + 1}`,
        locator: { section: sourceKind, index: index + 1 },
        excerpt: truncate(content, 600),
        metadata: { sourceKind, topic: item.topic, confusionScore: item.confusionScore },
      });
    };
    input.exitSlips.forEach((slip, index) => push("direct_student_feedback", slip, index));
    input.teacherObservations.forEach((note, index) => push("teacher_observation", note, index));

    // Uploaded documents (audio notes, exit slip exports, syllabus) become document evidence.
    const documentEvidence = await collectDocumentEvidence(context, [...input.topics.slice(0, 3), "student confusion questions feedback"].filter(Boolean), { limit: 12, startIndex: evidence.length });
    for (const item of documentEvidence.evidence) {
      const kind = item.metadata?.documentKind;
      const sourceKind: InsightSourceKind = kind === "exit_slip" || kind === "query_export" ? "direct_student_feedback" : kind === "teacher_note" ? "teacher_observation" : "data_derived_pattern";
      evidence.push({ ...item, metadata: { ...item.metadata, sourceKind } });
      if (sourceKind !== "data_derived_pattern") {
        feedback.push({ key: item.key, sourceKind, content: item.excerpt, confusionScore: sourceKind === "direct_student_feedback" ? confusionScore(item.excerpt) : null, topic: matchTopic(item.excerpt, input.topics) });
      }
    }

    const topicSeries = buildTopicSeries(feedback, input.topics, input.quizSummary);
    if (input.quizSummary.length > 0) {
      evidence.push(metricEvidence(evidenceKey(evidence.length), "Quiz summary", input.quizSummary.map((entry) => `${entry.topic}: avg ${entry.averageScore}% over ${entry.attempts} attempts`).join("; "), { sourceKind: "data_derived_pattern" }));
    }
    if (topicSeries.length > 0) {
      evidence.push(metricEvidence(evidenceKey(evidence.length), "Topic confusion index", topicSeries.map((point) => `${point.topic}: index ${point.confusionIndex} (${point.confusionMentions}/${point.mentions} confused mentions${point.averageQuizScore !== null ? `, quiz ${point.averageQuizScore}%` : ""})`).join("; "), { sourceKind: "data_derived_pattern" }));
    }
    const limitations: string[] = [];
    const directCount = feedback.filter((item) => item.sourceKind === "direct_student_feedback").length;
    if (directCount === 0) limitations.push("No direct student feedback was provided; insights rely on teacher observations and data patterns only.");
    else if (directCount < 5) limitations.push(`Only ${directCount} direct student feedback items; sentiment must not be generalised to the class.`);
    if (input.quizSummary.length === 0) limitations.push("No quiz data supplied; performance correlations are unavailable.");
    return { ...context, evidence, extra: { feedback, topicSeries }, limitations, retrieval: documentEvidence.retrieval, externalSources: {} };
  }

  async execute(context: CollectedContext<TeachingPulseInput, Extra>): Promise<HandlerResult<TeachingPulseOutput>> {
    const { extra, input } = context;
    const sourceBreakdown: Record<InsightSourceKind, number> = { direct_student_feedback: 0, teacher_observation: 0, data_derived_pattern: 0, ai_hypothesis: 0 };
    for (const item of extra.feedback) sourceBreakdown[item.sourceKind] += 1;
    const metricKeys = context.evidence.filter((item) => item.sourceType === "calculated_metric" && item.metadata?.sourceKind === "data_derived_pattern").map((item) => item.key);
    const measured = extra.topicSeries
      .filter((point) => point.mentions > 0 || point.quizAttempts > 0)
      .sort((a, b) => b.confusionIndex - a.confusionIndex)
      .slice(0, 5)
      .map((point) =>
        measuredFinding(
          `Measured confusion: ${point.topic}`,
          `${point.confusionMentions} of ${point.mentions} feedback items on "${point.topic}" contain confusion language${point.averageQuizScore !== null ? `; quiz average ${point.averageQuizScore}%` : ""}. Confusion index ${point.confusionIndex}.`,
          [...extra.feedback.filter((item) => item.topic === point.topic).slice(0, 6).map((item) => item.key), ...metricKeys],
          { category: "measured", metrics: { ...point }, confidence: point.mentions >= 5 ? "high" : "medium" },
        ),
      );

    if (context.evidence.length === 0) {
      return {
        findings: [measuredFinding("No feedback to analyse", "No exit slips, observations, quiz data, or documents were supplied.", [], { category: "measured", confidence: "low" })],
        artifacts: [],
        output: { topicSeries: [], frictionPoints: [], actionPlan: [], warmupQuestions: [], sourceBreakdown, feedbackCount: 0 },
        confidence: "low",
        limitations: ["No inputs supplied."],
        modelCalls: [],
        promptVersion: this.promptVersion,
      };
    }

    const response = await runPrompt(
      context,
      teachingPulsePrompt,
      {
        weekLabel: input.weekLabel,
        topics: input.topics,
        metrics: JSON.stringify({ topicSeries: extra.topicSeries, sourceBreakdown }),
        evidence: context.evidence,
      },
      outputSchema,
    );
    const data = response.data;
    // Enforce provenance: a friction point may only claim direct feedback if all cited evidence is direct feedback.
    const kindByKey = new Map(context.evidence.map((item) => [item.key, item.metadata?.sourceKind as InsightSourceKind | undefined]));
    const frictionPoints = data.frictionPoints.map((point) => {
      const kinds = point.evidenceKeys.map((key) => kindByKey.get(key));
      const claimsDirect = point.sourceKind === "direct_student_feedback";
      const allDirect = kinds.length > 0 && kinds.every((kind) => kind === "direct_student_feedback");
      return claimsDirect && !allDirect ? { ...point, sourceKind: "ai_hypothesis" as const } : point;
    });
    const findings = [
      ...measured,
      ...frictionPoints.map((point) =>
        toFindingDraft(
          { title: `Friction: ${point.topic}`, summary: point.description, confidence: point.severity === "high" ? "medium" : "low", sourceKind: point.sourceKind, evidenceKeys: point.evidenceKeys, limitations: ["Derived from a limited feedback sample."], requiresHumanReview: point.sourceKind === "ai_hypothesis" },
          "friction",
          "supports",
          { severity: point.severity },
        ),
      ),
      ...data.findings.map((finding) => toFindingDraft(finding, "insight")),
    ];
    const output: TeachingPulseOutput = { topicSeries: extra.topicSeries, frictionPoints, actionPlan: data.actionPlan, warmupQuestions: data.warmupQuestions, sourceBreakdown, feedbackCount: extra.feedback.length };
    const planText = ["## Next-class action plan", ...data.actionPlan.map((item, index) => `${index + 1}. ${item}`), "", "### Friction points", ...frictionPoints.map((point) => `- **${point.topic}** (${point.sourceKind}, ${point.severity}): ${point.description} [${point.evidenceKeys.join(", ")}]`)].join("\n");
    const quizText = ["## Warm-up questions", ...data.warmupQuestions.map((question, index) => `${index + 1}. (${question.topic}) ${question.question}${question.targetsMisconception ? `\n   _Targets:_ ${question.targetsMisconception}` : ""}`)].join("\n");
    return {
      findings,
      artifacts: [
        { type: "action_plan", title: `Action plan${input.weekLabel ? ` — ${input.weekLabel}` : ""}`, content: { actionPlan: data.actionPlan, frictionPoints }, contentText: planText },
        { type: "warmup_quiz", title: `Warm-up questions${input.weekLabel ? ` — ${input.weekLabel}` : ""}`, content: { questions: data.warmupQuestions }, contentText: quizText },
      ],
      output,
      confidence: overallConfidence(findings),
      limitations: data.limitations,
      modelCalls: [response.model],
      promptVersion: this.promptVersion,
    };
  }

  async persist(context: PersistContext<HandlerResult<TeachingPulseOutput>, TeachingPulseInput, Extra>): Promise<void> {
    const tenant = { organization_id: context.analysis.organization_id, workspace_id: context.analysis.workspace_id, created_by: context.analysis.created_by };
    const items = context.extra.feedback.filter((item) => item.sourceKind === "direct_student_feedback" || item.sourceKind === "teacher_observation");
    if (items.length === 0) return;
    await context.deps.teaching.insertFeedback(
      items.map((item) => ({
        ...tenant,
        course_id: context.input.courseId ?? null,
        document_id: null,
        analysis_id: context.analysis.id,
        source_kind: item.sourceKind,
        content: item.content,
        is_anonymized: context.settings.redactIdentifiers !== false,
        occurred_at: null,
        topic_id: null,
        sentiment_label: item.confusionScore === null ? null : item.confusionScore >= 0.34 ? "confused" : "neutral",
        confusion_score: item.confusionScore,
      })),
    );
  }
}
