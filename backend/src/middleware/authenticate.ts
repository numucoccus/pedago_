import type { NextFunction, Request, Response } from "express";
import type { TokenVerifier } from "../providers/auth/token-verifier.js";
import { AppError } from "../utils/errors.js";

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  role?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  auth?: { userId: string; email: string | null };
  accessToken?: string;
}

/** Resolves the user strictly from the verified bearer token; request bodies never carry identity. */
export function authenticate(verifier: TokenVerifier) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const header = req.header("authorization");
    if (!header || !header.toLowerCase().startsWith("bearer ")) {
      next(AppError.authRequired("Missing bearer token"));
      return;
    }
    const token = header.slice(7).trim();
    if (!token) {
      next(AppError.authRequired("Missing bearer token"));
      return;
    }
    try {
      const identity = await verifier.verify(token);
      req.auth = { userId: identity.userId, email: identity.email };
      (req as AuthenticatedRequest).user = {
        id: identity.userId,
        email: identity.email,
        role: identity.role,
      };
      (req as AuthenticatedRequest).accessToken = token;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireAuth(req: Request): { userId: string; email: string | null } {
  if (!req.auth) throw AppError.authRequired();
  return req.auth;
}
