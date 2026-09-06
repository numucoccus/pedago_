import type { ApiError, ApiSuccess } from "@pedago/shared";
import type { NextFunction, Request, Response } from "express";
import type { AppLogger } from "../config/logger.js";
import { AppError, isAppError, toAppError } from "../utils/errors.js";
import { reqId } from "./request-id.js";

export interface ErrorReporter {
  captureException(error: unknown, context: { requestId: string; path: string; code: string }): void;
}

export function sendSuccess<T>(req: Request, res: Response, data: T, status = 200, meta?: Record<string, unknown>): void {
  const body: ApiSuccess<T> = { data, requestId: reqId(req), ...(meta ? { meta } : {}) };
  res.status(status).json(body);
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError("RESOURCE_NOT_FOUND", `Route ${req.method} ${req.path} not found`));
}

/** Centralized error middleware: stable codes, safe messages, request ids, structured logs. */
export function errorHandler(logger: AppLogger, reporter?: ErrorReporter) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (error: unknown, req: Request, res: Response, _next: NextFunction): void => {
    const appError = normalize(error);
    const requestId = reqId(req);
    const logContext = { requestId, method: req.method, path: req.path, code: appError.code, status: appError.status, userId: req.auth?.userId };
    if (appError.status >= 500) {
      logger.error({ ...logContext, err: appError.cause ?? appError }, appError.message);
      reporter?.captureException(appError.cause ?? appError, { requestId, path: req.path, code: appError.code });
    } else {
      logger.warn(logContext, appError.message);
    }
    if (res.headersSent) return;
    const body: ApiError = {
      error: {
        code: appError.code,
        message: appError.status >= 500 && appError.code === "INTERNAL_ERROR" ? "An unexpected error occurred" : appError.message,
        ...(appError.details !== undefined && appError.status < 500 ? { details: appError.details } : {}),
      },
      requestId,
    };
    res.status(appError.status).json(body);
  };
}

function normalize(error: unknown): AppError {
  if (isAppError(error)) return error;
  if (error && typeof error === "object" && "type" in error && (error as { type?: string }).type === "entity.parse.failed") {
    return AppError.validation("Request body is not valid JSON");
  }
  if (error && typeof error === "object" && "type" in error && (error as { type?: string }).type === "entity.too.large") {
    return new AppError("VALIDATION_FAILED", "Request body is too large", { status: 413 });
  }
  return toAppError(error);
}
