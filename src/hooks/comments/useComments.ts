/**
 * useComments Hook
 * 
 * Fetches all comments for a board from Supabase via the Next.js API.
 * 
 * This hook provides a clean interface for fetching comments with:
 * - Automatic polling for real-time updates (every 5 seconds)
 * - Loading and error states
 * - Proper data transformation from API format to app format
 * - Type safety with TypeScript
 * 
 * @param boardId - The ID of the board to fetch comments for (null/undefined will clear comments)
 * @returns Object containing:
 *   - comments: Array of Comment objects
 *   - loading: Boolean indicating if comments are being fetched
 *   - error: Error message string or null if no error
 *   - refetch: Function to manually refresh comments
 * 
 * @example
 * ```tsx
 * const { comments, loading, error, refetch } = useComments(boardId);
 * 
 * if (loading) return <div>Loading comments...</div>;
 * if (error) return <div>Error: {error}</div>;
 * 
 * return (
 *   <div>
 *     {comments.map(comment => (
 *       <CommentItem key={comment.id} comment={comment} />
 *     ))}
 *   </div>
 * );
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import type { Comment } from '@/types';

/**
 * Return type for the useComments hook
 */
interface UseCommentsResult {
  /** Array of comments for the board, ordered by creation date (newest first) */
  comments: Comment[];
  /** True while fetching comments from the API */
  loading: boolean;
  /** Error message if fetching failed, null otherwise */
  error: string | null;
  /** Function to manually refetch comments */
  refetch: () => Promise<void>;
}

/**
 * Transforms an API comment response to the app's Comment format
 * 
 * This handles differences between the Supabase/API format and the app's expected format,
 * including backward compatibility with legacy fields.
 * 
 * @param apiComment - Comment object from the API response
 * @returns Comment object in app format
 */
const transformApiComment = (apiComment: any): Comment => {
  return {
    id: apiComment.id,
    author: apiComment.author || apiComment.authorName || 'Anonymous',
    text: apiComment.text,
    timestamp: apiComment.timestamp || apiComment.createdAt || new Date().toISOString(),
    boardId: apiComment.boardId,
    category: (apiComment.category?.toLowerCase() as Comment['category']) || 'general',
    elementId: apiComment.elementId || apiComment.targetElementId || null,
    targetElementId: apiComment.targetElementId || apiComment.elementId || null,
    x: apiComment.x || undefined,
    y: apiComment.y || undefined,
    task: apiComment.task || apiComment.isTask || false,
    source: apiComment.source || undefined,
    // Legacy fields for backward compatibility
    pinId: apiComment.pinId || null,
    type: (apiComment.type as 'comment' | 'crit') || 'comment',
  };
};

/**
 * Hook options for filtering comments
 */
export interface UseCommentsOptions {
  /** Board ID (required) - filters comments by board */
  boardId: string | null;
  /** Element ID (optional) - filters comments by specific element (UUID) */
  elementId?: string | null;
  /** Source (optional) - filters comments by source (e.g., "liveCrit" for crit session comments) */
  source?: string | null;
}

/**
 * REFACTORED: Unified hook to fetch and manage comments from Supabase
 * 
 * This hook:
 * - Fetches comments from the shared Supabase comments table
 * - Supports filtering by board, element, and crit session (source)
 * - Provides loading and error states
 * - Automatically polls for updates every 5 seconds
 * - Works across all contexts: student page, live crit page, board page, etc.
 * 
 * Automatically fetches comments when:
 * - Component mounts
 * - boardId, elementId, or source changes
 * - Every 5 seconds (polling for real-time updates)
 * 
 * @param options - Filtering options: { boardId, elementId?, source? }
 *                  OR legacy: boardId (string | null) for backward compatibility
 * @returns UseCommentsResult with comments, loading state, error, and refetch function
 * 
 * @example
 * // All comments for a board
 * const { comments } = useComments({ boardId: "board-123" });
 * 
 * @example
 * // Comments for a specific element
 * const { comments } = useComments({ boardId: "board-123", elementId: "element-uuid" });
 * 
 * @example
 * // Live crit session comments
 * const { comments } = useComments({ boardId: "board-123", source: "liveCrit" });
 */
export function useComments(
  options: UseCommentsOptions | string | null
): UseCommentsResult {
  // Handle legacy API: if options is a string or null, convert to options object
  const opts: UseCommentsOptions = typeof options === 'string' || options === null
    ? { boardId: options }
    : options;
  
  const { boardId, elementId, source } = opts;
  
  // State for comments, loading, and error
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches comments from the Supabase API with filtering
   * 
   * REFACTORED: Supports filtering by board, element, and source
   * 
   * Makes a GET request to /api/comments?boardId={boardId}&elementId={elementId}&source={source}
   * Handles errors and transforms the response to app format
   */
  const fetchComments = useCallback(async () => {
    // If no boardId, clear comments and return
    if (!boardId) {
      setComments([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      // Set loading state before fetching
      setLoading(true);
      setError(null);

      // Build query parameters with filters
      const params = new URLSearchParams({ boardId });
      if (elementId) {
        params.append('elementId', elementId);
      }
      if (source) {
        params.append('source', source);
      }

      // Fetch comments from API with filtering
      // GET /api/comments?boardId={boardId}&elementId={elementId}&source={source}
      // Returns { data: Comment[], error: null }
      const response = await fetch(`/api/comments?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Handle HTTP errors (4xx, 5xx status codes)
      if (!response.ok) {
        let errorMessage = `Failed to fetch comments: ${response.status} ${response.statusText}`;
        
        // Try to extract error message from response body
        try {
          const errorData = await response.json();
          if (errorData.error) {
            // Handle both string and object error formats
            errorMessage = typeof errorData.error === 'string' 
              ? errorData.error 
              : errorData.error.message || errorMessage;
          }
          // Add details if available
          if (errorData.details) {
            errorMessage += ` - ${errorData.details}`;
          }
        } catch {
          // Response isn't JSON, use default error message
        }
        throw new Error(errorMessage);
      }

      // Parse response in { data, error } format
      const responseData = await response.json();
      
      // Check for API-level errors (Supabase errors, etc.)
      if (responseData.error) {
        const errorMsg = typeof responseData.error === 'string'
          ? responseData.error
          : responseData.error.message || 'Failed to fetch comments';
        throw new Error(errorMsg);
      }

      // Transform API comments to app format
      // API returns comments array in responseData.data
      const apiComments = responseData.data || [];
      const transformedComments = apiComments.map(transformApiComment);
      
      // Update state with transformed comments
      setComments(transformedComments);
      setError(null);
    } catch (err) {
      // Handle any errors (network, parsing, etc.)
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'An unexpected error occurred while fetching comments';
      console.error('[useComments] Error fetching comments:', err);
      setError(errorMessage);
      setComments([]); // Clear comments on error
    } finally {
      // Always set loading to false after fetch completes
      setLoading(false);
    }
  }, [boardId]); // Re-fetch when boardId changes

  /**
   * Effect: Fetch comments when component mounts or boardId changes
   * 
   * This runs immediately when the hook is first called and whenever boardId changes.
   */
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  /**
   * Effect: Poll for updates every 5 seconds
   * 
   * This enables real-time synchronization across users without WebSockets.
   * Comments are automatically refreshed every 5 seconds to pick up changes
   * made by other users.
   * 
   * The interval is cleared when:
   * - Component unmounts
   * - boardId changes (will be recreated with new interval)
   */
  useEffect(() => {
    // Don't poll if there's no boardId
    if (!boardId) return;

    // Set up polling interval (every 5 seconds)
    const interval = setInterval(() => {
      fetchComments();
    }, 5000); // 5000ms = 5 seconds

    // Cleanup: clear interval when effect re-runs or component unmounts
    return () => clearInterval(interval);
  }, [boardId, elementId, source, fetchComments]);

  // Return comments, loading state, error, and manual refetch function
  return {
    comments,
    loading,
    error,
    refetch: fetchComments, // Expose fetchComments as refetch for manual refresh
  };
}


