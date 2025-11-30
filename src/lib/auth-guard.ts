"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth Guard Utility
 * 
 * Server-side function to protect routes that require authentication.
 * 
 * Usage in server components:
 *   await requireAuth();
 * 
 * If user is not authenticated, redirects to /auth.
 * Returns the authenticated user if successful.
 */
export async function requireAuth() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth");
  }

  return user;
}

/**
 * Optional Auth Check
 * 
 * Returns the current user if authenticated, null otherwise.
 * Does not redirect - useful for conditional rendering.
 */
export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

