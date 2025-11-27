/**
 * useDeleteComment Hook
 * 
 * Deletes a comment from Supabase via the API.
 * 
 * This hook handles comment deletion with proper error handling
 * and response format normalization.
 * 
 * @returns Object with deleteComment function, loading state, and error state
 */

import { useState, useCallback } from 'react';

interface UseDeleteCommentResult {
  deleteComment: (commentId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useDeleteComment(): UseDeleteCommentResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteComment = useCallback(async (commentId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      if (!commentId) {
        throw new Error('commentId is required');
      }

      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorMessage = `Failed to delete comment: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = typeof errorData.error === 'string'
              ? errorData.error
              : errorData.error.message || errorMessage;
          }
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

      if (responseData.error) {
        throw new Error(responseData.error.message || responseData.error || 'Failed to delete comment');
      }

      // Success - comment deleted
      return;
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : 'An unexpected error occurred while deleting comment';
      console.error('[useDeleteComment] Error deleting comment:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    deleteComment,
    loading,
    error,
  };
}




