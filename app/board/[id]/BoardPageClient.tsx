"use client";

import { useState, useEffect } from "react";

// A single comment on the board
type Comment = {
  id: string;
  author: string;
  text: string;
  timestamp: string;
};

// The props this client component expects
type BoardPageClientProps = {
  boardId: string;
};

export default function BoardPageClient({ boardId }: BoardPageClientProps) {
  // local state
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);

  // snapshots
  const [snapshots, setSnapshots] = useState<
    Array<{ id: string; label: string; data: unknown }>
  >([]);
  const [currentSnapshotId, setCurrentSnapshotId] = useState<string>("live");

  // load comments on mount + whenever boardId changes
  useEffect(() => {
    async function loadComments() {
      const res = await fetch("/api/comments", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      // for now we’re not filtering per-board, just store them
      setComments(data.comments || []);
    }
    loadComments();
  }, [boardId]);

  // post a new comment
  async function handlePostComment() {
    if (!name.trim() || !note.trim()) return;

    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author: name,
        text: note,
        boardId,
      }),
    });

    if (!res.ok) {
      console.error("comment post failed");
      return;
    }

    // clear inputs
    setNote("");

    // reload comments so UI updates
    const refreshed = await fetch("/api/comments", { cache: "no-store" });
    if (refreshed.ok) {
      const data = await refreshed.json();
      setComments(data.comments || []);
    }
  }


  // load snapshots on mount
  useEffect(() => {
    async function loadSnaps() {
      const res = await fetch("/api/snapshots", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setSnapshots(data.snapshots || []);
    }
    loadSnaps();
  }, [boardId]);

  // figure out if we’re previewing a snapshot or "live"
  const previewSnapshot =
    currentSnapshotId !== "live"
      ? snapshots.find((s) => s.id === currentSnapshotId)
      : null;

  // comments to show in the right panel (live vs snapshot)
  const visibleComments = previewSnapshot
    ? // @ts-ignore – your snapshot payload shape is whatever you saved
      (previewSnapshot.data?.comments as Comment[]) || []
    : comments;

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      {/* HEADER ROW */}
      <header className="flex items-start justify-between border-b border-gray-200 p-4">
        {/* left: board info */}
        <div>
          <div className="text-lg font-semibold leading-tight">
            Runway / Movement Study
          </div>
          <div className="text-sm text-gray-500">
            Last edited 2h ago · 3 collaborators
          </div>
        </div>

        {/* middle: snapshot controls */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <select
              className="rounded border border-gray-300 bg-white px-2 py-2 text-xs"
              value={currentSnapshotId}
              onChange={(e) => setCurrentSnapshotId(e.target.value)}
            >
              <option value="live">Live board</option>
              {snapshots.map((snap) => (
                <option key={snap.id} value={snap.id}>
                  {snap.label ?? snap.id}
                </option>
              ))}
            </select>

            <button className="rounded bg-indigo-600 text-white px-3 py-2 text-xs font-medium hover:bg-indigo-500">
              Present to Class
            </button>

            <button className="rounded border border-gray-300 bg-white px-3 py-2 text-xs font-medium hover:bg-gray-50">
              Share
            </button>
          </div>

          {/* yellow bar if you're previewing an old snapshot */}
          {previewSnapshot && (
            <div className="rounded bg-yellow-100 border border-yellow-300 text-yellow-800 text-[11px] px-2 py-1 w-fit">
              Snapshot preview mode – changes here won’t update the live board.
              Select “Live board” to exit.
            </div>
          )}
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside className="w-48 shrink-0 border-r border-gray-200 bg-white p-4 text-sm">
          <div className="font-semibold text-gray-900 mb-4">PinSpace</div>
          <nav className="flex flex-col gap-2 text-gray-700">
            <button className="flex items-center gap-2 rounded border border-gray-300 bg-gray-100 px-2 py-1 text-xs font-medium">
              Home
            </button>
            <button className="flex items-center gap-2 rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50">
              Boards
            </button>
            <button className="flex items-center gap-2 rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50">
              Classroom
            </button>
            <button className="flex items-center gap-2 rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50">
              Explore
            </button>
            <button className="flex items-center gap-2 rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50">
              Profile
            </button>
          </nav>
        </aside>

        {/* BOARD COLUMN */}
        <main className="flex-1 overflow-y-auto p-6 bg-white">
          {/* fake “Add reference” drop area */}
          <div className="rounded border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center text-xs text-gray-500 mb-6">
            <div className="font-medium text-gray-700 mb-1">+ Add reference</div>
            <div>Upload screenshots, sketches, model shots…</div>
          </div>

          {/* board cards – placeholder design content */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded border border-gray-300 bg-white text-[11px]">
              <div className="border-b border-gray-200 bg-gray-100 p-3 text-[11px] text-gray-500 text-center">
                Facade reference img
              </div>
              <div className="p-3 text-[11px] leading-[1.4]">
                Layered reflective skin / textile logic. Surface reads as motion.
              </div>
            </div>

            <div className="rounded border border-gray-300 bg-white text-[11px]">
              <div className="border-b border-gray-200 bg-gray-100 p-3 text-[11px] text-gray-500 text-center">
                Circulation diagram
              </div>
              <div className="p-3 text-[11px] leading-[1.4]">
                Circulation acts like a runway spine. Public spine / visibility.
              </div>
            </div>

            <div className="rounded border border-gray-300 bg-yellow-100 text-[11px]">
              <div className="border-b border-yellow-300 bg-yellow-50 p-3 text-[11px] text-gray-700 text-center">
                Concept note
              </div>
              <div className="p-3 text-[11px] leading-[1.4] text-gray-800">
                “Public edge is porous, not sealed. You are in but still seen.”
              </div>
            </div>
          </div>
        </main>

        {/* COMMENTS / CRIT PANEL */}
        <aside className="w-80 shrink-0 border-l border-gray-200 bg-white flex flex-col">
          <div className="border-b border-gray-200 p-3 text-sm font-medium">
            Comments
          </div>

          {/* comment list */}
          <div className="flex-1 overflow-y-auto p-3 text-[11px] leading-[1.4] text-gray-800 space-y-3">
            {visibleComments.length === 0 ? (
              <div className="text-gray-400 text-[11px] italic">
                No comments yet.
              </div>
            ) : (
              visibleComments.map((c) => (
                <div
                  key={c.id}
                  className="rounded border border-gray-300 bg-white p-2"
                >
                  <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                    <span className="font-medium text-gray-700">
                      {c.author}
                    </span>
                    <span>{c.timestamp}</span>
                  </div>
                  <div className="text-[11px] text-gray-800 whitespace-pre-line">
                    {c.text}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* new comment form */}
          <div className="border-t border-gray-200 p-3 text-[11px] text-gray-700">
            <div className="mb-2">
              <label className="block text-[10px] text-gray-500 mb-1">
                Your name
              </label>
              <input
                className="w-full rounded border border-gray-300 bg-white p-1 text-[11px]"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Studio Guest"
              />
            </div>

            <div className="mb-2">
              <label className="block text-[10px] text-gray-500 mb-1">
                Note
              </label>
              <textarea
                className="w-full rounded border border-gray-300 bg-white p-1 text-[11px]"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note…"
              />
            </div>

            <button
              onClick={handlePostComment}
              className="w-full rounded bg-indigo-600 text-white text-[11px] font-medium py-2 hover:bg-indigo-500 disabled:opacity-50"
              disabled={!name.trim() || !note.trim()}
            >
              Post
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
