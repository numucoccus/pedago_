import type { ApiSuccess, ApiError } from "@pedago/shared";
import { supabase } from "@/lib/supabase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api/v1";

export class ApiRequestError extends Error {
  code: string;
  details?: unknown;
  requestId: string;
  status: number;

  constructor(code: string, message: string, status: number, requestId: string, details?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.details = details;
  }
}

function generateRequestId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiSuccess<T>> {
  const { body, params, headers = {}, signal, ...customConfig } = options;

  let url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const requestId = generateRequestId();

  // Attach Supabase access token if session exists
  let token: string | undefined;
  try {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;
  } catch {
    // Session retrieval error - proceed unauthenticated
  }

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Request-ID": requestId,
    ...(headers as Record<string, string>),
  };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...customConfig,
    headers: requestHeaders,
    signal,
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);

    let parsedJson: unknown;
    try {
      parsedJson = await response.json();
    } catch {
      parsedJson = null;
    }

    if (!response.ok) {
      const errorPayload = parsedJson as ApiError | null;
      throw new ApiRequestError(
        errorPayload?.error?.code || `HTTP_${response.status}`,
        errorPayload?.error?.message || `Request failed with status ${response.status}`,
        response.status,
        errorPayload?.requestId || requestId,
        errorPayload?.error?.details
      );
    }

    const successPayload = parsedJson as ApiSuccess<T>;
    return {
      data: successPayload?.data !== undefined ? successPayload.data : (parsedJson as T),
      meta: successPayload?.meta,
      requestId: successPayload?.requestId || requestId,
    };
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throw new ApiRequestError(
      "NETWORK_ERROR",
      error instanceof Error ? error.message : "Network request failed",
      0,
      requestId
    );
  }
}
