import type { ApiErrorCode } from "@pedago/shared";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  AUTH_REQUIRED: 401,
  FORBIDDEN: 403,
  VALIDATION_FAILED: 400,
  RESOURCE_NOT_FOUND: 404,
  UPLOAD_INVALID: 400,
  DOCUMENT_PROCESSING_FAILED: 422,
  PROVIDER_UNAVAILABLE: 503,
  AI_OUTPUT_INVALID: 502,
  ANALYSIS_FAILED: 500,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export interface AppErrorOptions {
  details?: unknown;
  retryable?: boolean;
  cause?: unknown;
  status?: number;
}

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: unknown;
  readonly retryable: boolean;

  constructor(code: ApiErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.status = options.status ?? STATUS_BY_CODE[code];
    this.details = options.details;
    this.retryable = options.retryable ?? (code === "PROVIDER_UNAVAILABLE" || code === "AI_OUTPUT_INVALID");
  }

  static authRequired(message = "Authentication required"): AppError {
    return new AppError("AUTH_REQUIRED", message);
  }

  static forbidden(message = "You do not have access to this resource"): AppError {
    return new AppError("FORBIDDEN", message);
  }

  static validation(message: string, details?: unknown): AppError {
    return new AppError("VALIDATION_FAILED", message, { details });
  }

  static notFound(resource: string): AppError {
    return new AppError("RESOURCE_NOT_FOUND", `${resource} not found`);
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError("CONFLICT", message, { details });
  }

  static uploadInvalid(message: string, details?: unknown): AppError {
    return new AppError("UPLOAD_INVALID", message, { details });
  }

  static providerUnavailable(message: string, cause?: unknown): AppError {
    return new AppError("PROVIDER_UNAVAILABLE", message, { cause, retryable: true });
  }

  static aiOutputInvalid(message: string, details?: unknown): AppError {
    return new AppError("AI_OUTPUT_INVALID", message, { details, retryable: true });
  }

  static documentProcessing(message: string, options: AppErrorOptions = {}): AppError {
    return new AppError("DOCUMENT_PROCESSING_FAILED", message, { retryable: false, ...options });
  }

  static analysisFailed(message: string, options: AppErrorOptions = {}): AppError {
    return new AppError("ANALYSIS_FAILED", message, { retryable: false, ...options });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Converts unknown failures into a typed error without leaking internals to clients. */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }
  if (error instanceof Error && error.name === "AbortError") {
    return new AppError("PROVIDER_UNAVAILABLE", "Operation aborted or timed out", { cause: error, retryable: true });
  }
  return new AppError("INTERNAL_ERROR", "An unexpected error occurred", { cause: error });
}
