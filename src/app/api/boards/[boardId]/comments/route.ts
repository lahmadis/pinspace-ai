import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { boardId: string } }
) {
  try {
    const { boardId } = params;

    if (!boardId) {
      return NextResponse.json(
        { error: "boardId is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      content,
      text,
      authorName,
      authorEmail,
      author,
      elementId,
      targetElementId,
      source,
      critSessionId,
      x,
      y,
      category = "general",
      task = false,
      isTask = false,
    } = body;

    // Use text or content (backward compatibility)
    const commentText = text || content;
    if (!commentText || typeof commentText !== "string" || commentText.trim().length === 0) {
      return NextResponse.json(
        { error: "text or content is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Determine author name
    const authorNameFinal = authorName || author || "Anonymous";

    // Determine target element ID (prefer targetElementId, fall back to elementId)
    const finalTargetElementId = targetElementId || elementId || null;

    const supabase = createClient();

    const { data: comment, error } = await supabase
      .from("comments")
      .insert({
        board_id: boardId,
        text: commentText.trim(),
        author_name: authorNameFinal,
        author_email: authorEmail || null,
        element_id: finalTargetElementId || null,
        target_element_id: finalTargetElementId || null,
        x: x || null,
        y: y || null,
        category: category || "general",
        is_task: task || isTask || false,
        source: source || null,
        crit_session_id: critSessionId || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/boards/[boardId]/comments] Error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/boards/[boardId]/comments] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}




