# Attachment Storage Refactor - Complete Summary

## Overview

Refactored PinSpace attachment upload code to **always use the "attachments" bucket** in Supabase Storage. The bucket name is now hardcoded and cannot be overridden, ensuring consistency across the application.

## Key Changes

### 1. Hardcoded Bucket Name

**Before:** Bucket name was optional (`storageBucket?: string` with default `'attachments'`)

**After:** Bucket name is **always** `"attachments"` - hardcoded constant in the hook

```typescript
// In useCreateAttachment.ts
const STORAGE_BUCKET_NAME = 'attachments'; // Always use this bucket
```

### 2. Enhanced Error Handling

Added comprehensive error handling for common storage errors:

- ✅ **Bucket not found** - Clear error message with setup instructions
- ✅ **Permission denied** - Helpful message about RLS policies
- ✅ **File too large** - Shows file size limit
- ✅ **Duplicate file** - Clear message about file already existing
- ✅ **Network errors** - Detailed network error messages
- ✅ **URL generation failure** - Validates public URL was generated

### 3. Improved Logging

All upload operations now include detailed logging:

- Upload start with file details
- Storage path and bucket name
- Upload duration
- Public URL generation
- Database insert duration
- Error details with diagnostics
- Cleanup operations

### 4. Code Annotations

All code sections now have clear annotations explaining:

- Purpose of each step
- Bucket name usage
- Storage path structure
- Error handling logic
- Cleanup operations

## Files Changed

### 1. `src/hooks/attachments/useCreateAttachment.ts`

**Changes:**
- ✅ Removed optional `storageBucket` parameter from `CreateAttachmentOptions`
- ✅ Added hardcoded `STORAGE_BUCKET_NAME = 'attachments'` constant
- ✅ Enhanced error handling with specific error types and diagnostics
- ✅ Added validation for public URL generation
- ✅ Improved logging with bucket name and path details
- ✅ Added detailed code comments and annotations

**Key Sections:**

```typescript
// STORAGE BUCKET: Always use "attachments" bucket
const STORAGE_BUCKET_NAME = 'attachments'; // Hardcoded for consistency

// Upload file to Supabase Storage bucket "attachments"
const { data, error } = await supabase.storage
  .from(STORAGE_BUCKET_NAME) // Always "attachments"
  .upload(finalStoragePath, file);
```

### 2. `app/board/[id]/page.tsx`

**Changes:**
- ✅ Added code comments explaining bucket usage
- ✅ Removed unnecessary `storageBucket` parameter references
- ✅ Added annotations for upload operations

**Key Sections:**

```typescript
// Upload file to Supabase Storage bucket "attachments" and create attachment record
// The useCreateAttachment hook always uses the "attachments" bucket
const attachment = await createAttachment({
  file,
  boardId: boardId,
  commentId: null,
  uploadedBy: currentUser?.name || 'Anonymous',
  // NOTE: storageBucket is automatically set to "attachments" in the hook
});
```

### 3. `STORAGE_BUCKET_SETUP.md` (NEW)

**Purpose:** Complete setup guide for the "attachments" bucket

**Contents:**
- Step-by-step bucket creation instructions
- Storage policy configuration (RLS)
- Error troubleshooting guide
- Production recommendations
- Testing checklist

### 4. `ATTACHMENT_STORAGE_REFACTOR.md` (NEW)

**Purpose:** This document - summary of changes

## Error Handling Improvements

### Bucket Not Found

**Error Message:**
```
Storage bucket "attachments" not found. The "attachments" bucket does not exist in your Supabase project. Please create it in the Supabase Dashboard → Storage → Create Bucket, and set it to public.
```

**Detection:**
- Checks for 404 status code
- Checks error message for "bucket" or "not found"
- Provides setup instructions

### Permission Denied

**Error Message:**
```
Permission denied: Cannot upload to storage bucket. You do not have permission to upload files to the "attachments" bucket. Please check your Supabase Storage policies (RLS) or bucket permissions.
```

**Detection:**
- Checks for 403 status code
- Checks error message for "permission" or "forbidden"
- Suggests checking RLS policies

### File Too Large

**Error Message:**
```
File too large for storage. The file size (X.XXMB) exceeds the maximum allowed size for the storage bucket.
```

**Detection:**
- Checks file size against `MAX_FILE_SIZE` (10MB)
- Shows actual file size vs limit

### URL Generation Failure

**Error Message:**
```
Failed to generate public URL for uploaded file
```

**Detection:**
- Validates `urlData.publicUrl` exists and is non-empty
- Attempts cleanup if URL generation fails

## Storage Path Structure

Files are stored in the `attachments` bucket with this structure:

```
attachments/
  └── {boardId}/
      ├── {timestamp}_{random}_{filename}.png
      ├── {timestamp}_{random}_{filename}.pdf
      └── ...
```

**Example:**
- `attachments/abc-123/1234567890_a1b2c3_example.png`
- `attachments/xyz-789/1234567891_b2c3d4_document.pdf`

**Path Generation:**
```typescript
const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${fileName}`;
const finalStoragePath = storagePath || `${boardId.trim()}/${uniqueFileName}`;
```

## Upload Flow

```
1. Validate file (size, type, boardId)
   └─> Checks file exists, boardId is valid, file size < 10MB

2. Upload to Supabase Storage
   └─> bucket: "attachments"
   └─> path: "{boardId}/{timestamp_random_filename}"
   └─> Logs: Upload start, duration, success/failure

3. Get public URL
   └─> Generates public URL from storage path
   └─> Validates URL was generated
   └─> Logs URL for debugging

4. Create attachment record in database
   └─> POST /api/attachments
   └─> Stores metadata in attachments table
   └─> Logs insert duration, success/failure

5. Cleanup on failure
   └─> If database insert fails, delete uploaded file from storage
   └─> Prevents orphaned files

6. Return attachment object
   └─> Returns attachment with all metadata
   └─> UI displays immediately
```

## Metadata Saved to Database

After upload, the following metadata is saved in the `attachments` table:

**Required Fields:**
- `board_id` - UUID (links to boards table)
- `file_name` - TEXT (original filename)
- `file_url` - TEXT (public URL from Supabase Storage)

**Optional Fields (auto-detected):**
- `comment_id` - UUID (if linked to a comment)
- `file_type` - TEXT ('image', 'pdf', 'document', 'video', 'audio', 'archive')
- `file_size` - BIGINT (file size in bytes)
- `mime_type` - TEXT ('image/png', 'application/pdf', etc.)
- `uploaded_by` - TEXT (user ID or username)

**Auto-generated:**
- `id` - UUID (primary key)
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

## Code Annotations

All code sections are annotated with:

- **Purpose comments** - What each section does
- **Bucket references** - Where "attachments" bucket is used
- **Error handling** - How errors are caught and handled
- **Cleanup logic** - When and how files are cleaned up
- **Logging points** - What information is logged

**Example:**
```typescript
// ========================================================================
// STEP 1: Upload file to Supabase Storage (bucket: "attachments")
// ========================================================================
// IMPORTANT: The bucket name "attachments" is hardcoded to ensure consistency
// Make sure this bucket exists in your Supabase project:
// 1. Go to Supabase Dashboard → Storage
// 2. Create bucket named "attachments"
// 3. Set bucket to public (or configure RLS policies for storage.objects)
const STORAGE_BUCKET_NAME = 'attachments';
```

## Testing Checklist

- [ ] Verify "attachments" bucket exists in Supabase Dashboard
- [ ] Verify bucket is set to public
- [ ] Upload an image via drag-drop → Check browser console logs
- [ ] Verify file appears in storage bucket
- [ ] Verify attachment metadata in `attachments` table
- [ ] Test error handling: Upload file > 10MB → Should show error
- [ ] Test error handling: Try upload without bucket → Should show bucket not found error
- [ ] Test cleanup: Disable RLS temporarily → Upload succeeds, insert fails → File should be deleted
- [ ] Verify public URL is accessible in browser

## Maintenance Notes

- **Bucket Name:** Always use `"attachments"` - do not change without updating all references
- **Path Structure:** `{boardId}/{filename}` - ensures files are organized by board
- **File Cleanup:** Automatic cleanup on database insert failure prevents orphaned files
- **Logging:** All upload operations are logged for easy debugging
- **Error Messages:** Clear, actionable error messages guide users to fix issues

## Production Recommendations

1. **Restrict Upload Permissions** - Only allow authenticated users to upload
2. **Restrict Delete Permissions** - Only allow uploader or board owner to delete
3. **Set File Size Limits** - Match bucket limits with code limits
4. **Enable File Compression** - Compress images before upload
5. **Monitor Storage Usage** - Set up alerts for storage limits

See `STORAGE_BUCKET_SETUP.md` for detailed setup and production configuration.

## Summary

✅ **Bucket name is now hardcoded to "attachments"** - ensures consistency  
✅ **Enhanced error handling** - clear messages for common errors  
✅ **Improved logging** - detailed logs for debugging  
✅ **Code annotations** - easy to maintain and understand  
✅ **Metadata saved to database** - all file uploads create attachment records  
✅ **Automatic cleanup** - prevents orphaned files on failure  

The refactor is complete and ready for use!





