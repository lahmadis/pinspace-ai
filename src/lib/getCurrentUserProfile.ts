import { createClient } from "@/lib/supabase/server";

/**
 * Get the current user's profile from Supabase
 * 
 * Returns the profile with role field from the profiles table.
 * Returns null if user is not authenticated or profile not found.
 */
export async function getCurrentUserProfile(): Promise<{
  id: string;
  username: string;
  displayName: string;
  school: string;
  bio: string;
  avatarUrl: string;
  role?: "student" | "professor";
} | null> {
  try {
    const supabase = createClient();
    
    // Get the current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return null;
    }

    // Fetch profile from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, display_name, school, bio, avatar_url, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return null;
    }

    // Map database fields to camelCase
    return {
      id: profile.id,
      username: profile.username || "",
      displayName: profile.display_name || "",
      school: profile.school || "",
      bio: profile.bio || "",
      avatarUrl: profile.avatar_url || "",
      role: profile.role as "student" | "professor" | undefined,
    };
  } catch (error) {
    console.error("[getCurrentUserProfile] Error:", error);
    return null;
  }
}



