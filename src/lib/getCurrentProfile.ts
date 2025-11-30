import { createClient } from "@/lib/supabase/server";

/**
 * Get the current user's profile from Supabase profiles table
 * 
 * Matches profile by email (or id if available) from the authenticated user.
 * Returns { id, email, full_name, role } or null if not found.
 */
export async function getCurrentProfile(): Promise<{
  id: string;
  email: string;
  full_name: string;
  role: string;
} | null> {
  try {
    const supabase = createClient();
    
    // Get the current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return null;
    }

    // Try to find profile by id first (if profiles.id matches auth.users.id)
    let profile = null;
    let profileError = null;

    // First try matching by id
    const { data: profileById, error: errorById } = await supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("id", user.id)
      .single();

    if (!errorById && profileById) {
      profile = profileById;
    } else {
      // If not found by id, try matching by email
      if (user.email) {
        const { data: profileByEmail, error: errorByEmail } = await supabase
          .from("profiles")
          .select("id, email, full_name, role")
          .eq("email", user.email)
          .single();

        if (!errorByEmail && profileByEmail) {
          profile = profileByEmail;
        } else {
          profileError = errorByEmail;
        }
      } else {
        profileError = errorById;
      }
    }

    if (profileError || !profile) {
      return null;
    }

    return {
      id: profile.id,
      email: profile.email || "",
      full_name: profile.full_name || "",
      role: profile.role || "student",
    };
  } catch (error) {
    console.error("[getCurrentProfile] Error:", error);
    return null;
  }
}


