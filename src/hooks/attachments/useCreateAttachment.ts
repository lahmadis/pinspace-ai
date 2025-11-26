/**
 * useCreateAttachment Hook
 * 
 * Uploads a file to Supabase Storage and creates an attachment record in the attachments table.
 * 
 * IMPORTANT: Always uses the "attachments" bucket in Supabase Storage.
 * Make sure this bucket exists in your Supabase project and is configured as public.
 * 
 * Features:
 * - Upload file to Supabase Storage bucket "attachments"
 * - Create attachment metadata row in attachments table
 * - Comprehensive error handling for bucket not found, file errors, etc.
 * - Detailed logging for upload and insert operations
 * - Loading and error states
 * - Automatic cleanup on upload failure (deletes file from storage if DB insert fails)
 * 
 * Storage Path Structure:
 *   attachments/{boardId}/{timestamp_random_filename}
 * 
 * Example:
 *   attachments/abc-123/1234567890_a1b2c3_example.png
 * 
 * Usage:
 *   const { createAttachment, loading, error } = useCreateAttachment();
 *   await createAttachment({
 *     file: File,
 *     boardId: 'abc-123',
 *     commentId: 'comment-456' // optional
 *   });
 * 
 * Error Handling:
 * - Bucket not found: Clear error message with setup instructions
 * - File too large: Shows file size limit
 * - Network errors: Detailed network error messages
 * - RLS policy violations: Clear permission error messages
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Attachment } from './useAttachments';

// REFACTORED: Exported interfaces for use in other files
export interface CreateAttachmentOptions {
  file: File;
  boardId: string;
  commentId?: string | null; // Optional: link attachment to a comment
  uploadedBy?: string | null; // Optional: user ID or username
  storagePath?: string; // Optional: custom path in storage (default: '{boardId}/{filename}')
  // NOTE: Storage bucket is ALWAYS "attachments" - cannot be overridden
}

export interface UseCreateAttachmentResult {
  createAttachment: (options: CreateAttachmentOptions) => Promise<Attachment | null>;
  loading: boolean;
  error: string | null;
}

/**
 * Get file type category from mime type or file extension
 */
function getFileTypeCategory(mimeType: string | null, fileName: string): string | null {
  if (!mimeType) {
    // Try to infer from file extension
    const ext = fileName.split('.').pop()?.toLowerCase();
    const extensionMap: Record<string, string> = {
      'jpg': 'image',
      'jpeg': 'image',
      'png': 'image',
      'gif': 'image',
      'webp': 'image',
      'svg': 'image',
      'pdf': 'pdf',
      'doc': 'document',
      'docx': 'document',
      'txt': 'document',
      'xls': 'document',
      'xlsx': 'document',
      'mp4': 'video',
      'avi': 'video',
      'mov': 'video',
      'webm': 'video',
      'mp3': 'audio',
      'wav': 'audio',
      'ogg': 'audio',
      'zip': 'archive',
      'rar': 'archive',
      '7z': 'archive',
    };
    return extensionMap[ext || ''] || null;
  }

  const mime = mimeType.toLowerCase();
  
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.includes('document') || mime.includes('word') || mime.includes('text')) return 'document';
  if (mime.includes('spreadsheet') || mime.includes('excel')) return 'document';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.includes('zip') || mime.includes('archive')) return 'archive';
  
  return null;
}

/**
 * Hook to upload files to Supabase Storage and create attachment records
 */
export function useCreateAttachment(): UseCreateAttachmentResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAttachment = useCallback(async (options: CreateAttachmentOptions): Promise<Attachment | null> => {
    try {
      setLoading(true);
      setError(null);

      const {
        file,
        boardId,
        commentId = null,
        uploadedBy = null,
        storagePath, // Optional custom path
      } = options;

      // ========================================================================
      // STORAGE BUCKET: Always use "attachments" bucket
      // ========================================================================
      // IMPORTANT: The bucket name "attachments" is hardcoded to ensure consistency
      // Make sure this bucket exists in your Supabase project:
      // 1. Go to Supabase Dashboard → Storage
      // 2. Create bucket named "attachments"
      // 3. Set bucket to public (or configure RLS policies for storage.objects)
      const STORAGE_BUCKET_NAME = 'attachments';

      // ========================================================================
      // VALIDATION: Check required fields before upload
      // ========================================================================
      console.group('[useCreateAttachment] 🚀 Starting attachment upload');
      console.log('📤 Upload Options:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        boardId,
        commentId: commentId || 'none',
        storageBucket: STORAGE_BUCKET_NAME, // Always "attachments"
      });

      if (!file) {
        const errorMsg = 'File is required';
        console.error('❌ Validation failed:', errorMsg);
        console.groupEnd();
        throw new Error(errorMsg);
      }

      // ========================================================================
      // VALIDATION: board_id is REQUIRED - every attachment must be linked to a board
      // ========================================================================
      // IMPORTANT: The attachments table has board_id as NOT NULL with a foreign key
      // constraint. This ensures every attachment is linked to a board.
      // The board_id comes from the current board context/state in the component.
      if (!boardId) {
        const errorMsg = 'boardId is required - every attachment must be linked to a board';
        console.error('❌ Validation failed:', errorMsg);
        console.error('❌ Missing board_id - attachment cannot be created without a board context');
        console.groupEnd();
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      if (typeof boardId !== 'string') {
        const errorMsg = `boardId must be a string, but received ${typeof boardId}`;
        console.error('❌ Validation failed:', errorMsg);
        console.error('❌ Invalid board_id type:', { boardId, type: typeof boardId });
        console.groupEnd();
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      if (boardId.trim().length === 0) {
        const errorMsg = 'boardId cannot be empty - please provide a valid board ID';
        console.error('❌ Validation failed:', errorMsg);
        console.error('❌ Empty board_id - boardId was provided but is empty/whitespace');
        console.groupEnd();
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      // Normalize boardId by trimming whitespace
      const normalizedBoardId = boardId.trim();
      console.log('✅ board_id validated:', normalizedBoardId);

      // Validate file size (optional: 10MB limit)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_FILE_SIZE) {
        const errorMsg = `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (10MB)`;
        console.error('❌ Validation failed:', errorMsg);
        console.groupEnd();
        throw new Error(errorMsg);
      }

      // ========================================================================
      // STEP 1: Upload file to Supabase Storage (bucket: "attachments")
      // ========================================================================
      const fileName = file.name;
      const fileExtension = fileName.split('.').pop() || '';
      
      // Generate unique filename to prevent collisions
      // Format: {timestamp}_{random}_{original_filename}
      const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${fileName}`;
      
      // Determine storage path: {boardId}/{filename} or custom path
      // Example: "abc-123/1234567890_a1b2c3_example.png"
      // NOTE: Uses normalizedBoardId to ensure consistent path structure
      const finalStoragePath = storagePath || `${normalizedBoardId}/${uniqueFileName}`;

      console.log('📤 Uploading file to Supabase Storage:', {
        bucket: STORAGE_BUCKET_NAME,
        path: finalStoragePath,
        fileSize: file.size,
        mimeType: file.type,
        fullPath: `${STORAGE_BUCKET_NAME}/${finalStoragePath}`,
        boardId: normalizedBoardId, // Always included in storage path and metadata
      });

      const uploadStartTime = Date.now();

      // Upload file to Supabase Storage bucket "attachments"
      // IMPORTANT: This will fail if the "attachments" bucket doesn't exist
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET_NAME) // Always use "attachments" bucket
        .upload(finalStoragePath, file, {
          cacheControl: '3600',
          upsert: false, // Don't overwrite existing files
        });

      const uploadDuration = Date.now() - uploadStartTime;
      console.log(`⏱️ Storage upload completed in ${uploadDuration}ms`);

      // ========================================================================
      // ERROR HANDLING: Handle storage upload errors with detailed diagnostics
      // ========================================================================
      if (uploadError) {
        console.error('❌ Storage upload failed:', uploadError);
        console.error('❌ Upload error details:', {
          message: uploadError.message,
          statusCode: (uploadError as any).statusCode, // REFACTORED: StorageError may not have statusCode
          name: uploadError.name,
          error: uploadError,
        });
        
        // Determine specific error type and provide helpful error messages
        // REFACTORED: Single declaration of errorMessage - declared once with let so it can be reassigned
        let errorMessage = 'Failed to upload file to storage';
        let errorDetails = '';
        
        // REFACTORED: Handle StorageError without statusCode property
        // StorageError may not have statusCode, so check message and error properties instead
        const statusCode = (uploadError as any).statusCode;
        // REFACTORED: Reassign errorMessage (no let/const/var) - use uploadError.message or uploadError.error
        const uploadErrorMessage = uploadError.message || (uploadError as any).error || '';
        if (uploadErrorMessage) {
          errorMessage = uploadErrorMessage; // Reassign instead of appending
        }
        
        // Check for common error scenarios
        if (errorMessage.toLowerCase().includes('bucket') || 
            errorMessage.toLowerCase().includes('not found') ||
            statusCode === 404) {
          errorMessage = `Storage bucket "${STORAGE_BUCKET_NAME}" not found`;
          errorDetails = `The "${STORAGE_BUCKET_NAME}" bucket does not exist in your Supabase project. Please create it in the Supabase Dashboard → Storage → Create Bucket, and set it to public.`;
        } else if (errorMessage.toLowerCase().includes('permission') ||
                   errorMessage.toLowerCase().includes('forbidden') ||
                   statusCode === 403) {
          errorMessage = 'Permission denied: Cannot upload to storage bucket';
          errorDetails = `You do not have permission to upload files to the "${STORAGE_BUCKET_NAME}" bucket. Please check your Supabase Storage policies (RLS) or bucket permissions.`;
        } else if (errorMessage.toLowerCase().includes('duplicate') ||
                   errorMessage.toLowerCase().includes('already exists')) {
          errorMessage = 'File already exists in storage';
          errorDetails = 'A file with this name already exists in the storage bucket. Please try uploading with a different filename.';
        } else if (errorMessage.toLowerCase().includes('size') ||
                   errorMessage.toLowerCase().includes('too large')) {
          errorMessage = 'File too large for storage';
          errorDetails = `The file size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds the maximum allowed size for the storage bucket.`;
        } else if (errorMessage.toLowerCase().includes('network') ||
                   errorMessage.toLowerCase().includes('timeout')) {
          errorMessage = 'Network error during file upload';
          errorDetails = 'Failed to upload file due to a network error. Please check your internet connection and try again.';
        } else {
          errorDetails = errorMessage || 'Unknown storage error occurred';
        }
        
        console.error('❌ Error diagnosis:', {
          errorMessage,
          errorDetails,
          statusCode: statusCode,
        });
        
        const finalErrorMessage = errorDetails 
          ? `${errorMessage}. ${errorDetails}`
          : errorMessage;
        
        console.groupEnd();
        setError(finalErrorMessage);
        throw new Error(finalErrorMessage);
      }

      // Validate upload data was returned
      if (!uploadData) {
        const errorMsg = 'File upload returned no data - upload may have failed silently';
        console.error('❌ Upload failed:', errorMsg);
        console.error('❌ Upload response:', { uploadData, uploadError });
        console.groupEnd();
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      console.log('✅ File uploaded successfully to storage:', uploadData.path);
      console.log('✅ Storage bucket:', STORAGE_BUCKET_NAME);
      console.log('✅ Storage path:', finalStoragePath);

      // ========================================================================
      // STEP 2: Get public URL for the uploaded file
      // ========================================================================
      // IMPORTANT: The bucket must be public for getPublicUrl to work
      // If the bucket is private, you'll need to use signed URLs instead
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET_NAME) // Always use "attachments" bucket
        .getPublicUrl(finalStoragePath);

      const fileUrl = urlData.publicUrl;
      console.log('✅ Public URL generated:', fileUrl);
      
      // Validate URL was generated
      if (!fileUrl || fileUrl.trim().length === 0) {
        const errorMsg = 'Failed to generate public URL for uploaded file';
        console.error('❌ URL generation failed:', { urlData, finalStoragePath });
        
        // Try to clean up uploaded file
        try {
          await supabase.storage.from(STORAGE_BUCKET_NAME).remove([finalStoragePath]);
          console.log('✅ Cleaned up uploaded file after URL generation failure');
        } catch (cleanupError) {
          console.error('❌ Failed to clean up file:', cleanupError);
        }
        
        console.groupEnd();
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      // ========================================================================
      // STEP 3: Create attachment record in Supabase attachments table
      // ========================================================================
      // IMPORTANT: board_id is REQUIRED and must always be included in the insert
      // The attachments table has board_id as NOT NULL with a foreign key constraint.
      // This ensures every attachment is properly linked to a board.
      const fileType = getFileTypeCategory(file.type, fileName);
      const mimeType = file.type || null;
      const fileSize = file.size;

      // ========================================================================
      // STEP 3: Prepare attachment data for API request
      // ========================================================================
      // IMPORTANT: The API expects camelCase field names (boardId, commentId, etc.)
      // The API will convert these to snake_case (board_id, comment_id) for the database.
      // boardId is REQUIRED and must always be included from the current board context.
      const attachmentData = {
        boardId: normalizedBoardId, // REQUIRED: Always included, normalized, and validated (camelCase for API)
        commentId: commentId || null, // Optional: Links attachment to a specific comment (camelCase for API)
        fileName: fileName,
        fileUrl: fileUrl,
        fileType: fileType,
        fileSize: fileSize,
        mimeType: mimeType,
        uploadedBy: uploadedBy || null,
      };

      // ========================================================================
      // VALIDATION: Ensure boardId is present before sending to API
      // ========================================================================
      // This is a critical safety check to prevent attachments from being created
      // without a board_id. The API will also validate this, but we check here
      // to fail fast and provide better error messages.
      if (!attachmentData.boardId || attachmentData.boardId.trim().length === 0) {
        const errorMsg = 'Internal error: boardId is missing from attachment data';
        console.error('❌ Critical validation error:', errorMsg);
        console.error('❌ Attachment data missing boardId:', attachmentData);
        console.groupEnd();
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      console.log('📤 Creating attachment record in database:', {
        ...attachmentData,
        boardId: normalizedBoardId, // Explicitly log boardId
      });
      console.log('✅ boardId is present and validated:', normalizedBoardId);

      const insertStartTime = Date.now();

      // Insert attachment record via API (uses RLS and standardized response format)
      const response = await fetch('/api/attachments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attachmentData),
      });

      const insertDuration = Date.now() - insertStartTime;
      console.log(`⏱️ Database insert completed in ${insertDuration}ms`);

      // Handle API errors
      if (!response.ok) {
        let errorMessage = `Failed to create attachment record: ${response.status} ${response.statusText}`;
        
        try {
          const errorData = await response.json();
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

        // IMPORTANT: If database insert fails, try to clean up uploaded file from storage
        // This prevents orphaned files in Supabase Storage
        console.warn('⚠️ Attempting to delete uploaded file due to database insert failure...');
        console.warn('⚠️ Cleanup target:', {
          bucket: STORAGE_BUCKET_NAME,
          path: finalStoragePath,
        });
        
        try {
          const { data: deleteData, error: deleteError } = await supabase.storage
            .from(STORAGE_BUCKET_NAME) // Always use "attachments" bucket
            .remove([finalStoragePath]);
          
          if (deleteError) {
            console.error('❌ Failed to clean up uploaded file:', deleteError);
            console.error('❌ Cleanup error details:', {
              message: deleteError.message,
              statusCode: (deleteError as any).statusCode, // REFACTORED: StorageError may not have statusCode
            });
            errorMessage += ` (File uploaded to "${STORAGE_BUCKET_NAME}" bucket but attachment record creation failed. File may need manual cleanup at path: ${finalStoragePath})`;
          } else {
            console.log('✅ Successfully cleaned up uploaded file from storage');
            console.log('✅ Cleanup result:', deleteData);
          }
        } catch (cleanupError) {
          console.error('❌ Error during cleanup:', cleanupError);
          errorMessage += ` (File uploaded but cleanup failed. Check storage bucket "${STORAGE_BUCKET_NAME}" for orphaned file: ${finalStoragePath})`;
        }

        console.groupEnd();
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // Parse response in { data, error } format
      const responseData = await response.json();
      console.log('✅ API Success Response:', JSON.stringify(responseData, null, 2));

      if (responseData.error) {
        const errorMsg = typeof responseData.error === 'string'
          ? responseData.error
          : responseData.error.message || 'Failed to create attachment record';
        
        // Try to clean up uploaded file from storage
        console.warn('⚠️ Attempting to delete uploaded file due to database error...');
        console.warn('⚠️ Cleanup target:', {
          bucket: STORAGE_BUCKET_NAME,
          path: finalStoragePath,
        });
        
        try {
          const { error: deleteError } = await supabase.storage
            .from(STORAGE_BUCKET_NAME) // Always use "attachments" bucket
            .remove([finalStoragePath]);
          
          if (deleteError) {
            console.error('❌ Failed to clean up uploaded file:', deleteError);
          } else {
            console.log('✅ Successfully cleaned up uploaded file from storage');
          }
        } catch (cleanupError) {
          console.error('❌ Error during cleanup:', cleanupError);
        }

        console.error('❌ Response contains error field:', errorMsg);
        console.groupEnd();
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      // Validate that data exists in successful response
      if (!responseData.data) {
        const errorMsg = 'Attachment was created but no data was returned from the server';
        console.error('❌ Response missing data field:', responseData);
        console.groupEnd();
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      // Transform API attachment to app format
      const apiAttachment = responseData.data;
      const attachment: Attachment = {
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
      };

      console.log('✅ Successfully created attachment:', attachment.id);
      console.log('✅ Final Attachment Object:', JSON.stringify(attachment, null, 2));
      console.groupEnd();

      setError(null); // Clear any previous errors on success
      return attachment;
    } catch (err) {
      // ========================================================================
      // ERROR HANDLING: Log full error details
      // ========================================================================
      console.group('❌ [useCreateAttachment] Attachment creation failed');
      
      const errorMessage = err instanceof Error
        ? err.message
        : 'An unexpected error occurred while creating attachment';
      
      console.error('❌ Error Type:', err instanceof Error ? 'Error' : 'Unknown');
      console.error('❌ Error Message:', errorMessage);
      console.error('❌ Full Error Object:', err);
      if (err instanceof Error) {
        console.error('❌ Error Stack:', err.stack);
      }
      
      console.groupEnd();
      
      setError(errorMessage);
      return null; // Return null instead of throwing - allows component to check error state
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createAttachment,
    loading,
    error,
  };
}

