import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../utils/errors.js";

export interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/** Validates and replaces request input with parsed, typed values before controllers run. */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const issues: { location: string; path: string; message: string }[] = [];
    const parsedValues: { body?: unknown; query?: unknown; params?: unknown } = {};
    for (const location of ["params", "query", "body"] as const) {
      const schema = schemas[location];
      if (!schema) continue;
      const result = schema.safeParse(req[location] ?? {});
      if (result.success) {
        parsedValues[location] = result.data;
      } else {
        for (const issue of result.error.issues) {
          issues.push({ location, path: issue.path.join("."), message: issue.message });
        }
      }
    }
    if (issues.length > 0) {
      next(AppError.validation("Request validation failed", issues));
      return;
    }
    req.validated = {
      body: parsedValues.body ?? req.validated?.body,
      query: parsedValues.query ?? req.validated?.query,
      params: parsedValues.params ?? req.validated?.params,
    };
    next();
  };
}

export function idempotencyKeyFrom(req: Request): string | null {
  const value = req.header("idempotency-key");
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length < 8 || trimmed.length > 128 || !/^[A-Za-z0-9_.:-]+$/.test(trimmed)) {
    throw AppError.validation("Idempotency-Key must be 8-128 characters of [A-Za-z0-9_.:-]");
  }
  return trimmed;
}
