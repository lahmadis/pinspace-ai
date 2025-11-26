import { useState, useEffect, useCallback } from "react";
import { currentUser } from "@/lib/currentUser";
import type { StoredBoard } from "@/lib/storage";

/**
 * ========================================================================
 * REFACTORED: Helper function to convert error messages to human-readable strings
 * ========================================================================
 * 
 * This function ensures that error messages are always human-readable strings,
 * never "[object Object]". If the error is an object, it converts it to a
 * JSON string for debugging purposes.
 * 
 * @param error - Error value (can be string, Error object, or any other type)
 * @param includeJson - If true, includes full JSON representation for objects
 * @returns Human-readable error message string with optional JSON details
 * ========================================================================
 */
function formatErrorMessage(error: unknown, includeJson: boolean = true): string {
  // Handle null/undefined
  if (error === null || error === undefined) {
    return "An unknown error occurred";
  }

  // Handle Error instances (has .message property)
  if (error instanceof Error) {
    return error.message;
  }

  // Handle strings (already human-readable)
  if (typeof error === "string") {
    return error;
  }

  // Handle objects - convert to JSON string for debugging
  if (typeof error === "object") {
    try {
      let message = "";
      
      // Try to extract a message property if it exists
      if ("message" in error && typeof (error as any).message === "string") {
        message = (error as any).message;
      }
      // Try to extract a details property if it exists
      else if ("details" in error && typeof (error as any).details === "string") {
        message = (error as any).details;
      }
      
      // Convert entire object to JSON string
      const jsonString = JSON.stringify(error, null, 2);
      
      // If we have a message and includeJson is true, include both
      if (message && includeJson) {
        return `${message}\n\nFull error object:\n${jsonString}`;
      }
      // If we have a message, use it
      if (message) {
        return message;
      }
      // Otherwise, return the JSON string
      return jsonString;
    } catch {
      // If JSON.stringify fails, fall back to string representation
      return String(error);
    }
  }

  // Handle other types (numbers, booleans, etc.) - convert to string
  return String(error);
}

/**
 * useFetchBoards Hook
 * 
 * Custom React hook to fetch boards from the Supabase API endpoint.
 * 
 * CHANGES:
 * - Replaced localStorage-based data fetching with API call to /api/boards
 * - Added loading state management
 * - Added error state handling
 * - Transforms Supabase API response to StoredBoard format
 * - Supports refetching on demand
 * - REFACTORED: Error messages are now always human-readable strings (never "[object Object]")
 * 
 * API Endpoint: GET /api/boards
 * Expected Response: Array of board objects from Supabase
 * 
 * Error Handling:
 * - Network errors: Returns error message, shows empty state
 * - HTTP errors: Captures error details from API response
 * - Invalid responses: Validates response structure before processing
 * - REFACTORED: All error messages are converted to human-readable strings
 * 
 * @returns Object with boards array, loading state, error state, and refetch function
 */
export function useFetchBoards() {
  const [boards, setBoards] = useState<StoredBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  /**
   * Transform Supabase board object to StoredBoard format
   * 
   * Maps API response fields to the format expected by the UI components.
   * Handles both snake_case (Supabase default) and camelCase field names.
   * 
   * Supabase fields (expected):
   * - id, title, visibility, owner_id, created_at, updated_at
   * - May also have: owner_username, school, cover_image, cover_color, collaborators
   * 
   * StoredBoard format:
   * - id, title, lastEdited, visibility ("Public" | "Private"), ownerUsername, etc.
   */
  const transformApiBoardToStoredBoard = useCallback((apiBoard: any): StoredBoard => {
    // Transform visibility from lowercase "private"/"public" to "Private"/"Public"
    // Handle both string values and boolean isPublic flag
    let visibility: "Public" | "Private" = "Private";
    if (apiBoard.visibility === "public" || apiBoard.isPublic === true) {
      visibility = "Public";
    } else if (apiBoard.visibility === "private" || apiBoard.isPublic === false) {
      visibility = "Private";
    }

    // Use updated_at/updatedAt if available, otherwise created_at/createdAt, format as ISO string
    const lastEdited = apiBoard.updated_at || apiBoard.updatedAt
      ? new Date(apiBoard.updated_at || apiBoard.updatedAt).toISOString()
      : apiBoard.created_at || apiBoard.createdAt
        ? new Date(apiBoard.created_at || apiBoard.createdAt).toISOString()
        : new Date().toISOString();

    // Extract owner username - try multiple field name variations
    // Supports: owner_username, ownerUsername, owner.username, or falls back to currentUser
    const ownerUsername = 
      apiBoard.owner_username || 
      apiBoard.ownerUsername || 
      apiBoard.owner?.username ||
      (typeof apiBoard.owner === "string" ? apiBoard.owner : null) ||
      currentUser.username;

    // Extract school - try multiple field name variations
    const school = 
      apiBoard.owner_school || 
      apiBoard.ownerSchool || 
      apiBoard.school ||
      undefined;

    // Extract cover image - try multiple field name variations
    const coverImage = 
      apiBoard.cover_image || 
      apiBoard.coverImage ||
      undefined;

    // Extract cover color - try multiple field name variations
    const coverColor = 
      apiBoard.cover_color || 
      apiBoard.coverColor ||
      undefined;

    // Extract collaborators - handle both array and string formats
    const collaborators = apiBoard.collaborators 
      ? (Array.isArray(apiBoard.collaborators) ? apiBoard.collaborators : undefined)
      : apiBoard.collaborator_ids
        ? (Array.isArray(apiBoard.collaborator_ids) ? apiBoard.collaborator_ids : undefined)
        : undefined;

    return {
      id: apiBoard.id,
      title: apiBoard.title || "Untitled Board",
      lastEdited,
      visibility,
      ownerUsername,
      school,
      coverImage,
      coverColor,
      collaborators,
    };
  }, []);

  /**
   * Fetch boards from API
   * 
   * Calls GET /api/boards and transforms the response.
   */
  const fetchBoards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Make API request
      const response = await fetch("/api/boards", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Handle HTTP errors
      if (!response.ok) {
        let errorMessage = `Failed to fetch boards: HTTP ${response.status} ${response.statusText}`;
        let errorDetails: any = null;
        
        // Try to extract error message from response body
        try {
          const errorData = await response.json();
          errorDetails = errorData;
          
          // REFACTORED: Log detailed error information for debugging
          console.error("[useFetchBoards] HTTP Error Response:", {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            errorData: errorData,
            errorDataStringified: JSON.stringify(errorData, null, 2),
          });
          
          // REFACTORED: Use formatErrorMessage to ensure human-readable strings
          // If errorData.error is an object, it will be converted to JSON string
          if (errorData.error) {
            const formattedError = formatErrorMessage(errorData.error, true);
            errorMessage = `HTTP ${response.status} Error: ${formattedError}`;
          }
          
          // REFACTORED: Format details as well (in case it's an object)
          if (errorData.details) {
            const formattedDetails = formatErrorMessage(errorData.details, true);
            errorMessage += `\n\nDetails: ${formattedDetails}`;
          }
          
          // Include full error data if available
          if (errorData && Object.keys(errorData).length > 0) {
            errorMessage += `\n\nFull error response:\n${JSON.stringify(errorData, null, 2)}`;
          }
        } catch (parseError) {
          // If response isn't JSON, try to get text
          try {
            const text = await response.text();
            console.error("[useFetchBoards] Non-JSON Error Response:", {
              status: response.status,
              statusText: response.statusText,
              url: response.url,
              responseText: text,
            });
            errorMessage += `\n\nResponse body: ${text}`;
          } catch {
            // If we can't read the response, just log the status
            console.error("[useFetchBoards] HTTP Error (unable to read response):", {
              status: response.status,
              statusText: response.statusText,
              url: response.url,
            });
          }
        }

        // Log the complete error before throwing
        console.error("[useFetchBoards] Throwing error with message:", errorMessage);
        throw new Error(errorMessage);
      }

      // Parse response - now uses { data, error } format
      const responseData = await response.json();

      // UPDATED: Handle new standardized { data, error } format
      // REFACTORED: Use formatErrorMessage to ensure human-readable strings
      // If responseData.error is an object without message/details, it will be converted to JSON string
      if (responseData.error) {
        // REFACTORED: Log detailed error information
        console.error("[useFetchBoards] API Error in Response:", {
          error: responseData.error,
          errorType: typeof responseData.error,
          errorStringified: JSON.stringify(responseData.error, null, 2),
          fullResponse: responseData,
        });
        
        const errorMessage = formatErrorMessage(responseData.error, true);
        const finalMessage = errorMessage || "Failed to fetch boards";
        
        console.error("[useFetchBoards] Throwing API error:", finalMessage);
        throw new Error(finalMessage);
      }

      // Validate response structure
      const data = responseData.data;
      if (!Array.isArray(data)) {
        throw new Error("Invalid API response: expected an array of boards");
      }

      // Transform API boards to StoredBoard format
      const transformedBoards = data.map(transformApiBoardToStoredBoard);

      // Filter boards to show only current user's boards and shared boards
      // Split into "my boards" and "shared boards" for the UI
      setBoards(transformedBoards);
      setError(null);
    } catch (err) {
      // REFACTORED: Log detailed error information before formatting
      console.error("[useFetchBoards] Caught error in fetchBoards:", {
        error: err,
        errorType: typeof err,
        errorConstructor: err?.constructor?.name,
        isErrorInstance: err instanceof Error,
        errorMessage: err instanceof Error ? err.message : undefined,
        errorStack: err instanceof Error ? err.stack : undefined,
        errorStringified: typeof err === "object" ? JSON.stringify(err, null, 2) : String(err),
      });
      
      // REFACTORED: Use formatErrorMessage to ensure human-readable error strings
      // This prevents "[object Object]" from appearing in error messages
      // If err is an object, it will be converted to JSON string for debugging
      const errorMessage = formatErrorMessage(err, true);
      
      // Log the formatted error message
      console.error("[useFetchBoards] Formatted error message:", errorMessage);
      
      // Set human-readable error message (never "[object Object]")
      setError(errorMessage || "An unexpected error occurred while fetching boards");
      setBoards([]); // Clear boards on error
    } finally {
      setLoading(false);
    }
  }, [transformApiBoardToStoredBoard]);

  /**
   * Effect to fetch boards on mount and when refetchTrigger changes
   */
  useEffect(() => {
    fetchBoards();
  }, [fetchBoards, refetchTrigger]);

  /**
   * Refetch function to manually trigger a refresh
   * Useful after creating a new board
   */
  const refetch = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  return {
    boards,
    loading,
    error,
    refetch,
  };
}
