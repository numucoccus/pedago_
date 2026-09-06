import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend folder or workspace root if present
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const booleanFromEnv = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .transform((value) => value === true || value === "true" || value === "1");

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  API_BASE_PATH: z.string().default("/api/v1"),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://localhost:3001")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  SUPABASE_JWT_SECRET: z.string().min(16).optional(),
  SUPABASE_JWKS_URL: z.string().url().optional(),
  SUPABASE_JWT_ISSUER: z.string().optional(),
  DATABASE_URL: z.string().optional(),

  DATA_STORE: z.enum(["supabase", "memory"]).default("supabase"),
  JOB_DISPATCHER: z.enum(["inngest", "inline"]).default("inline"),
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
  INNGEST_APP_ID: z.string().default("pedago-backend"),

  AI_PROVIDER: z.enum(["openai_compatible", "fake"]).default("fake"),
  AI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("gpt-4o-mini"),
  AI_VISION_MODEL: z.string().optional(),
  AI_TRANSCRIPTION_MODEL: z.string().default("whisper-1"),
  AI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  AI_EMBEDDING_DIMENSION: z.coerce.number().int().min(8).max(4096).default(1536),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(600_000).default(90_000),
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  AI_INPUT_COST_PER_1K_USD: z.coerce.number().min(0).optional(),
  AI_OUTPUT_COST_PER_1K_USD: z.coerce.number().min(0).optional(),

  RESEARCH_SOURCES: z
    .string()
    .default("openalex,semantic_scholar,crossref,arxiv")
    .transform((value) =>
      value
        .split(",")
        .map((source) => source.trim())
        .filter(Boolean),
    ),
  OPENALEX_MAILTO: z.string().email().optional(),
  SEMANTIC_SCHOLAR_API_KEY: z.string().optional(),
  CROSSREF_MAILTO: z.string().email().optional(),
  UNPAYWALL_EMAIL: z.string().email().optional(),
  RESEARCH_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(20_000),

  MAX_UPLOAD_BYTES: z.coerce.number().int().min(1024).default(50 * 1024 * 1024),
  SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(30).max(3600).default(300),
  EXPORT_URL_TTL_SECONDS: z.coerce.number().int().min(30).max(86_400).default(900),
  DEFAULT_RETENTION_DAYS: z.coerce.number().int().min(1).max(3650).default(365),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(300),
  EXPENSIVE_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(30),

  SENTRY_DSN: z.string().url().optional(),
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_SECRET_KEY: z.string().optional(),
  LANGFUSE_BASE_URL: z.string().url().optional(),
  TRUST_PROXY: booleanFromEnv.default(false),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === "production") {
    if (env.AI_PROVIDER === "fake") {
      throw new Error("AI_PROVIDER=fake is not allowed in production");
    }
    if (env.DATA_STORE === "memory") {
      throw new Error("DATA_STORE=memory is not allowed in production");
    }
    if (!env.SUPABASE_JWT_SECRET && !env.SUPABASE_JWKS_URL) {
      throw new Error("SUPABASE_JWT_SECRET or SUPABASE_JWKS_URL is required in production");
    }
  }
  if (env.AI_PROVIDER === "openai_compatible" && !env.AI_API_KEY) {
    throw new Error("AI_API_KEY is required when AI_PROVIDER=openai_compatible");
  }
  return env;
}

export function testEnv(overrides: Partial<Record<keyof Env, string>> = {}): Env {
  return loadEnv({
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    SUPABASE_URL: "http://localhost:54321",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-a-real-secret",
    SUPABASE_JWT_SECRET: "test-jwt-secret-with-at-least-32-characters!",
    DATA_STORE: "memory",
    JOB_DISPATCHER: "inline",
    AI_PROVIDER: "fake",
    AI_EMBEDDING_DIMENSION: "64",
    ...overrides,
  });
}

// Fallback exported instance
let defaultEnvInstance: Env | undefined;
export function getEnv(): Env {
  if (!defaultEnvInstance) {
    defaultEnvInstance = loadEnv();
  }
  return defaultEnvInstance;
}
