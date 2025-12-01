# Comments Refactor Summary

This document summarizes the refactoring of comment logic from localStorage to Supabase.

## Overview

All comment create, edit, delete, and list operations now use Supabase via API routes. Comments are stored in a `comments` table in Supabase and automatically sync across all users.

## Changes Made

### 1. Supabase Schema (`SUPABASE_COMMENTS_SCHEMA.sql`)

Created the `comments` table with:
- **Primary fields**: `id`, `board_id`, `text`, `author_name`, `author_id`
- **Positioning**: `target_element_id`, `x`, `y` for canvas positioning
- **Metadata**: `category`, `is_task`, `source`
- **Timestamps**: `created_at`, `updated_at` (auto-updated)
- **Legacy fields**: `element_id`, `pin_id`, `type` for backward compatibility

**RLS Policies**:
- Anyone can read comments (public access)
- Anyone can create, update, and delete comments (for now - can be restricted later)

### 2. API Routes

#### `pages/api/comments/index.js`
- **GET** `/api/comments?boardId={boardId}` - List all comments for a board
- **POST** `/api/comments` - Create a new comment
- All responses use `{ data, error }` format

#### `pages/api/comments/[id].js`
- **GET** `/api/comments/[id]` - Fetch a single comment
- **PATCH** `/api/comments/[id]` - Update a comment (text, category, task, etc.)
- **DELETE** `/api/comments/[id]` - Delete a comment
- All responses use `{ data, error }` format

**Response Format**:
```javascript
// Success
{ data: commentObject, error: null }

// Error
{ data: null, error: { message: "...", details: "..." } }
```

### 3. React Hooks (`src/hooks/`)

#### `useComments.ts`
- Fetches all comments for a board from Supabase
- Automatically polls for updates every 5 seconds (real-time sync)
- Returns: `{ comments, loading, error, refetch }`

#### `useCreateComment.ts`
- Creates a new comment in Supabase
- Returns: `{ createComment, loading, error, createdComment }`
- Usage:
  ```typescript
  const { createComment } = useCreateComment();
  await createComment({
    boardId: "...",
    text: "Comment text",
    authorName: "User Name",
    targetElementId: "e_123",
    category: "general",
    task: false,
  });
  ```

#### `useUpdateComment.ts`
- Updates an existing comment
- Returns: `{ updateComment, loading, error }`
- Usage:
  ```typescript
  const { updateComment } = useUpdateComment();
  await updateComment(commentId, {
    text: "Updated text",
    category: "plan",
  });
  ```

#### `useDeleteComment.ts`
- Deletes a comment
- Returns: `{ deleteComment, loading, error }`
- Usage:
  ```typescript
  const { deleteComment } = useDeleteComment();
  await deleteComment(commentId);
  ```

### 4. Updated Components

#### `app/board/[id]/page.tsx`
- **Removed**: localStorage-based comment loading (`getComments`, `addComment`, `removeComment` from `@/lib/comments`)
- **Added**: Supabase-based hooks (`useComments`, `useCreateComment`, `useDeleteComment`)
- **Updated**:
  - `handlePostComment`: Now creates comments via API instead of localStorage
  - `handleDeleteComment`: Now deletes comments via API
  - Live crit handler: Creates comments via API when receiving from peer-to-peer
  - Comment loading: Automatically fetches from API and polls for updates

**Key Changes**:
```typescript
// Before (localStorage)
import { getComments, addComment, removeComment } from "@/lib/comments";
addComment({ id, boardId, text, ... });

// After (Supabase)
import { useComments, useCreateComment, useDeleteComment } from "@/hooks/comments";
const { createComment } = useCreateComment();
await createComment({ boardId, text, ... });
```

## Data Flow

1. **Creating a Comment**:
   ```
   User types comment → handlePostComment() → createCommentApi() → 
   POST /api/comments → Supabase insert → Response → Local state update → 
   UI shows new comment → Polling syncs with other users
   ```

2. **Listing Comments**:
   ```
   Component mounts → useComments hook → GET /api/comments?boardId=... → 
   Supabase query → Transform to app format → Set state → 
   UI renders → Poll every 5s for updates
   ```

3. **Deleting a Comment**:
   ```
   User clicks delete → handleDeleteComment() → deleteCommentApi() → 
   DELETE /api/comments/[id] → Supabase delete → Response → 
   Refresh comments → UI updates
   ```

## Real-Time Sync

Comments automatically sync across users via:
1. **Polling**: `useComments` hook polls for updates every 5 seconds
2. **Optimistic Updates**: UI updates immediately, then syncs with server
3. **Error Handling**: On error, refreshes from API to ensure consistency

## Migration Notes

### Old Code (Still in Codebase)
- `src/lib/comments.ts` - Old localStorage-based functions (can be removed after testing)
- `src/lib/storage.ts` - `getComments`, `saveComments` functions (still used for other data)
- `src/lib/useComments.ts` - Old localStorage-based hook (can be removed)

### Backward Compatibility
- API routes transform between database field names and app field names
- Legacy fields (`pinId`, `elementId`, `type`) are preserved for compatibility
- Comments work with both old and new field names during transition

## Testing Checklist

- [ ] Run Supabase schema SQL to create `comments` table
- [ ] Test creating a comment in the UI
- [ ] Test deleting a comment
- [ ] Test updating a comment (if edit functionality exists)
- [ ] Test comments sync across multiple browser tabs
- [ ] Test comments sync across multiple users
- [ ] Test comments with element targeting (attached to canvas elements)
- [ ] Test comments with free-floating positioning (x, y coordinates)
- [ ] Test comments in live crit mode (peer-to-peer sync)
- [ ] Verify RLS policies allow public access (or restrict as needed)

## Next Steps

1. **Test thoroughly** with real Supabase instance
2. **Remove old localStorage code** once confirmed working:
   - `src/lib/comments.ts`
   - `src/lib/useComments.ts`
   - localStorage comment loading logic in components
3. **Consider WebSocket** integration for real-time updates (replace polling)
4. **Add authentication** - Link comments to authenticated users via `author_id`
5. **Restrict RLS policies** - Make them more secure for production

## Files Created/Modified

### Created:
- `SUPABASE_COMMENTS_SCHEMA.sql` - Database schema
- `pages/api/comments/index.js` - List and create endpoints
- `pages/api/comments/[id].js` - Get, update, delete endpoints
- `src/hooks/useComments.ts` - Fetch comments hook
- `src/hooks/useCreateComment.ts` - Create comment hook
- `src/hooks/useUpdateComment.ts` - Update comment hook
- `src/hooks/useDeleteComment.ts` - Delete comment hook
- `src/hooks/comments/index.ts` - Hooks barrel export
- `COMMENTS_REFACTOR_SUMMARY.md` - This file

### Modified:
- `app/board/[id]/page.tsx` - Updated to use Supabase hooks

### Can Be Removed (After Testing):
- `src/lib/comments.ts` - Old localStorage functions
- `src/lib/useComments.ts` - Old localStorage hook
- localStorage comment loading logic in components

## API Response Examples

### GET /api/comments?boardId=xxx
```json
{
  "data": [
    {
      "id": "uuid",
      "boardId": "board-uuid",
      "author": "User Name",
      "text": "Comment text",
      "timestamp": "2024-01-01T12:00:00Z",
      "category": "general",
      "targetElementId": "e_123",
      "task": false
    }
  ],
  "error": null
}
```

### POST /api/comments
```json
// Request
{
  "boardId": "board-uuid",
  "text": "New comment",
  "authorName": "User Name",
  "targetElementId": "e_123",
  "category": "general",
  "task": false
}

// Response
{
  "data": {
    "id": "uuid",
    "boardId": "board-uuid",
    "author": "User Name",
    "text": "New comment",
    "timestamp": "2024-01-01T12:00:00Z",
    ...
  },
  "error": null
}
```

---

**All comment operations now use Supabase and sync across users!** 🎉







