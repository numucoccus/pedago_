import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@pedago/shared';
import { env } from './env.js';

/**
 * Service Role client for background jobs, administrative tasks, and bypassing RLS when needed.
 * NEVER expose this client to frontend or untrusted input.
 */
export const supabaseAdmin: SupabaseClient<Database> = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * Creates an authenticated Supabase client for a specific user request.
 * Enforces Row-Level Security (RLS) policies matching the provided access token.
 */
export function createSupabaseUserClient(accessToken: string): SupabaseClient<Database> {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
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
export async function checkDatabaseConnection(): Promise<{ ok: boolean; message?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('count', { count: 'exact', head: true });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown connection error';
    return { ok: false, message };
  }
}
