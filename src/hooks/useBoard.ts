import { useState, useEffect, useCallback } from "react";
import { currentUser } from "@/lib/currentUser";
import type { StoredBoard } from "@/lib/storage";

/**
 * useBoard Hook
 * 
 * Fetches a single board by ID from the API.
 * 
 * @param boardId - The ID of the board to fetch
 * @returns Object with board data, loading state, error state, and refetch function
 */
export function useBoard(boardId: string | null) {
  const [board, setBoard] = useState<StoredBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Transform API board to StoredBoard format
  const transformApiBoardToStoredBoard = useCallback((apiBoard: any): StoredBoard => {
    let visibility: "Public" | "Private" = "Private";
    if (apiBoard.visibility === "public" || apiBoard.isPublic === true) {
      visibility = "Public";
    }

    const lastEdited = apiBoard.updated_at || apiBoard.updatedAt
      ? new Date(apiBoard.updated_at || apiBoard.updatedAt).toISOString()
      : apiBoard.created_at || apiBoard.createdAt
        ? new Date(apiBoard.created_at || apiBoard.createdAt).toISOString()
        : new Date().toISOString();

    const ownerUsername = 
      apiBoard.owner_username || 
      apiBoard.ownerUsername || 
      apiBoard.owner?.username ||
      (typeof apiBoard.owner === "string" ? apiBoard.owner : null) ||
      currentUser.username;

    return {
      id: apiBoard.id,
      title: apiBoard.title || "Untitled Board",
      lastEdited,
      visibility,
      ownerUsername,
      school: apiBoard.owner_school || apiBoard.ownerSchool || apiBoard.school || undefined,
      coverImage: apiBoard.cover_image || apiBoard.coverImage || undefined,
      coverColor: apiBoard.cover_color || apiBoard.coverColor || undefined,
      collaborators: Array.isArray(apiBoard.collaborators) 
        ? apiBoard.collaborators 
        : Array.isArray(apiBoard.collaborator_ids) 
          ? apiBoard.collaborator_ids 
          : undefined,
    };
  }, []);

  // Fetch board from API
  const fetchBoard = useCallback(async () => {
    if (!boardId) {
      setBoard(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/boards/${boardId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        let errorMessage = `Failed to fetch board: ${response.status} ${response.statusText}`;
        
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
          "Failed to fetch board"
        );
      }

      const data = responseData.data;
      const transformedBoard = transformApiBoardToStoredBoard(data);
      setBoard(transformedBoard);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : "An unexpected error occurred while fetching board";
      
      console.error("[useBoard] Error fetching board:", err);
      setError(errorMessage);
      setBoard(null);
    } finally {
      setLoading(false);
    }
  }, [boardId, transformApiBoardToStoredBoard]);

  // Effect to fetch board when boardId or refetchTrigger changes
  useEffect(() => {
    fetchBoard();
  }, [fetchBoard, refetchTrigger]);

  // Refetch function
  const refetch = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  return {
    board,
    loading,
    error,
    refetch,
  };
}
