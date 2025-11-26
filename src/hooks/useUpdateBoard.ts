import { useState, useCallback } from "react";

/**
 * useUpdateBoard Hook
 * 
 * Updates a board via PATCH /api/boards/[id]
 * 
 * @returns Object with update function, loading state, and error state
 */
export function useUpdateBoard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Update a board
   * 
   * @param boardId - The ID of the board to update
   * @param updates - Partial board data to update (title, description, visibility)
   * @returns Promise with the updated board data
   */
  const updateBoard = useCallback(async (
    boardId: string,
    updates: {
      title?: string;
      description?: string | null;
      visibility?: "private" | "public";
    }
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/boards/${boardId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        let errorMessage = `Failed to update board: ${response.status} ${response.statusText}`;
        
        try {
          // UPDATED: Handle new standardized { data, error } format
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error.message || errorData.error.details || errorMessage;
            if (errorData.error.details && errorData.error.message !== errorData.error.details) {
              errorMessage += ` - ${errorData.error.details}`;
            }
          }
        } catch {
          // Response isn't JSON
        }

        throw new Error(errorMessage);
      }

      // UPDATED: Handle new standardized { data, error } format
      const responseData = await response.json();
      
      if (responseData.error) {
        throw new Error(
          responseData.error.message || 
          responseData.error.details || 
          "Failed to update board"
        );
      }

      return responseData.data;
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : "An unexpected error occurred while updating board";
      
      console.error("[useUpdateBoard] Error updating board:", err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    updateBoard,
    loading,
    error,
  };
}
