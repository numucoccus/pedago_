import {
  addWorkspaceMemberSchema,
  approveAnalysisSchema,
  completeUploadSchema,
  createAchievementSchema,
  createAnalysisSchema,
  createStudentSchema,
  createWorkspaceSchema,
  exportArtifactSchema,
  updateAchievementVerificationSchema,
  updateArtifactSchema,
  updateStudentSchema,
  updateWorkspaceSchema,
  uploadIntentSchema,
} from "@pedago/shared";
import { Router, type RequestHandler } from "express";
import type { Controllers } from "../controllers/index.js";
import { authorizeWorkspace } from "../middleware/authorize-workspace.js";
import { validate } from "../middleware/validate.js";
import { analysisListQuerySchema, documentListQuerySchema, idParamSchema, memberParamsSchema, studentListQuerySchema, workspaceQuerySchema } from "../schemas/http.js";
import { MANAGER_ROLES, type AccessService } from "../services/workspaces/workspace-service.js";

export interface RouterDeps {
  controllers: Controllers;
  access: AccessService;
  authenticate: RequestHandler;
  rateLimit: { standard: RequestHandler; expensive: RequestHandler };
}

/** HTTP wiring only: paths, middleware order, validation. No domain logic lives here. */
export function createApiRouter({ controllers, access, authenticate, rateLimit }: RouterDeps): Router {
  const router = Router();
  const wsParams = validate({ params: idParamSchema });

  router.get("/health", controllers.system.health);

  router.use(authenticate, rateLimit.standard);
  router.get("/me", controllers.system.me);

  router.get("/workspaces", controllers.workspaces.list);
  router.post("/workspaces", validate({ body: createWorkspaceSchema }), controllers.workspaces.create);
  router.get("/workspaces/:id", wsParams, authorizeWorkspace(access), controllers.workspaces.get);
  router.patch("/workspaces/:id", validate({ params: idParamSchema, body: updateWorkspaceSchema }), authorizeWorkspace(access, { roles: MANAGER_ROLES }), controllers.workspaces.update);
  router.get("/workspaces/:id/members", wsParams, authorizeWorkspace(access), controllers.workspaces.listMembers);
  router.post("/workspaces/:id/members", validate({ params: idParamSchema, body: addWorkspaceMemberSchema }), authorizeWorkspace(access, { roles: MANAGER_ROLES }), controllers.workspaces.addMember);
  router.delete("/workspaces/:id/members/:memberId", validate({ params: memberParamsSchema }), authorizeWorkspace(access, { roles: MANAGER_ROLES }), controllers.workspaces.removeMember);

  router.get("/documents", validate({ query: documentListQuerySchema }), controllers.documents.list);
  router.post("/documents/upload-intent", rateLimit.expensive, validate({ body: uploadIntentSchema }), controllers.documents.uploadIntent);
  router.post("/documents/:id/complete", rateLimit.expensive, validate({ params: idParamSchema, body: completeUploadSchema }), controllers.documents.complete);
  router.get("/documents/:id", wsParams, controllers.documents.get);
  router.delete("/documents/:id", wsParams, controllers.documents.remove);
  router.post("/documents/:id/reprocess", rateLimit.expensive, wsParams, controllers.documents.reprocess);

  router.get("/analyses", validate({ query: analysisListQuerySchema }), controllers.analyses.list);
  router.post("/analyses", rateLimit.expensive, validate({ body: createAnalysisSchema }), controllers.analyses.create);
  router.get("/analyses/:id", wsParams, controllers.analyses.get);
  router.post("/analyses/:id/cancel", wsParams, controllers.analyses.cancel);
  router.post("/analyses/:id/retry", rateLimit.expensive, wsParams, controllers.analyses.retry);
  router.post("/analyses/:id/approve", validate({ params: idParamSchema, body: approveAnalysisSchema }), controllers.analyses.approve);
  router.get("/analyses/:id/evidence", wsParams, controllers.analyses.evidence);
  router.get("/analyses/:id/artifacts", wsParams, controllers.analyses.artifacts);
  router.patch("/artifacts/:id", validate({ params: idParamSchema, body: updateArtifactSchema }), controllers.artifacts.update);
  router.post("/artifacts/:id/export", rateLimit.expensive, validate({ params: idParamSchema, body: exportArtifactSchema }), controllers.artifacts.export);

  router.get("/students", validate({ query: studentListQuerySchema }), controllers.students.list);
  router.post("/students", validate({ body: createStudentSchema }), controllers.students.create);
  router.get("/students/:id", wsParams, controllers.students.get);
  router.patch("/students/:id", validate({ params: idParamSchema, body: updateStudentSchema }), controllers.students.update);
  router.get("/students/:id/achievements", wsParams, controllers.students.listAchievements);
  router.post("/students/:id/achievements", validate({ params: idParamSchema, body: createAchievementSchema }), controllers.students.createAchievement);
  router.patch("/achievements/:id/verification", validate({ params: idParamSchema, body: updateAchievementVerificationSchema }), controllers.students.updateVerification);

  router.get("/research/sources", controllers.sources.research);
  router.get("/industry/sources", validate({ query: workspaceQuerySchema }), authorizeWorkspace(access, { source: "query" }), controllers.sources.industry);

  return router;
}
