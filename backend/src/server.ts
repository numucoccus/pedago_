import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { buildContainer } from "./container.js";
import type { ErrorReporter } from "./middleware/error-handler.js";

async function createErrorReporter(dsn: string | undefined, logger: { warn: (o: object, m: string) => void }): Promise<ErrorReporter | undefined> {
  if (!dsn) return undefined;
  try {
    // Sentry is optional; it is only loaded when a DSN is configured and the SDK is installed.
    const sentry = (await import("@sentry/node" as string)) as { init(options: { dsn: string }): void; captureException(error: unknown, hint?: unknown): void };
    sentry.init({ dsn });
    return { captureException: (error, context) => sentry.captureException(error, { extra: context }) };
  } catch {
    logger.warn({}, "SENTRY_DSN set but @sentry/node is not installed; error reporting disabled");
    return undefined;
  }
}

async function main(): Promise<void> {
  const env = loadEnv();
  const container = buildContainer(env);
  const { logger } = container;
  const errorReporter = await createErrorReporter(env.SENTRY_DSN, logger);
  const app = createApp(container, { errorReporter });

  const server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, basePath: env.API_BASE_PATH, dataStore: env.DATA_STORE, aiProvider: env.AI_PROVIDER, jobs: env.JOB_DISPATCHER, handlers: container.registry.types().length },
      "🚀 Pedago AI backend listening",
    );
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, "Shutting down HTTP server");
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "Unhandled promise rejection");
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
