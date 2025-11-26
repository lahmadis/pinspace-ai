/**
 * useUpdateComment Hook
 * 
 * Updates an existing comment in Supabase via the API.
 * 
 * This hook handles comment updates with proper error handling
 * and response format normalization.
 * 
 * @returns Object with updateComment function, loading state, and error state
 */

import { useState, useCallback } from 'react';
import type { Comment } from '@/types';

interface UpdateCommentData {
  text?: string;
  category?: Comment['category'];
  task?: boolean;
  isTask?: boolean; // Backward compatibility
  targetElementId?: string | null;
  elementId?: string | null; // Backward compatibility
  x?: number | null;
  y?: number | null;
  source?: string | null;
}

interface UseUpdateCommentResult {
  updateComment: (commentId: string, updates: UpdateCommentData) => Promise<Comment | null>;
  loading: boolean;
  error: string | null;
}

export function useUpdateComment(): UseUpdateCommentResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateComment = useCallback(async (
    commentId: string,
    updates: UpdateCommentData
  ): Promise<Comment | null> => {
    try {
      setLoading(true);
      setError(null);

      // ========================================================================
      // VALIDATION: Check required fields before sending request
      // ========================================================================
      console.group('[useUpdateComment] 🚀 Starting comment update');
      console.log('📤 Update Payload:', { commentId, updates: JSON.stringify(updates, null, 2) });
      console.log('📋 Update Types:', {
        text: typeof updates.text,
        category: typeof updates.category,
        task: typeof updates.task,
        targetElementId: typeof updates.targetElementId,
      });

      if (!commentId) {
        const errorMsg = 'commentId is required';
        console.error('❌ Validation failed:', errorMsg);
        console.groupEnd();
        throw new Error(errorMsg);
      }

      // Validate text if provided
      if (updates.text !== undefined) {
        const trimmedText = typeof updates.text === 'string' ? updates.text.trim() : '';
        if (trimmedText.length === 0) {
          const errorMsg = 'Text cannot be empty';
          console.error('❌ Validation failed:', errorMsg);
          console.groupEnd();
          throw new Error(errorMsg);
        }
      }

      // ========================================================================
      // API CALL: Send PATCH request to update comment
      // ========================================================================
      console.log('🌐 Sending PATCH request to /api/comments/' + commentId);
      const requestStartTime = Date.now();
      
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const requestDuration = Date.now() - requestStartTime;
      console.log(`⏱️ Request completed in ${requestDuration}ms`);
      console.log(`📥 Response Status: ${response.status} ${response.statusText}`);

      // ========================================================================
      // ERROR HANDLING: Handle HTTP errors
      // ========================================================================
      if (!response.ok) {
        let errorMessage = `Failed to update comment: ${response.status} ${response.statusText}`;
        let errorData: any = null;
        
        try {
          errorData = await response.json();
          console.error('❌ API Error Response:', JSON.stringify(errorData, null, 2));
          
          if (errorData.error) {
            errorMessage = typeof errorData.error === 'string'
              ? errorData.error
              : errorData.error.message || errorMessage;
          }
          if (errorData.details) {
            errorMessage += ` - ${errorData.details}`;
          }
        } catch {
          console.error('❌ Failed to parse error response as JSON');
        }
        
        console.groupEnd();
        throw new Error(errorMessage);
      }

      // ========================================================================
      // SUCCESS: Parse response and transform to app format
      // ========================================================================
      const responseData = await response.json();
      console.log('✅ API Success Response:', JSON.stringify(responseData, null, 2));

      if (responseData.error) {
        const errorMsg = responseData.error.message || responseData.error || 'Failed to update comment';
        console.error('❌ Response contains error field:', errorMsg);
        console.groupEnd();
        throw new Error(errorMsg);
      }

      // Validate that data exists in successful response
      if (!responseData.data) {
        console.error('❌ Response missing data field:', responseData);
        console.groupEnd();
        throw new Error('Comment was updated but no data was returned from the server.');
      }

      // Transform API comment to app format
      const apiComment = responseData.data;
      const comment: Comment = {
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
        pinId: apiComment.pinId || null,
        type: (apiComment.type as 'comment' | 'crit') || 'comment',
      };

      console.log('✅ Successfully updated comment:', comment.id);
      console.log('✅ Updated Comment Object:', JSON.stringify(comment, null, 2));
      console.groupEnd();

      return comment;
    } catch (err) {
      // ========================================================================
      // ERROR HANDLING: Log full error details
      // ========================================================================
      console.group('❌ [useUpdateComment] Comment update failed');
      
      const errorMessage = err instanceof Error
        ? err.message
        : 'An unexpected error occurred while updating comment';
      
      console.error('❌ Error Type:', err instanceof Error ? 'Error' : 'Unknown');
      console.error('❌ Error Message:', errorMessage);
      console.error('❌ Full Error Object:', err);
      if (err instanceof Error) {
        console.error('❌ Error Stack:', err.stack);
      }
      
      console.groupEnd();
      
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    updateComment,
    loading,
    error,
  };
}
