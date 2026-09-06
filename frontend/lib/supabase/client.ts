import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@pedago/shared';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ncdhjxdcrxgudladiajn.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZGhqeGRjcnhndWRsYWRpYWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2Nzg3NDAsImV4cCI6MjEwNDI1NDc0MH0.tgkq_Em0bLVTylcwhRNAS3FJkYz2B4rxylev-_T5OCE';

export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

export const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
