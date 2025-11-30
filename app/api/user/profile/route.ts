import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/getCurrentProfile";

/**
 * GET /api/user/profile
 * 
 * Returns the current user's profile including role.
 * Matches profile by email or id from the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    
    if (!profile) {
      return NextResponse.json(
        { error: "Not authenticated or profile not found" },
        { status: 401 }
      );
    }

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error("[GET /api/user/profile] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

