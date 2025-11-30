/**
 * useCreateComment Hook
 * 
 * Creates a new comment in Supabase via the API.
 * 
 * This hook handles comment creation with proper error handling
 * and response format normalization.
 * 
 * @returns Object with createComment function, loading state, error state, and created comment
 */

import { useState, useCallback } from 'react';
import type { Comment } from '@/types';

interface CreateCommentData {
  boardId: string;
  text: string;
  author?: string;
  authorName?: string;
  targetElementId?: string | null;
  elementId?: string | null; // Backward compatibility
  x?: number | null;
  y?: number | null;
  category?: Comment['category'];
  task?: boolean;
  isTask?: boolean; // Backward compatibility
  source?: string | null;
  critSessionId?: string | null; // Optional: Link comment to crit session
  pinId?: string | null; // Legacy field
}

interface UseCreateCommentResult {
  createComment: (data: CreateCommentData) => Promise<Comment | null>;
  loading: boolean;
  error: string | null;
  createdComment: Comment | null;
}

export function useCreateComment(): UseCreateCommentResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdComment, setCreatedComment] = useState<Comment | null>(null);

  const createComment = useCallback(async (data: CreateCommentData): Promise<Comment | null> => {
    try {
      setLoading(true);
      setError(null);
      setCreatedComment(null);

      // ========================================================================
      // FRONTEND: Log request payload before sending
      // ========================================================================
      console.group('[useCreateComment] 🚀 Starting comment creation');
      console.log('📤 Request Payload:', JSON.stringify(data, null, 2));
      console.log('📋 Field Types:', {
        boardId: typeof data.boardId,
        text: typeof data.text,
        authorName: typeof data.authorName,
        author: typeof data.author,
        targetElementId: typeof data.targetElementId,
        elementId: typeof data.elementId,
        category: typeof data.category,
        task: typeof data.task,
        isTask: typeof data.isTask,
        x: typeof data.x,
        y: typeof data.y,
        source: typeof data.source,
      });
      console.log('📋 Field Values:', {
        boardId: data.boardId || 'MISSING',
        text: data.text || 'MISSING',
        authorName: data.authorName || 'MISSING',
        author: data.author || 'MISSING',
        targetElementId: data.targetElementId ?? 'null',
        elementId: data.elementId ?? 'null',
      });

      // ========================================================================
      // FRONTEND: Validate required fields with detailed error messages
      // ========================================================================
      const missingFields: string[] = [];
      const invalidFields: { field: string; reason: string }[] = [];

      // Validate boardId (required)
      if (!data.boardId) {
        missingFields.push('boardId');
      } else if (typeof data.boardId !== 'string' || data.boardId.trim().length === 0) {
        invalidFields.push({ field: 'boardId', reason: `Must be a non-empty string. Received: ${typeof data.boardId}` });
      }

      // Validate text (required)
      if (!data.text) {
        missingFields.push('text');
      } else if (typeof data.text !== 'string') {
        invalidFields.push({ field: 'text', reason: `Must be a string. Received: ${typeof data.text}` });
      } else if (data.text.trim().length === 0) {
        invalidFields.push({ field: 'text', reason: 'Cannot be empty or only whitespace' });
      }

      // Log validation errors
      if (missingFields.length > 0) {
        const errorMsg = `Missing required fields: ${missingFields.join(', ')}`;
        console.error('❌ Validation failed:', errorMsg);
        console.error('❌ Missing fields:', missingFields);
        console.groupEnd();
        throw new Error(errorMsg);
      }

      if (invalidFields.length > 0) {
        const errorDetails = invalidFields.map(f => `${f.field}: ${f.reason}`).join('; ');
        const errorMsg = `Invalid field values: ${errorDetails}`;
        console.error('❌ Validation failed:', errorMsg);
        console.error('❌ Invalid fields:', invalidFields);
        console.groupEnd();
        throw new Error(errorMsg);
      }

      // REFACTORED: Add type guard before toLowerCase() to ensure category is string
      // Validate optional fields if provided
      if (data.category !== undefined && typeof data.category === 'string') {
        const validCategories = ['concept', 'plan', 'section', 'material', 'circulation', 'structure', 'general'];
        if (!validCategories.includes(data.category.toLowerCase())) {
          console.warn(`⚠️ Invalid category "${data.category}". Will default to "general"`);
        }
      }

      // ========================================================================
      // FRONTEND → API: Send request
      // ========================================================================
      console.log('🌐 Sending POST request to /api/comments');
      const requestStartTime = Date.now();
      
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const requestDuration = Date.now() - requestStartTime;
      console.log(`⏱️  Request completed in ${requestDuration}ms`);
      console.log(`📥 Response Status: ${response.status} ${response.statusText}`);
      console.log(`📥 Response Headers:`, Object.fromEntries(response.headers.entries()));

      // ========================================================================
      // API → FRONTEND: Handle HTTP errors
      // ========================================================================
      if (!response.ok) {
        let errorMessage = `Failed to create comment: ${response.status} ${response.statusText}`;
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
        } catch (parseError) {
          console.error('❌ Failed to parse error response as JSON:', parseError);
          // Try to get response text for debugging
          try {
            const responseText = await response.text();
            console.error('❌ Raw error response:', responseText);
          } catch {
            // Response isn't readable, use default error message
          }
        }
        
        console.groupEnd();
        throw new Error(errorMessage);
      }

      // ========================================================================
      // API → FRONTEND: Parse successful response
      // ========================================================================
      const responseData = await response.json();
      console.log('✅ API Success Response:', JSON.stringify(responseData, null, 2));

      // Check for error in { data, error } format
      if (responseData.error) {
        // Extract error message and details for better error display
        const errorMessage = typeof responseData.error === 'string'
          ? responseData.error
          : responseData.error.message || 'Failed to create comment';
        const errorDetails = responseData.details 
          ? `${errorMessage} - ${responseData.details}`
          : errorMessage;
        
        console.error('❌ Response contains error field:', errorDetails);
        console.groupEnd();
        throw new Error(errorDetails);
      }

      // Validate that data exists in successful response
      if (!responseData.data) {
        console.error('❌ Response missing data field:', responseData);
        console.groupEnd();
        throw new Error('Comment was created but no data was returned from the server.');
      }

      // Transform API comment to app format
      const apiComment = responseData.data;
      console.log('📦 Transformed API Comment:', JSON.stringify(apiComment, null, 2));
      
      // Validate required fields in response
      if (!apiComment.id) {
        console.error('❌ Response missing required field: id');
        console.groupEnd();
        throw new Error('Comment was created but missing required field: id');
      }
      if (!apiComment.text) {
        console.error('❌ Response missing required field: text');
        console.groupEnd();
        throw new Error('Comment was created but missing required field: text');
      }
      if (!apiComment.boardId) {
        console.error('❌ Response missing required field: boardId');
        console.groupEnd();
        throw new Error('Comment was created but missing required field: boardId');
      }

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

      console.log('✅ Successfully created comment:', comment.id);
      console.log('✅ Final Comment Object:', JSON.stringify(comment, null, 2));
      console.groupEnd();

      setCreatedComment(comment);
      setError(null); // Clear any previous errors on success
      return comment;
    } catch (err) {
      // ========================================================================
      // ERROR HANDLING: Log full error details
      // ========================================================================
      console.group('❌ [useCreateComment] Comment creation failed');
      
      // Extract detailed error message for better error display
      let errorMessage: string;
      if (err instanceof Error) {
        errorMessage = err.message;
        console.error('❌ Error Type: Error');
        console.error('❌ Error Message:', err.message);
        console.error('❌ Error Stack:', err.stack);
      } else {
        errorMessage = 'An unexpected error occurred while creating comment';
        console.error('❌ Error Type: Unknown');
        console.error('❌ Error Object:', err);
        console.error('❌ Error Stringified:', JSON.stringify(err, null, 2));
      }
      
      // Log the full error object for debugging
      console.error('❌ Full Error Object:', err);
      console.error('❌ Error Details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: errorMessage,
        constructor: err?.constructor?.name,
        keys: err ? Object.keys(err) : [],
      });
      
      console.groupEnd();
      
      setError(errorMessage);
      setCreatedComment(null); // Clear created comment on error
      
      // Return null instead of throwing - allows component to check error state
      // Components can check hook.error or handlePostComment's catch block
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createComment,
    loading,
    error,
    createdComment,
  };
}
