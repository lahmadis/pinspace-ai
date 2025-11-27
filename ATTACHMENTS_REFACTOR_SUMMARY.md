# Attachments Refactor Summary

## Overview

All attachment functionality in PinSpace has been refactored to sync with the Supabase `attachments` table. Attachments are now displayed in the comments sidebar, grouped by comment ID, with automatic real-time updates.

## Changed Files

### 1. `pages/api/attachments/index.js` (NEW)
**Purpose:** API route for listing and creating attachments

**Features:**
- GET `/api/attachments?boardId={boardId}&commentId={commentId}` - List attachments for a board or comment
- POST `/api/attachments` - Create a new attachment
- Validates required fields (boardId, fileName, fileUrl)
- Returns consistent `{ data, error }` format
- Handles RLS policy violations

**Required Fields for POST:**
- `boardId` (required) - Board ID the attachment belongs to
- `fileName` (required) - Original filename
- `fileUrl` (required) - URL to the file (Supabase Storage, S3, etc.)
- `commentId` (optional) - Comment ID if attachment is linked to a comment
- `fileType`, `fileSize`, `mimeType`, `uploadedBy` (optional) - Metadata

### 2. `pages/api/attachments/[id].js` (NEW)
**Purpose:** API route for fetching and deleting single attachments

**Features:**
- GET `/api/attachments/[id]` - Fetch a single attachment by ID
- DELETE `/api/attachments/[id]` - Delete an attachment
- Validates attachment exists before deletion
- Handles RLS policy violations
- Returns consistent `{ data, error }` format

### 3. `src/hooks/attachments/useAttachments.ts` (NEW)
**Purpose:** React hook for fetching and managing attachments

**Features:**
- Fetches attachments by `boardId` or `commentId`
- Automatic polling every 5 seconds for real-time updates
- Groups attachments by `commentId` for easy display
- Provides `boardAttachments` (attachments not linked to any comment)
- Loading and error states
- Manual `refetch()` function

**Usage:**
```typescript
const { attachments, attachmentsByComment, boardAttachments, loading, error, refetch } = 
  useAttachments({ boardId: 'abc-123' });
```

**Returns:**
- `attachments` - Array of all attachments
- `attachmentsByComment` - Record mapping comment IDs to attachment arrays
- `boardAttachments` - Attachments not linked to any comment
- `loading` - Loading state
- `error` - Error message if any
- `refetch` - Manual refetch function

### 4. `src/hooks/attachments/index.ts` (NEW)
**Purpose:** Barrel export for attachments hooks

### 5. `src/components/AttachmentsList.tsx` (NEW)
**Purpose:** Component for displaying attachments with previews and download links

**Features:**
- Image previews for image files
- File type icons for different file types
- Download links for all files
- File size display
- Uploader name display
- Compact mode for inline display in comments
- Delete button support (optional)

**Props:**
- `attachments` - Array of attachments to display
- `onDelete` - Optional delete handler
- `deletable` - Whether to show delete button (default: false)
- `showTitle` - Whether to show "Attachments" title (default: true)
- `compact` - Compact mode for smaller display (default: false)

### 6. `src/components/RightPanel.tsx` (MODIFIED)
**Changes:**
- Integrated `useAttachments` hook to fetch attachments for the current board
- Displays attachments grouped by comment ID in each comment thread
- Shows board-level attachments (not linked to any comment) at the top
- Shows loading indicator while fetching attachments
- Shows error message if attachments fail to load

**Features:**
- Attachments appear below comment text in each comment card
- Board-level attachments displayed at the top of the comments list
- Automatic refresh when attachments are created/deleted (via polling)

### 7. `SUPABASE_ATTACHMENTS_SCHEMA.sql` (NEW)
**Purpose:** SQL schema for creating the attachments table in Supabase

**Table Structure:**
- `id` - UUID (primary key)
- `board_id` - UUID (required, references boards table)
- `comment_id` - UUID (optional, references comments table)
- `file_name` - TEXT (required) - Original filename
- `file_url` - TEXT (required) - URL to the file
- `file_type` - TEXT (optional) - e.g., 'image', 'document', 'pdf'
- `file_size` - BIGINT (optional) - File size in bytes
- `mime_type` - TEXT (optional) - e.g., 'image/png', 'application/pdf'
- `uploaded_by` - TEXT (optional) - User ID or username
- `created_at` - TIMESTAMP (auto-generated)
- `updated_at` - TIMESTAMP (auto-generated)

**RLS Policies:**
- Anyone can read attachments (for public boards)
- Anyone can create attachments (for now)
- Anyone can update attachments (for now)
- Anyone can delete attachments (for now)

**Indexes:**
- `idx_attachments_board_id` - For faster queries by board
- `idx_attachments_comment_id` - For faster queries by comment
- `idx_attachments_created_at` - For sorting by creation date

## Required Supabase Columns

### Required (NOT NULL)
1. **`id`** - UUID (auto-generated, PRIMARY KEY)
2. **`board_id`** - UUID (NOT NULL, REFERENCES boards(id))
3. **`file_name`** - TEXT (NOT NULL) - Original filename
4. **`file_url`** - TEXT (NOT NULL) - URL to the file
5. **`created_at`** - TIMESTAMP WITH TIME ZONE (auto-generated)
6. **`updated_at`** - TIMESTAMP WITH TIME ZONE (auto-generated)

### Optional (Nullable)
7. **`comment_id`** - UUID - Comment ID if attachment is linked to a comment
8. **`file_type`** - TEXT - File type category (e.g., 'image', 'document', 'pdf')
9. **`file_size`** - BIGINT - File size in bytes
10. **`mime_type`** - TEXT - MIME type (e.g., 'image/png', 'application/pdf')
11. **`uploaded_by`** - TEXT - User ID or username who uploaded the file

**Minimum required for INSERT:** `board_id`, `file_name`, `file_url`

## Attachments Flow

```
User uploads file → Store in Supabase Storage (or S3)
    ↓
Create attachment record in Supabase attachments table
    ↓
POST /api/attachments (with boardId, fileName, fileUrl, optional commentId)
    ↓
useAttachments hook polls every 5 seconds
    ↓
Attachments appear in UI grouped by comment_id
```

## UI Display

### Comments Sidebar (RightPanel)
- **Board-level attachments**: Displayed at the top of the comments list
- **Comment-specific attachments**: Displayed below each comment's text, grouped by comment ID
- **Image previews**: Small thumbnails for image files
- **File icons**: Icons for different file types (PDF, document, video, etc.)
- **Download links**: Clickable links to download/view files
- **File metadata**: File size, type, and uploader name

### AttachmentsList Component
- Compact mode for inline display in comments
- Full mode for standalone attachment lists
- Loading and error states
- Delete button support (optional)

## Real-time Updates

- **Polling**: `useAttachments` hook polls every 5 seconds for new attachments
- **Automatic refresh**: When attachments are created/deleted, they appear/disappear in the UI automatically
- **Manual refetch**: Components can call `refetch()` to manually refresh attachments

## Error Handling

- **API errors**: Displayed in the attachments list area
- **Loading states**: Show loading indicator while fetching
- **Network errors**: Gracefully handled with error messages
- **RLS violations**: Clear error messages for permission issues

## Testing Checklist

- [ ] Run `SUPABASE_ATTACHMENTS_SCHEMA.sql` in Supabase SQL Editor
- [ ] Verify attachments table is created with correct structure
- [ ] Create an attachment via POST `/api/attachments`
- [ ] Verify attachment appears in UI (grouped by comment_id if provided)
- [ ] Verify image previews work for image files
- [ ] Verify download links work
- [ ] Delete an attachment via DELETE `/api/attachments/[id]`
- [ ] Verify attachment disappears from UI automatically
- [ ] Verify board-level attachments display at top of comments list
- [ ] Verify comment-specific attachments display below comment text
- [ ] Verify error handling shows clear error messages
- [ ] Verify loading states work correctly

## Next Steps

1. **File Upload Integration**: Add file upload component that:
   - Uploads files to Supabase Storage (or S3)
   - Creates attachment records in the attachments table
   - Links attachments to comments when uploading from comment thread

2. **Attachment Management**: Add UI for:
   - Uploading new attachments
   - Deleting attachments (with permission checks)
   - Viewing attachment details

3. **Permission Controls**: Update RLS policies to:
   - Restrict attachment deletion to uploader/board owner
   - Restrict attachment creation to authenticated users
   - Support private boards with restricted access

4. **File Type Support**: Enhance file preview for:
   - PDF previews (using PDF.js or similar)
   - Video players for video files
   - Audio players for audio files
   - Document previews (Google Docs viewer or similar)





