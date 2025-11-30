"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Get the current user's profile from Supabase profiles table
 * 
 * Matches profile by email from the authenticated user.
 * Returns { id, email, full_name, role } or null if not found.
 * 
 * This is a server-only function and must not be imported in client components.
 * 
 * PROFILE SCHEMA REQUIREMENTS:
 * 
 * The profiles table in Supabase must have the following structure:
 * 
 * - id: uuid (primary key, should match auth.users.id)
 * - email: text (unique, matches auth.users.email)
 * - full_name: text (nullable, optional)
 * - role: text (required, values: 'student' or 'professor')
 * 
 * Example SQL to create/update the profiles table:
 * 
 * CREATE TABLE IF NOT EXISTS profiles (
 *   id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 *   email TEXT UNIQUE NOT NULL,
 *   full_name TEXT,
 *   role TEXT NOT NULL CHECK (role IN ('student', 'professor')),
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
 * 
 * Note: The role field is required for new sign-ups. Old accounts without a role
 * will temporarily route to /boards, but should be prompted to select a role.
 */
export async function getCurrentProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", user.email)
    .maybeSingle();

  return profile; // { id, email, full_name, role }
}

