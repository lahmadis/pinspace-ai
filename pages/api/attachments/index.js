/**
 * Attachments API Route
 * 
 * Endpoints:
 * - GET /api/attachments?boardId={boardId}&commentId={commentId} → List attachments for a board or comment
 * - POST /api/attachments → Create a new attachment
 * 
 * All operations use Supabase and respect RLS (Row Level Security) policies.
 * Responses use consistent { data, error } format.
 * 
 * ========================================================================
 * CRITICAL: board_id Requirement
 * ========================================================================
 * IMPORTANT: Every attachment MUST have a board_id. The attachments table
 * has board_id as NOT NULL with a foreign key constraint to the boards table.
 * 
 * - POST requests MUST include boardId (camelCase) in the request body
 * - The API converts boardId (camelCase) to board_id (snake_case) for the database
 * - GET requests should include boardId in query params for board-level filtering
 * - Missing boardId will result in a 400 Bad Request error
 * 
 * Components calling this API must pass boardId from the current board context/state.
 */

import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse } from '../_helpers/responseHelper';

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

    // GET /api/attachments?boardId={boardId}&commentId={commentId} - List attachments
    if (req.method === 'GET') {
      const { boardId, commentId } = req.query;

      // At least one of boardId or commentId must be provided
      if (!boardId && !commentId) {
        return errorResponse(
          res,
          'boardId or commentId query parameter is required',
          400,
          'Please provide a boardId or commentId in the query string: /api/attachments?boardId={boardId} or /api/attachments?commentId={commentId}'
        );
      }

      // Build query - filter by boardId and/or commentId
      let query = supabase.from('attachments').select('*');

      if (boardId) {
        query = query.eq('board_id', boardId);
      }

      if (commentId) {
        query = query.eq('comment_id', commentId);
      }

      // Order by created_at descending (newest first)
      query = query.order('created_at', { ascending: false });

      const { data: attachments, error } = await query;

      if (error) {
        console.error('Error fetching attachments:', error);
        return errorResponse(
          res,
          'Failed to fetch attachments',
          500,
          error.message
        );
      }

      // Transform Supabase attachments to app format
      const transformedAttachments = (attachments || []).map((attachment) => ({
        id: attachment.id,
        boardId: attachment.board_id,
        commentId: attachment.comment_id || null,
        fileName: attachment.file_name,
        fileUrl: attachment.file_url,
        fileType: attachment.file_type || null,
        fileSize: attachment.file_size || null,
        mimeType: attachment.mime_type || null,
        uploadedBy: attachment.uploaded_by || null,
        createdAt: attachment.created_at,
        updatedAt: attachment.updated_at,
      }));

      // Return attachments in { data, error } format
      return successResponse(res, transformedAttachments, 200);
    }

    // POST /api/attachments - Create a new attachment
    if (req.method === 'POST') {
      // Step 1: Validate request body exists and is an object
      if (!req.body || typeof req.body !== 'object') {
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
        commentId,
        fileName,
        fileUrl,
        fileType,
        fileSize,
        mimeType,
        uploadedBy,
      } = req.body;

      // ========================================================================
      // Step 3: Validate boardId (REQUIRED)
      // ========================================================================
      // IMPORTANT: board_id is REQUIRED in the attachments table (NOT NULL constraint).
      // Every attachment MUST be linked to a board. The boardId comes from the
      // component's board context/state when uploading files.
      if (!boardId) {
        console.error('[POST /api/attachments] ❌ Missing boardId in request body');
        return errorResponse(
          res,
          'boardId is required',
          400,
          'Please provide a boardId field in the request body. Every attachment must be linked to a board.'
        );
      }

      if (typeof boardId !== 'string') {
        console.error('[POST /api/attachments] ❌ Invalid boardId type:', typeof boardId, boardId);
        return errorResponse(
          res,
          'boardId must be a string',
          400,
          `boardId must be a string. Received: ${typeof boardId}. Value: ${JSON.stringify(boardId)}`
        );
      }

      if (boardId.trim().length === 0) {
        console.error('[POST /api/attachments] ❌ Empty boardId provided');
        return errorResponse(
          res,
          'boardId cannot be empty',
          400,
          'boardId must be a non-empty string. Please provide a valid board ID from the current board context.'
        );
      }

      // Normalize boardId by trimming whitespace
      const normalizedBoardId = boardId.trim();
      console.log('[POST /api/attachments] ✅ boardId validated:', normalizedBoardId);

      // Step 4: Validate fileName (required)
      if (!fileName) {
        return errorResponse(
          res,
          'fileName is required',
          400,
          'Please provide a fileName field in the request body.'
        );
      }

      if (typeof fileName !== 'string' || fileName.trim().length === 0) {
        return errorResponse(
          res,
          'fileName must be a non-empty string',
          400,
          `fileName must be a string. Received: ${typeof fileName}`
        );
      }

      // Step 5: Validate fileUrl (required)
      if (!fileUrl) {
        return errorResponse(
          res,
          'fileUrl is required',
          400,
          'Please provide a fileUrl field in the request body.'
        );
      }

      if (typeof fileUrl !== 'string' || fileUrl.trim().length === 0) {
        return errorResponse(
          res,
          'fileUrl must be a non-empty string',
          400,
          `fileUrl must be a string. Received: ${typeof fileUrl}`
        );
      }

      // ========================================================================
      // Step 6: Prepare attachment data for Supabase
      // ========================================================================
      // IMPORTANT: board_id is REQUIRED and must always be included in the insert.
      // The attachments table has board_id as NOT NULL with a foreign key constraint
      // to the boards table. This ensures data integrity and proper board linkage.
      const attachmentData = {
        board_id: normalizedBoardId, // REQUIRED: Always included, normalized, and validated above
        comment_id: commentId || null, // Optional: Links attachment to a specific comment
        file_name: fileName.trim(),
        file_url: fileUrl.trim(),
        file_type: fileType || null, // e.g., 'image', 'document', 'pdf'
        file_size: fileSize || null, // File size in bytes
        mime_type: mimeType || null, // e.g., 'image/png', 'application/pdf'
        uploaded_by: uploadedBy || null, // User ID or name
      };

      // Final validation: Ensure board_id is present before insert
      if (!attachmentData.board_id || attachmentData.board_id.trim().length === 0) {
        console.error('[POST /api/attachments] ❌ Critical error: board_id missing from attachment data');
        console.error('[POST /api/attachments] ❌ Attachment data:', attachmentData);
        return errorResponse(
          res,
          'Internal error: board_id is missing from attachment data',
          500,
          'The attachment data is missing the required board_id field. This should not happen if validation is working correctly.'
        );
      }

      console.log('[POST /api/attachments] 📤 Inserting attachment with board_id:', attachmentData.board_id);

      // ========================================================================
      // Step 7: Insert attachment into Supabase
      // ========================================================================
      const { data: insertedAttachment, error: insertError } = await supabase
        .from('attachments')
        .insert(attachmentData)
        .select()
        .single();

      // Step 8: Handle Supabase errors
      if (insertError) {
        console.error('[POST /api/attachments] Supabase error creating attachment:', insertError);
        
        let errorMessage = 'Failed to create attachment';
        let errorDetails = insertError.message || 'Unknown database error';
        
        // Handle specific Supabase error codes
        if (insertError.code === '23503') {
          // Foreign key constraint violation - board_id or comment_id doesn't exist
          errorMessage = 'Board or comment not found';
          errorDetails = `The board with ID "${normalizedBoardId}" does not exist in the database. ` +
            `Please ensure you are uploading from a valid board context. ` +
            (commentId ? `Comment ID "${commentId}" may also be invalid.` : '');
          console.error('[POST /api/attachments] ❌ Foreign key violation - board not found:', normalizedBoardId);
        } else if (insertError.code === '23502') {
          // Not null constraint violation - likely board_id is missing or null
          errorMessage = 'Missing required field: board_id';
          errorDetails = `A required field is missing. This is likely the board_id field. ` +
            `The attachments table requires board_id to be NOT NULL. ` +
            `Error: ${insertError.message}`;
          console.error('[POST /api/attachments] ❌ Not null constraint violation:', insertError.message);
          console.error('[POST /api/attachments] ❌ This should not happen if validation is working correctly');
        } else if (insertError.code === '42501') {
          // Insufficient privilege (RLS policy violation)
          errorMessage = 'Permission denied';
          errorDetails = 'You do not have permission to create attachments. Please check your Row Level Security policies.';
        }

        return errorResponse(
          res,
          errorMessage,
          500,
          errorDetails
        );
      }

      // Step 9: Check if insertion succeeded
      if (!insertedAttachment) {
        console.error('[POST /api/attachments] No attachment returned after insert');
        return errorResponse(
          res,
          'Failed to create attachment',
          500,
          'Attachment was not created. No data returned from database.'
        );
      }

      // Step 10: Transform the inserted attachment to app format
      const transformedAttachment = {
        id: insertedAttachment.id,
        boardId: insertedAttachment.board_id,
        commentId: insertedAttachment.comment_id || null,
        fileName: insertedAttachment.file_name,
        fileUrl: insertedAttachment.file_url,
        fileType: insertedAttachment.file_type || null,
        fileSize: insertedAttachment.file_size || null,
        mimeType: insertedAttachment.mime_type || null,
        uploadedBy: insertedAttachment.uploaded_by || null,
        createdAt: insertedAttachment.created_at,
        updatedAt: insertedAttachment.updated_at,
      };

      // Step 11: Return created attachment in { data, error } format
      return successResponse(res, transformedAttachment, 201);
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
    console.error('Unexpected error in attachments API:', error);
    return errorResponse(
      res,
      'Internal server error',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

