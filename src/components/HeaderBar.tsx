"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Snapshot } from "@/types";
import { getBoards } from "@/lib/storage";
import { timeAgo } from "@/lib/time";

interface HeaderBarProps {
  boardId: string;
  snapshots: Snapshot[];
  viewingSnapshotId: string | null;
  onSnapshotChange: (snapshotId: string | null) => void;
  onSaveSnapshot?: () => void; // Optional - no longer used
  onPresent?: () => void; // Toggle present mode
  onShare?: () => void; // Open share modal
  onSaveTimelineSnapshot?: () => void; // Optional - no longer used
  onStartCrit?: () => void; // Open crit share modal
  onEndCrit?: () => void; // End crit mode
  isCritActive?: boolean; // Whether crit is currently active
  isPresenting?: boolean; // Whether in present mode
  onEndPresent?: () => void; // Exit present mode
  isStartingCrit?: boolean; // Whether crit is currently starting (for loading state)
}

export default function HeaderBar({
  boardId,
  snapshots,
  viewingSnapshotId,
  onSnapshotChange,
  onSaveSnapshot,
  onPresent,
  onShare,
  onSaveTimelineSnapshot,
  onStartCrit,
  onEndCrit,
  isCritActive = false,
  isPresenting = false,
  onEndPresent,
  isStartingCrit = false, // Loading state for crit button
}: HeaderBarProps) {
  const router = useRouter();
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [boardTitle, setBoardTitle] = useState("Runway / Movement Study");
  const [lastEdited, setLastEdited] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load current board data
  useEffect(() => {
    async function loadBoard() {
      try {
        // Load from localStorage first
        const storedBoards = getBoards();
        const storedBoard = storedBoards.find((b) => b.id === boardId);
        if (storedBoard) {
          setBoardTitle(storedBoard.title);
          setLastEdited(storedBoard.lastEdited);
        }

        // Also load from API - UPDATED: Use single board endpoint
        try {
          const res = await fetch(`/api/boards/${boardId}`);
          if (res.ok) {
            // UPDATED: Handle new standardized { data, error } format
            const responseData = await res.json();
            if (responseData.error) {
              console.error("API error loading board:", responseData.error);
            } else if (responseData.data) {
              const board = responseData.data;
              if (board.visibility) {
                setVisibility(board.visibility);
              }
              if (board.title) {
                setBoardTitle(board.title);
              }
              if (board.updated_at) {
                setLastEdited(new Date(board.updated_at).toISOString());
              } else if (board.created_at) {
                setLastEdited(new Date(board.created_at).toISOString());
              }
            }
          } else {
            // Handle HTTP errors - try to parse error response
            try {
              const errorData = await res.json();
              if (errorData.error) {
                console.error("Failed to load board:", errorData.error.message || errorData.error.details);
              }
            } catch {
              console.error(`Failed to load board: ${res.status} ${res.statusText}`);
            }
          }
        } catch (apiErr) {
          // Network or other fetch errors
          console.error("Network error loading board:", apiErr);
        }
      } catch (err) {
        console.error("Failed to load board data", err);
      } finally {
        setLoading(false);
      }
    }
    loadBoard();

    // Set up interval to refresh lastEdited from storage
    const interval = setInterval(() => {
      const storedBoards = getBoards();
      const storedBoard = storedBoards.find((b) => b.id === boardId);
      if (storedBoard?.lastEdited) {
        setLastEdited(storedBoard.lastEdited);
      }
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [boardId]);

  const handlePresentMode = () => {
    router.push(`/board/${boardId}/present`);
  };

  const handleExportSheet = () => {
    // Build URL with optional snapshot version query param
    const url = viewingSnapshotId
      ? `/board/${boardId}/export?version=${viewingSnapshotId}`
      : `/board/${boardId}/export`;
    window.open(url, "_blank");
  };

  const handleVisibilityChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newVisibility = e.target.value as "private" | "public";
    setVisibility(newVisibility);

    try {
      // FIXED: Use correct endpoint format /api/boards/[id] instead of /api/boards
      const res = await fetch(`/api/boards/${boardId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visibility: newVisibility,
        }),
      });

      if (!res.ok) {
        // UPDATED: Handle new standardized { data, error } format
        const responseData = await res.json();
        const errorMessage = responseData.error?.message || responseData.error || "Failed to update board visibility";
        console.error("Failed to update board visibility:", errorMessage);
        // Revert on error
        setVisibility(visibility);
      } else {
        // UPDATED: Handle new standardized { data, error } format
        const responseData = await res.json();
        if (responseData.error) {
          console.error("API error updating board:", responseData.error);
          // Revert on error
          setVisibility(visibility);
        }
      }
    } catch (err) {
      console.error("Error updating board visibility", err);
      // Revert on error
      setVisibility(visibility);
    }
  };


  // Present mode: slim header with minimal controls
  if (isPresenting) {
    return (
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {boardTitle}
          </h2>
          <div className="flex items-center gap-3">
            {onEndPresent && (
              <button
                onClick={onEndPresent}
                className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-900 transition"
              >
                Exit Present
              </button>
            )}
            {onStartCrit && !isCritActive && (
              <button
                onClick={onStartCrit}
                disabled={isStartingCrit}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title={isStartingCrit ? "Starting Live Crit session..." : "Start a Live Crit session for guest feedback"}
              >
                {isStartingCrit ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Starting...</span>
                  </>
                ) : (
                  "Start Live Crit"
                )}
              </button>
            )}
            {onEndCrit && isCritActive && (
              <button
                onClick={onEndCrit}
                className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition"
              >
                End Crit
              </button>
            )}
            <button
              onClick={handleExportSheet}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition"
              title="Export sheet"
            >
              Export sheet
            </button>
          </div>
        </div>
      </header>
    );
  }

  // Normal mode: full header with all controls
  return (
    <header className="bg-white border-b border-gray-200 px-8 py-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">
            {boardTitle}
          </h2>
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${
              visibility === "public"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {visibility === "public" ? "Public" : "Private"}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handlePresentMode}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition"
          >
            Present to Class
          </button>
          {onStartCrit && !isCritActive && (
            <button
              onClick={onStartCrit}
              disabled={isStartingCrit}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title={isStartingCrit ? "Starting Live Crit session..." : "Start a Live Crit session for guest feedback"}
            >
              {isStartingCrit ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Starting...</span>
                </>
              ) : (
                "Start Live Crit"
              )}
            </button>
          )}
          {onEndCrit && isCritActive && (
            <button
              onClick={onEndCrit}
              className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition"
            >
              End Crit
            </button>
          )}
          {onShare && (
            <button
              onClick={onShare}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition"
            >
              Share
            </button>
          )}
          <button
            onClick={handleExportSheet}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition"
            title="Export sheet"
          >
            Export sheet
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-200">
        {/* Last edited timestamp */}
        {lastEdited && (
          <div className="text-xs text-gray-500">
            Last edited {timeAgo(lastEdited)}
          </div>
        )}

        {/* Visibility dropdown - moved to top for better visibility */}
        <div>
          <label className="text-xs font-medium text-gray-700 mb-2 block">
            Visibility:
          </label>
          <select
            value={visibility}
            onChange={handleVisibilityChange}
            disabled={loading}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </div>

        {/* Board version dropdown */}
        <div className="flex-1">
          <label className="text-xs font-medium text-gray-700 mb-2 block">
            Board version
          </label>
          <select
            value={viewingSnapshotId || ""}
            onChange={(e) => {
              if (e.target.value === "") {
                onSnapshotChange(null);
              } else {
                onSnapshotChange(e.target.value);
              }
            }}
            className="w-full max-w-xs px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Live board</option>
            {snapshots.map((snapshot) => (
              <option key={snapshot.id} value={snapshot.id}>
                {snapshot.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
