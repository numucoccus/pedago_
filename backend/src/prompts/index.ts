import type { EvidenceCandidate } from "../services/analysis/types.js";
import { EVIDENCE_POLICY, renderEvidence, renderList, type PromptTemplate } from "./common.js";

const FINDING_SHAPE =
  "Each finding needs: title, summary, confidence (low|medium|high), sourceKind, evidenceKeys (≥1 provided key), limitations (≥1), requiresHumanReview.";

export const researchGapPrompt: PromptTemplate<{
  topic: string;
  claimedGap: string;
  method?: string;
  problem?: string;
  populationContext?: string;
  yearRange: string;
  coverage: string;
  evidence: EvidenceCandidate[];
}> = {
  id: "research.gap",
  version: "research.gap.v1",
  system: `${EVIDENCE_POLICY}\nTask: verify a claimed research gap against retrieved prior work. Never infer universal novelty from partial source coverage.`,
  render: (vars) =>
    [
      `TOPIC: ${vars.topic}`,
      `CLAIMED GAP: ${vars.claimedGap}`,
      vars.method ? `METHOD: ${vars.method}` : "",
      vars.problem ? `PROBLEM: ${vars.problem}` : "",
      vars.populationContext ? `POPULATION/CONTEXT: ${vars.populationContext}` : "",
      `YEAR RANGE: ${vars.yearRange}`,
      `SEARCH COVERAGE: ${vars.coverage}`,
      renderEvidence(vars.evidence),
      "",
      "Compare the claim with the closest prior work. Output verdict (supported|partially_supported|not_supported|insufficient_evidence),",
      "closestWorkKeys (evidence keys of the most similar works), supportingFindings and contradictingFindings, a suggested reformulated claim, and limitations.",
      FINDING_SHAPE,
    ]
      .filter(Boolean)
      .join("\n"),
};

export const researchEvolutionPrompt: PromptTemplate<{
  topic: string;
  yearRange: string;
  series: string;
  evidence: EvidenceCandidate[];
}> = {
  id: "research.evolution",
  version: "research.evolution.v1",
  system: `${EVIDENCE_POLICY}\nTask: label and explain measured publication trends. The numbers are already computed; do not recompute or alter them.`,
  render: (vars) =>
    [
      `TOPIC: ${vars.topic}`,
      `YEAR RANGE: ${vars.yearRange}`,
      `MEASURED SERIES (deterministic aggregation):\n${vars.series}`,
      renderEvidence(vars.evidence, 400),
      "",
      "Produce narrative findings that explain the measured patterns (emerging, declining, stable methods and keywords), each citing evidence keys.",
      FINDING_SHAPE,
    ].join("\n"),
};

export const researchQuestionPrompt: PromptTemplate<{
  researchQuestion: string;
  hypothesis?: string;
  context?: string;
  evidence: EvidenceCandidate[];
}> = {
  id: "research.question",
  version: "research.question.v1",
  system: `${EVIDENCE_POLICY}\nTask: stress-test a research question. Score each dimension 0-10 with a justification and locate issues in the question text.`,
  render: (vars) =>
    [
      `RESEARCH QUESTION: ${vars.researchQuestion}`,
      vars.hypothesis ? `HYPOTHESIS: ${vars.hypothesis}` : "HYPOTHESIS: (none provided)",
      vars.context ? `CONTEXT: ${vars.context}` : "",
      renderEvidence(vars.evidence, 400),
      "",
      "Dimensions: clarity, specificity, variables, populationContext, measurability, feasibility, scope, noveltyEvidence, hypothesisQuality.",
      "noveltyEvidence must be grounded in the EVIDENCE keys; if no evidence exists, score it low and say so.",
      "Also return issues (with the exact phrase from the question), revisedAlternatives (each with tradeoffs), and limitations.",
    ]
      .filter(Boolean)
      .join("\n"),
};

export const researchDecisionPrompt: PromptTemplate<{
  options: string;
  weights: string;
  ranking: string;
  evidence: EvidenceCandidate[];
}> = {
  id: "research.decision",
  version: "research.decision.v1",
  system: `${EVIDENCE_POLICY}\nTask: explain a deterministic weighted decision matrix. Scores are fixed inputs; you provide qualitative reasoning only.`,
  render: (vars) =>
    [
      `OPTIONS:\n${vars.options}`,
      `WEIGHTS (total 100): ${vars.weights}`,
      `COMPUTED RANKING: ${vars.ranking}`,
      renderEvidence(vars.evidence, 400),
      "",
      "For each option, give strengths, risks, and evidence-backed reasoning citing keys where available (use sourceKind ai_hypothesis when reasoning is not evidence-backed).",
      FINDING_SHAPE,
    ].join("\n"),
};

export const teachingPulsePrompt: PromptTemplate<{
  weekLabel?: string;
  topics: string[];
  metrics: string;
  evidence: EvidenceCandidate[];
}> = {
  id: "teaching.pulse",
  version: "teaching.pulse.v1",
  system: `${EVIDENCE_POLICY}\nTask: summarise classroom pulse from teacher observations, anonymous exit slips, and quiz metrics. Never fabricate student quotes or expand sparse feedback into asserted sentiment.`,
  render: (vars) =>
    [
      vars.weekLabel ? `PERIOD: ${vars.weekLabel}` : "",
      renderList("SYLLABUS TOPICS", vars.topics),
      `MEASURED METRICS:\n${vars.metrics}`,
      renderEvidence(vars.evidence, 500),
      "",
      "Return: frictionPoints (recurring confusion, each with evidenceKeys and sourceKind from the evidence source), findings, actionPlan (exactly 3 bullets),",
      "warmupQuestions (3-5 short diagnostic questions tied to topics), and limitations. Correlations between quiz scores and feedback must be labelled ai_hypothesis.",
      FINDING_SHAPE,
    ]
      .filter(Boolean)
      .join("\n"),
};

export const queryClusterLabelPrompt: PromptTemplate<{
  clusters: string;
  syllabusTopics: string[];
  evidence: EvidenceCandidate[];
}> = {
  id: "teaching.query_clusters",
  version: "teaching.query_clusters.v1",
  system: `${EVIDENCE_POLICY}\nTask: label clusters of anonymised student questions, classify intent (conceptual|administrative|logistical|other), map to syllabus topics, and draft a broadcast reply.`,
  render: (vars) =>
    [
      renderList("SYLLABUS TOPICS", vars.syllabusTopics),
      `CLUSTERS (deterministic embedding clustering; each lists its representative evidence keys):\n${vars.clusters}`,
      renderEvidence(vars.evidence, 300),
      "",
      "Return clusters[] with clusterIndex, label, description, intentKind, syllabusTopic (or null), evidenceKeys; findings; broadcastDraft (markdown addressing conceptual clusters, citing evidenceKeys); limitations.",
      FINDING_SHAPE,
    ].join("\n"),
};

export const examMisconceptionPrompt: PromptTemplate<{
  examTitle: string;
  itemStats: string;
  clusters: string;
  syllabusTopics: string[];
  evidence: EvidenceCandidate[];
}> = {
  id: "assessment.misconception",
  version: "assessment.misconception.v1",
  system: `${EVIDENCE_POLICY}\nTask: diagnose misconceptions from measured item statistics and clustered incorrect responses. Measured error rates are facts; root causes are hypotheses.`,
  render: (vars) =>
    [
      `EXAM: ${vars.examTitle}`,
      `ITEM STATISTICS (measured):\n${vars.itemStats}`,
      `INCORRECT-RESPONSE CLUSTERS (deterministic):\n${vars.clusters}`,
      renderList("SYLLABUS TOPICS", vars.syllabusTopics),
      renderEvidence(vars.evidence, 400),
      "",
      "Return misconceptions[] (clusterIndex, label, description, rootCauseHypothesis, concept, confidence, evidenceKeys), findings,",
      "remedialLesson (15 minutes: title, objective, segments[] with minutes and activity), diagnosticQuestions (2-3 fresh questions with the misconception each targets), limitations.",
      FINDING_SHAPE,
    ].join("\n"),
};

export const studentPortfolioPrompt: PromptTemplate<{
  scoreBreakdown: string;
  evidence: EvidenceCandidate[];
}> = {
  id: "student.portfolio",
  version: "student.portfolio.v1",
  system: `${EVIDENCE_POLICY}\nTask: narrate a student portfolio from verified/unverified achievements and a deterministic merit score. Do not alter scores. Workload observations must be non-diagnostic and require human review.`,
  render: (vars) =>
    [
      `DETERMINISTIC SCORE BREAKDOWN:\n${vars.scoreBreakdown}`,
      renderEvidence(vars.evidence, 400),
      "",
      "Return strengths[] (dimension, summary, evidenceKeys), growthAreas[], findings, and limitations. Mention verification status when relying on unverified items.",
      FINDING_SHAPE,
    ].join("\n"),
};

export const lorDossierPrompt: PromptTemplate<{
  programName: string;
  requirements: string[];
  relationship?: string;
  facultyNotes?: string;
  tone: string;
  matrix: string;
  evidence: EvidenceCandidate[];
}> = {
  id: "student.lor",
  version: "student.lor.v1",
  system: `${EVIDENCE_POLICY}\nTask: build a recommendation-letter dossier. Every factual claim must cite evidence keys. Where evidence is missing, say so instead of inventing. The faculty member gives final approval.`,
  render: (vars) =>
    [
      `TARGET PROGRAM: ${vars.programName}`,
      renderList("REQUIREMENTS", vars.requirements),
      vars.relationship ? `RELATIONSHIP: ${vars.relationship}` : "",
      vars.facultyNotes ? `FACULTY NOTES (trusted): ${vars.facultyNotes}` : "",
      `TONE: ${vars.tone}`,
      `REQUIREMENT-TO-EVIDENCE MATRIX (deterministic keyword matching):\n${vars.matrix}`,
      renderEvidence(vars.evidence, 400),
      "",
      "Return claims[] (text, evidenceKeys), missingEvidence[] (requirement, whatWouldHelp), outline[] (section, bullets), draft (markdown letter using [E#] citations after factual sentences), findings, limitations.",
      FINDING_SHAPE,
    ]
      .filter(Boolean)
      .join("\n"),
};

export const curriculumAlignmentPrompt: PromptTemplate<{
  targetSector: string;
  measures: string;
  evidence: EvidenceCandidate[];
}> = {
  id: "curriculum.alignment",
  version: "curriculum.alignment.v1",
  system: `${EVIDENCE_POLICY}\nTask: recommend curriculum micro-updates from deterministic demand/coverage measures. Do not change the classifications or scores.`,
  render: (vars) =>
    [
      `TARGET SECTOR: ${vars.targetSector}`,
      `MEASURED SKILL COVERAGE (current|legacy|missing with demand and coverage scores):\n${vars.measures}`,
      renderEvidence(vars.evidence, 300),
      "",
      "Return recommendations[] (priority 1..n, title, type micro_update|lab|project|module, rationale, estimatedHours, placement, evidenceKeys), findings, limitations.",
      FINDING_SHAPE,
    ].join("\n"),
};
