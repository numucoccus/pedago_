import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@pedago/shared";
import type { Env } from "./env.js";

export type ServiceSupabaseClient = SupabaseClient<Database>;

/**
 * Creates the backend-only service-role client. The key never leaves this process and is redacted
 * from logs by the logger configuration.
 */
export function createServiceClient(env: Pick<Env, "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY">): ServiceSupabaseClient {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-pedago-client": "backend" } },
  });
}

/**
 * Creates an authenticated Supabase client for a specific user request.
 * Enforces Row-Level Security (RLS) policies matching the provided access token.
 */
export function createSupabaseUserClient(
  env: Pick<Env, "SUPABASE_URL" | "SUPABASE_ANON_KEY">,
  accessToken: string
): SupabaseClient<Database> {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY || "", {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Health check utility to verify database connectivity to Supabase.
 */
export async function checkDatabaseConnection(client: ServiceSupabaseClient): Promise<{ ok: boolean; message?: string }> {
  try {
    const { error } = await client
      .from("profiles")
      .select("count", { count: "exact", head: true });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown connection error";
    return { ok: false, message };
  }
}
