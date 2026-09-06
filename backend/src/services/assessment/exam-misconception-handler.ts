import { examMisconceptionInputSchema, type ExamMisconceptionInput } from "@pedago/shared";
import type { Json } from "@pedago/shared/database";
import { z } from "zod";
import { examMisconceptionPrompt } from "../../prompts/index.js";
import { redactIdentifiers } from "../../utils/redaction.js";
import { round, truncate } from "../../utils/text.js";
import { agglomerativeCluster } from "../../utils/vectors.js";
import { aiFindingsBlock, measuredFinding, metricEvidence, toFindingDraft } from "../analysis/ai-schemas.js";
import { collectDocumentEvidence, runPrompt } from "../analysis/handler-utils.js";
import type { AnalysisContext, AnalysisHandler, CollectedContext, EvidenceCandidate, HandlerResult, PersistContext } from "../analysis/types.js";
import { evidenceKey, overallConfidence } from "../analysis/types.js";
import { matchTopic } from "../teaching/teaching-pulse-handler.js";

const buildOutputSchema = (clusterCount: number) => z.object({
  misconceptions: z
    .array(
      z.object({
        clusterIndex: z.number().int().min(0).max(Math.max(0, clusterCount - 1)),
        label: z.string().min(1).max(160),
        description: z.string().min(1).max(1000),
        rootCauseHypothesis: z.string().min(1).max(1000),
        concept: z.string().min(1).max(160),
        confidence: z.enum(["low", "medium", "high"]),
        evidenceKeys: z.array(z.string()).min(1).max(8),
      }),
    )
    .max(15),
  remedialLesson: z.object({
    title: z.string().min(1).max(200),
    objective: z.string().min(1).max(600),
    segments: z.array(z.object({ minutes: z.number().int().min(1).max(15), activity: z.string().min(1).max(800) })).min(2).max(6),
  }),
  diagnosticQuestions: z.array(z.object({ question: z.string().min(1).max(800), targetsMisconception: z.string().min(1).max(300), expectedAnswer: z.string().max(600) })).min(2).max(3),
  ...aiFindingsBlock,
});

export interface ItemStatistic {
  questionNumber: string;
  attempts: number;
  meanScore: number;
  maximumMarks: number;
  difficultyIndex: number;
  errorRate: number;
  topic: string | null;
}

type OutputSchema = ReturnType<typeof buildOutputSchema>;

export interface MisconceptionOutput {
  itemStatistics: ItemStatistic[];
  heatmap: { questionNumber: string; topic: string | null; errorRate: number; difficultyBand: "easy" | "moderate" | "hard" }[];
  misconceptions: (z.infer<OutputSchema>["misconceptions"][number] & { measuredResponseCount: number; measuredErrorRate: number; questionNumber: string })[];
  remedialLesson: z.infer<OutputSchema>["remedialLesson"] | null;
  diagnosticQuestions: z.infer<OutputSchema>["diagnosticQuestions"];
}

interface ResponseCluster {
  index: number;
  questionNumber: string;
  members: number[];
  representatives: number[];
  errorRate: number;
}

interface Extra {
  stats: ItemStatistic[];
  responses: { key: string; questionNumber: string; subjectKey: string; awardedMarks: number; text: string; incorrect: boolean }[];
  clusters: ResponseCluster[];
}

/** Classical item difficulty: mean score / max marks. Error rate = share of responses below 50%. */
export function computeItemStatistics(input: ExamMisconceptionInput): ItemStatistic[] {
  return input.questions.map((question) => {
    const responses = input.responses.filter((response) => response.questionNumber === question.number);
    const attempts = responses.length;
    const meanScore = attempts > 0 ? responses.reduce((sum, response) => sum + Math.min(response.awardedMarks, question.maximumMarks), 0) / attempts : 0;
    const difficultyIndex = attempts > 0 ? round(meanScore / question.maximumMarks, 3) : 0;
    const errorRate = attempts > 0 ? round(responses.filter((response) => response.awardedMarks < question.maximumMarks * 0.5).length / attempts, 3) : 0;
    return { questionNumber: question.number, attempts, meanScore: round(meanScore, 2), maximumMarks: question.maximumMarks, difficultyIndex, errorRate, topic: question.topic ?? matchTopic(question.prompt, input.syllabusTopics) };
  });
}

export function difficultyBand(index: number): "easy" | "moderate" | "hard" {
  if (index >= 0.75) return "easy";
  if (index >= 0.45) return "moderate";
  return "hard";
}

export class ExamMisconceptionHandler implements AnalysisHandler<ExamMisconceptionInput, HandlerResult<MisconceptionOutput>, Extra> {
  readonly type = "exam_misconception" as const;
  readonly promptVersion = examMisconceptionPrompt.version;
  readonly requiresDocuments = false;

  validateInput(input: unknown): ExamMisconceptionInput {
    const parsed = examMisconceptionInputSchema.parse(input);
    const numbers = new Set(parsed.questions.map((question) => question.number));
    if (numbers.size !== parsed.questions.length) throw new Error("Question numbers must be unique");
    for (const response of parsed.responses) {
      if (!numbers.has(response.questionNumber)) throw new Error(`Response references unknown question ${response.questionNumber}`);
    }
    return parsed;
  }

  async collectContext(context: AnalysisContext<ExamMisconceptionInput>): Promise<CollectedContext<ExamMisconceptionInput, Extra>> {
    const { input } = context;
    const stats = computeItemStatistics(input);
    const byNumber = new Map(input.questions.map((question) => [question.number, question]));
    const responses: Extra["responses"] = input.responses
      .filter((response) => response.responseText && response.responseText.trim().length > 0)
      .map((response, index) => ({
        key: evidenceKey(index),
        questionNumber: response.questionNumber,
        subjectKey: response.subjectKey,
        awardedMarks: response.awardedMarks,
        text: redactIdentifiers(response.responseText!).text,
        incorrect: response.awardedMarks < byNumber.get(response.questionNumber)!.maximumMarks * 0.5,
      }));
    const incorrect = responses.filter((response) => response.incorrect);
    await context.reportProgress("indexing", 35, `Clustering ${incorrect.length} incorrect responses`);
    const clusters: ResponseCluster[] = [];
    if (incorrect.length > 0) {
      const embeddings = await context.deps.ai.createEmbeddings(incorrect.map((response) => response.text));
      const indexByResponse = new Map(incorrect.map((response, index) => [response, index]));
      for (const question of input.questions) {
        const own = incorrect.filter((response) => response.questionNumber === question.number);
        if (own.length === 0) continue;
        const vectors = own.map((response) => embeddings[indexByResponse.get(response)!]!);
        const result = agglomerativeCluster(vectors, { similarityThreshold: 0.6, maxClusters: Math.min(4, own.length) });
        const stat = stats.find((entry) => entry.questionNumber === question.number)!;
        for (const cluster of result.clusters) {
          const members = cluster.members.map((member) => responses.indexOf(own[member]!));
          clusters.push({ index: clusters.length, questionNumber: question.number, members, representatives: members.slice(0, 3), errorRate: stat.attempts > 0 ? round(members.length / stat.attempts, 3) : 0 });
        }
      }
    }
    const evidence: EvidenceCandidate[] = [];
    for (const cluster of clusters) {
      for (const member of cluster.representatives) {
        const response = responses[member]!;
        evidence.push({ key: response.key, sourceType: "calculated_metric", title: `Incorrect response Q${response.questionNumber} (cluster ${cluster.index})`, locator: { question: response.questionNumber, section: "response", cluster: cluster.index }, excerpt: truncate(response.text, 500), metadata: { anonymized: true, awardedMarks: response.awardedMarks } });
      }
    }
    const statsKey = evidenceKey(responses.length);
    evidence.push(metricEvidence(statsKey, "Item statistics", stats.map((stat) => `Q${stat.questionNumber}: difficulty ${stat.difficultyIndex}, error rate ${stat.errorRate}, n=${stat.attempts}${stat.topic ? `, topic ${stat.topic}` : ""}`).join("; "), { stats }));
    input.questions.forEach((question, index) => {
      evidence.push({ key: evidenceKey(responses.length + 1 + index), sourceType: "calculated_metric", title: `Question ${question.number}`, locator: { question: question.number, section: "question" }, excerpt: truncate(`${question.prompt}${question.rubric ? `\nRubric: ${question.rubric}` : ""}`, 600), metadata: { maximumMarks: question.maximumMarks } });
    });
    const documents = await collectDocumentEvidence(context, input.questions.slice(0, 3).map((question) => question.topic ?? question.prompt), { limit: 8, startIndex: evidence.length });
    evidence.push(...documents.evidence);
    const limitations: string[] = [];
    if (input.responses.length === 0) limitations.push("No itemized marks supplied; difficulty and error rates cannot be measured.");
    if (incorrect.length === 0) limitations.push("No incorrect textual responses available; misconception clusters cannot be formed.");
    return { ...context, evidence, extra: { stats, responses, clusters }, limitations, retrieval: documents.retrieval, externalSources: {} };
  }

  async execute(context: CollectedContext<ExamMisconceptionInput, Extra>): Promise<HandlerResult<MisconceptionOutput>> {
    const { extra, input } = context;
    const statsKey = evidenceKey(extra.responses.length);
    const heatmap = extra.stats.map((stat) => ({ questionNumber: stat.questionNumber, topic: stat.topic, errorRate: stat.errorRate, difficultyBand: difficultyBand(stat.difficultyIndex) }));
    const measured = extra.stats
      .filter((stat) => stat.attempts > 0)
      .map((stat) => measuredFinding(`Q${stat.questionNumber}: ${difficultyBand(stat.difficultyIndex)} (error rate ${round(stat.errorRate * 100)}%)`, `Mean ${stat.meanScore}/${stat.maximumMarks} across ${stat.attempts} responses; difficulty index ${stat.difficultyIndex}.`, [statsKey], { category: "measured", metrics: { ...stat } }));
    if (extra.clusters.length === 0) {
      return { findings: measured.length > 0 ? measured : [measuredFinding("No measurable items", "No responses were supplied.", [statsKey], { category: "measured", confidence: "low" })], artifacts: [], output: { itemStatistics: extra.stats, heatmap, misconceptions: [], remedialLesson: null, diagnosticQuestions: [] }, confidence: measured.length > 0 ? "medium" : "low", limitations: context.limitations, modelCalls: [], promptVersion: this.promptVersion };
    }
    const clusterText = extra.clusters.map((cluster) => `cluster ${cluster.index}: Q${cluster.questionNumber}, ${cluster.members.length} responses (measured error share ${cluster.errorRate}), representatives=[${cluster.representatives.map((m) => extra.responses[m]!.key).join(", ")}]`).join("\n");
    const response = await runPrompt(context, examMisconceptionPrompt, { examTitle: input.examTitle, itemStats: JSON.stringify(extra.stats), clusters: clusterText, syllabusTopics: input.syllabusTopics, evidence: context.evidence }, buildOutputSchema(extra.clusters.length));
    const data = response.data;
    const misconceptions = data.misconceptions
      .filter((item) => extra.clusters[item.clusterIndex])
      .map((item) => ({ ...item, measuredResponseCount: extra.clusters[item.clusterIndex]!.members.length, measuredErrorRate: extra.clusters[item.clusterIndex]!.errorRate, questionNumber: extra.clusters[item.clusterIndex]!.questionNumber }));
    const findings = [
      ...measured,
      ...misconceptions.map((item) =>
        toFindingDraft({ title: `Misconception: ${item.label}`, summary: `${item.description} Root-cause hypothesis: ${item.rootCauseHypothesis}`, confidence: item.confidence, sourceKind: "ai_hypothesis", evidenceKeys: item.evidenceKeys, limitations: ["Root cause is an AI hypothesis; the measured error rate is the only asserted fact."], requiresHumanReview: true }, "misconception", "supports", { measuredResponseCount: item.measuredResponseCount, measuredErrorRate: item.measuredErrorRate, concept: item.concept }),
      ),
      ...data.findings.map((finding) => toFindingDraft(finding, "insight")),
    ];
    const output: MisconceptionOutput = { itemStatistics: extra.stats, heatmap, misconceptions, remedialLesson: data.remedialLesson, diagnosticQuestions: data.diagnosticQuestions };
    const lessonText = [`## ${data.remedialLesson.title} (15 minutes)`, `**Objective:** ${data.remedialLesson.objective}`, ``, ...data.remedialLesson.segments.map((segment) => `- **${segment.minutes} min** — ${segment.activity}`)].join("\n");
    const questionsText = ["## Diagnostic questions", ...data.diagnosticQuestions.map((question, index) => `${index + 1}. ${question.question}\n   _Targets:_ ${question.targetsMisconception}${question.expectedAnswer ? `\n   _Expected:_ ${question.expectedAnswer}` : ""}`)].join("\n");
    return {
      findings,
      artifacts: [
        { type: "remedial_lesson", title: data.remedialLesson.title, content: data.remedialLesson as unknown as Record<string, unknown>, contentText: lessonText },
        { type: "diagnostic_questions", title: `Diagnostic questions — ${input.examTitle}`, content: { questions: data.diagnosticQuestions }, contentText: questionsText },
      ],
      output,
      confidence: overallConfidence(findings),
      limitations: data.limitations,
      modelCalls: [response.model],
      promptVersion: this.promptVersion,
    };
  }

  async persist(context: PersistContext<HandlerResult<MisconceptionOutput>, ExamMisconceptionInput, Extra>): Promise<void> {
    const { input, result } = context;
    const tenant = { organization_id: context.analysis.organization_id, workspace_id: context.analysis.workspace_id, created_by: context.analysis.created_by };
    const exam = await context.deps.teaching.insertExam({ ...tenant, course_id: input.courseId ?? null, analysis_id: context.analysis.id, title: input.examTitle, exam_date: null, total_marks: input.totalMarks ?? input.questions.reduce((sum, question) => sum + question.maximumMarks, 0) });
    const questionRows = await context.deps.teaching.insertExamQuestions(input.questions.map((question) => ({ ...tenant, exam_id: exam.id, question_number: question.number, prompt: question.prompt, maximum_marks: question.maximumMarks, course_topic_id: null, rubric: (question.rubric ? { text: question.rubric } : {}) as Json })));
    const questionIdByNumber = new Map(questionRows.map((row) => [row.question_number, row.id]));
    if (input.responses.length > 0) {
      await context.deps.teaching.insertStudentResponses(
        input.responses.map((response) => ({ ...tenant, exam_question_id: questionIdByNumber.get(response.questionNumber)!, student_id: null, anonymous_subject_key: response.subjectKey, response_text: response.responseText ? redactIdentifiers(response.responseText).text : null, awarded_marks: response.awardedMarks, feedback: null })),
      );
    }
    if (result.output.misconceptions.length > 0) {
      await context.deps.teaching.insertMisconceptionClusters(
        result.output.misconceptions.map((item) => ({ ...tenant, analysis_id: context.analysis.id, exam_question_id: questionIdByNumber.get(item.questionNumber)!, label: item.label, description: item.description, response_count: item.measuredResponseCount, error_rate: item.measuredErrorRate, root_cause_hypothesis: item.rootCauseHypothesis, confidence: item.confidence, course_topic_id: null })),
      );
    }
  }
}
