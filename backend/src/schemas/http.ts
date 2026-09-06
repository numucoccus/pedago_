import { analysisStatuses, analysisTypes, documentKinds, documentStatuses, paginationSchema } from "@pedago/shared";
import { z } from "zod";

export const idParamSchema = z.object({ id: z.uuid() });
export const memberParamsSchema = z.object({ id: z.uuid(), memberId: z.uuid() });

export const documentListQuerySchema = paginationSchema.extend({
  workspaceId: z.uuid(),
  kind: z.enum(documentKinds).optional(),
  status: z.enum(documentStatuses).optional(),
  courseId: z.uuid().optional(),
});

export const analysisListQuerySchema = paginationSchema.extend({
  workspaceId: z.uuid(),
  type: z.enum(analysisTypes).optional(),
  status: z.enum(analysisStatuses).optional(),
});

export const studentListQuerySchema = paginationSchema.extend({
  workspaceId: z.uuid(),
  cohort: z.string().max(64).optional(),
  program: z.string().max(160).optional(),
});

export const workspaceQuerySchema = z.object({ workspaceId: z.uuid() });
