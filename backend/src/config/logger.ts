import pino, { type Logger } from "pino";
import type { Env } from "./env.js";

export type AppLogger = Logger;

const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers['x-api-key']",
  "*.authorization",
  "*.serviceRoleKey",
  "*.apiKey",
  "*.token",
  "*.password",
  "*.content",
  "*.responseText",
  "*.anonymizedContent",
  "*.text",
  "*.excerpt",
];

export function createLogger(env: Pick<Env, "LOG_LEVEL" | "NODE_ENV">): AppLogger {
  return pino({
    level: env.LOG_LEVEL,
    base: { service: "pedago-backend", env: env.NODE_ENV },
    redact: { paths: REDACT_PATHS, censor: "[redacted]" },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}
