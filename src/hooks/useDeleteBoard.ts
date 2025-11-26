import { useState, useCallback } from "react";

/**
 * useDeleteBoard Hook
 * 
 * Deletes a board via DELETE /api/boards/[id]
 * 
 * @returns Object with delete function, loading state, and error state
 */
export function useDeleteBoard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Delete a board
   * 
   * @param boardId - The ID of the board to delete
   * @returns Promise with deletion confirmation
   */
  const deleteBoard = useCallback(async (boardId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/boards/${boardId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        let errorMessage = `Failed to delete board: ${response.status} ${response.statusText}`;
        
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
          "Failed to delete board"
        );
      }

      return responseData.data;
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : "An unexpected error occurred while deleting board";
      
      console.error("[useDeleteBoard] Error deleting board:", err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    deleteBoard,
    loading,
    error,
  };
}
