import type { WorkspaceRole } from "@pedago/shared";
import type { NextFunction, Request, Response } from "express";
import { ALL_ROLES, type AccessService } from "../services/workspaces/workspace-service.js";
import { AppError } from "../utils/errors.js";
import { requireAuth } from "./authenticate.js";

export type WorkspaceIdSource = "params" | "body" | "query";

/**
 * Authorizes workspace membership (and optional role) for routes that carry a workspace id
 * directly. Routes addressing resources by id authorize inside their service after loading the
 * resource, so the workspace boundary is always derived from stored data — never from the client.
 */
export function authorizeWorkspace(access: AccessService, options: { roles?: WorkspaceRole[]; source?: WorkspaceIdSource; key?: string } = {}) {
  const source = options.source ?? "params";
  const key = options.key ?? (source === "params" ? "id" : "workspaceId");
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = requireAuth(req);
      const container = source === "params" ? req.params : source === "body" ? (req.validated.body as Record<string, unknown> | undefined) ?? req.body : (req.validated.query as Record<string, unknown> | undefined) ?? req.query;
      const workspaceId = (container as Record<string, unknown> | undefined)?.[key];
      if (typeof workspaceId !== "string" || workspaceId.length === 0) {
        throw AppError.validation(`Missing workspace identifier (${key})`);
      }
      req.workspaceAccess = await access.requireMembership(userId, workspaceId, options.roles ?? ALL_ROLES);
      next();
    } catch (error) {
      next(error);
    }
  };
}
