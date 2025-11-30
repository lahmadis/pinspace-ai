import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/signup
 * 
 * Creates a new user account with email/password authentication.
 * After creating the auth user, creates or updates the profile with role.
 * 
 * Request body:
 * - email: string (required)
 * - password: string (required, min 6 characters)
 * - full_name: string (optional)
 * - role: "student" | "professor" (required)
 * 
 * Returns:
 * - 201: User created successfully
 * - 400: Validation error
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, full_name, role } = body;

    // Validation
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password is required and must be at least 6 characters" },
        { status: 400 }
      );
    }

    if (!role || (role !== "student" && role !== "professor")) {
      return NextResponse.json(
        { error: "Role is required and must be 'student' or 'professor'" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (authError) {
      console.error("[POST /api/auth/signup] Auth error:", authError);
      return NextResponse.json(
        { error: authError.message || "Failed to create user account" },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 }
      );
    }

    // Create or update profile with role
    // Use upsert to handle case where profile might already exist
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: authData.user.id, // Use auth user id as profile id
          email: email.trim(),
          full_name: full_name?.trim() || null,
          role: role,
        },
        {
          onConflict: "id", // If profile exists, update it
        }
      )
      .select()
      .single();

    if (profileError) {
      console.error("[POST /api/auth/signup] Profile error:", profileError);
      // Note: Auth user was created, but profile creation failed
      // This is not ideal, but we'll return success and let the user sign in
      // The profile can be created/updated on first sign-in if needed
      return NextResponse.json(
        {
          error: "Account created but profile setup failed. Please try signing in.",
          user_id: authData.user.id,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Account created successfully",
        user_id: authData.user.id,
        profile: profileData,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/auth/signup] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

