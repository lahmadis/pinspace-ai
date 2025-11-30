import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// IMPORTANT: After renaming route folders, you must stop and restart `npm run dev`
// so Next.js rebuilds its route manifest. Otherwise, routes may return 404.

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const boardId = id;

    if (!boardId) {
      return NextResponse.json(
        { error: "boardId is required" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Return all sessions for this board ordered by started_at desc
    const { data: sessions, error } = await supabase
      .from("crit_sessions")
      .select("*")
      .eq("board_id", boardId)
      .order("started_at", { ascending: false });

    if (error) {
      console.error("[GET /api/boards/[id]/crit-sessions] Error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessions: sessions || [] });
  } catch (error: any) {
    console.error("[GET /api/boards/[id]/crit-sessions] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const boardId = id;

    if (!boardId) {
      return NextResponse.json(
        { error: "boardId is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { board_snapshot } = body;

    const supabase = createClient();

    const { data: session, error } = await supabase
      .from("crit_sessions")
      .insert({
        board_id: boardId,
        board_snapshot: board_snapshot || null,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/boards/[id]/crit-sessions] Error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Return session with session.id as requested
    return NextResponse.json({ session }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/boards/[id]/crit-sessions] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}


