import { useState, useEffect } from "react";
import { mockBoards } from "@/lib/mockData";
import { timeAgo } from "@/lib/time";
import type { BoardCardData } from "@/types/boards";
import type { Board } from "@/types";

/**
 * useBoards Hook
 * 
 * Manages board data fetching, loading state, and error handling.
 * Now fetches from live API with fallback to mock data.
 * 
 * API Endpoint: GET /api/boards?public=true
 * Expected Response: { boards: Board[] }
 * 
 * Error Handling:
 * - Network errors: Shows user-friendly message with retry option
 * - Empty results: Falls back to mock data with helpful message
 * - API not ready: Gracefully falls back to mock data
 * 
 * TODO: Enhancements
 * - Add profile fetching to get author names and institutions
 * - Add caching/refetch logic
 * - Add pagination support
 */

// Fallback flag - set to false to disable mock data fallback
const ENABLE_MOCK_FALLBACK = true;

/**
 * Transform API Board object to BoardCardData format
 * 
 * This function maps the API response structure to the format expected
 * by the BoardCard component. Adjust this mapping if your API response
 * structure differs.
 * 
 * Current API Board fields:
 * - id, title, owner, ownerId, visibility, isPublic, lastEdited
 * 
 * Required BoardCardData fields:
 * - id, title, authorName, institution, timeAgo, previewImage?, coverColor?
 * 
 * TODO: Profile Integration
 * To get authorName and institution, you may need to:
 * 1. Fetch profile data: GET /api/profiles/{ownerId}
 * 2. Or include profile data in the boards API response
 * 3. Update this transformation to use profile data
 */
function transformApiBoardToCardData(board: Board): BoardCardData {
  // Get author name from owner field (username)
  // TODO: Replace with actual author name from profile if available
  const authorName = board.owner || "Unknown Author";

  // Get institution - API doesn't currently return this
  // TODO: Fetch from profile or include in API response
  // For now, we'll use a placeholder or try to extract from owner
  const institution = "Unknown Institution"; // TODO: Get from profile.school

  // Format time ago from lastEdited timestamp
  const timeAgoStr = board.lastEdited
    ? timeAgo(board.lastEdited)
    : "Recently";

  // Get preview image - API doesn't currently return this
  // TODO: Include coverImage in API response or fetch separately
  const previewImage = undefined; // TODO: Get from board.coverImage if API provides it
  const coverColor = undefined; // TODO: Get from board.coverColor if API provides it

  return {
    id: board.id,
    title: board.title || "Untitled Board",
    authorName,
    institution,
    timeAgo: timeAgoStr,
    previewImage,
    coverColor,
  };
}

/**
 * Fetch boards from API endpoint
 * 
 * @returns Promise<BoardCardData[]> Array of transformed board card data
 */
async function fetchBoardsFromAPI(): Promise<BoardCardData[]> {
  try {
    // API call to get public boards
    // Adjust endpoint and query params as needed
    const response = await fetch("/api/boards?public=true", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Add auth headers if needed
        // "Authorization": `Bearer ${token}`,
      },
      // Add timeout if needed
      // signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    // Handle HTTP errors
    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `Failed to fetch boards: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // If response isn't JSON, use status text
      }

      throw new Error(errorMessage);
    }

    // Parse response
    const data = await response.json();

    // Validate response structure
    if (!data || !Array.isArray(data.boards)) {
      throw new Error("Invalid API response format: expected { boards: Board[] }");
    }

    // Filter to only public boards (safety check)
    const publicBoards = data.boards.filter(
      (board: Board) => board.isPublic || board.visibility === "public"
    );

    // Transform API boards to card data format
    const transformedBoards = publicBoards.map(transformApiBoardToCardData);

    return transformedBoards;
  } catch (error) {
    // Re-throw with context for error handling
    throw error;
  }
}

export function useBoards() {
  const [boards, setBoards] = useState<BoardCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0); // Trigger for retry

  // ============================================================================
  // DEPENDENCY ARRAY STABILITY
  // ============================================================================
  // CRITICAL: The dependency array [retryTrigger] must ALWAYS be the same length
  // and order between renders. React requires this for proper effect tracking.
  // 
  // DO NOT:
  // - Conditionally add/remove dependencies
  // - Use spread operators that might change length
  // - Add dependencies based on runtime conditions
  //
  // DO:
  // - Always use [retryTrigger] exactly as written
  // - If you need more dependencies, add them unconditionally: [retryTrigger, dep1, dep2]
  // - Keep the same order every time
  // ============================================================================
  useEffect(() => {
    let isMounted = true; // Track if component is still mounted

    async function fetchBoards() {
      try {
        setLoading(true);
        setError(null);
        setUsingFallback(false);

        // Attempt to fetch from API
        const fetchedBoards = await fetchBoardsFromAPI();

        // Check if component is still mounted before updating state
        if (!isMounted) return;

        // Check if API returned empty results
        if (fetchedBoards.length === 0) {
          // API returned no boards - use fallback if enabled
          if (ENABLE_MOCK_FALLBACK) {
            console.warn(
              "[useBoards] API returned no boards, falling back to mock data"
            );
            setBoards(mockBoards);
            setUsingFallback(true);
            setError(
              "No public boards available. Showing sample boards for demonstration."
            );
          } else {
            setBoards([]);
            setError(null); // Empty results is not an error
          }
        } else {
          // Successfully fetched boards from API
          setBoards(fetchedBoards);
          setUsingFallback(false);
        }
      } catch (err) {
        // Handle fetch errors
        if (!isMounted) return;

        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to load boards from server";

        console.error("[useBoards] Error fetching boards:", err);

        // Fallback to mock data if enabled
        if (ENABLE_MOCK_FALLBACK) {
          console.warn(
            "[useBoards] API fetch failed, falling back to mock data:",
            errorMessage
          );
          setBoards(mockBoards);
          setUsingFallback(true);
          setError(
            `Unable to connect to server (${errorMessage}). Showing sample boards.`
          );
        } else {
          // No fallback - show error state
          setBoards([]);
          setError(errorMessage);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchBoards();

    // Cleanup: mark component as unmounted
    return () => {
      isMounted = false;
    };
  }, 
  // ========================================================================
  // DEPENDENCY ARRAY - CRITICAL: Must remain constant between renders
  // ========================================================================
  // React requires the dependency array to have the EXACT SAME length and
  // order between renders. Changing the array structure causes the error:
  // "The final argument passed to useEffect changed size between renders."
  //
  // WHY THIS MATTERS:
  // React uses the dependency array to determine when to re-run the effect.
  // If the array structure changes (length or order), React cannot properly
  // track dependencies and will throw this error. The array must be a
  // constant literal that never changes structure.
  //
  // RULES (MUST FOLLOW):
  // 1. Always use [retryTrigger] - never conditionally add/remove items
  // 2. If you need more dependencies, add them unconditionally:
  //    [retryTrigger, dep1, dep2] - same structure every render
  // 3. Never use spread operators: [...deps] or conditional arrays
  // 4. Never conditionally include: condition ? [retryTrigger, x] : [retryTrigger]
  // 5. Keep dependencies in the same order always
  //
  // Current: [retryTrigger] - stable literal, never changes structure
  // ========================================================================
  [retryTrigger]
  );

  return {
    boards,
    loading,
    error,
    usingFallback, // Indicates if we're using mock data fallback
    retry: () => {
      // Retry function for error recovery
      // Triggers re-fetch by incrementing retryTrigger
      setRetryTrigger((prev) => prev + 1);
    },
  };
}
