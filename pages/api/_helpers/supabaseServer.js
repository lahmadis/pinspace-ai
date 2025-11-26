import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Server Helper
 * 
 * REFACTORED: Uses environment variables for Supabase configuration.
 * 
 * Creates a Supabase client for server-side API routes with session support.
 * 
 * Required environment variables (must be set in .env.local):
 * - NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY: Your Supabase anon/public key
 * 
 * This helper:
 * 1. Creates a Supabase client with the anon key from environment variables
 * 2. Reads the session from request cookies/headers
 * 3. Returns the client and user (if authenticated)
 * 
 * @param {Object} req - Next.js request object
 * @returns {Object} { supabase, user } - Supabase client and user (if authenticated)
 */
export function getSupabaseClient(req) {
  // Get environment variables (required for Supabase to work)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Validate environment variables are present
  if (!supabaseUrl || !supabaseAnonKey) {
    const missingVars = [];
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    throw new Error(
      `Missing required Supabase environment variables: ${missingVars.join(', ')}. ` +
      'Please check your .env.local file.'
    );
  }

  // Create Supabase client
  // For server-side, we need to manually handle session from cookies/headers
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Don't persist on server
      autoRefreshToken: false, // Don't auto-refresh on server
    },
  });

  return { supabase };
}

/**
 * Get authenticated user from request
 * 
 * Reads the session token from request cookies/headers and gets the user.
 * 
 * NOTE: For full session support, you may need to configure Supabase to store
 * sessions in HTTP-only cookies and read them here. For now, this handles
 * the Authorization header approach which works when clients send the token.
 * 
 * For better security in production, use Supabase's cookie-based sessions
 * and read them from req.headers.cookie or use a cookie parser.
 * 
 * @param {Object} req - Next.js request object
 * @returns {Promise<Object|null>} User object or null if not authenticated
 */
export async function getAuthenticatedUser(req) {
  try {
    const { supabase } = getSupabaseClient(req);

    // Method 1: Try to get session from Authorization header
    // This works when client explicitly sends the token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        return user;
      }
    }

    // Method 2: Try to get session from cookies
    // Supabase stores session in cookies when using browser-based auth
    const cookieHeader = req.headers.cookie || '';
    
    // Look for Supabase auth cookie pattern: sb-<project-ref>-auth-token
    const cookiePattern = /sb-[^-]+-auth-token=([^;]+)/;
    const cookieMatch = cookieHeader.match(cookiePattern);
    
    if (cookieMatch) {
      try {
        // Decode and parse the cookie value (it's JSON)
        const cookieValue = decodeURIComponent(cookieMatch[1]);
        const sessionData = JSON.parse(cookieValue);
        
        // Extract access token from session data
        if (sessionData?.access_token) {
          const { data: { user }, error } = await supabase.auth.getUser(sessionData.access_token);
          if (!error && user) {
            return user;
          }
        }
      } catch (err) {
        // Cookie parse error - not a valid session cookie
        // Continue to return null (unauthenticated)
      }
    }

    // Method 3: If using Next.js cookies API (Pages Router doesn't have req.cookies by default)
    // You could also check req.cookies if you're using cookie-parser middleware
    // For now, we rely on Authorization header and cookie string parsing

    // No valid session found - user is not authenticated
    return null;
  } catch (error) {
    console.error('[getAuthenticatedUser] Error getting user:', error);
    // Return null on error to allow anonymous access (backward compatible)
    return null;
  }
}
