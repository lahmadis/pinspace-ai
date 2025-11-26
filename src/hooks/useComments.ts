/**
 * useComments Hook
 * 
 * Fetches all comments for a board from Supabase via the API.
 * 
 * This hook replaces the localStorage-based comment fetching with
 * Supabase-backed API calls for real-time synchronization across users.
 * 
 * @param boardId - The ID of the board to fetch comments for
 * @returns Object with comments array, loading state, error state, and refetch function
 */

import { useState, useEffect, useCallback } from 'react';
import type { Comment } from '@/types';

interface UseCommentsResult {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useComments(boardId: string | null): UseCommentsResult {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transform API comment format to app Comment format
  const transformApiComment = useCallback((apiComment: any): Comment => {
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
  }, []);

  // Fetch comments from API
  const fetchComments = useCallback(async () => {
    if (!boardId) {
      setComments([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/comments?boardId=${boardId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorMessage = `Failed to fetch comments: ${response.status} ${response.statusText}`;
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
        throw new Error(responseData.error.message || responseData.error || 'Failed to fetch comments');
      }

      // Transform API comments to app format
      const apiComments = responseData.data || [];
      const transformedComments = apiComments.map(transformApiComment);
      
      setComments(transformedComments);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'An unexpected error occurred while fetching comments';
      console.error('[useComments] Error fetching comments:', err);
      setError(errorMessage);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [boardId, transformApiComment]);

  // Fetch comments on mount and when boardId changes
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Poll for updates every 5 seconds (for real-time sync without WebSockets)
  useEffect(() => {
    if (!boardId) return;

    const interval = setInterval(() => {
      fetchComments();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [boardId, fetchComments]);

  return {
    comments,
    loading,
    error,
    refetch: fetchComments,
  };
}


