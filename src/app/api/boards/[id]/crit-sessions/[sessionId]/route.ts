import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// IMPORTANT: After renaming route folders, you must stop and restart `npm run dev`
// so Next.js rebuilds its route manifest. Otherwise, routes may return 404.

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: boardId, sessionId } = await context.params;

    if (!boardId) {
      return NextResponse.json(
        { error: "boardId is required" },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Update session by id (UUID) and board_id to ensure it belongs to this board
    const { data: session, error } = await supabase
      .from("crit_sessions")
      .update({
        ended_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("board_id", boardId)
      .select()
      .single();

    if (error) {
      console.error("[PATCH /api/boards/[id]/crit-sessions/[sessionId]] Error:", error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ session });
  } catch (error: any) {
    console.error("[PATCH /api/boards/[id]/crit-sessions/[sessionId]] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: boardId, sessionId } = await context.params;

    if (!boardId) {
      return NextResponse.json(
        { error: "boardId is required" },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Query session by id (UUID) and board_id to ensure it belongs to this board
    const { data: session, error: sessionError } = await supabase
      .from("crit_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("board_id", boardId)
      .single();

    if (sessionError) {
      console.error("[GET /api/boards/[id]/crit-sessions/[sessionId]] Session error:", sessionError);
      if (sessionError.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: sessionError.message },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Fetch all comments where crit_session_id = session.id
    const { data: comments, error: commentsError } = await supabase
      .from("comments")
      .select("*")
      .eq("crit_session_id", session.id)
      .order("created_at", { ascending: true });

    if (commentsError) {
      console.error("[GET /api/boards/[id]/crit-sessions/[sessionId]] Comments error:", commentsError);
      return NextResponse.json(
        { error: commentsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      session,
      comments: comments || [],
    });
  } catch (error: any) {
    console.error("[GET /api/boards/[id]/crit-sessions/[sessionId]] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}


