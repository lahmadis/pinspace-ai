import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse } from '../_helpers/responseHelper';

/**
 * Dynamic API route for single board operations
 * 
 * Endpoints:
 * - GET /api/boards/[id] → Fetch a single board by ID
 * - PATCH /api/boards/[id] → Update board title/description/visibility
 * - DELETE /api/boards/[id] → Delete a board
 * 
 * All operations respect Supabase RLS (Row Level Security) policies.
 * The client uses the anon key, so RLS policies control access.
 * 
 * UPDATED: All responses now use consistent { data, error } format
 */

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

    // Extract board ID from query parameters
    const boardId = req.query.id;

    if (!boardId) {
      return errorResponse(res, 'Board ID is required', 400);
    }

    // Create Supabase client
    // RLS policies will be enforced automatically with the anon key
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // GET /api/boards/[id] - Fetch a single board
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .single();

      if (error) {
        console.error('Error fetching board:', error);
        
        // Handle not found errors
        if (error.code === 'PGRST116') {
          return errorResponse(
            res,
            'Board not found',
            404,
            `No board found with ID: ${boardId}`
          );
        }

        return errorResponse(res, 'Failed to fetch board', 500, error.message);
      }

      return successResponse(res, data, 200);
    }

    // PATCH /api/boards/[id] - Update board
    if (req.method === 'PATCH') {
      // Step 1: Validate request body
      if (!req.body || typeof req.body !== 'object') {
        return errorResponse(res, 'Request body must be a valid JSON object', 400);
      }

      // Step 2: Check if board exists first (provides better error messages)
      // This helps distinguish between "board not found" vs "update forbidden"
      const { data: existingBoard, error: fetchError } = await supabase
        .from('boards')
        .select('id')
        .eq('id', boardId)
        .single();

      // If board doesn't exist, return 404 error in { data, error } format
      if (fetchError && fetchError.code === 'PGRST116') {
        return errorResponse(
          res,
          'Board not found',
          404,
          `No board found with ID: ${boardId}. Cannot update a board that does not exist.`
        );
      }

      // If there's another error fetching the board, return error in { data, error } format
      if (fetchError) {
        console.error('Error checking if board exists:', fetchError);
        return errorResponse(
          res,
          'Failed to check board existence',
          500,
          fetchError.message
        );
      }

      // Step 3: Extract allowed update fields
      // Only allow updating: title, description, visibility
      const updates = {};
      if (req.body.title !== undefined) {
        // Validate title is a string and not empty (after trim)
        const trimmedTitle = typeof req.body.title === 'string' ? req.body.title.trim() : '';
        if (trimmedTitle.length === 0) {
          return errorResponse(
            res,
            'Invalid title',
            400,
            'Title cannot be empty'
          );
        }
        updates.title = trimmedTitle;
      }
      if (req.body.description !== undefined) {
        // Allow null or string for description
        updates.description = req.body.description === null ? null : String(req.body.description);
      }
      if (req.body.visibility !== undefined) {
        // Validate visibility value
        const visibility = String(req.body.visibility).toLowerCase();
        if (visibility !== 'private' && visibility !== 'public') {
          return errorResponse(
            res,
            'Invalid visibility value',
            400,
            'Visibility must be "private" or "public"'
          );
        }
        updates.visibility = visibility;
      }

      // Step 4: Check if there are any fields to update
      if (Object.keys(updates).length === 0) {
        return errorResponse(
          res,
          'No valid fields to update',
          400,
          'Allowed fields: title, description, visibility'
        );
      }

      // Step 5: Update updated_at timestamp
      updates.updated_at = new Date().toISOString();

      // Step 6: Perform update operation
      // Note: Supabase update can return different formats:
      //   - Array: [updatedRow] when update succeeds
      //   - Empty array []: When RLS policy prevents update (no rows updated)
      //   - null: When query fails
      // We normalize all of these to always return { data, error } format
      const { data: updateResult, error: updateError } = await supabase
        .from('boards')
        .update(updates)
        .eq('id', boardId)
        .select();  // Use .select() instead of .single() to handle empty arrays from RLS

      // Step 7: Handle Supabase errors (network, database, etc.)
      // These are distinct from RLS policy violations
      if (updateError) {
        console.error('Error updating board:', updateError);
        return errorResponse(
          res,
          'Failed to update board',
          500,
          updateError.message
        );
      }

      // Step 8: Normalize Supabase response to consistent format
      // Supabase UPDATE with .select() returns an array, which can be:
      //   - [updatedRow] if update succeeded
      //   - [] (empty array) if RLS policy prevented update or no rows matched
      // We check the array length to determine success
      let updatedBoard = null;
      let updateSuccessful = false;

      if (Array.isArray(updateResult)) {
        // If array has items, update was successful
        if (updateResult.length > 0) {
          updatedBoard = updateResult[0];  // Get first updated row
          updateSuccessful = true;
        } else {
          // Empty array means no rows were updated (RLS prevented update)
          updatedBoard = null;
          updateSuccessful = false;
        }
      } else if (updateResult && typeof updateResult === 'object') {
        // If it's an object (shouldn't happen with .select(), but handle it)
        updatedBoard = updateResult;
        updateSuccessful = true;
      } else {
        // If null or undefined, update failed (RLS or no match)
        updatedBoard = null;
        updateSuccessful = false;
      }

      // Step 9: Check if update was successful
      // If updateSuccessful is false, it means RLS policy prevented update
      // or the board didn't exist (though we already checked that above)
      if (!updateSuccessful) {
        // Return 403 Forbidden in { data, error } format when RLS prevents update
        return errorResponse(
          res,
          'Update forbidden',
          403,
          'You do not have permission to update this board. RLS policy prevented update.'
        );
      }

      // Step 10: Success - return normalized { data, error } format
      // Always return { data, error } even on success
      return successResponse(res, updatedBoard, 200);
    }

    // DELETE /api/boards/[id] - Delete board
    if (req.method === 'DELETE') {
      // Step 1: Check if board exists first (provides better error messages)
      // This helps distinguish between "board not found" vs "delete forbidden"
      const { data: existingBoard, error: fetchError } = await supabase
        .from('boards')
        .select('id')
        .eq('id', boardId)
        .single();

      // If board doesn't exist, return 404 error in { data, error } format
      if (fetchError && fetchError.code === 'PGRST116') {
        return errorResponse(
          res,
          'Board not found',
          404,
          `No board found with ID: ${boardId}`
        );
      }

      // If there's another error fetching the board, return error in { data, error } format
      if (fetchError) {
        console.error('Error checking if board exists:', fetchError);
        return errorResponse(
          res,
          'Failed to check board existence',
          500,
          fetchError.message
        );
      }

      // Step 2: Perform the delete operation
      // Note: Supabase delete can return different formats:
      //   - Array: [deletedRow] when multiple rows match (shouldn't happen with UUID)
      //   - Empty array []: When RLS policy prevents deletion (no rows deleted)
      //   - null: When query fails or no rows match
      // We normalize all of these to always return { data, error } format
      const { data: deleteResult, error: deleteError } = await supabase
        .from('boards')
        .delete()
        .eq('id', boardId)
        .select();  // Use .select() to get deleted row data (not .single() to avoid errors)

      // Step 3: Handle Supabase errors (network, database, etc.)
      // These are distinct from RLS policy violations
      if (deleteError) {
        console.error('Error deleting board:', deleteError);
        return errorResponse(
          res,
          'Failed to delete board',
          500,
          deleteError.message
        );
      }

      // Step 4: Normalize Supabase response to consistent format
      // Supabase DELETE with .select() returns an array, which can be:
      //   - [deletedRow] if deletion succeeded
      //   - [] (empty array) if RLS policy prevented deletion or no rows matched
      // We check the array length to determine success
      let deletedBoard = null;
      let deletionSuccessful = false;

      if (Array.isArray(deleteResult)) {
        // If array has items, deletion was successful
        if (deleteResult.length > 0) {
          deletedBoard = deleteResult[0];  // Get first deleted row
          deletionSuccessful = true;
        } else {
          // Empty array means no rows were deleted (RLS prevented deletion)
          deletedBoard = null;
          deletionSuccessful = false;
        }
      } else if (deleteResult && typeof deleteResult === 'object') {
        // If it's an object (shouldn't happen with .select(), but handle it)
        deletedBoard = deleteResult;
        deletionSuccessful = true;
      } else {
        // If null or undefined, deletion failed (RLS or no match)
        deletedBoard = null;
        deletionSuccessful = false;
      }

      // Step 5: Check if deletion was successful
      // If deletionSuccessful is false, it means RLS policy prevented deletion
      // or the board didn't exist (though we already checked that above)
      if (!deletionSuccessful) {
        // Return 403 Forbidden in { data, error } format when RLS prevents deletion
        return errorResponse(
          res,
          'Delete forbidden',
          403,
          'You do not have permission to delete this board. RLS policy prevented deletion.'
        );
      }

      // Step 6: Success - return normalized { data, error } format
      // Always return { data, error } even on success
      return successResponse(res, {
        success: true,
        message: 'Board deleted successfully',
        deletedId: boardId,
      }, 200);
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
    console.error('Unexpected error in boards/[id] API:', error);
    return errorResponse(
      res,
      'Internal server error',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
