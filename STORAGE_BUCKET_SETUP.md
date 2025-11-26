# Supabase Storage Bucket Setup Guide

## Overview

All file uploads in PinSpace use the Supabase Storage bucket named **"attachments"**. This bucket stores all uploaded files (images, PDFs, documents, etc.) for the application.

## Required Setup

### 1. Create the "attachments" Bucket

**In Supabase Dashboard:**

1. Navigate to **Storage** in the left sidebar
2. Click **"New bucket"** or **"Create bucket"**
3. Set the bucket name to: **`attachments`** (exactly, case-sensitive)
4. Configure bucket settings:
   - **Public bucket**: ✅ Yes (recommended for file access)
   - **File size limit**: 10MB (or as needed)
   - **Allowed MIME types**: All (or restrict as needed)

5. Click **"Create bucket"**

### 2. Configure Storage Policies (RLS)

**In Supabase Dashboard → Storage → Policies:**

Add the following policies for the `attachments` bucket:

#### Policy 1: Allow Public Uploads (for now)

```sql
-- Allow anyone to upload files (for development - restrict in production)
CREATE POLICY "Anyone can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'attachments');
```

#### Policy 2: Allow Public Read Access

```sql
-- Allow anyone to read/download files
CREATE POLICY "Anyone can read attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'attachments');
```

#### Policy 3: Allow Public Deletion (optional - restrict in production)

```sql
-- Allow anyone to delete files (for development - restrict in production)
CREATE POLICY "Anyone can delete attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'attachments');
```

**Alternative: Use Supabase Dashboard UI**

1. Go to **Storage** → **Policies** tab
2. Click **"New Policy"** for the `attachments` bucket
3. Select policy template or create custom policy
4. Set:
   - **Policy name**: "Anyone can upload attachments"
   - **Allowed operation**: INSERT
   - **Target roles**: public (or authenticated for production)
   - **USING expression**: `bucket_id = 'attachments'`

### 3. Verify Bucket Configuration

**Test Upload (in Supabase Dashboard):**

1. Go to **Storage** → **attachments** bucket
2. Click **"Upload file"**
3. Upload a test file
4. Verify file appears in the bucket

**Check Public URL:**

1. Click on the uploaded test file
2. Verify the public URL is accessible (opens in browser)
3. If URL is not accessible, check bucket is set to **Public**

## Storage Path Structure

Files are stored in the `attachments` bucket with the following path structure:

```
attachments/
  └── {boardId}/
      ├── {timestamp}_{random}_{filename}.png
      ├── {timestamp}_{random}_{filename}.pdf
      └── ...
```

**Example paths:**
- `attachments/abc-123/1234567890_a1b2c3_example.png`
- `attachments/abc-123/1234567891_b2c3d4_document.pdf`
- `attachments/xyz-789/1234567892_c3d4e5_image.jpg`

## Error Handling

### Common Errors and Fixes

#### 1. "Storage bucket 'attachments' not found"

**Error Message:**
```
Storage bucket "attachments" not found. The "attachments" bucket does not exist in your Supabase project. Please create it in the Supabase Dashboard → Storage → Create Bucket, and set it to public.
```

**Fix:**
1. Create the `attachments` bucket as described above
2. Verify bucket name is exactly "attachments" (case-sensitive)
3. Set bucket to public

#### 2. "Permission denied: Cannot upload to storage bucket"

**Error Message:**
```
Permission denied: Cannot upload to storage bucket. You do not have permission to upload files to the "attachments" bucket. Please check your Supabase Storage policies (RLS) or bucket permissions.
```

**Fix:**
1. Go to **Storage** → **Policies** → `attachments` bucket
2. Add INSERT policy for public or authenticated users
3. See policy examples above

#### 3. "File too large for storage"

**Error Message:**
```
File too large for storage. The file size (X.XXMB) exceeds the maximum allowed size for the storage bucket.
```

**Fix:**
1. Reduce file size (compress images, split PDFs, etc.)
2. Or increase bucket file size limit in Supabase Dashboard
3. Current limit in code: 10MB (can be changed in `useCreateAttachment.ts`)

#### 4. "Failed to generate public URL"

**Error Message:**
```
Failed to generate public URL for uploaded file
```

**Fix:**
1. Ensure bucket is set to **Public**
2. If bucket is private, update code to use signed URLs instead
3. Check bucket policies allow SELECT operation

## Code Reference

### Hook: `useCreateAttachment`

**Location:** `src/hooks/attachments/useCreateAttachment.ts`

**Bucket Name:** Hardcoded to `"attachments"`

```typescript
const STORAGE_BUCKET_NAME = 'attachments'; // Always use this bucket

// Upload to Supabase Storage
const { data, error } = await supabase.storage
  .from(STORAGE_BUCKET_NAME) // Always "attachments"
  .upload(path, file);
```

### Usage Example

```typescript
import { useCreateAttachment } from '@/hooks/attachments';

const { createAttachment, loading, error } = useCreateAttachment();

// Upload file - automatically uses "attachments" bucket
const attachment = await createAttachment({
  file: myFile,
  boardId: 'abc-123',
  commentId: null, // optional
  uploadedBy: 'username', // optional
});
```

## Production Recommendations

### 1. Restrict Upload Permissions

**Current:** Anyone can upload (public INSERT policy)

**Production:** Restrict to authenticated users only

```sql
-- Only authenticated users can upload
DROP POLICY IF EXISTS "Anyone can upload attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'attachments' 
    AND auth.uid() IS NOT NULL
  );
```

### 2. Restrict Delete Permissions

**Current:** Anyone can delete (public DELETE policy)

**Production:** Restrict to uploader or board owner

```sql
-- Only uploader can delete their files
DROP POLICY IF EXISTS "Anyone can delete attachments" ON storage.objects;
CREATE POLICY "Users can delete their own attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'attachments' 
    AND (storage.foldername(name))[1] = auth.uid()::text
    -- OR check uploaded_by field in attachments table
  );
```

### 3. Set File Size Limits

**In Supabase Dashboard:**
- Set bucket file size limit to match application requirements
- Update `MAX_FILE_SIZE` constant in `useCreateAttachment.ts` if needed

### 4. Enable File Compression

**For images:**
- Compress images before upload to reduce storage costs
- Use libraries like `browser-image-compression` or `sharp` (server-side)

### 5. Monitor Storage Usage

**In Supabase Dashboard:**
- Monitor storage usage in **Storage** → **attachments** bucket
- Set up alerts for storage limits
- Consider cleanup policies for old files

## Testing Checklist

- [ ] Create `attachments` bucket in Supabase Dashboard
- [ ] Set bucket to public
- [ ] Add INSERT policy for uploads
- [ ] Add SELECT policy for downloads
- [ ] Add DELETE policy (optional)
- [ ] Upload test file via UI → Verify file appears
- [ ] Check public URL → Verify file is accessible
- [ ] Upload file via app → Verify in attachments list
- [ ] Check browser console for upload logs
- [ ] Verify attachment metadata in `attachments` table

## Troubleshooting

### Files Not Appearing in Storage

1. Check bucket name is exactly `"attachments"` (case-sensitive)
2. Verify bucket exists in Supabase Dashboard
3. Check browser console for error messages
4. Verify environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### Upload Errors

1. Check browser console for detailed error logs
2. Verify storage policies are configured correctly
3. Check file size doesn't exceed limits
4. Verify bucket is public (or signed URL logic is implemented)

### URL Not Accessible

1. Ensure bucket is set to **Public**
2. Verify file was uploaded successfully
3. Check public URL format matches Supabase structure
4. Test URL in browser directly

## Maintenance Notes

- **Bucket Name:** Always use `"attachments"` - do not change without updating all code references
- **Path Structure:** `{boardId}/{filename}` - ensures files are organized by board
- **File Cleanup:** Automatic cleanup on database insert failure prevents orphaned files
- **Logging:** All upload operations are logged for easy debugging



