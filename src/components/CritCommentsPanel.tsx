"use client";

import React, { useMemo, useState } from "react";
import { useComments } from "@/lib/useComments";

type Props = {
  boardId: string;
  /** If provided, "Selected" tab filters to this element's comments */
  attachedElementId?: string;
  /** If provided, filter comments by source (e.g., "liveCrit" for crit session comments) */
  source?: string | null;
};

/**
 * REFACTORED: Uses unified Supabase comments table with filtering support
 * 
 * This component displays comments from the shared Supabase comments table,
 * filtered by board, element (optional), and source (optional).
 */
export default function CritCommentsPanel({ boardId, attachedElementId, source }: Props) {
  // REFACTORED: Use unified useComments hook with filtering
  // If attachedElementId is provided and tab is "selected", filter by element
  // Otherwise, show all comments for the board (optionally filtered by source)
  const [allComments] = useComments({ 
    boardId, 
    elementId: null, // Fetch all comments, filter in UI for "selected" tab
    source: source || null 
  });
  
  const [tab, setTab] = useState<"all" | "selected">("all");

  // Filter comments based on selected tab
  const visible = useMemo(() => {
    if (tab === "selected" && attachedElementId) {
      // Filter to comments for the selected element
      return allComments.filter((c) => c.elementId === attachedElementId);
    }
    // Show all comments (already filtered by board and source via API)
    return allComments;
  }, [tab, allComments, attachedElementId]);

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="px-3 pt-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 p-1">
          <button
            className={`px-3 py-1 text-xs rounded-full ${tab === "all" ? "bg-black text-white" : "text-zinc-700"}`}
            onClick={() => setTab("all")}
          >
            All ({allComments.length})
          </button>
          <button
            className={`px-3 py-1 text-xs rounded-full ${tab === "selected" ? "bg-black text-white" : "text-zinc-700"}`}
            onClick={() => setTab("selected")}
            disabled={!attachedElementId}
            title={!attachedElementId ? "Select an element on the canvas" : ""}
          >
            Selected ({attachedElementId ? allComments.filter(c => c.elementId === attachedElementId).length : 0})
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto px-3 pb-3">
        {visible.length === 0 ? (
          <div className="text-xs text-zinc-500 mt-4">
            {tab === "selected"
              ? "No comments for the selected element."
              : "No comments yet."}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {visible
              .slice()
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((c) => (
                <div key={c.id} className="rounded-lg border px-3 py-2">
                  <div className="text-[11px] text-zinc-500 flex items-center justify-between">
                    <span>{c.category || "General"}</span>
                    <span className="font-mono text-[10px] opacity-60">
                      {c.elementId?.slice(0, 6)}…
                    </span>
                  </div>
                  <div className="text-sm mt-1">{c.text}</div>
                  <div className="text-[11px] text-zinc-400 mt-1">by {c.createdBy}</div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
