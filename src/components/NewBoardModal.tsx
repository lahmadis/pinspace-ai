"use client";

import { useState } from "react";
import { currentUser } from "@/lib/currentUser";
import { useRouter } from "next/navigation";
import { useCreateBoard } from "@/hooks/boards";

/**
 * NewBoardModal Component
 * 
 * CHANGES:
 * - Added onBoardCreated callback prop to refresh boards list after creation
 * - Updated API response handling to match Supabase response format
 * - Improved error handling with user-friendly messages
 * 
 * API Integration:
 * - POST /api/boards - Creates a new board in Supabase
 * - Response format: Single board object (not wrapped in { board: {...} })
 * 
 * Error Handling:
 * - Network errors: Shows error message in modal
 * - API errors: Displays error details from API response
 * - Validation errors: Prevents submission with invalid data
 */
export default function NewBoardModal({
  isOpen,
  onClose,
  onBoardCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onBoardCreated?: () => void; // NEW: Callback to refresh boards list
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"Public" | "Private">("Private");
  
  // NEW: Use useCreateBoard hook instead of manual fetch
  const { createBoard, loading: saving, error: createError } = useCreateBoard();
  
  // Keep local error state for form validation
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  /**
   * handleCreate - Creates a new board using useCreateBoard hook
   * 
   * CHANGED: Now uses useCreateBoard hook instead of manual fetch
   * This provides consistent error handling and loading states
   */
  async function handleCreate() {
    // Prevent multiple submissions
    if (saving) return;
    
    // Validate input
    if (!title.trim()) {
      setError("Please enter a board title");
      return;
    }

    setError(null);

    try {
      // Generate a unique user ID (in production, this comes from authentication)
      const userId = `user_${currentUser.username}_${Date.now()}`;

      // Prepare the request data
      const requestData = {
        title: title.trim(),
        description: null,
        visibility: visibility.toLowerCase() as "private" | "public",
        ownerId: userId,
        ownerUsername: currentUser.username || "user",
        ownerName: currentUser.name || "User",
        ownerEmail: null,
        ownerSchool: currentUser.school || null,
        ownerAvatarUrl: currentUser.avatarUrl || null,
      };

      // NEW: Use useCreateBoard hook instead of manual fetch
      const newBoard = await createBoard(requestData);
      
      // Extract board ID from response
      const newBoardId = newBoard.id;

      if (!newBoardId) {
        throw new Error("Invalid response: board ID not found in API response");
      }

      // Success! Call onBoardCreated callback to refresh boards list
      if (onBoardCreated) {
        onBoardCreated();
      }
      
      // Close modal and navigate to the new board
      onClose();
      setTitle("");
      router.push(`/board/${newBoardId}`);
    } catch (err) {
      // Error is handled by the hook and stored in createError
      // Display hook error or fallback to local error state
      const errorMessage = createError || (err instanceof Error ? err.message : "Failed to create board");
      setError(errorMessage);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-40"
        onClick={() => {
          if (!saving) onClose();
        }}
      />

      {/* card */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Create New Board
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
              placeholder="Midterm Crit / Week 6 pin-up / etc."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
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
            >
              <option value="Private">Private</option>
              <option value="Public">Public</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Public boards can show up in Explore.
            </p>
          </div>
        </div>

        {/* Error message - show hook error or local validation error */}
        {(error || createError) && (
          <div className="mt-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error || createError}
          </div>
        )}

        {/* actions */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => {
              if (!saving) {
                setError(null);
                onClose();
              }
            }}
            disabled={saving}
            className="px-3 py-2 text-sm rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !title.trim()}
            className="px-3 py-2 text-sm rounded-md bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
