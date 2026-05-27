/**
 * Supabase Client — Route Handler (cookie-aware, RLS-enforcing)
 *
 * For App Router route handlers that need to act AS THE CALLING USER.
 * This is what you want for almost every authenticated API route — it
 * reads the session cookie set by the browser client and exposes the
 * user's JWT to PostgREST, so RLS policies on `auth.uid()` work.
 *
 * Compare with:
 *   - `client.ts` (`createBrowserClient`): runs in the browser, sets
 *     the session cookies that this server client reads.
 *   - `server.ts` (`getSupabaseServerClient`): uses the SERVICE ROLE
 *     key and BYPASSES RLS. Only correct for admin/maintenance tasks
 *     that act as the platform itself, not as a user. Do not use it
 *     to "auth check then query" — calling `auth.getUser()` on a
 *     service-role client without a JWT argument returns `null` user,
 *     because no session is attached.
 *
 * Next 15+ note: `cookies()` is async — must be awaited.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

export async function createSupabaseRouteHandlerClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Match the build-time tolerance of client.ts / server.ts so a
    // missing env doesn't fail `next build`. Runtime callers will
    // get 401s because `getUser()` will fail to validate.
    console.warn('⚠️ Supabase env vars not set; route handler will reject auth.');
    return createServerClient<Database>(
      'https://placeholder.supabase.co',
      'placeholder-anon-key',
      { cookies: { getAll: () => [], setAll: () => {} } },
    );
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      // The `getAll` / `setAll` shape is the modern @supabase/ssr API
      // (>= 0.4). Older `get`/`set`/`remove` works too but is deprecated.
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // `setAll` is invoked from a Server Component context in
          // some flows where cookies are read-only. Swallowing here
          // is the documented pattern — the middleware refreshes the
          // session on the next navigation, so a missed write is not
          // fatal.
        }
      },
    },
  });
}

// Made with Bob
