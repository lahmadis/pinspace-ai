import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client Utility
 * 
 * REFACTORED: Uses environment variables for Supabase configuration.
 * 
 * Creates a Supabase client for client-side authentication and database operations.
 * 
 * Required environment variables (must be set in .env.local):
 * - NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL
 *   Example: https://your-project.supabase.co
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY: Your Supabase anon/public key
 *   Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * 
 * This client is used for:
 * - Authentication (sign in, sign out, session management)
 * - Database queries with RLS (Row Level Security)
 * - Real-time subscriptions
 * 
 * To set up:
 * 1. Create a .env.local file in the project root
 * 2. Add the following variables:
 *    NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
 *    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
 * 3. Restart your Next.js dev server
 */

// Get environment variables (required for Supabase to work)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables are present
if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  console.error('❌ Supabase environment variables are missing:', missingVars.join(', '));
  console.error('💡 Please create a .env.local file in the project root with:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key');
  console.error('💡 Then restart your Next.js dev server.');
  
  // Throw error in development to catch misconfiguration early
  if (process.env.NODE_ENV === 'development') {
    throw new Error(
      `Missing required Supabase environment variables: ${missingVars.join(', ')}. ` +
      'Please check your .env.local file.'
    );
  }
}

// Create Supabase client with environment variables
// This client automatically handles cookies for session management
export const supabase = createClient(
  supabaseUrl!,
  supabaseAnonKey!,
  {
    auth: {
      persistSession: true, // Persist session in localStorage
      autoRefreshToken: true, // Automatically refresh tokens
      detectSessionInUrl: true, // Detect auth callback in URL
    },
  }
);


