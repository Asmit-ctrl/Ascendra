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
    // During build time, use placeholder values to allow build to complete
    // At runtime in browser, this will be caught by the auth check
    if (typeof window === 'undefined') {
      console.warn('⚠️ Supabase env vars not set. Using placeholder for build.');
      client = createBrowserClient<Database>(
        'https://placeholder.supabase.co',
        'placeholder-anon-key'
      );
      return client;
    }
    
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

  return client;
}

// Export singleton instance
export const supabase = getSupabaseClient();

