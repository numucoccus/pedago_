import { z } from "zod";
import {
  analysisTypes,
  artifactStatuses,
  documentKinds,
  gapVerdicts,
  insightSourceKinds,
  verificationStatuses,
  workspaceRoles,
} from "./constants.js";

const jsonRecord = z.record(z.string(), z.unknown());

export const weightsSchema = z
  .record(z.string(), z.number().min(0).max(100))
  .refine((weights) => Object.keys(weights).length > 0, "At least one weight is required")
  .refine(
    (weights) => Math.abs(Object.values(weights).reduce((sum, value) => sum + value, 0) - 100) < 1e-6,
    "Weights must total 100",
  );

export const portfolioWeightsSchema = z
  .strictObject({
    academic: z.number().min(0).max(100),
    technical: z.number().min(0).max(100),
    leadership: z.number().min(0).max(100),
    service: z.number().min(0).max(100),
    sportsCultural: z.number().min(0).max(100),
    consistency: z.number().min(0).max(100),
  })
  .refine(
    (weights) => Math.abs(Object.values(weights).reduce((sum, value) => sum + value, 0) - 100) < 1e-6,
    "Weights must total 100",
  );
export type PortfolioWeights = z.infer<typeof portfolioWeightsSchema>;

export const researchDecisionWeightsSchema = z
  .strictObject({
    noveltyEvidence: z.number().min(0).max(100),
    feasibility: z.number().min(0).max(100),
    dataAvailability: z.number().min(0).max(100),
    methodFit: z.number().min(0).max(100),
    expectedContribution: z.number().min(0).max(100),
    risk: z.number().min(0).max(100),
  })
  .refine(
    (weights) => Math.abs(Object.values(weights).reduce((sum, value) => sum + value, 0) - 100) < 1e-6,
    "Weights must total 100",
  );
export type ResearchDecisionWeights = z.infer<typeof researchDecisionWeightsSchema>;

export const createWorkspaceSchema = z.strictObject({
  organizationId: z.uuid().optional(),
  organizationName: z.string().min(2).max(120).optional(),
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case"),
  description: z.string().max(2000).optional(),
  settings: jsonRecord.optional(),
});
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const updateWorkspaceSchema = z
  .strictObject({
    name: z.string().min(2).max(120).optional(),
    description: z.string().max(2000).nullable().optional(),
    settings: jsonRecord.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

export const addWorkspaceMemberSchema = z.strictObject({
  userId: z.uuid(),
  role: z.enum(workspaceRoles),
});
export type AddWorkspaceMemberInput = z.infer<typeof addWorkspaceMemberSchema>;

export const uploadPurposes = ["academic", "student_evidence", "audio_note"] as const;
export type UploadPurpose = (typeof uploadPurposes)[number];

export const uploadIntentSchema = z.strictObject({
  workspaceId: z.uuid(),
  courseId: z.uuid().optional(),
  kind: z.enum(documentKinds),
  title: z.string().min(1).max(200),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(3).max(120),
  byteSize: z.number().int().positive(),
  purpose: z.enum(uploadPurposes),
  containsPersonalData: z.boolean().default(false),
  retentionDays: z.number().int().min(1).max(3650).optional(),
  language: z.string().min(2).max(16).optional(),
});
export type UploadIntentInput = z.infer<typeof uploadIntentSchema>;

export const completeUploadSchema = z.strictObject({
  contentHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/i)
    .optional(),
});
export type CompleteUploadInput = z.infer<typeof completeUploadSchema>;

export const analysisSettingsSchema = z
  .object({
    weights: weightsSchema.optional(),
    redactIdentifiers: z.boolean().optional(),
    maxEvidence: z.number().int().min(3).max(60).optional(),
    yearFrom: z.number().int().min(1900).max(2100).optional(),
    yearTo: z.number().int().min(1900).max(2100).optional(),
  })
  .catchall(z.unknown());

export const createAnalysisSchema = z.strictObject({
  workspaceId: z.uuid(),
  type: z.enum(analysisTypes),
  title: z.string().min(1).max(200),
  documentIds: z.array(z.uuid()).max(40).default([]),
  input: jsonRecord.default({}),
  settings: analysisSettingsSchema.default({}),
});
export type CreateAnalysisInput = z.infer<typeof createAnalysisSchema>;

export const approveAnalysisSchema = z.strictObject({
  note: z.string().max(2000).optional(),
});

export const updateArtifactSchema = z
  .strictObject({
    title: z.string().min(1).max(200).optional(),
    content: jsonRecord.optional(),
    contentText: z.string().max(200_000).optional(),
    status: z.enum(artifactStatuses).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");
export type UpdateArtifactInput = z.infer<typeof updateArtifactSchema>;

export const exportArtifactSchema = z.strictObject({
  format: z.enum(["markdown", "json"]).default("markdown"),
});
export type ExportArtifactInput = z.infer<typeof exportArtifactSchema>;

export const createStudentSchema = z.strictObject({
  workspaceId: z.uuid(),
  externalStudentId: z.string().min(1).max(64),
  displayName: z.string().min(1).max(160),
  email: z.email().optional(),
  program: z.string().max(160).optional(),
  cohort: z.string().max(64).optional(),
  cgpa: z.number().min(0).max(10).optional(),
  consentStatus: z.enum(["pending", "granted", "withdrawn"]).default("pending"),
  retentionUntil: z.iso.datetime().optional(),
});
export type CreateStudentInput = z.infer<typeof createStudentSchema>;

export const updateStudentSchema = z
  .strictObject({
    displayName: z.string().min(1).max(160).optional(),
    email: z.email().nullable().optional(),
    program: z.string().max(160).nullable().optional(),
    cohort: z.string().max(64).nullable().optional(),
    cgpa: z.number().min(0).max(10).nullable().optional(),
    consentStatus: z.enum(["pending", "granted", "withdrawn"]).optional(),
    retentionUntil: z.iso.datetime().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

export const achievementCategories = [
  "academic",
  "technical",
  "leadership",
  "service",
  "sports_cultural",
  "other",
] as const;
export type AchievementCategory = (typeof achievementCategories)[number];

export const createAchievementSchema = z.strictObject({
  documentId: z.uuid().optional(),
  title: z.string().min(1).max(200),
  issuer: z.string().max(200).optional(),
  achievementDate: z.iso.date().optional(),
  category: z.enum(achievementCategories),
  level: z.enum(["institutional", "regional", "national", "international", "unspecified"]).default("unspecified"),
  description: z.string().max(4000).optional(),
  verificationStatus: z.enum(["student_submitted", "unverified"]).default("student_submitted"),
  verificationUrl: z.url().optional(),
  extractedFields: jsonRecord.default({}),
});
export type CreateAchievementInput = z.infer<typeof createAchievementSchema>;

export const updateAchievementVerificationSchema = z.strictObject({
  verificationStatus: z.enum(verificationStatuses),
  verificationUrl: z.url().nullable().optional(),
  note: z.string().max(2000).optional(),
});
export type UpdateAchievementVerificationInput = z.infer<typeof updateAchievementVerificationSchema>;

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export const workspaceScopedListSchema = paginationSchema.extend({
  workspaceId: z.uuid(),
});

// Analysis input schemas are shared so the frontend can validate before submitting.

export const researchGapInputSchema = z.strictObject({
  topic: z.string().min(3).max(300),
  claimedGap: z.string().min(10).max(3000),
  method: z.string().max(500).optional(),
  problem: z.string().max(1000).optional(),
  populationContext: z.string().max(500).optional(),
  yearFrom: z.number().int().min(1900).max(2100).optional(),
  yearTo: z.number().int().min(1900).max(2100).optional(),
  sources: z.array(z.enum(["openalex", "semantic_scholar", "crossref", "arxiv"])).min(1).optional(),
  maxResultsPerSource: z.number().int().min(5).max(50).default(25),
});
export type ResearchGapInput = z.infer<typeof researchGapInputSchema>;

export const researchEvolutionInputSchema = z.strictObject({
  topic: z.string().min(3).max(300),
  yearFrom: z.number().int().min(1900).max(2100),
  yearTo: z.number().int().min(1900).max(2100),
  keywords: z.array(z.string().min(2).max(60)).max(30).default([]),
  methodTerms: z.array(z.string().min(2).max(60)).max(30).default([]),
  sources: z.array(z.enum(["openalex", "semantic_scholar", "crossref", "arxiv"])).min(1).optional(),
  maxResultsPerSource: z.number().int().min(5).max(100).default(50),
});
export type ResearchEvolutionInput = z.infer<typeof researchEvolutionInputSchema>;

export const researchQuestionInputSchema = z.strictObject({
  researchQuestion: z.string().min(10).max(2000),
  hypothesis: z.string().max(2000).optional(),
  context: z.string().max(3000).optional(),
  checkNovelty: z.boolean().default(true),
  sources: z.array(z.enum(["openalex", "semantic_scholar", "crossref", "arxiv"])).min(1).optional(),
});
export type ResearchQuestionInput = z.infer<typeof researchQuestionInputSchema>;

export const researchDecisionCriteriaSchema = z.strictObject({
  noveltyEvidence: z.number().min(0).max(10),
  feasibility: z.number().min(0).max(10),
  dataAvailability: z.number().min(0).max(10),
  methodFit: z.number().min(0).max(10),
  expectedContribution: z.number().min(0).max(10),
  risk: z.number().min(0).max(10),
});

export const researchDecisionInputSchema = z.strictObject({
  options: z
    .array(
      z.strictObject({
        label: z.string().min(1).max(160),
        description: z.string().min(1).max(3000),
        criteria: researchDecisionCriteriaSchema,
        notes: z.string().max(2000).optional(),
      }),
    )
    .min(2)
    .max(8),
  weights: researchDecisionWeightsSchema.optional(),
  checkNovelty: z.boolean().default(false),
});
export type ResearchDecisionInput = z.infer<typeof researchDecisionInputSchema>;

export const teachingPulseInputSchema = z.strictObject({
  courseId: z.uuid().optional(),
  weekLabel: z.string().max(60).optional(),
  topics: z.array(z.string().min(1).max(120)).max(40).default([]),
  teacherObservations: z.array(z.string().min(1).max(4000)).max(50).default([]),
  exitSlips: z.array(z.string().min(1).max(2000)).max(500).default([]),
  quizSummary: z
    .array(
      z.strictObject({
        topic: z.string().min(1).max(120),
        averageScore: z.number().min(0).max(100),
        attempts: z.number().int().min(0),
      }),
    )
    .max(60)
    .default([]),
});
export type TeachingPulseInput = z.infer<typeof teachingPulseInputSchema>;

export const queryClusteringInputSchema = z.strictObject({
  courseId: z.uuid().optional(),
  messages: z
    .array(
      z.strictObject({
        externalId: z.string().max(120).optional(),
        content: z.string().min(1).max(4000),
        occurredAt: z.iso.datetime().optional(),
      }),
    )
    .max(2000)
    .default([]),
  syllabusTopics: z.array(z.string().min(1).max(120)).max(60).default([]),
  targetClusterCount: z.number().int().min(2).max(20).optional(),
});
export type QueryClusteringInput = z.infer<typeof queryClusteringInputSchema>;

export const examMisconceptionInputSchema = z.strictObject({
  courseId: z.uuid().optional(),
  examTitle: z.string().min(1).max(200),
  totalMarks: z.number().positive().optional(),
  questions: z
    .array(
      z.strictObject({
        number: z.string().min(1).max(20),
        prompt: z.string().min(1).max(4000),
        maximumMarks: z.number().positive(),
        topic: z.string().max(160).optional(),
        rubric: z.string().max(4000).optional(),
      }),
    )
    .min(1)
    .max(100),
  responses: z
    .array(
      z.strictObject({
        questionNumber: z.string().min(1).max(20),
        subjectKey: z.string().min(1).max(80),
        awardedMarks: z.number().min(0),
        responseText: z.string().max(6000).optional(),
      }),
    )
    .max(20000)
    .default([]),
  syllabusTopics: z.array(z.string().min(1).max(120)).max(60).default([]),
});
export type ExamMisconceptionInput = z.infer<typeof examMisconceptionInputSchema>;

export const studentPortfolioInputSchema = z.strictObject({
  studentId: z.uuid(),
  weights: portfolioWeightsSchema.optional(),
  includeRiskSignals: z.boolean().default(true),
});
export type StudentPortfolioInput = z.infer<typeof studentPortfolioInputSchema>;

export const lorDossierInputSchema = z.strictObject({
  studentId: z.uuid(),
  targetProgram: z.strictObject({
    name: z.string().min(1).max(200),
    institution: z.string().max(200).optional(),
    programType: z.string().max(80).optional(),
    requirements: z.array(z.string().min(1).max(500)).min(1).max(30),
  }),
  relationship: z.string().max(500).optional(),
  facultyNotes: z.string().max(4000).optional(),
  tone: z.enum(["formal", "warm", "concise"]).default("formal"),
});
export type LorDossierInput = z.infer<typeof lorDossierInputSchema>;

export const curriculumAlignmentInputSchema = z.strictObject({
  courseId: z.uuid().optional(),
  targetSector: z.string().min(2).max(120),
  learningOutcomes: z.array(z.string().min(1).max(500)).max(80).default([]),
  syllabusTopics: z.array(z.string().min(1).max(160)).max(120).default([]),
  industrySourceKeys: z.array(z.string().min(1).max(80)).max(10).default([]),
  legacyHintTerms: z.array(z.string().min(1).max(80)).max(40).default([]),
});
export type CurriculumAlignmentInput = z.infer<typeof curriculumAlignmentInputSchema>;

export const gapVerdictSchema = z.enum(gapVerdicts);
export const insightSourceKindSchema = z.enum(insightSourceKinds);
