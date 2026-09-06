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
