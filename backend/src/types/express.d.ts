import type { WorkspaceRole } from "@pedago/shared";
import type { WorkspaceRow } from "@pedago/shared/database";

export interface AuthenticatedUser {
  userId: string;
  email: string | null;
}

export interface RequestWorkspaceAccess {
  workspace: WorkspaceRow;
  role: WorkspaceRole;
}

export interface ValidatedRequest<TBody = unknown, TQuery = unknown, TParams = unknown> {
  body: TBody;
  query: TQuery;
  params: TParams;
}

declare global {
  namespace Express {
    interface Request {
      id: string;
      auth?: AuthenticatedUser;
      workspaceAccess?: RequestWorkspaceAccess;
      validated: ValidatedRequest;
    }
  }
}

export {};
