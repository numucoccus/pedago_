import type {
  AddWorkspaceMemberInput,
  CompleteUploadInput,
  CreateAchievementInput,
  CreateAnalysisInput,
  CreateStudentInput,
  CreateWorkspaceInput,
  ExportArtifactInput,
  UpdateAchievementVerificationInput,
  UpdateArtifactInput,
  UpdateStudentInput,
  UpdateWorkspaceInput,
  UploadIntentInput,
} from "@pedago/shared";
import type { Request, Response } from "express";
import type { z } from "zod";
import { requireAuth } from "../middleware/authenticate.js";
import { sendSuccess } from "../middleware/error-handler.js";
import { reqId } from "../middleware/request-id.js";
import { idempotencyKeyFrom } from "../middleware/validate.js";
import type { IndustryDemandProvider } from "../providers/industry/industry-demand-provider.js";
import type { ResearchAggregator } from "../providers/research/research-aggregator.js";
import type { analysisListQuerySchema, documentListQuerySchema, studentListQuerySchema, workspaceQuerySchema } from "../schemas/http.js";
import type { AnalysisService } from "../services/analysis/analysis-service.js";
import type { ArtifactService } from "../services/artifacts/artifact-service.js";
import type { DocumentService } from "../services/documents/document-service.js";
import type { StudentService } from "../services/students/student-service.js";
import type { WorkspaceService } from "../services/workspaces/workspace-service.js";

const auditOf = (req: Request) => ({ actorId: req.auth?.userId ?? null, requestId: reqId(req) });
const params = (req: Request) => req.validated.params as { id: string; memberId?: string };

export interface Controllers {
  system: ReturnType<typeof systemController>;
  workspaces: ReturnType<typeof workspaceController>;
  documents: ReturnType<typeof documentController>;
  analyses: ReturnType<typeof analysisController>;
  artifacts: ReturnType<typeof artifactController>;
  students: ReturnType<typeof studentController>;
  sources: ReturnType<typeof sourceController>;
}

export function systemController(workspaces: WorkspaceService, info: { version: string; startedAt: string; dataStore: string; aiProvider: string }) {
  return {
    health: (req: Request, res: Response) => {
      sendSuccess(req, res, { status: "ok", version: info.version, startedAt: info.startedAt, uptimeSeconds: Math.round(process.uptime()), dataStore: info.dataStore, aiProvider: info.aiProvider });
    },
    me: async (req: Request, res: Response) => {
      const { userId, email } = requireAuth(req);
      sendSuccess(req, res, await workspaces.currentUser(userId, email));
    },
  };
}

export function workspaceController(service: WorkspaceService) {
  return {
    list: async (req: Request, res: Response) => {
      sendSuccess(req, res, await service.list(requireAuth(req).userId));
    },
    create: async (req: Request, res: Response) => {
      sendSuccess(req, res, await service.create(requireAuth(req).userId, req.validated.body as CreateWorkspaceInput, auditOf(req)), 201);
    },
    get: async (req: Request, res: Response) => {
      sendSuccess(req, res, await service.get(requireAuth(req).userId, params(req).id));
    },
    update: async (req: Request, res: Response) => {
      sendSuccess(req, res, await service.update(requireAuth(req).userId, params(req).id, req.validated.body as UpdateWorkspaceInput, auditOf(req)));
    },
    listMembers: async (req: Request, res: Response) => {
      sendSuccess(req, res, await service.listMembers(requireAuth(req).userId, params(req).id));
    },
    addMember: async (req: Request, res: Response) => {
      sendSuccess(req, res, await service.addMember(requireAuth(req).userId, params(req).id, req.validated.body as AddWorkspaceMemberInput, auditOf(req)), 201);
    },
    removeMember: async (req: Request, res: Response) => {
      await service.removeMember(requireAuth(req).userId, params(req).id, params(req).memberId!, auditOf(req));
      res.status(204).end();
    },
  };
}

export function documentController(service: DocumentService) {
  return {
    list: async (req: Request, res: Response) => {
      const query = req.validated.query as z.infer<typeof documentListQuerySchema>;
      const { items, total } = await service.list(requireAuth(req).userId, query.workspaceId, query);
      sendSuccess(req, res, items, 200, { total, limit: query.limit, offset: query.offset });
    },
    uploadIntent: async (req: Request, res: Response) => {
      sendSuccess(req, res, await service.createUploadIntent(requireAuth(req).userId, req.validated.body as UploadIntentInput, auditOf(req)), 201);
    },
    complete: async (req: Request, res: Response) => {
      sendSuccess(req, res, await service.completeUpload(requireAuth(req).userId, params(req).id, (req.validated.body ?? {}) as CompleteUploadInput, auditOf(req)), 202);
    },
    get: async (req: Request, res: Response) => {
      sendSuccess(req, res, await service.get(requireAuth(req).userId, params(req).id, auditOf(req)));
    },
    remove: async (req: Request, res: Response) => {
      await service.delete(requireAuth(req).userId, params(req).id, auditOf(req));
      res.status(204).end();
    },
    reprocess: async (req: Request, res: Response) => {
      sendSuccess(req, res, await service.reprocess(requireAuth(req).userId, params(req).id, auditOf(req)), 202);
    },
  };
}

export function analysisController(service: AnalysisService) {
  return {
    list: async (req: Request, res: Response) => {
      const query = req.validated.query as z.infer<typeof analysisListQuerySchema>;
      const { items, total } = await service.list(requireAuth(req).userId, query.workspaceId, query);
      sendSuccess(req, res, items, 200, { total, limit: query.limit, offset: query.offset });
    },
    create: async (req: Request, res: Response) => {
      const { analysis, created } = await service.create(requireAuth(req).userId, req.validated.body as CreateAnalysisInput, idempotencyKeyFrom(req), auditOf(req));
      sendSuccess(req, res, analysis, created ? 202 : 200, { idempotentReplay: !created });
    },
    get: async (req: Request, res: Response) => {
      sendSuccess(req, res, await service.get(requireAuth(req).userId, params(req).id, auditOf(req)));
    },
    cancel: async (req: Request, res: Response) => {
      sendSuccess(req, res, await service.cancel(requireAuth(req).userId, params(req).id, auditOf(req)));
    },
    retry: async (req: Request, res: Response) => {
      sendSuccess(req, res, await service.retry(requireAuth(req).userId, params(req).id, auditOf(req)), 202);
    },
    approve: async (req: Request, res: Response) => {
      const body = (req.validated.body ?? {}) as { note?: string };
      sendSuccess(req, res, await service.approve(requireAuth(req).userId, params(req).id, body.note, auditOf(req)));
    },
    evidence: async (req: Request, res: Response) => {
      sendSuccess(req, res, await service.evidence(requireAuth(req).userId, params(req).id));
    },
    artifacts: async (req: Request, res: Response) => {
      sendSuccess(req, res, await service.artifacts(requireAuth(req).userId, params(req).id));
    },
  };
}

export function artifactController(service: ArtifactService) {
  return {
    update: async (req: Request, res: Response) => {
      sendSuccess(req, res, await service.update(requireAuth(req).userId, params(req).id, req.validated.body as UpdateArtifactInput, auditOf(req)));
    },
    export: async (req: Request, res: Response) => {
      const { export: result, created } = await service.export(requireAuth(req).userId, params(req).id, req.validated.body as ExportArtifactInput, idempotencyKeyFrom(req), auditOf(req));
      sendSuccess(req, res, result, created ? 201 : 200, { idempotentReplay: !created });
    },
  };
}

export function studentController(service: StudentService) {
  return {
    list: async (req: Request, res: Response) => {
      const query = req.validated.query as z.infer<typeof studentListQuerySchema>;
      const { items, total } = await service.list(requireAuth(req).userId, query.workspaceId, query);
      sendSuccess(req, res, items, 200, { total, limit: query.limit, offset: query.offset });
    },
    create: async (req: Request, res: Response) => {
      sendSuccess(req, res, await service.create(requireAuth(req).userId, req.validated.body as CreateStudentInput, auditOf(req)), 201);
    },
    get: async (req: Request, res: Response) => {
      sendSuccess(req, res, await service.get(requireAuth(req).userId, params(req).id, auditOf(req)));
    },
    update: async (req: Request, res: Response) => {
      sendSuccess(req, res, await service.update(requireAuth(req).userId, params(req).id, req.validated.body as UpdateStudentInput, auditOf(req)));
    },
    listAchievements: async (req: Request, res: Response) => {
      sendSuccess(req, res, await service.listAchievements(requireAuth(req).userId, params(req).id));
    },
    createAchievement: async (req: Request, res: Response) => {
      sendSuccess(req, res, await service.createAchievement(requireAuth(req).userId, params(req).id, req.validated.body as CreateAchievementInput, auditOf(req)), 201);
    },
    updateVerification: async (req: Request, res: Response) => {
      sendSuccess(req, res, await service.updateVerification(requireAuth(req).userId, params(req).id, req.validated.body as UpdateAchievementVerificationInput, auditOf(req)));
    },
  };
}

export function sourceController(research: ResearchAggregator, industry: IndustryDemandProvider) {
  return {
    research: (req: Request, res: Response) => {
      requireAuth(req);
      sendSuccess(req, res, research.catalog());
    },
    industry: async (req: Request, res: Response) => {
      const query = req.validated.query as z.infer<typeof workspaceQuerySchema>;
      sendSuccess(req, res, await industry.catalog(query.workspaceId));
    },
  };
}
