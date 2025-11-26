/**
 * useAttachments Hook
 * 
 * Fetches and manages attachments for a board or comment from Supabase.
 * 
 * Features:
 * - Fetch attachments by boardId or commentId
 * - Automatic polling for real-time updates (every 5 seconds)
 * - Loading and error states
 * - Manual refetch function
 * - Group attachments by comment_id for display
 * 
 * Usage:
 *   const { attachments, loading, error, refetch } = useAttachments({ boardId: 'abc-123' });
 *   const { attachments, loading, error } = useAttachments({ commentId: 'comment-456' });
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Attachment type matching the API response format
 */
export interface Attachment {
  id: string;
  boardId: string;
  commentId: string | null;
  fileName: string;
  fileUrl: string;
  fileType: string | null; // e.g., 'image', 'document', 'pdf'
  fileSize: number | null; // File size in bytes
  mimeType: string | null; // e.g., 'image/png', 'application/pdf'
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// REFACTORED: Exported interfaces for use in other files
export interface UseAttachmentsOptions {
  boardId?: string | null;
  commentId?: string | null;
  enabled?: boolean; // Whether to fetch automatically (default: true)
  pollInterval?: number; // Polling interval in milliseconds (default: 5000)
}

export interface UseAttachmentsResult {
  attachments: Attachment[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  // Grouped attachments by commentId for easy display
  attachmentsByComment: Record<string, Attachment[]>;
  // Board-level attachments (not linked to any comment)
  boardAttachments: Attachment[];
}

/**
 * Hook to fetch and manage attachments for a board or comment
 * 
 * @param options - Configuration options for fetching attachments
 * @returns UseAttachmentsResult with attachments, loading state, error, and helper functions
 */
export function useAttachments(options: UseAttachmentsOptions): UseAttachmentsResult {
  const {
    boardId,
    commentId,
    enabled = true,
    pollInterval = 5000, // Poll every 5 seconds for real-time updates
  } = options;

  // State for attachments, loading, and error
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches attachments from the Supabase API
   * 
   * Makes a GET request to /api/attachments?boardId={boardId}&commentId={commentId}
   * Handles errors and transforms the response to app format
   * 
   * IMPORTANT: boardId is required for fetching board-level attachments.
   * commentId can be used to fetch attachments for a specific comment, but
   * boardId should still be provided for proper data integrity.
   */
  const fetchAttachments = useCallback(async () => {
    // ========================================================================
    // VALIDATION: Ensure at least one identifier is provided
    // ========================================================================
    // If both boardId and commentId are missing, clear attachments and return
    // This prevents unnecessary API calls and ensures proper data filtering
    if (!boardId && !commentId) {
      console.warn('[useAttachments] ⚠️ No boardId or commentId provided - cannot fetch attachments');
      setAttachments([]);
      setLoading(false);
      return;
    }

    // ========================================================================
    // VALIDATION: Warn if boardId is missing when fetching board attachments
    // ========================================================================
    // While commentId can be used alone, boardId should be provided for
    // proper board-level attachment filtering and data integrity
    if (!boardId && commentId) {
      console.warn('[useAttachments] ⚠️ boardId is missing - fetching by commentId only. Consider providing boardId for better data integrity.');
    }

    // If fetching is disabled, don't fetch
    if (!enabled) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build query string
      const queryParams = new URLSearchParams();
      if (boardId) {
        queryParams.append('boardId', boardId);
      }
      if (commentId) {
        queryParams.append('commentId', commentId);
      }

      const response = await fetch(`/api/attachments?${queryParams.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to fetch attachments: ${response.status} ${response.statusText}`
        );
      }

      // Parse response in { data, error } format
      const responseData = await response.json();

      if (responseData.error) {
        throw new Error(
          typeof responseData.error === 'string'
            ? responseData.error
            : responseData.error.message || 'Failed to fetch attachments'
        );
      }

      // Transform API attachments to app format
      const fetchedAttachments: Attachment[] = (responseData.data || []).map((apiAttachment: any) => ({
        id: apiAttachment.id,
        boardId: apiAttachment.boardId,
        commentId: apiAttachment.commentId || null,
        fileName: apiAttachment.fileName,
        fileUrl: apiAttachment.fileUrl,
        fileType: apiAttachment.fileType || null,
        fileSize: apiAttachment.fileSize || null,
        mimeType: apiAttachment.mimeType || null,
        uploadedBy: apiAttachment.uploadedBy || null,
        createdAt: apiAttachment.createdAt,
        updatedAt: apiAttachment.updatedAt,
      }));

      setAttachments(fetchedAttachments);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : 'An unexpected error occurred while fetching attachments';
      console.error('[useAttachments] Error fetching attachments:', err);
      setError(errorMessage);
      setAttachments([]); // Clear attachments on error
    } finally {
      setLoading(false);
    }
  }, [boardId, commentId, enabled]);

  /**
   * Manual refetch function that can be called by components
   */
  const refetch = useCallback(async () => {
    await fetchAttachments();
  }, [fetchAttachments]);

  // Fetch attachments when component mounts or when boardId/commentId changes
  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  // Set up polling for real-time updates (only if enabled)
  useEffect(() => {
    if (!enabled || (!boardId && !commentId)) {
      return;
    }

    const intervalId = setInterval(() => {
      fetchAttachments();
    }, pollInterval);

    // Cleanup interval on unmount or when dependencies change
    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, boardId, commentId, pollInterval, fetchAttachments]);

  /**
   * Group attachments by commentId for easy display in comment threads
   * Returns a Record where keys are commentIds and values are arrays of attachments
   */
  const attachmentsByComment = useMemo(() => {
    const grouped: Record<string, Attachment[]> = {};
    
    attachments.forEach((attachment) => {
      if (attachment.commentId) {
        if (!grouped[attachment.commentId]) {
          grouped[attachment.commentId] = [];
        }
        grouped[attachment.commentId].push(attachment);
      }
    });
    
    return grouped;
  }, [attachments]);

  /**
   * Board-level attachments (not linked to any specific comment)
   */
  const boardAttachments = useMemo(() => {
    return attachments.filter((attachment) => !attachment.commentId);
  }, [attachments]);

  return {
    attachments,
    loading,
    error,
    refetch,
    attachmentsByComment,
    boardAttachments,
  };
}


