import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Create a Supabase client for server-side operations
 * 
 * This client is used in Next.js App Router API routes and server components.
 * It uses cookies to maintain the user session.
 * 
 * Required environment variables:
 * - NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY: Your Supabase anon/public key
 * 
 * @returns Supabase client instance
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const missingVars = [];
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    throw new Error(
      `Missing required Supabase environment variables: ${missingVars.join(', ')}. ` +
      'Please check your .env.local file.'
    );
  }

  const cookieStore = cookies();

  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      getSession: async () => {
        // Get session from cookies
        const cookieName = `sb-${supabaseUrl.split('//')[1]?.split('.')[0]}-auth-token`;
        const sessionCookie = cookieStore.get(cookieName);
        
        if (sessionCookie?.value) {
          try {
            const session = JSON.parse(sessionCookie.value);
            return { data: { session }, error: null };
          } catch {
            return { data: { session: null }, error: null };
          }
        }
        
        return { data: { session: null }, error: null };
      },
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

