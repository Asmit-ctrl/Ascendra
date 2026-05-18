/**
 * Supabase Client - Server-side
 * 
 * Creates a Supabase client for use in API routes and server components.
 * Uses service role key (keep secret, never expose to browser).
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

let serverClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseServerClient() {
  if (serverClient) {
    return serverClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    // During build time, use placeholder values to allow build to complete
    console.warn('⚠️ Supabase server env vars not set. Using placeholder for build.');
    serverClient = createClient<Database>(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseServiceKey || 'placeholder-service-key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    return serverClient;
  }

  serverClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serverClient;
}
