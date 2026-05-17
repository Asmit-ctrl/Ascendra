/**
 * Supabase Client - Browser-side
 * 
 * Creates a Supabase client for use in React components.
 * Uses anon key (safe to expose in browser).
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseClient() {
  if (client) {
    return client;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

  return client;
}

// Convenience export
export const supabase = getSupabaseClient();
