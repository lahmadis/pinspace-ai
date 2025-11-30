/**
 * Comments API Route
 * 
 * Endpoints:
 * - GET /api/comments?boardId={boardId} → List all comments for a board
 * - POST /api/comments → Create a new comment
 * 
 * All operations use Supabase and respect RLS (Row Level Security) policies.
 * Responses use consistent { data, error } format.
 */

import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse } from '../_helpers/responseHelper';
import { validateAndNormalizeElementId, isValidUUID } from '../_helpers/uuidValidator';

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

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // GET /api/comments?boardId={boardId}&elementId={elementId}&source={source} - List comments with filtering
    // 
    // REFACTORED: Added filtering support for element and crit session
    // 
    // Query parameters:
    // - boardId (required): Filter comments by board ID
    // - elementId (optional): Filter comments by element ID (UUID)
    // - source (optional): Filter comments by source (e.g., "liveCrit" for crit session comments)
    // 
    // Examples:
    // - /api/comments?boardId=123 → All comments for board 123
    // - /api/comments?boardId=123&elementId=uuid → Comments for board 123 and element uuid
    // - /api/comments?boardId=123&source=liveCrit → Live crit comments for board 123
    // - /api/comments?boardId=123&elementId=uuid&source=liveCrit → Live crit comments for board 123 and element uuid
    if (req.method === 'GET') {
      const { boardId, elementId, source } = req.query;

      // Validate required boardId parameter
      if (!boardId) {
        return errorResponse(
          res,
          'boardId query parameter is required',
          400,
          'Please provide a boardId in the query string: /api/comments?boardId={boardId}'
        );
      }

      // Build Supabase query with filters
      // Start with base query: select all comments for the board
      let query = supabase
        .from('comments')
        .select('*')
        .eq('board_id', boardId);

      // ========================================================================
      // REFACTORED: Add element filter if elementId is provided
      // Now checks both UUID and TEXT columns for element IDs
      // ========================================================================
      // Supports both:
      // - UUID element IDs (stored in element_id)
      // - Non-UUID element IDs (stored in element_id_text, e.g., "pdf_page_...")
      // ========================================================================
      // REFACTORED: Removed duplicate require - using imported functions from top of file
      if (elementId) {
        // Normalize the element ID (strip prefixes) using imported function
        const validation = validateAndNormalizeElementId(elementId);
        if (validation.valid && validation.normalizedId) {
          const normalizedId = validation.normalizedId;
          const isUUID = validation.isUUID;
          
          if (isUUID) {
            // UUID ID - check element_id column (and target_element_id for backward compatibility)
            query = query.or(`element_id.eq.${normalizedId},target_element_id.eq.${normalizedId}`);
          } else {
            // Non-UUID ID - check element_id_text column
            query = query.eq('element_id_text', normalizedId);
          }
        }
      }

      // Add source filter if source is provided (e.g., "liveCrit" for crit session comments)
      if (source) {
        query = query.eq('source', source);
      }

      // Order by created_at descending (newest first)
      query = query.order('created_at', { ascending: false });

      // Execute query
      const { data: comments, error } = await query;

      if (error) {
        console.error('Error fetching comments:', error);
        return errorResponse(
          res,
          'Failed to fetch comments',
          500,
          error.message
        );
      }

      // ========================================================================
      // REFACTORED: Transform Supabase comments to app format
      // ========================================================================
      // Map database field names to app field names
      // 
      // NOTE: targetElementId and elementId can now be either:
      // - UUID strings (from element_id column)
      // - Non-UUID strings (from element_id_text column, e.g., "pdf_page_...")
      // 
      // The app format uses a single targetElementId/elementId field that can contain either type.
      // ========================================================================
      const transformedComments = (comments || []).map((comment) => ({
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
        // Legacy fields for backward compatibility
        pinId: comment.pin_id || null,
        type: comment.type || 'comment',
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
      }));

      // Return comments in { data, error } format
      return successResponse(res, transformedComments, 200);
    }

    // POST /api/comments - Create a new comment
    if (req.method === 'POST') {
      // ========================================================================
      // API: Log incoming request
      // ========================================================================
      console.group('[POST /api/comments] 🔵 Received comment creation request');
      console.log('📥 Request Method:', req.method);
      console.log('📥 Request Headers:', {
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length'],
      });
      console.log('📥 Raw Request Body:', JSON.stringify(req.body, null, 2));
      console.log('📥 Request Body Type:', typeof req.body);
      
      // Step 1: Validate request body exists and is an object
      if (!req.body || typeof req.body !== 'object') {
        console.error('❌ Validation failed: Request body must be a valid JSON object');
        console.groupEnd();
        return errorResponse(
          res,
          'Request body must be a valid JSON object',
          400,
          'The request body must be a JSON object. Make sure Content-Type is application/json.'
        );
      }

      // Step 2: Extract and validate required fields
      const {
        boardId,
        text,
        author, // Can be author name or we'll derive from auth
        authorName,
        targetElementId,
        elementId, // Backward compatibility
        x,
        y,
        category = 'general',
        task = false,
        isTask = false, // Backward compatibility
        source = null,
        critSessionId = null, // Optional: Link comment to crit session
        // Legacy fields
        pinId = null,
      } = req.body;

      // Step 3: Validate boardId (required, must be string/non-empty)
      if (!boardId) {
        return errorResponse(
          res,
          'boardId is required',
          400,
          'Please provide a boardId field in the request body. This identifies which board the comment belongs to.'
        );
      }

      if (typeof boardId !== 'string' || boardId.trim().length === 0) {
        return errorResponse(
          res,
          'boardId must be a non-empty string',
          400,
          `boardId must be a string. Received: ${typeof boardId}`
        );
      }

      // Step 4: Validate text (required, must be string/non-empty)
      if (text === undefined || text === null) {
        return errorResponse(
          res,
          'text is required',
          400,
          'Please provide a text field in the request body. This is the comment content.'
        );
      }

      if (typeof text !== 'string') {
        return errorResponse(
          res,
          'text must be a string',
          400,
          `text must be a string. Received: ${typeof text}`
        );
      }

      const trimmedText = text.trim();
      if (trimmedText.length === 0) {
        return errorResponse(
          res,
          'text cannot be empty',
          400,
          'The text field cannot be empty or contain only whitespace.'
        );
      }

      // Step 5: Validate and normalize author name
      // Determine author name (prefer explicit authorName, then author, then default)
      let finalAuthorName;
      if (authorName !== undefined && authorName !== null) {
        if (typeof authorName !== 'string') {
          return errorResponse(
            res,
            'authorName must be a string',
            400,
            `authorName must be a string. Received: ${typeof authorName}`
          );
        }
        finalAuthorName = authorName.trim() || 'Anonymous';
      } else if (author !== undefined && author !== null) {
        if (typeof author !== 'string') {
          return errorResponse(
            res,
            'author must be a string',
            400,
            `author must be a string. Received: ${typeof author}`
          );
        }
        finalAuthorName = author.trim() || 'Anonymous';
      } else {
        finalAuthorName = 'Anonymous';
      }

      // Step 6: Validate category
      const validCategories = ['concept', 'plan', 'section', 'material', 'circulation', 'structure', 'general'];
      let finalCategory = 'general';
      if (category !== undefined && category !== null) {
        if (typeof category !== 'string') {
          return errorResponse(
            res,
            'category must be a string',
            400,
            `category must be a string. Received: ${typeof category}. Valid values: ${validCategories.join(', ')}`
          );
        }
        const normalizedCategory = category.toLowerCase().trim();
        if (validCategories.includes(normalizedCategory)) {
          finalCategory = normalizedCategory;
        } else {
          return errorResponse(
            res,
            'Invalid category value',
            400,
            `category must be one of: ${validCategories.join(', ')}. Received: "${category}"`
          );
        }
      }

      // ========================================================================
      // Step 7: Validate and normalize target element ID
      // REFACTORED: Now supports both UUID and non-UUID element IDs
      // ========================================================================
      // The database has two columns:
      // - `element_id` (UUID type) - for UUID element IDs
      // - `element_id_text` (TEXT type) - for non-UUID element IDs (e.g., "pdf_page_...")
      // 
      // This function:
      // 1. Strips common prefixes (e_, el_, img_, t_, shape_)
      // 2. Determines if the ID is a UUID or a string
      // 3. Returns the normalized ID with type information
      // ========================================================================
      
      // Determine target element ID (prefer targetElementId, fall back to elementId)
      // REFACTORED: Save elementId exactly as received (with "e_" prefix if present)
      let finalElementId = null; // For UUID IDs (stored in element_id)
      let finalElementIdText = null; // For non-UUID IDs (stored in element_id_text)
      let elementIdIsUUID = false;
      
      if (targetElementId !== undefined && targetElementId !== null) {
        if (typeof targetElementId !== 'string' && typeof targetElementId !== 'number') {
          return errorResponse(
            res,
            'targetElementId must be a string or null',
            400,
            `targetElementId must be a string or null. Received: ${typeof targetElementId}`
          );
        }
        
        // Convert to string and trim (save exactly as received, no prefix stripping)
        const originalElementId = String(targetElementId).trim();
        if (!originalElementId) {
          return errorResponse(
            res,
            'targetElementId cannot be empty',
            400,
            'targetElementId must be a non-empty string'
          );
        }
        
        // Check if it's a valid UUID (without stripping prefix)
        const isUUID = isValidUUID(originalElementId);
        
        // Store in appropriate column based on ID type (save original value with prefix)
        if (isUUID) {
          finalElementId = originalElementId;
          elementIdIsUUID = true;
        } else {
          finalElementIdText = originalElementId;
        }
        
        console.log(`[POST /api/comments] ✅ Element ID saved (no prefix stripping):`, {
          original: targetElementId,
          saved: originalElementId,
          isUUID: isUUID,
          storageColumn: isUUID ? 'element_id' : 'element_id_text',
        });
      } else if (elementId !== undefined && elementId !== null) {
        if (typeof elementId !== 'string' && typeof elementId !== 'number') {
          return errorResponse(
            res,
            'elementId must be a string or null',
            400,
            `elementId must be a string or null. Received: ${typeof elementId}`
          );
        }
        
        // Convert to string and trim (save exactly as received, no prefix stripping)
        const originalElementId = String(elementId).trim();
        if (!originalElementId) {
          return errorResponse(
            res,
            'elementId cannot be empty',
            400,
            'elementId must be a non-empty string'
          );
        }
        
        // Check if it's a valid UUID (without stripping prefix)
        const isUUID = isValidUUID(originalElementId);
        
        // Store in appropriate column based on ID type (save original value with prefix)
        if (isUUID) {
          finalElementId = originalElementId;
          elementIdIsUUID = true;
        } else {
          finalElementIdText = originalElementId;
        }
        
        console.log(`[POST /api/comments] ✅ Element ID saved (no prefix stripping):`, {
          original: elementId,
          saved: originalElementId,
          isUUID: isUUID,
          storageColumn: isUUID ? 'element_id' : 'element_id_text',
        });
      }

      // Step 8: Validate and normalize numeric fields (x, y)
      let finalX = null;
      if (x !== undefined && x !== null) {
        const parsedX = parseFloat(x);
        if (isNaN(parsedX)) {
          return errorResponse(
            res,
            'x must be a valid number',
            400,
            `x must be a number. Received: ${x} (${typeof x})`
          );
        }
        finalX = parsedX;
      }

      let finalY = null;
      if (y !== undefined && y !== null) {
        const parsedY = parseFloat(y);
        if (isNaN(parsedY)) {
          return errorResponse(
            res,
            'y must be a valid number',
            400,
            `y must be a number. Received: ${y} (${typeof y})`
          );
        }
        finalY = parsedY;
      }

      // Step 9: Validate and normalize boolean fields (task, isTask)
      let finalIsTask = false;
      if (task !== undefined && task !== null) {
        if (typeof task !== 'boolean') {
          return errorResponse(
            res,
            'task must be a boolean',
            400,
            `task must be a boolean. Received: ${typeof task}`
          );
        }
        finalIsTask = task;
      } else if (isTask !== undefined && isTask !== null) {
        if (typeof isTask !== 'boolean') {
          return errorResponse(
            res,
            'isTask must be a boolean',
            400,
            `isTask must be a boolean. Received: ${typeof isTask}`
          );
        }
        finalIsTask = isTask;
      }

      // Step 10: Validate source field (if provided)
      let finalSource = null;
      if (source !== undefined && source !== null) {
        if (typeof source !== 'string') {
          return errorResponse(
            res,
            'source must be a string or null',
            400,
            `source must be a string or null. Received: ${typeof source}`
          );
        }
        finalSource = source.trim() || null;
      }

      // ========================================================================
      // Step 11: Prepare comment data for Supabase
      // REFACTORED: Store element IDs in appropriate columns based on type
      // ========================================================================
      // Map app field names to database field names
      // - UUID element IDs → stored in `element_id` (UUID column)
      // - Non-UUID element IDs → stored in `element_id_text` (TEXT column)
      // - Only one column should be set at a time (the other should be null)
      // ========================================================================
      // Step 12: Validate critSessionId (optional, must be UUID if provided)
      let finalCritSessionId = null;
      if (critSessionId !== undefined && critSessionId !== null) {
        if (typeof critSessionId !== 'string') {
          return errorResponse(
            res,
            'critSessionId must be a string or null',
            400,
            `critSessionId must be a string or null. Received: ${typeof critSessionId}`
          );
        }
        const trimmedCritSessionId = critSessionId.trim();
        if (trimmedCritSessionId.length > 0) {
          // Validate it's a valid UUID format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(trimmedCritSessionId)) {
            return errorResponse(
              res,
              'critSessionId must be a valid UUID',
              400,
              `critSessionId must be a valid UUID format. Received: "${critSessionId}"`
            );
          }
          finalCritSessionId = trimmedCritSessionId;
        }
      }

      const commentData = {
        board_id: boardId.trim(),
        text: trimmedText,
        author_name: finalAuthorName,
        author_id: null, // TODO: Set from authenticated user if available
        // REFACTORED: Store UUID IDs in element_id column, non-UUID IDs in element_id_text column
        // Clear the other column to avoid conflicts
        element_id: finalElementId, // UUID column (for UUID element IDs)
        element_id_text: finalElementIdText, // TEXT column (for non-UUID element IDs like "pdf_page_...")
        // Backward compatibility: also set target_element_id for UUIDs
        target_element_id: finalElementId, // Backward compatibility (UUID only, null for non-UUID)
        x: finalX,
        y: finalY,
        category: finalCategory,
        is_task: finalIsTask,
        source: finalSource,
        crit_session_id: finalCritSessionId, // Link to crit session if provided (null for non-live crit comments)
        pin_id: pinId || null,
        type: 'comment', // Default type
      };

      // ========================================================================
      // API → SUPABASE: Log data being sent to Supabase
      // ========================================================================
      console.log('✅ Validation passed');
      console.log('📤 Prepared Supabase Data:', JSON.stringify(commentData, null, 2));
      console.log('📋 Supabase Data Types:', {
        board_id: typeof commentData.board_id,
        text: typeof commentData.text,
        author_name: typeof commentData.author_name,
        author_id: typeof commentData.author_id,
        target_element_id: typeof commentData.target_element_id,
        element_id: typeof commentData.element_id,
        x: typeof commentData.x,
        y: typeof commentData.y,
        category: typeof commentData.category,
        is_task: typeof commentData.is_task,
        source: typeof commentData.source,
        pin_id: typeof commentData.pin_id,
        type: typeof commentData.type,
      });
      console.log('📋 Supabase Data Values:', {
        board_id: commentData.board_id || 'MISSING',
        text: commentData.text || 'MISSING',
        author_name: commentData.author_name || 'MISSING',
        author_id: commentData.author_id ?? 'null',
        target_element_id: commentData.target_element_id ?? 'null',
        category: commentData.category || 'default: general',
        is_task: commentData.is_task,
      });
      // REFACTORED: Log element ID processing with both UUID and TEXT columns
      console.log('🔧 Element ID Processing:', {
        original_targetElementId: targetElementId ?? 'null',
        original_elementId: elementId ?? 'null',
        final_element_id: commentData.element_id ?? 'null',
        final_element_id_text: commentData.element_id_text ?? 'null',
        isUUID: elementIdIsUUID,
        storageColumn: elementIdIsUUID ? 'element_id (UUID)' : 'element_id_text (TEXT)',
        prefix_stripped: (targetElementId || elementId) && (finalElementId || finalElementIdText) !== (targetElementId || elementId) ? 'YES' : 'NO',
      });
      console.log('🔗 Supabase URL:', supabaseUrl);
      console.log('🔑 Using anon key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING');
      
      // Final check: Ensure all required fields are present
      const requiredFields = ['board_id', 'text', 'author_name'];
      const missingRequired = requiredFields.filter(field => !commentData[field] || (typeof commentData[field] === 'string' && commentData[field].trim().length === 0));
      if (missingRequired.length > 0) {
        console.error('❌ CRITICAL: Required fields missing after validation:', missingRequired);
        console.groupEnd();
        return errorResponse(
          res,
          'Internal validation error',
          500,
          `Required fields missing: ${missingRequired.join(', ')}. This should not happen - please report this bug.`
        );
      }

      // Step 12: Insert comment into Supabase
      console.log('📡 Sending insert request to Supabase...');
      const supabaseStartTime = Date.now();
      
      const { data: insertedComment, error: insertError } = await supabase
        .from('comments')
        .insert(commentData)
        .select()
        .single();

      const supabaseDuration = Date.now() - supabaseStartTime;
      console.log(`⏱️  Supabase request completed in ${supabaseDuration}ms`);

      // ========================================================================
      // SUPABASE → API: Handle Supabase response/errors
      // ========================================================================
      if (insertError) {
        console.group('❌ [POST /api/comments] Supabase error creating comment');
        console.error('❌ Full Supabase Error Object:', JSON.stringify(insertError, null, 2));
        console.error('❌ Supabase Error Properties:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          statusCode: insertError.statusCode,
          status: insertError.status,
        });
        console.error('❌ Supabase Error Code:', insertError.code);
        console.error('❌ Supabase Error Message:', insertError.message);
        console.error('❌ Supabase Error Details:', insertError.details);
        console.error('❌ Supabase Error Hint:', insertError.hint);
        
        // Log the attempted data for comparison
        console.error('❌ Attempted Insert Data:', JSON.stringify(commentData, null, 2));
        
        // Extract detailed error information from Supabase
        let errorMessage = 'Failed to create comment';
        let errorDetails = insertError.message || 'Unknown database error';
        
        // Handle specific Supabase error codes
        if (insertError.code === '23503') {
          // Foreign key constraint violation (board_id doesn't exist)
          errorMessage = 'Board not found';
          errorDetails = `The board with ID "${boardId}" does not exist. Please check the boardId and try again.`;
          console.error('❌ DIAGNOSIS: Foreign key constraint violation - board_id does not exist in boards table');
          console.error('❌ FIX: Verify the boardId exists in the boards table or create the board first');
        } else if (insertError.code === '23505') {
          // Unique constraint violation
          errorMessage = 'Duplicate comment';
          errorDetails = 'A comment with these exact details already exists.';
          console.error('❌ DIAGNOSIS: Unique constraint violation - duplicate comment');
        } else if (insertError.code === '23502') {
          // Not null constraint violation
          errorMessage = 'Missing required field';
          errorDetails = `A required field is missing: ${insertError.message}`;
          console.error('❌ DIAGNOSIS: Not null constraint violation - required field missing');
          console.error('❌ FIX: Check that all required fields (board_id, text, author_name) are provided');
        } else if (insertError.code === '42501') {
          // Insufficient privilege (RLS policy violation)
          errorMessage = 'Permission denied';
          errorDetails = 'You do not have permission to create comments. Please check your Row Level Security policies.';
          console.error('❌ DIAGNOSIS: RLS policy violation - INSERT policy is blocking the operation');
          console.error('❌ FIX: Run the RLS policy SQL in SUPABASE_COMMENTS_SCHEMA.sql to allow public inserts');
        } else if (insertError.code === 'PGRST116') {
          // PostgREST: No rows returned (though this shouldn't happen on INSERT)
          errorMessage = 'No comment created';
          errorDetails = 'Insert operation completed but no comment was returned.';
          console.error('❌ DIAGNOSIS: PostgREST returned no rows (unexpected for INSERT)');
        } else if (insertError.details) {
          // Use Supabase details if available
          errorDetails = insertError.details;
          console.error('❌ Using Supabase details:', errorDetails);
        } else if (insertError.hint) {
          // Use Supabase hint if available
          errorDetails = insertError.hint;
          console.error('❌ Using Supabase hint:', errorDetails);
        }

        console.groupEnd();
        
        return errorResponse(
          res,
          errorMessage,
          500,
          errorDetails
        );
      }

      // ========================================================================
      // SUPABASE → API: Log successful Supabase response
      // ========================================================================
      console.log('✅ Supabase Insert Successful');
      console.log('📥 Inserted Comment from Supabase:', JSON.stringify(insertedComment, null, 2));

      // Step 14: Check if insertion succeeded (should have data)
      if (!insertedComment) {
        console.error('❌ [POST /api/comments] No comment returned after insert, but no error reported');
        console.error('❌ Supabase response:', { data: insertedComment, error: null });
        console.groupEnd();
        return errorResponse(
          res,
          'Failed to create comment',
          500,
          'Comment was not created. No data returned from database. This may indicate an RLS policy issue.'
        );
      }

      // ========================================================================
      // Step 15: REFACTORED: Transform the inserted comment to app format
      // ========================================================================
      // NOTE: targetElementId and elementId can now be either:
      // - UUID strings (from element_id column)
      // - Non-UUID strings (from element_id_text column, e.g., "pdf_page_...")
      // ========================================================================
      const transformedComment = {
        id: insertedComment.id,
        boardId: insertedComment.board_id,
        author: insertedComment.author_name,
        authorId: insertedComment.author_id || null,
        text: insertedComment.text,
        timestamp: insertedComment.created_at,
        category: insertedComment.category || 'general',
        // REFACTORED: Get element ID from either UUID column (element_id) or TEXT column (element_id_text)
        // Also check target_element_id for backward compatibility
        targetElementId: insertedComment.element_id || insertedComment.element_id_text || insertedComment.target_element_id || null,
        elementId: insertedComment.element_id || insertedComment.element_id_text || insertedComment.target_element_id || null, // Backward compatibility
        x: insertedComment.x || null,
        y: insertedComment.y || null,
        task: insertedComment.is_task || false,
        source: insertedComment.source || null,
        // Legacy fields
        pinId: insertedComment.pin_id || null,
        type: insertedComment.type || 'comment',
        createdAt: insertedComment.created_at,
        updatedAt: insertedComment.updated_at,
      };

      console.log('✅ Transformed Comment:', JSON.stringify(transformedComment, null, 2));
      console.log('📤 Sending success response to client');
      console.groupEnd();

      // Step 16: Return created comment in { data, error } format
      return successResponse(res, transformedComment, 201);
    }

    // Handle unsupported HTTP methods
    return errorResponse(
      res,
      `Method ${req.method} not allowed`,
      405,
      'Supported methods: GET, POST'
    );
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error in comments API:', error);
    return errorResponse(
      res,
      'Internal server error',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
