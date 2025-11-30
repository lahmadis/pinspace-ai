"use client";

import { useState, useEffect } from "react";
import { useUpdateBoard } from "@/hooks/boards";

/**
 * EditBoardModal Component
 * 
 * Modal for editing/renaming a board's title and visibility.
 * 
 * Uses useUpdateBoard hook to call PATCH /api/boards/[id]
 * 
 * Example usage:
 *   <EditBoardModal
 *     isOpen={isOpen}
 *     onClose={() => setIsOpen(false)}
 *     boardId="board-123"
 *     currentTitle="My Board"
 *     currentVisibility="Private"
 *     onBoardUpdated={() => refetch()}
 *   />
 */
export default function EditBoardModal({
  isOpen,
  onClose,
  boardId,
  currentTitle,
  currentVisibility,
  onBoardUpdated,
}: {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  currentTitle: string;
  currentVisibility: "Public" | "Private";
  onBoardUpdated?: () => void;
}) {
  const [title, setTitle] = useState(currentTitle);
  const [visibility, setVisibility] = useState<"Public" | "Private">(currentVisibility);
  const { updateBoard, loading, error } = useUpdateBoard();

  // Reset form when modal opens or board changes
  useEffect(() => {
    if (isOpen) {
      setTitle(currentTitle);
      setVisibility(currentVisibility);
    }
  }, [isOpen, currentTitle, currentVisibility]);

  if (!isOpen) return null;

  // Handle form submission
  async function handleUpdate() {
    if (!title.trim()) {
      return;
    }

    try {
      // Convert "Public"/"Private" to lowercase for API
      const visibilityLower = visibility.toLowerCase() as "private" | "public";
      
      await updateBoard(boardId, {
        title: title.trim(),
        visibility: visibilityLower,
      });

      // Call callback to refresh boards list
      if (onBoardUpdated) {
        onBoardUpdated();
      }

      // Close modal
      onClose();
    } catch (err) {
      // Error is handled by the hook and displayed below
      console.error("Failed to update board:", err);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-40"
        onClick={() => {
          if (!loading) onClose();
        }}
      />

      {/* card */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Edit Board
        </h2>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Board title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter board title"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              disabled={loading}
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Visibility
            </label>
            <select
              value={visibility}
              onChange={(e) =>
                setVisibility(e.target.value as "Public" | "Private")
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              disabled={loading}
            >
              <option value="Private">Private</option>
              <option value="Public">Public</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Public boards can show up in Explore.
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* actions */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => {
              if (!loading) {
                onClose();
              }
            }}
            disabled={loading}
            className="px-3 py-2 text-sm rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={loading || !title.trim()}
            className="px-3 py-2 text-sm rounded-md bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}






