# Attachment Upload Refactor Summary

## Overview

File upload functionality in PinSpace has been refactored to automatically store file metadata in the Supabase `attachments` table. When files are uploaded (via drag-drop, file picker, or image paste), they are:

1. **Uploaded to Supabase Storage** (in the `attachments` bucket)
2. **Metadata stored in `attachments` table** (file_url, filename, board_id, mime_type, created_at, etc.)
3. **UI updated immediately** to show the new attachment

## Changed Files

### 1. `src/hooks/attachments/useCreateAttachment.ts` (NEW)
**Purpose:** React hook for uploading files to Supabase Storage and creating attachment records

**Features:**
- Uploads file to Supabase Storage bucket
- Gets public URL for the uploaded file
- Creates attachment record in `attachments` table via API
- Comprehensive error handling with cleanup on failure
- Detailed logging for upload and insert operations
- Validates file size (10MB limit)
- Detects file type category automatically

**Usage:**
```typescript
const { createAttachment, loading, error } = useCreateAttachment();

const attachment = await createAttachment({
  file: File,
  boardId: 'abc-123',
  commentId: 'comment-456', // optional
  uploadedBy: 'username', // optional
  storageBucket: 'attachments', // optional, default: 'attachments'
});
```

**Upload Flow:**
1. Validate file and boardId
2. Upload file to Supabase Storage (`attachments/{boardId}/{filename}`)
3. Get public URL for uploaded file
4. Create attachment record in `attachments` table via POST `/api/attachments`
5. If step 4 fails, attempt to delete uploaded file from storage (cleanup)

**Error Handling:**
- File validation errors (missing file, invalid boardId, file too large)
- Storage upload errors (network, permissions, bucket not found)
- Database insert errors (foreign key violations, RLS policies)
- Automatic cleanup: If database insert fails, uploaded file is deleted from storage

**Logging:**
- Upload start with file details
- Storage upload progress and duration
- Public URL generation
- Database insert progress and duration
- Success confirmation with attachment ID
- Full error details with stack traces

### 2. `app/board/[id]/page.tsx` (MODIFIED)
**Changes:**
- Imported `useCreateAttachment` hook
- Updated `handleFileDrop` to upload files to Supabase Storage before displaying
- Updated `handleInsertImage` to handle both File objects and data URLs
- Added error display for attachment upload errors
- Files are now uploaded and stored in Supabase before being added to canvas

**File Upload Flow:**
- **Images**: Uploaded to Supabase Storage → attachment record created → displayed on canvas using Storage URL
- **PDFs**: Uploaded to Supabase Storage → attachment record created → processed for PDF viewer
- **Other files**: Uploaded to Supabase Storage → attachment record created → shown in attachments list

**Error Display:**
- Shows error toast when file upload fails
- Displays attachment upload errors in UI
- Continues processing other files if one fails

### 3. `src/hooks/attachments/index.ts` (MODIFIED)
**Changes:**
- Added export for `useCreateAttachment` hook
- Added type exports for `UseCreateAttachmentResult` and `CreateAttachmentOptions`

## Required Supabase Setup

### 1. Create Storage Bucket

In Supabase Dashboard → Storage → Create Bucket:

- **Bucket Name:** `attachments`
- **Public:** Yes (to allow public file access)
- **File size limit:** 10MB (or as needed)
- **Allowed MIME types:** All (or restrict as needed)

### 2. Create Attachments Table

Run `SUPABASE_ATTACHMENTS_SCHEMA.sql` in Supabase SQL Editor to create the table and RLS policies.

### 3. Storage Policies

Add RLS policies for the `attachments` storage bucket:

```sql
-- Allow public uploads (for now - can restrict later)
CREATE POLICY "Anyone can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'attachments');

-- Allow public read access
CREATE POLICY "Anyone can read attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'attachments');

-- Allow public deletion (optional - can restrict to uploader)
CREATE POLICY "Anyone can delete attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'attachments');
```

## Attachment Metadata Fields

When a file is uploaded, the following metadata is stored in the `attachments` table:

### Required Fields
- `board_id` - UUID (links to boards table)
- `file_name` - TEXT (original filename)
- `file_url` - TEXT (public URL from Supabase Storage)

### Optional Fields (auto-detected)
- `comment_id` - UUID (if attachment is linked to a comment)
- `file_type` - TEXT (auto-detected: 'image', 'pdf', 'document', 'video', 'audio', 'archive')
- `file_size` - BIGINT (file size in bytes)
- `mime_type` - TEXT (e.g., 'image/png', 'application/pdf')
- `uploaded_by` - TEXT (user ID or username)

### Auto-generated Fields
- `id` - UUID (primary key)
- `created_at` - TIMESTAMP (auto-generated)
- `updated_at` - TIMESTAMP (auto-updated)

## Upload Process Flow

```
User drops/selects file
    ↓
handleFileDrop / handleInsertImage
    ↓
useCreateAttachment hook
    ↓
1. Validate file (size, type, boardId)
    ↓
2. Upload to Supabase Storage
   └─> attachments/{boardId}/{timestamp_random_filename}
    ↓
3. Get public URL
   └─> https://{project}.supabase.co/storage/v1/object/public/attachments/...
    ↓
4. Create attachment record in database
   └─> POST /api/attachments
    ↓
5. Return attachment object
    ↓
6. Display in UI (canvas or attachments list)
    ↓
7. useAttachments hook polls every 5 seconds
   └─> New attachment appears in sidebar automatically
```

## Error Handling

### Storage Upload Failure
- Error logged with details
- User sees error toast: "Failed to upload {filename}"
- Process continues with next file if multiple files

### Database Insert Failure
- Error logged with details
- **Automatic cleanup**: Uploaded file is deleted from storage
- User sees error toast with details
- Process continues with next file

### Network Errors
- Error logged with network details
- User sees error toast
- File not uploaded, no cleanup needed

## Logging

### Browser Console (Frontend)
- `[useCreateAttachment] 🚀 Starting attachment upload` - Upload start
- `📤 Upload Options` - File details, boardId, etc.
- `📤 Uploading file to Supabase Storage` - Storage upload start
- `⏱️ Storage upload completed in Xms` - Upload duration
- `✅ File uploaded successfully` - Upload success
- `✅ Public URL generated` - URL generated
- `📤 Creating attachment record` - Database insert start
- `⏱️ Database insert completed in Xms` - Insert duration
- `✅ Successfully created attachment` - Final success

### Server Terminal (API)
- `[POST /api/attachments]` - API request received
- Validation errors
- Supabase insert errors
- Success responses

## UI Updates

### Immediate Updates
- Files uploaded via drag-drop appear on canvas immediately (using Storage URL)
- Files uploaded appear in attachments list (via polling every 5 seconds)

### Error Feedback
- Error toast appears for failed uploads
- Error message includes file name and error details
- Multiple files continue processing even if one fails

## Testing Checklist

- [ ] Create `attachments` storage bucket in Supabase
- [ ] Set bucket to public
- [ ] Run `SUPABASE_ATTACHMENTS_SCHEMA.sql` to create table
- [ ] Upload an image via drag-drop → Verify in storage and attachments table
- [ ] Upload a PDF via drag-drop → Verify in storage and attachments table
- [ ] Upload a document → Verify in storage and attachments table
- [ ] Check browser console for upload logs
- [ ] Check server terminal for API logs
- [ ] Verify attachment appears in attachments list (sidebar)
- [ ] Test error handling: Upload file larger than 10MB → Should show error
- [ ] Test error handling: Upload without boardId → Should show error
- [ ] Verify cleanup: Disable RLS temporarily → Upload succeeds but insert fails → File should be deleted from storage

## Next Steps

1. **File Upload UI**: Add explicit "Upload File" button in comments/composer
2. **Attachment Management**: Add UI to delete attachments
3. **Permission Controls**: Update RLS to restrict uploads to authenticated users
4. **File Size Limits**: Make configurable per file type
5. **Progress Indicators**: Show upload progress for large files
6. **Image Compression**: Compress images before upload to reduce storage




