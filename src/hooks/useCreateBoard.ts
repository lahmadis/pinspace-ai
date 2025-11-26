import { useState, useCallback } from "react";

/**
 * useCreateBoard Hook
 * 
 * Creates a new board via POST /api/boards
 * 
 * @returns Object with create function, loading state, error state, and created board data
 */
export function useCreateBoard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdBoard, setCreatedBoard] = useState<any | null>(null);

  /**
   * Create a new board
   * 
   * @param boardData - Board data to create
   * @returns Promise with the created board data
   */
  const createBoard = useCallback(async (boardData: {
    title: string;
    description?: string | null;
    visibility?: "private" | "public";
    ownerId: string;
    ownerUsername?: string;
    ownerName?: string;
    ownerEmail?: string | null;
    ownerSchool?: string | null;
    ownerAvatarUrl?: string | null;
  }) => {
    try {
      setLoading(true);
      setError(null);
      setCreatedBoard(null);

      const response = await fetch("/api/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(boardData),
      });

      if (!response.ok) {
        let errorMessage = `Failed to create board: ${response.status} ${response.statusText}`;
        
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
          "Failed to create board"
        );
      }

      const data = responseData.data;
      setCreatedBoard(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : "An unexpected error occurred while creating board";
      
      console.error("[useCreateBoard] Error creating board:", err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createBoard,
    loading,
    error,
    createdBoard,
  };
}