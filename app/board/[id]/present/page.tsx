"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import SidebarNav from "@/components/SidebarNav";
import CanvasToolbar, { type ToolType } from "@/components/CanvasToolbar"; // REFACTORED: Import ToolType to ensure activeTool is always valid
import BoardCanvas from "@/components/BoardCanvas";      // KEEP your existing canvas
import CritCommentsPanel from "@/components/CritCommentsPanel"; // replaced in step 2
// REFACTORED: Removed unnecessary defensive checks - getBoardById is exported from @/lib/storage
import { getBoardById, type StoredBoard } from "@/lib/storage";
import { timeAgo } from "@/lib/time";

// Helper to get board data for displaying last edited time
function safeGetBoard(boardId: string): StoredBoard | null {
  try {
    return getBoardById(boardId);
  } catch {
    return null;
  }
}

/** Stable, shareable session id for /live, derived from boardId. */
function makeLiveSessionId(boardId: string) {
  // keep prefix short and URL-friendly so the live page can resolve the host board
  const base = String(boardId).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
  // add a short nonce so multiple sessions can exist
  const nonce = Math.random().toString(36).slice(2, 7);
  return `${base}-${nonce}`;
}

export default function BoardPage() {
  const params = useParams<{ boardId: string }>();
  const boardId = (params?.boardId as string) || "";

  // REFACTORED: Ensure activeTool is always a valid ToolType (not undefined)
  // BoardCanvas requires activeTool to be ToolType (non-optional)
  // Initialize with "select" as default to ensure it's never undefined
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [snap, setSnap] = useState(false);

  // selection from canvas
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedElementId = selectedIds.length ? selectedIds[0] : null;

  // little header niceties
  const board = useMemo(() => (boardId ? safeGetBoard(boardId) : null), [boardId]);
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    setSessionId(makeLiveSessionId(boardId));
  }, [boardId]);

  return (
    <div className="min-h-screen w-full bg-gray-50 flex">
      {/* Left app nav (Boards / Classroom / Explore / My Profile) */}
      <SidebarNav />

      {/* Main column */}
      <main className="flex-1 min-h-screen px-6 py-6">
        {/* Top bar: visibility, version select, live-crit button */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-6">
            <div className="space-y-1">
              <div className="text-sm text-gray-500">Visibility:</div>
              <select className="rounded-md border px-2 py-1 text-sm">
                <option>Private</option>
                <option>Public</option>
              </select>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-gray-500">Board version</div>
              <select className="rounded-md border px-2 py-1 text-sm">
                <option>Live board</option>
                <option>Snapshot</option>
              </select>
            </div>

            {board ? (
              <div className="hidden md:block text-xs text-gray-500">
                Last edited {timeAgo(board.lastEdited)}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/live/${sessionId}`}
              className="rounded-md bg-indigo-600 text-white text-sm px-3 py-2 hover:bg-indigo-700 transition"
              title="Open a Live Crit session for this board"
            >
              Start live crit
            </Link>
          </div>
        </div>

        {/* Canvas + right comments rail */}
        <div className="grid grid-cols-12 gap-6">
          {/* Canvas/toolbar column */}
          <div className="col-span-9 rounded-xl border bg-white overflow-hidden">
            {/* Canvas toolbar (left vertical) */}
            <div className="flex">
              <div className="w-36 border-r bg-white">
                {/* REFACTORED: Updated CanvasToolbar props to match CanvasToolbarProps interface
                    - Changed setActiveTool to onToolChange
                    - Changed setZoom to onZoomIn/onZoomOut/onZoomReset callbacks
                    - Changed setSnap to onSnapToggle callback
                    - Removed pan/setPan (not used by CanvasToolbar component)
                */}
                <CanvasToolbar
                  activeTool={activeTool}
                  onToolChange={setActiveTool}
                  zoom={zoom}
                  onZoomIn={() => setZoom(Math.min(3, zoom * 1.1))}
                  onZoomOut={() => setZoom(Math.max(0.1, zoom / 1.1))}
                  onZoomReset={() => setZoom(1)}
                  snap={snap}
                  onSnapToggle={() => setSnap(prev => !prev)}
                />
                <div className="px-3 py-3">
                  <Link
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPan({ x: 0, y: 0 });
                      setZoom(1);
                    }}
                    className="inline-block w-full text-center text-sm rounded-md border px-2 py-1 hover:bg-gray-50"
                  >
                    Reset
                  </Link>
                </div>
              </div>

              {/* Actual board canvas */}
              <div className="flex-1">
                <BoardCanvas
                  // ⬇️ use YOUR existing BoardCanvas props
                  elements={[] as any}                // your component ignores this if it loads from storage
                  setElements={() => {}}              // noop; your canvas already persists internally
                  selectedIds={selectedIds}
                  setSelectedIds={setSelectedIds}
                  activeTool={activeTool}
                  onSetActiveTool={setActiveTool}
                  zoom={zoom}
                  setZoom={setZoom}
                  pan={pan}
                  setPan={setPan}
                  snap={snap}
                  onSaveElements={() => {}}
                  isReadOnly={false}
                  boardId={boardId}
                  // this fires whenever selection changes (needed for Selected tab)
                  onSelectionChange={(ids: string[]) => setSelectedIds(ids)}
                  onSelectElement={() => {}}
                />
              </div>
            </div>
          </div>

          {/* Right rail: Comments tabs */}
          <div className="col-span-3">
            <CritCommentsPanel
              boardId={boardId}
              attachedElementId={selectedElementId || undefined}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
