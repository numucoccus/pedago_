import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import swaggerUi from "swagger-ui-express";
import { APP_VERSION, type Container } from "./container.js";
import { buildOpenApiDocument } from "./docs/openapi.js";
import { authenticate } from "./middleware/authenticate.js";
import { errorHandler, notFoundHandler, type ErrorReporter } from "./middleware/error-handler.js";
import { createRateLimiters } from "./middleware/rate-limit.js";
import { requestId } from "./middleware/request-id.js";
import { createApiRouter } from "./routes/index.js";
import { AppError } from "./utils/errors.js";

export function createApp(container: Container, options: { errorReporter?: ErrorReporter } = {}): Express {
  const { env, logger } = container;
  const app = express();
  app.disable("x-powered-by");
  if (env.TRUST_PROXY) app.set("trust proxy", 1);

  app.use(requestId());
  app.use(helmet({ contentSecurityPolicy: env.NODE_ENV === "production" ? undefined : false }));
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.CORS_ORIGINS.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(AppError.forbidden("Origin not allowed"));
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key", "X-Request-Id"],
      exposedHeaders: ["X-Request-Id", "RateLimit", "RateLimit-Policy"],
      maxAge: 600,
    }),
  );
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id as string,
      autoLogging: { ignore: (req) => req.url?.endsWith("/health") ?? false },
      customProps: (req) => ({ userId: (req as express.Request).auth?.userId }),
      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(express.json({ limit: "2mb" }));

  const basePath = env.API_BASE_PATH.replace(/\/$/, "");
  const openapi = buildOpenApiDocument({ basePath, version: APP_VERSION });
  app.get(`${basePath}/openapi.json`, (_req, res) => {
    res.json(openapi);
  });
  app.use(`${basePath}/docs`, swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: "Pedago AI API" }));

  if (container.inngestHandler) {
    app.use("/api/inngest", container.inngestHandler);
  }

  app.use(
    basePath,
    createApiRouter({
      controllers: container.controllers,
      access: container.services.access,
      authenticate: authenticate(container.tokenVerifier),
      rateLimit: createRateLimiters(env),
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler(logger, options.errorReporter));
  return app;
}
