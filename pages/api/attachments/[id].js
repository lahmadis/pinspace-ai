/**
 * Attachment API Route (Single Attachment)
 * 
 * Endpoints:
 * - GET /api/attachments/[id] → Fetch a single attachment by ID
 * - DELETE /api/attachments/[id] → Delete an attachment
 * 
 * All operations use Supabase and respect RLS (Row Level Security) policies.
 * Responses use consistent { data, error } format.
 */

import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse } from '../_helpers/responseHelper';

/**
 * Transform Supabase attachment to app format
 */
const transformAttachment = (attachment) => ({
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
});

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

    // Extract attachment ID from URL
    const attachmentId = req.query.id;

    if (!attachmentId) {
      return errorResponse(
        res,
        'Attachment ID is required',
        400,
        'Please provide an attachment ID in the URL: /api/attachments/[id]'
      );
    }

    // GET /api/attachments/[id] - Fetch a single attachment
    if (req.method === 'GET') {
      const { data: attachment, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('id', attachmentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return errorResponse(
            res,
            'Attachment not found',
            404,
            `No attachment found with ID: ${attachmentId}`
          );
        }

        console.error('Error fetching attachment:', error);
        return errorResponse(
          res,
          'Failed to fetch attachment',
          500,
          error.message
        );
      }

      // Transform and return attachment
      return successResponse(res, transformAttachment(attachment), 200);
    }

    // DELETE /api/attachments/[id] - Delete an attachment
    if (req.method === 'DELETE') {
      // Step 1: Check if attachment exists first
      const { data: existingAttachment, error: fetchError } = await supabase
        .from('attachments')
        .select('id')
        .eq('id', attachmentId)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        return errorResponse(
          res,
          'Attachment not found',
          404,
          `No attachment found with ID: ${attachmentId}. Cannot delete an attachment that does not exist.`
        );
      }

      if (fetchError) {
        console.error('Error checking if attachment exists:', fetchError);
        return errorResponse(
          res,
          'Failed to check attachment existence',
          500,
          fetchError.message
        );
      }

      // Step 2: Delete the attachment
      const { data: deletedAttachment, error: deleteError } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachmentId)
        .select()
        .single();

      if (deleteError) {
        console.error('Error deleting attachment:', deleteError);
        
        // Handle RLS policy violation
        if (deleteError.code === '42501') {
          return errorResponse(
            res,
            'Delete forbidden',
            403,
            'You do not have permission to delete this attachment. RLS policy prevented deletion.'
          );
        }

        return errorResponse(
          res,
          'Failed to delete attachment',
          500,
          deleteError.message
        );
      }

      // Step 3: Normalize response - Supabase delete can return array, object, or null
      let deletedData = null;
      if (Array.isArray(deletedAttachment) && deletedAttachment.length > 0) {
        deletedData = deletedAttachment[0];
      } else if (deletedAttachment && typeof deletedAttachment === 'object') {
        deletedData = deletedAttachment;
      }

      // Step 4: Check if deletion was actually performed (RLS might block it silently)
      if (!deletedData || !deletedData.id) {
        return errorResponse(
          res,
          'Delete forbidden',
          403,
          'You do not have permission to delete this attachment. RLS policy prevented deletion.'
        );
      }

      // Step 5: Transform and return deleted attachment
      return successResponse(res, transformAttachment(deletedData), 200);
    }

    // Handle unsupported HTTP methods
    return errorResponse(
      res,
      `Method ${req.method} not allowed`,
      405,
      'Supported methods: GET, DELETE'
    );
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error in attachment API:', error);
    return errorResponse(
      res,
      'Internal server error',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}








