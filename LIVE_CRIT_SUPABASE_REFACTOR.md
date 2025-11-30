# Live Crit Supabase Refactor Summary

## Overview
Refactored the Live Crit commenting logic to use Supabase instead of localStorage. All crit comments are now stored in and fetched from the Supabase `comments` table.

## Changes Made

### 1. Replaced localStorage Comment Operations with Supabase Hooks

**File:** `app/live/[sessionId]/page.tsx`

#### Before (localStorage-based):
```typescript
import { addComment, removeComment } from "@/lib/comments";
import { getComments } from "@/lib/comments";

// Manual localStorage fetching with polling
const loadComments = () => {
  const boardComments = getComments(activeBoardId);
  // Convert and set state...
};

// Manual localStorage saving
addComment({
  id: commentId,
  boardId: activeBoardId,
  // ...
});

// Manual localStorage deletion
removeComment(activeBoardId, commentId);
```

#### After (Supabase-based):
```typescript
import { useComments, useCreateComment, useDeleteComment } from "@/hooks/comments";

// Automatic fetching with polling (every 5 seconds)
const { 
  comments: allComments, 
  loading: commentsLoading, 
  error: commentsError, 
  refetch: refetchComments 
} = useComments(activeBoardId);

// Filter to only show liveCrit comments
const comments = useMemo(() => {
  return allComments.filter(c => c.source === 'liveCrit');
}, [allComments]);

// Create comment via API
const { createComment: createCommentApi } = useCreateComment();
await createCommentApi({
  boardId: activeBoardId,
  text: textBody,
  authorName: name || "Guest",
  source: "liveCrit",
  // ...
});

// Delete comment via API
const { deleteComment: deleteCommentApi } = useDeleteComment();
await deleteCommentApi(commentId);
```

### 2. Removed localStorage Dependencies

**Removed:**
- `getComments()` from `@/lib/comments` (localStorage)
- `addComment()` from `@/lib/comments` (localStorage)
- `removeComment()` from `@/lib/comments` (localStorage)
- Manual localStorage polling (2 second interval)
- Storage event listeners
- Custom event listeners for cross-tab communication

**Replaced with:**
- `useComments` hook (automatic polling every 5 seconds)
- `useCreateComment` hook (API-based creation)
- `useDeleteComment` hook (API-based deletion)
- Supabase Realtime subscriptions (instant updates)

### 3. Updated Comment Creation Flow

**Before:**
1. Create comment in localStorage
2. Update local state optimistically
3. Send via Realtime (which also creates via API - duplicate!)

**After:**
1. Create comment via `createCommentApi()` (inserts into Supabase)
2. Supabase Realtime broadcasts INSERT event to all subscribers
3. `useComments` hook automatically refetches and updates UI
4. Manual `refetchComments()` for instant feedback

### 4. Updated Comment Deletion Flow

**Before:**
1. Delete from localStorage
2. Update local state optimistically

**After:**
1. Delete via `deleteCommentApi()` (deletes from Supabase)
2. Supabase Realtime broadcasts DELETE event to all subscribers
3. `useComments` hook automatically refetches and updates UI
4. Manual `refetchComments()` for instant feedback

### 5. Updated Realtime Message Handler

**Before:**
```typescript
guest.onMessage((msg: CritMessage) => {
  if (msg.type === "comment") {
    // Trigger localStorage ping
    localStorage.setItem(`pinspace_comments_ping_${activeBoardId}`, String(Date.now()));
  }
});
```

**After:**
```typescript
guest.onMessage((msg: CritMessage) => {
  if (msg.type === "comment") {
    // Trigger refetch from Supabase
    refetchComments().catch((err) => {
      console.error("[live] Failed to refetch comments after Realtime update:", err);
    });
  }
});
```

### 6. Added Comment Filtering

**New:**
- Filter comments to only show `source === 'liveCrit'` comments
- Ensures only live crit session comments are displayed
- Uses `useMemo` for performance

## Architecture Flow

### Comment Creation:
1. User submits comment via `handlePostComment`
2. `createCommentApi()` called with `source: "liveCrit"`
3. API inserts comment into Supabase `comments` table
4. Supabase Realtime broadcasts INSERT event
5. All connected clients receive event via subscription
6. `useComments` hook refetches (or manual `refetchComments()`)
7. UI updates automatically

### Comment Deletion:
1. User deletes comment via `handleDeleteComment`
2. `deleteCommentApi()` called with comment ID
3. API deletes comment from Supabase `comments` table
4. Supabase Realtime broadcasts DELETE event
5. All connected clients receive event via subscription
6. `useComments` hook refetches (or manual `refetchComments()`)
7. UI updates automatically

### Comment Fetching:
1. `useComments(activeBoardId)` hook called
2. Fetches from `/api/comments?boardId={boardId}`
3. Filters to `source === 'liveCrit'` comments
4. Automatically polls every 5 seconds for updates
5. Supabase Realtime provides instant updates (via subscription)

## Benefits

1. **Persistence:** All comments stored in Supabase database
2. **Real-time:** Supabase Realtime provides instant updates
3. **Reliability:** No localStorage size limits or browser-specific issues
4. **Scalability:** Works across multiple devices and browsers
5. **Consistency:** Single source of truth (Supabase database)
6. **Error Handling:** Proper error states and user feedback
7. **Loading States:** UI feedback during operations

## Files Changed

1. `app/live/[sessionId]/page.tsx` - Complete refactor to use Supabase hooks

## Dependencies

- `@/hooks/comments` - Supabase-based comment hooks
  - `useComments` - Fetch comments with polling
  - `useCreateComment` - Create comments via API
  - `useDeleteComment` - Delete comments via API

## Testing Checklist

- [ ] Guest can create comments (stored in Supabase)
- [ ] Guest can see their own comments immediately
- [ ] Guest receives comments from other users in real-time
- [ ] Guest can delete their own comments
- [ ] Comments persist after page refresh
- [ ] Comments appear for all connected users
- [ ] Loading states work correctly
- [ ] Error handling works correctly
- [ ] Only `source: 'liveCrit'` comments are shown
- [ ] Polling works as fallback if Realtime fails

## Migration Notes

- **Backward Compatibility:** Old localStorage comments are not migrated automatically
- **Session ID:** Comments are linked to `boardId`, not `sessionId` (sessionId is used for Realtime subscription)
- **Source Field:** All live crit comments have `source: "liveCrit"` to distinguish from regular comments
- **Filtering:** Comments are filtered client-side to only show liveCrit comments






