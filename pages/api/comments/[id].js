/**
 * Single Comment API Route
 * 
 * Endpoints:
 * - GET /api/comments/[id] → Fetch a single comment by ID
 * - PATCH /api/comments/[id] → Update a comment
 * - DELETE /api/comments/[id] → Delete a comment
 * 
 * All operations use Supabase and respect RLS (Row Level Security) policies.
 * Responses use consistent { data, error } format.
 */

import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse } from '../_helpers/responseHelper';
import { validateAndNormalizeElementId } from '../_helpers/uuidValidator';

export default async function handler(req, res) {
  try {
    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse(
        res,
        'Supabase configuration is missing. Please check your environment variables.',
        500
      );
    }

    // Extract comment ID from query parameters
    const commentId = req.query.id;

    if (!commentId) {
      return errorResponse(
        res,
        'Comment ID is required',
        400,
        'Please provide a comment ID in the URL path: /api/comments/{id}'
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // ========================================================================
    // REFACTORED: Helper function to transform Supabase comment to app format
    // ========================================================================
    // NOTE: targetElementId and elementId can now be either:
    // - UUID strings (from element_id column)
    // - Non-UUID strings (from element_id_text column, e.g., "pdf_page_...")
    // ========================================================================
    const transformComment = (comment) => ({
      id: comment.id,
      boardId: comment.board_id,
      author: comment.author_name,
      authorId: comment.author_id || null,
      text: comment.text,
      timestamp: comment.created_at,
      category: comment.category || 'general',
      // REFACTORED: Get element ID from either UUID column (element_id) or TEXT column (element_id_text)
      // Also check target_element_id for backward compatibility
      targetElementId: comment.element_id || comment.element_id_text || comment.target_element_id || null,
      elementId: comment.element_id || comment.element_id_text || comment.target_element_id || null, // Backward compatibility
      x: comment.x || null,
      y: comment.y || null,
      task: comment.is_task || false,
      source: comment.source || null,
      // Legacy fields
      pinId: comment.pin_id || null,
      type: comment.type || 'comment',
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
    });

    // GET /api/comments/[id] - Fetch a single comment
    if (req.method === 'GET') {
      const { data: comment, error } = await supabase
        .from('comments')
        .select('*')
        .eq('id', commentId)
        .single();

      if (error) {
        console.error('Error fetching comment:', error);

        // Handle not found errors
        if (error.code === 'PGRST116') {
          return errorResponse(
            res,
            'Comment not found',
            404,
            `No comment found with ID: ${commentId}`
          );
        }

        return errorResponse(
          res,
          'Failed to fetch comment',
          500,
          error.message
        );
      }

      // Transform and return comment
      return successResponse(res, transformComment(comment), 200);
    }

    // PATCH /api/comments/[id] - Update a comment
    if (req.method === 'PATCH') {
      // Step 1: Check if comment exists first
      const { data: existingComment, error: fetchError } = await supabase
        .from('comments')
        .select('id')
        .eq('id', commentId)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        return errorResponse(
          res,
          'Comment not found',
          404,
          `No comment found with ID: ${commentId}. Cannot update a comment that does not exist.`
        );
      }

      if (fetchError) {
        console.error('Error checking if comment exists:', fetchError);
        return errorResponse(
          res,
          'Failed to check comment existence',
          500,
          fetchError.message
        );
      }

      // Step 2: Validate request body
      if (!req.body || typeof req.body !== 'object') {
        return errorResponse(
          res,
          'Request body must be a valid JSON object',
          400
        );
      }

      // Step 3: Extract and validate update fields
      const updates = {};

      if (req.body.text !== undefined) {
        const trimmedText = typeof req.body.text === 'string' ? req.body.text.trim() : '';
        if (trimmedText.length === 0) {
          return errorResponse(
            res,
            'Invalid text',
            400,
            'Text cannot be empty'
          );
        }
        updates.text = trimmedText;
      }

      if (req.body.category !== undefined) {
        const validCategories = ['concept', 'plan', 'section', 'material', 'circulation', 'structure', 'general'];
        const category = String(req.body.category).toLowerCase();
        if (!validCategories.includes(category)) {
          return errorResponse(
            res,
            'Invalid category',
            400,
            `Category must be one of: ${validCategories.join(', ')}`
          );
        }
        updates.category = category;
      }

      if (req.body.task !== undefined || req.body.isTask !== undefined) {
        updates.is_task = req.body.task || req.body.isTask || false;
      }

      // ========================================================================
      // REFACTORED: Validate and normalize element IDs before updating
      // Now supports both UUID and non-UUID element IDs
      // ========================================================================
      // The database has two columns:
      // - `element_id` (UUID type) - for UUID element IDs
      // - `element_id_text` (TEXT type) - for non-UUID element IDs (e.g., "pdf_page_...")
      // 
      // This function:
      // 1. Strips common prefixes (e_, el_, img_, t_, shape_)
      // 2. Determines if the ID is a UUID or a string
      // 3. Stores in the appropriate column based on type
      // ========================================================================
      
      if (req.body.targetElementId !== undefined || req.body.elementId !== undefined) {
        const targetId = req.body.targetElementId || req.body.elementId || null;
        
        // Validate and normalize element ID (supports both UUID and non-UUID)
        const validation = validateAndNormalizeElementId(targetId);
        if (!validation.valid) {
          console.error(`[PATCH /api/comments/${commentId}] ❌ Element ID validation failed:`, {
            original: targetId,
            error: validation.error,
          });
          return errorResponse(
            res,
            'Invalid element ID',
            400,
            validation.error || 'Invalid element ID'
          );
        }
        
        // Store in appropriate column based on ID type
        // Also clear the other column to avoid conflicts
        if (validation.isUUID) {
          updates.element_id = validation.normalizedId;
          updates.element_id_text = null; // Clear TEXT column when using UUID
          updates.target_element_id = validation.normalizedId; // Backward compatibility
        } else {
          updates.element_id_text = validation.normalizedId;
          updates.element_id = null; // Clear UUID column when using TEXT
          updates.target_element_id = null; // Clear backward compatibility column
        }
        
        console.log(`[PATCH /api/comments/${commentId}] ✅ Element ID validation passed:`, {
          original: targetId,
          normalized: validation.normalizedId,
          isUUID: validation.isUUID,
          storageColumn: validation.isUUID ? 'element_id' : 'element_id_text',
        });
      }

      if (req.body.x !== undefined) {
        updates.x = req.body.x !== null ? parseFloat(req.body.x) : null;
      }

      if (req.body.y !== undefined) {
        updates.y = req.body.y !== null ? parseFloat(req.body.y) : null;
      }

      if (req.body.source !== undefined) {
        updates.source = req.body.source || null;
      }

      // Step 4: Check if there are any fields to update
      if (Object.keys(updates).length === 0) {
        return errorResponse(
          res,
          'No valid fields to update',
          400,
          'Allowed fields: text, category, task, targetElementId, x, y, source'
        );
      }

      // Step 5: Perform update
      const { data: updateResult, error: updateError } = await supabase
        .from('comments')
        .update(updates)
        .eq('id', commentId)
        .select();

      if (updateError) {
        console.error('Error updating comment:', updateError);
        return errorResponse(
          res,
          'Failed to update comment',
          500,
          updateError.message
        );
      }

      // Step 6: Check if update was successful
      if (!updateResult || updateResult.length === 0) {
        return errorResponse(
          res,
          'Update forbidden',
          403,
          'You do not have permission to update this comment. RLS policy prevented update.'
        );
      }

      // Step 7: Transform and return updated comment
      return successResponse(res, transformComment(updateResult[0]), 200);
    }

    // DELETE /api/comments/[id] - Delete a comment
    if (req.method === 'DELETE') {
      // Step 1: Check if comment exists first
      const { data: existingComment, error: fetchError } = await supabase
        .from('comments')
        .select('id')
        .eq('id', commentId)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        return errorResponse(
          res,
          'Comment not found',
          404,
          `No comment found with ID: ${commentId}. Cannot delete a comment that does not exist.`
        );
      }

      if (fetchError) {
        console.error('Error checking if comment exists:', fetchError);
        return errorResponse(
          res,
          'Failed to check comment existence',
          500,
          fetchError.message
        );
      }

      // Step 2: Perform delete
      const { data: deleteResult, error: deleteError } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .select();

      if (deleteError) {
        console.error('Error deleting comment:', deleteError);
        return errorResponse(
          res,
          'Failed to delete comment',
          500,
          deleteError.message
        );
      }

      // Step 3: Check if deletion was successful
      if (!deleteResult || deleteResult.length === 0) {
        return errorResponse(
          res,
          'Delete forbidden',
          403,
          'You do not have permission to delete this comment. RLS policy prevented deletion.'
        );
      }

      // Step 4: Return success response
      return successResponse(
        res,
        {
          success: true,
          message: 'Comment deleted successfully',
          deletedId: commentId,
        },
        200
      );
    }

    // Handle unsupported HTTP methods
    return errorResponse(
      res,
      `Method ${req.method} not allowed`,
      405,
      'Supported methods: GET, PATCH, DELETE'
    );
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error in comments/[id] API:', error);
    return errorResponse(
      res,
      'Internal server error',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

