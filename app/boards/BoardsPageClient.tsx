"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import NewBoardModal from "@/components/NewBoardModal";
import EditBoardModal from "@/components/EditBoardModal";
import { currentUser } from "@/lib/currentUser";
import { timeAgo } from "@/lib/time";
import { deleteBoard, type StoredBoard } from "@/lib/storage";
import { useFetchBoards } from "@/hooks/useFetchBoards";
import { useDeleteBoard } from "@/hooks/boards";

/**
 * BoardsPageClient Component
 * 
 * Client component containing all the interactive boards page logic.
 * Separated from server component to allow client-side hooks and state.
 */
export default function BoardsPageClient() {
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteTitle, setConfirmDeleteTitle] = useState<string | null>(null);
  
  // NEW: State for edit modal
  const [editingBoard, setEditingBoard] = useState<{
    id: string;
    title: string;
    visibility: "Public" | "Private";
  } | null>(null);

  // CHANGED: Use API hook instead of localStorage
  // This hook handles fetching, loading, and error states
  const { boards: allBoards, loading, error, refetch } = useFetchBoards();
  
  // NEW: Use delete board hook for API deletion
  const { deleteBoard: deleteBoardApi, loading: deleting } = useDeleteBoard();

  // CHANGED: Split boards into "mine" and "shared" using useMemo for performance
  // This automatically updates when allBoards changes
  const { myBoards, sharedBoards } = useMemo(() => {
    const mine = allBoards.filter(
      (b) => b.ownerUsername === currentUser.username
    );
    const shared = allBoards.filter(
      (b) =>
        b.ownerUsername !== currentUser.username &&
        (Array.isArray(b.collaborators) ? b.collaborators.includes(currentUser.username) : false)
    );
    return { myBoards: mine, sharedBoards: shared };
  }, [allBoards]);

  const askDelete = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    boardId: string,
    boardTitle: string
  ) => {
    // CRITICAL: prevent bubbling to the card's navigation
    e.preventDefault();
    e.stopPropagation();
    setConfirmDeleteId(boardId);
    setConfirmDeleteTitle(boardTitle);
  };

  const cancelDelete = (e?: React.MouseEvent<HTMLButtonElement | HTMLDivElement, MouseEvent>) => {
    // Also stop bubbling if modal sits over a clickable area
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setConfirmDeleteId(null);
    setConfirmDeleteTitle(null);
  };

  // mock activity list for now
  const activity = [
    {
      type: "comment",
      actor: "Pasnik",
      boardTitle: "Runway / Movement Study",
      time: "2h ago",
      text: "The reflective facade is interesting...",
    },
    {
      type: "snapshot",
      actor: "You",
      boardTitle: "Runway / Movement Study",
      time: "yesterday",
      text: "Saved a snapshot",
    },
    {
      type: "share",
      actor: "Leila",
      boardTitle: "Urban Fabric Integration",
      time: "2d ago",
      text: "Shared board with you",
    },
  ];

  // Transform activity data for the new UI structure
  const activity_items = activity.map((item) => {
    let action = "";
    if (item.type === "comment") action = "left a comment on";
    else if (item.type === "snapshot") action = "updated";
    else if (item.type === "share") action = "shared";

    return {
      title: `${item.actor} ${action} ${item.boardTitle}`,
      subtitle: item.text,
      when: item.time,
    };
  });


  return (
    <>
      {/* Main content */}
      <main className="flex-1 bg-gray-50 min-h-screen p-8">
        <div className="max-w-6xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-12">
          {/* Header Row */}
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Your Boards
              </h1>
              <p className="text-sm text-gray-500">
                Work in progress, pinned for desk crits.
              </p>
            </div>

            <button
              className="inline-flex items-center rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 transition"
              onClick={() => setShowNewBoardModal(true)}
            >
              New Board
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="rounded-lg border border-gray-200 p-10 text-center text-gray-500 text-sm">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                <span>Loading boards...</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center space-y-4">
              <div className="text-red-700 font-medium">
                Failed to load boards
              </div>
              <div className="text-red-600 text-sm">
                {error}
              </div>
              <button
                onClick={() => refetch()}
                className="inline-block px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Your Boards Grid */}
          {!loading && !error && myBoards.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-500 text-sm space-y-4">
              <div className="font-medium text-gray-700 mb-1">
                No boards yet
              </div>
              <div>Click "New Board" to start your first pin-up space.</div>
              <div className="pt-4">
                <Link
                  href="/demo"
                  className="inline-block px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-sm font-medium"
                >
                  Try live demo
                </Link>
              </div>
            </div>
          )}

          {/* Boards Grid - Only show when not loading, no error, and boards exist */}
          {!loading && !error && myBoards.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {myBoards.map((board) => {
                // Fallback pastel colors if coverColor doesn't exist
                const fallbackColors = [
                  "#DBEAFE", // light blue
                  "#FEF3C7", // light yellow
                  "#FDE68A", // light amber
                  "#E9D5FF", // light purple
                  "#DCFCE7", // light green
                ];
                const coverColor =
                  board.coverColor ||
                  fallbackColors[
                    (board.id.charCodeAt(0) || 0) % fallbackColors.length
                  ];
                const visibilityColor =
                  board.visibility === "Public"
                    ? "bg-green-100 text-green-700 border-green-300"
                    : "bg-gray-100 text-gray-700 border-gray-300";

                return (
                  <Link
                    key={board.id}
                    href={`/board/${board.id}`}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md hover:border-gray-300 transition-all group"
                  >
                    {/* Cover */}
                    <div
                      className="rounded-t-lg"
                      style={{ backgroundColor: coverColor, height: "120px" }}
                    >
                      {board.coverImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={board.coverImage}
                          alt=""
                          className="w-full h-full object-cover rounded-t-lg"
                        />
                      )}
                    </div>

                    {/* Meta */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-gray-900 leading-tight group-hover:text-blue-600 transition">
                          {board.title || "Untitled Board"}
                        </h3>
                        <span
                          className={`text-[10px] font-medium rounded px-1.5 py-0.5 border flex-shrink-0 ${visibilityColor}`}
                        >
                          {board.visibility === "Public" ? "Public" : "Private"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Last edited {timeAgo(board.lastEdited)}
                      </div>
                      {/* NEW: Action buttons for edit and delete */}
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingBoard({
                              id: board.id,
                              title: board.title || "Untitled Board",
                              visibility: board.visibility,
                            });
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          Rename
                        </button>
                        <span className="text-xs text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={(e) => askDelete(e, board.id, board.title || "Untitled board")}
                          className="text-xs text-red-600 hover:text-red-700 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Shared Boards Section - Only show when not loading and no error */}
          {!loading && !error && (

            <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Shared with You
              </h2>
              <p className="text-xs text-gray-500">
                Boards you're editing with others
              </p>
            </div>

            {sharedBoards.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 text-sm">
                Nothing shared with you yet.
              </div>
            ) : (
              <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
                {sharedBoards.map((board) => (
                  <a
                    key={board.id}
                    href={`/board/${board.id}`}
                    className="min-w-[180px] max-w-[180px] flex-shrink-0 rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-gray-300 transition"
                  >
                    <div className="h-24 w-full bg-gradient-to-br from-slate-200 via-slate-100 to-white flex items-center justify-center text-[11px] text-gray-500">
                      {board.coverImage ? (
                        <img
                          src={board.coverImage}
                          alt={board.title || "Board cover"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="px-2 text-center leading-snug">
                          {board.title || "Shared board"}
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="text-xs font-medium text-gray-900 leading-tight">
                        {board.title || "Untitled board"}
                      </div>
                      <div className="text-[11px] text-gray-500 leading-tight">
                        {board.ownerUsername || "Studio collaborator"}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Recent Activity */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Activity
            </h2>
            <p className="text-xs text-gray-500">
              Crit notes, snapshots, and shares.
            </p>

            <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-200 shadow-sm">
              {activity_items.map((item, idx) => (
                <div key={idx} className="p-4 text-sm text-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="text-gray-900 font-medium leading-snug">
                        {item.title}
                      </div>
                      <div className="text-gray-500 text-xs leading-snug">
                        {item.subtitle}
                      </div>
                    </div>
                    <div className="text-[11px] text-gray-400 whitespace-nowrap pl-4">
                      {timeAgo(item.when)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Modal lives at root so it sits above everything */}
      {/* CHANGED: Pass refetch callback so modal can refresh the list after creating a board */}
      <NewBoardModal
        isOpen={showNewBoardModal}
        onClose={() => setShowNewBoardModal(false)}
        onBoardCreated={() => {
          // Refresh the boards list after a new board is created
          refetch();
        }}
      />

      {/* NEW: Edit board modal */}
      {editingBoard && (
        <EditBoardModal
          isOpen={true}
          onClose={() => setEditingBoard(null)}
          boardId={editingBoard.id}
          currentTitle={editingBoard.title}
          currentVisibility={editingBoard.visibility}
          onBoardUpdated={() => {
            // Refresh the boards list after updating
            refetch();
            setEditingBoard(null);
          }}
        />
      )}

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center"
          // clicking the dark backdrop closes the modal without bubbling
          onClick={cancelDelete}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            // stop clicks inside the panel from closing/navigating
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <h2 className="text-lg font-semibold mb-2">
              Delete board{" "}
              <span className="font-bold">
                {confirmDeleteTitle ?? "this board"}
              </span>
              ?
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              This will remove this board and its local snapshots, comments, and
              crit history from this browser. This can't be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={(e) => cancelDelete(e)}
                className="px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async (e) => {
                  // FIXED: Made handler async to allow await inside
                  // guard against bubbling just in case
                  e.preventDefault();
                  e.stopPropagation();
                  if (!confirmDeleteId) return;
                  
                  // NEW: Delete from API using useDeleteBoard hook
                  try {
                    await deleteBoardApi(confirmDeleteId);
                    // Also clean up localStorage (for any legacy data)
                    deleteBoard(confirmDeleteId);
                    // Refresh boards list from API
                    refetch();
                    // Close modal
                    setConfirmDeleteId(null);
                    setConfirmDeleteTitle(null);
                  } catch (err) {
                    // Error is displayed by the hook
                    // Keep modal open so user can retry or cancel
                    console.error("Failed to delete board:", err);
                  }
                }}
                className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}



