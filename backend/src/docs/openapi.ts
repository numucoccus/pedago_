import {
  addWorkspaceMemberSchema,
  analysisStatuses,
  analysisTypes,
  apiErrorCodes,
  approveAnalysisSchema,
  completeUploadSchema,
  createAchievementSchema,
  createAnalysisSchema,
  createStudentSchema,
  createWorkspaceSchema,
  curriculumAlignmentInputSchema,
  examMisconceptionInputSchema,
  exportArtifactSchema,
  lorDossierInputSchema,
  queryClusteringInputSchema,
  researchDecisionInputSchema,
  researchEvolutionInputSchema,
  researchGapInputSchema,
  researchQuestionInputSchema,
  studentPortfolioInputSchema,
  teachingPulseInputSchema,
  updateAchievementVerificationSchema,
  updateArtifactSchema,
  updateStudentSchema,
  updateWorkspaceSchema,
  uploadIntentSchema,
} from "@pedago/shared";
import { z, type ZodType } from "zod";
import { analysisListQuerySchema, documentListQuerySchema, studentListQuerySchema } from "../schemas/http.js";

type Json = Record<string, unknown>;

function schema(zodSchema: ZodType): Json {
  const json = z.toJSONSchema(zodSchema, { target: "draft-2020-12", unrepresentable: "any", io: "input" }) as Json;
  delete json.$schema;
  return json;
}

const envelope = (dataRef: Json, example?: unknown): Json => ({
  type: "object",
  required: ["data", "requestId"],
  properties: { data: dataRef, meta: { type: "object", additionalProperties: true }, requestId: { type: "string" } },
  ...(example !== undefined ? { example: { data: example, requestId: "6f1c1b4e-6e2a-4c0e-9a4c-2b8d1f0e7a11" } } : {}),
});

const ref = (name: string): Json => ({ $ref: `#/components/schemas/${name}` });
const list = (name: string): Json => ({ type: "array", items: ref(name) });

const errorResponses: Json = {
  "400": { description: "Validation failed", content: { "application/json": { schema: ref("ApiError") } } },
  "401": { description: "Authentication required", content: { "application/json": { schema: ref("ApiError") } } },
  "403": { description: "Forbidden (not a workspace member or insufficient role)", content: { "application/json": { schema: ref("ApiError") } } },
  "404": { description: "Not found", content: { "application/json": { schema: ref("ApiError") } } },
  "409": { description: "Conflict", content: { "application/json": { schema: ref("ApiError") } } },
  "429": { description: "Rate limited", content: { "application/json": { schema: ref("ApiError") } } },
};

const ok = (dataSchema: Json, description = "Success", status = "200", example?: unknown): Json => ({
  [status]: { description, content: { "application/json": { schema: envelope(dataSchema, example) } } },
});

const idParam = { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } };
const idempotencyHeader = { name: "Idempotency-Key", in: "header", required: false, description: "8-128 chars [A-Za-z0-9_.:-]. Replays return the original result.", schema: { type: "string" } };
const body = (name: string): Json => ({ required: true, content: { "application/json": { schema: ref(name) } } });
const queryParams = (zodSchema: ZodType): Json[] => {
  const json = schema(zodSchema);
  const properties = (json.properties ?? {}) as Record<string, Json>;
  const required = (json.required ?? []) as string[];
  return Object.entries(properties).map(([name, propertySchema]) => ({ name, in: "query", required: required.includes(name), schema: propertySchema }));
};

const WORKSPACE_ID = "3f2f4a1e-9c7d-4c39-9d2a-5b1c6e7f8a90";
const DOC_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

export function buildOpenApiDocument(options: { basePath: string; version: string }): Json {
  const analysisInputs: Record<string, ZodType> = {
    research_gap: researchGapInputSchema,
    research_evolution: researchEvolutionInputSchema,
    research_question: researchQuestionInputSchema,
    research_decision: researchDecisionInputSchema,
    teaching_pulse: teachingPulseInputSchema,
    query_clustering: queryClusteringInputSchema,
    exam_misconception: examMisconceptionInputSchema,
    student_portfolio: studentPortfolioInputSchema,
    lor_dossier: lorDossierInputSchema,
    curriculum_alignment: curriculumAlignmentInputSchema,
  };

  const components: Json = {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "Supabase access token" } },
    schemas: {
      ApiError: {
        type: "object",
        required: ["error", "requestId"],
        properties: {
          error: { type: "object", required: ["code", "message"], properties: { code: { type: "string", enum: [...apiErrorCodes] }, message: { type: "string" }, details: {} } },
          requestId: { type: "string" },
        },
        example: { error: { code: "FORBIDDEN", message: "You are not a member of this workspace" }, requestId: "6f1c1b4e-6e2a-4c0e-9a4c-2b8d1f0e7a11" },
      },
      Health: { type: "object", properties: { status: { type: "string" }, version: { type: "string" }, startedAt: { type: "string" }, uptimeSeconds: { type: "integer" }, dataStore: { type: "string" }, aiProvider: { type: "string" } } },
      CurrentUser: { type: "object", properties: { id: { type: "string" }, email: { type: "string", nullable: true }, displayName: { type: "string", nullable: true }, institution: { type: "string", nullable: true }, department: { type: "string", nullable: true }, designation: { type: "string", nullable: true }, workspaces: list("Workspace") } },
      Workspace: { type: "object", properties: { id: { type: "string" }, organizationId: { type: "string" }, name: { type: "string" }, slug: { type: "string" }, description: { type: "string", nullable: true }, settings: { type: "object" }, role: { type: "string", enum: ["owner", "admin", "faculty", "reviewer"] }, createdAt: { type: "string" }, updatedAt: { type: "string" } } },
      WorkspaceMember: { type: "object", properties: { id: { type: "string" }, workspaceId: { type: "string" }, userId: { type: "string" }, role: { type: "string" }, createdAt: { type: "string" } } },
      CreateWorkspace: schema(createWorkspaceSchema),
      UpdateWorkspace: schema(updateWorkspaceSchema),
      AddWorkspaceMember: schema(addWorkspaceMemberSchema),
      Document: { type: "object", properties: { id: { type: "string" }, workspaceId: { type: "string" }, courseId: { type: "string", nullable: true }, kind: { type: "string" }, title: { type: "string" }, originalFilename: { type: "string" }, mimeType: { type: "string" }, byteSize: { type: "integer" }, status: { type: "string", enum: ["pending_upload", "uploaded", "extracting", "ready", "failed", "deleted"] }, contentHash: { type: "string", nullable: true }, language: { type: "string", nullable: true }, extractionErrorCode: { type: "string", nullable: true }, retentionUntil: { type: "string", nullable: true }, containsPersonalData: { type: "boolean" }, createdAt: { type: "string" }, updatedAt: { type: "string" } } },
      DocumentDetail: { allOf: [ref("Document"), { type: "object", properties: { chunkCount: { type: "integer" }, extraction: { type: "object", nullable: true } } }] },
      UploadIntentRequest: schema(uploadIntentSchema),
      UploadIntent: { type: "object", properties: { document: ref("Document"), upload: { type: "object", properties: { method: { type: "string", enum: ["PUT"] }, url: { type: "string" }, token: { type: "string", nullable: true }, headers: { type: "object" }, expiresAt: { type: "string" }, maxBytes: { type: "integer" } } } } },
      CompleteUpload: schema(completeUploadSchema),
      CreateAnalysis: { ...schema(createAnalysisSchema), description: "`input` must match the schema for `type` (see AnalysisInput_* schemas)." },
      ...Object.fromEntries(Object.entries(analysisInputs).map(([type, inputSchema]) => [`AnalysisInput_${type}`, schema(inputSchema)])),
      Analysis: { type: "object", properties: { id: { type: "string" }, workspaceId: { type: "string" }, type: { type: "string", enum: [...analysisTypes] }, module: { type: "string" }, title: { type: "string" }, status: { type: "string", enum: [...analysisStatuses] }, progress: { type: "integer" }, currentStep: { type: "string", nullable: true }, attemptCount: { type: "integer" }, input: { type: "object" }, settings: { type: "object" }, promptVersion: { type: "string", nullable: true }, modelProvider: { type: "string", nullable: true }, modelName: { type: "string", nullable: true }, failureCode: { type: "string", nullable: true }, failureMessage: { type: "string", nullable: true }, approvedAt: { type: "string", nullable: true }, approvedBy: { type: "string", nullable: true }, startedAt: { type: "string", nullable: true }, completedAt: { type: "string", nullable: true }, createdBy: { type: "string" }, createdAt: { type: "string" }, updatedAt: { type: "string" }, documentIds: { type: "array", items: { type: "string" } } } },
      Evidence: { type: "object", properties: { id: { type: "string" }, sourceType: { type: "string", enum: ["document_chunk", "research_work", "external_dataset", "calculated_metric"] }, documentId: { type: "string" }, documentChunkId: { type: "string" }, researchWorkId: { type: "string" }, externalSourceUrl: { type: "string" }, title: { type: "string" }, locator: { type: "object" }, excerpt: { type: "string" }, publishedYear: { type: "integer" }, metadata: { type: "object" } } },
      Finding: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, summary: { type: "string" }, confidence: { type: "string", enum: ["low", "medium", "high"] }, limitations: { type: "array", items: { type: "string" } }, requiresHumanReview: { type: "boolean" }, category: { type: "string" }, metrics: { type: "object" }, evidence: { type: "array", items: { type: "object", properties: { evidenceId: { type: "string" }, relation: { type: "string", enum: ["supports", "contradicts", "context"] } } } } } },
      ModelMetadata: { type: "object", properties: { provider: { type: "string" }, model: { type: "string" }, promptId: { type: "string" }, promptVersion: { type: "string" }, inputTokens: { type: "integer" }, outputTokens: { type: "integer" }, latencyMs: { type: "integer" }, estimatedCostUsd: { type: "number", nullable: true }, attempts: { type: "integer" } } },
      EvidenceBackedResult: { type: "object", description: "Every completed analysis exposes findings, evidence, confidence, limitations, provenance, prompt version, and model metadata.", properties: { findings: list("Finding"), evidence: list("Evidence"), confidence: { type: "string", enum: ["low", "medium", "high"] }, limitations: { type: "array", items: { type: "string" } }, provenance: { type: "object", properties: { analysisId: { type: "string" }, analysisType: { type: "string" }, documentIds: { type: "array", items: { type: "string" } }, evidenceIds: { type: "array", items: { type: "string" } }, retrieval: { type: "object" }, externalSources: { type: "object" }, generatedAt: { type: "string" }, modelCalls: list("ModelMetadata") } }, promptVersion: { type: "string" }, model: { ...ref("ModelMetadata"), nullable: true }, output: { type: "object", description: "Handler-specific structured output" } } },
      AnalysisEvent: { type: "object", properties: { id: { type: "string" }, analysisId: { type: "string" }, status: { type: "string" }, progress: { type: "integer" }, message: { type: "string" }, metadata: { type: "object" }, createdAt: { type: "string" } } },
      AnalysisDetail: { allOf: [ref("Analysis"), { type: "object", properties: { result: { ...ref("EvidenceBackedResult"), nullable: true }, events: list("AnalysisEvent") } }] },
      ApproveAnalysis: schema(approveAnalysisSchema),
      Artifact: { type: "object", properties: { id: { type: "string" }, analysisId: { type: "string" }, workspaceId: { type: "string" }, type: { type: "string" }, status: { type: "string", enum: ["draft", "faculty_edited", "approved", "exported"] }, title: { type: "string" }, content: { type: "object" }, contentText: { type: "string" }, version: { type: "integer" }, approvedAt: { type: "string", nullable: true }, approvedBy: { type: "string", nullable: true }, exportedAt: { type: "string", nullable: true }, createdAt: { type: "string" }, updatedAt: { type: "string" } } },
      UpdateArtifact: schema(updateArtifactSchema),
      ExportArtifact: schema(exportArtifactSchema),
      ArtifactExport: { type: "object", properties: { artifactId: { type: "string" }, version: { type: "integer" }, format: { type: "string" }, bucket: { type: "string" }, path: { type: "string" }, downloadUrl: { type: "string", description: "Short-lived signed URL" }, expiresAt: { type: "string" } } },
      Student: { type: "object", properties: { id: { type: "string" }, workspaceId: { type: "string" }, externalStudentId: { type: "string" }, displayName: { type: "string" }, email: { type: "string", nullable: true }, program: { type: "string", nullable: true }, cohort: { type: "string", nullable: true }, cgpa: { type: "number", nullable: true }, consentStatus: { type: "string" }, retentionUntil: { type: "string", nullable: true }, createdAt: { type: "string" }, updatedAt: { type: "string" } } },
      CreateStudent: schema(createStudentSchema),
      UpdateStudent: schema(updateStudentSchema),
      Achievement: { type: "object", properties: { id: { type: "string" }, studentId: { type: "string" }, workspaceId: { type: "string" }, documentId: { type: "string", nullable: true }, title: { type: "string" }, issuer: { type: "string", nullable: true }, achievementDate: { type: "string", nullable: true }, category: { type: "string" }, level: { type: "string", nullable: true }, description: { type: "string", nullable: true }, verificationStatus: { type: "string", enum: ["extracted", "student_submitted", "issuer_verified", "faculty_verified", "unverified"] }, verificationUrl: { type: "string", nullable: true }, verifiedAt: { type: "string", nullable: true }, verifiedBy: { type: "string", nullable: true }, extractedFields: { type: "object" }, createdAt: { type: "string" }, updatedAt: { type: "string" } } },
      CreateAchievement: schema(createAchievementSchema),
      UpdateAchievementVerification: schema(updateAchievementVerificationSchema),
      ResearchSource: { type: "object", properties: { key: { type: "string" }, name: { type: "string" }, description: { type: "string" }, baseUrl: { type: "string" }, requiresApiKey: { type: "boolean" }, enabled: { type: "boolean" } } },
      IndustrySource: { type: "object", properties: { key: { type: "string" }, name: { type: "string" }, sourceType: { type: "string" }, description: { type: "string" }, termsUrl: { type: "string", nullable: true } } },
    },
  };

  const paths: Json = {
    "/health": { get: { tags: ["System"], summary: "Liveness and configuration summary", security: [], responses: ok(ref("Health")) } },
    "/me": { get: { tags: ["System"], summary: "Current user and workspace memberships", responses: { ...ok(ref("CurrentUser")), ...errorResponses } } },
    "/workspaces": {
      get: { tags: ["Workspaces"], summary: "List workspaces for the current user", responses: { ...ok(list("Workspace")), ...errorResponses } },
      post: { tags: ["Workspaces"], summary: "Create a workspace (and organization when none is given)", requestBody: body("CreateWorkspace"), responses: { ...ok(ref("Workspace"), "Created", "201"), ...errorResponses } },
    },
    "/workspaces/{id}": {
      get: { tags: ["Workspaces"], parameters: [idParam], responses: { ...ok(ref("Workspace")), ...errorResponses } },
      patch: { tags: ["Workspaces"], summary: "Owner/admin only", parameters: [idParam], requestBody: body("UpdateWorkspace"), responses: { ...ok(ref("Workspace")), ...errorResponses } },
    },
    "/workspaces/{id}/members": {
      get: { tags: ["Workspaces"], parameters: [idParam], responses: { ...ok(list("WorkspaceMember")), ...errorResponses } },
      post: { tags: ["Workspaces"], summary: "Owner/admin only", parameters: [idParam], requestBody: body("AddWorkspaceMember"), responses: { ...ok(ref("WorkspaceMember"), "Created", "201"), ...errorResponses } },
    },
    "/workspaces/{id}/members/{memberId}": {
      delete: { tags: ["Workspaces"], summary: "Owner/admin only", parameters: [idParam, { ...idParam, name: "memberId" }], responses: { "204": { description: "Removed" }, ...errorResponses } },
    },
    "/documents": { get: { tags: ["Documents"], parameters: queryParams(documentListQuerySchema), responses: { ...ok(list("Document")), ...errorResponses } } },
    "/documents/upload-intent": {
      post: {
        tags: ["Documents"],
        summary: "Validate and register an upload; returns a short-lived signed upload instruction",
        requestBody: { required: true, content: { "application/json": { schema: ref("UploadIntentRequest"), example: { workspaceId: WORKSPACE_ID, kind: "syllabus", title: "CSE 2201 Syllabus", filename: "syllabus.pdf", mimeType: "application/pdf", byteSize: 182_000, purpose: "academic" } } } },
        responses: { ...ok(ref("UploadIntent"), "Created", "201"), ...errorResponses },
      },
    },
    "/documents/{id}/complete": { post: { tags: ["Documents"], summary: "Verify the uploaded object and queue extraction", parameters: [idParam], requestBody: body("CompleteUpload"), responses: { ...ok(ref("Document"), "Queued", "202"), ...errorResponses } } },
    "/documents/{id}": {
      get: { tags: ["Documents"], parameters: [idParam], responses: { ...ok(ref("DocumentDetail")), ...errorResponses } },
      delete: { tags: ["Documents"], parameters: [idParam], responses: { "204": { description: "Deleted" }, ...errorResponses } },
    },
    "/documents/{id}/reprocess": { post: { tags: ["Documents"], parameters: [idParam], responses: { ...ok(ref("Document"), "Queued", "202"), ...errorResponses } } },
    "/analyses": {
      get: { tags: ["Analyses"], parameters: queryParams(analysisListQuerySchema), responses: { ...ok(list("Analysis")), ...errorResponses } },
      post: {
        tags: ["Analyses"],
        summary: "Create and queue an analysis (idempotent with Idempotency-Key)",
        parameters: [idempotencyHeader],
        requestBody: { required: true, content: { "application/json": { schema: ref("CreateAnalysis"), examples: { teachingPulse: { value: { workspaceId: WORKSPACE_ID, type: "teaching_pulse", title: "Week 5 Recursion Pulse", documentIds: [DOC_ID], input: { topics: ["Recursion", "Base cases"], exitSlips: ["I still don't understand when recursion stops"], teacherObservations: ["Many students confused base case with loop exit"] }, settings: {} } }, researchGap: { value: { workspaceId: WORKSPACE_ID, type: "research_gap", title: "Gap check", documentIds: [], input: { topic: "federated learning for medical imaging", claimedGap: "No prior work studies federated learning on low-resource hospital imaging with label noise", yearFrom: 2019 }, settings: {} } } } } } },
        responses: { ...ok(ref("Analysis"), "Queued", "202"), ...ok(ref("Analysis"), "Idempotent replay", "200"), ...errorResponses },
      },
    },
    "/analyses/{id}": { get: { tags: ["Analyses"], parameters: [idParam], responses: { ...ok(ref("AnalysisDetail")), ...errorResponses } } },
    "/analyses/{id}/cancel": { post: { tags: ["Analyses"], parameters: [idParam], responses: { ...ok(ref("Analysis")), ...errorResponses } } },
    "/analyses/{id}/retry": { post: { tags: ["Analyses"], summary: "Re-queue a failed or cancelled analysis", parameters: [idParam], responses: { ...ok(ref("Analysis"), "Queued", "202"), ...errorResponses } } },
    "/analyses/{id}/approve": { post: { tags: ["Analyses"], summary: "Faculty approval of a completed analysis and its draft artifacts", parameters: [idParam], requestBody: body("ApproveAnalysis"), responses: { ...ok(ref("Analysis")), ...errorResponses } } },
    "/analyses/{id}/evidence": { get: { tags: ["Analyses"], parameters: [idParam], responses: { ...ok({ type: "object", properties: { evidence: list("Evidence"), findings: list("Finding") } }), ...errorResponses } } },
    "/analyses/{id}/artifacts": { get: { tags: ["Analyses"], parameters: [idParam], responses: { ...ok(list("Artifact")), ...errorResponses } } },
    "/artifacts/{id}": { patch: { tags: ["Artifacts"], summary: "Faculty edit; content changes create a new version", parameters: [idParam], requestBody: body("UpdateArtifact"), responses: { ...ok(ref("Artifact")), ...errorResponses } } },
    "/artifacts/{id}/export": { post: { tags: ["Artifacts"], summary: "Export an approved artifact to private storage (idempotent)", parameters: [idParam, idempotencyHeader], requestBody: body("ExportArtifact"), responses: { ...ok(ref("ArtifactExport"), "Created", "201"), ...errorResponses } } },
    "/students": {
      get: { tags: ["Students"], parameters: queryParams(studentListQuerySchema), responses: { ...ok(list("Student")), ...errorResponses } },
      post: { tags: ["Students"], requestBody: body("CreateStudent"), responses: { ...ok(ref("Student"), "Created", "201"), ...errorResponses } },
    },
    "/students/{id}": {
      get: { tags: ["Students"], parameters: [idParam], responses: { ...ok(ref("Student")), ...errorResponses } },
      patch: { tags: ["Students"], parameters: [idParam], requestBody: body("UpdateStudent"), responses: { ...ok(ref("Student")), ...errorResponses } },
    },
    "/students/{id}/achievements": {
      get: { tags: ["Students"], parameters: [idParam], responses: { ...ok(list("Achievement")), ...errorResponses } },
      post: { tags: ["Students"], parameters: [idParam], requestBody: body("CreateAchievement"), responses: { ...ok(ref("Achievement"), "Created", "201"), ...errorResponses } },
    },
    "/achievements/{id}/verification": { patch: { tags: ["Students"], summary: "Faculty/issuer verification status change", parameters: [idParam], requestBody: body("UpdateAchievementVerification"), responses: { ...ok(ref("Achievement")), ...errorResponses } } },
    "/research/sources": { get: { tags: ["Sources"], responses: { ...ok(list("ResearchSource")), ...errorResponses } } },
    "/industry/sources": { get: { tags: ["Sources"], parameters: [{ name: "workspaceId", in: "query", required: true, schema: { type: "string", format: "uuid" } }], responses: { ...ok(list("IndustrySource")), ...errorResponses } } },
  };

  return {
    openapi: "3.1.0",
    info: {
      title: "Pedago AI Backend API",
      version: options.version,
      description:
        "Evidence-first faculty intelligence API. All endpoints (except /health) require a Supabase JWT. Responses use the `{ data, meta?, requestId }` envelope; errors use `{ error: { code, message, details? }, requestId }`.",
    },
    servers: [{ url: options.basePath }],
    security: [{ bearerAuth: [] }],
    tags: [{ name: "System" }, { name: "Workspaces" }, { name: "Documents" }, { name: "Analyses" }, { name: "Artifacts" }, { name: "Students" }, { name: "Sources" }],
    paths,
    components,
  };
}
