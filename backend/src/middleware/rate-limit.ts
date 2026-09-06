import type { ApiError } from "@pedago/shared";
import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import type { Env } from "../config/env.js";
import { reqId } from "./request-id.js";

function rateLimitedResponse(req: Request, res: Response): void {
  const body: ApiError = {
    error: { code: "RATE_LIMITED", message: "Too many requests; please retry later" },
    requestId: reqId(req),
  };
  res.status(429).json(body);
}

const keyGenerator = (req: Request): string => req.auth?.userId ?? req.ip ?? "anonymous";

export function createRateLimiters(env: Pick<Env, "RATE_LIMIT_WINDOW_MS" | "RATE_LIMIT_MAX" | "EXPENSIVE_RATE_LIMIT_MAX" | "NODE_ENV">) {
  const disabled = env.NODE_ENV === "test";
  const standard = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: disabled ? 1_000_000 : env.RATE_LIMIT_MAX,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator,
    handler: rateLimitedResponse,
    validate: { keyGeneratorIpFallback: false, xForwardedForHeader: false },
  });
  /** Applied to AI/analysis creation, uploads, exports, and reprocessing. */
  const expensive = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: disabled ? 1_000_000 : env.EXPENSIVE_RATE_LIMIT_MAX,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator,
    handler: rateLimitedResponse,
    validate: { keyGeneratorIpFallback: false, xForwardedForHeader: false },
  });
  return { standard, expensive };
}
