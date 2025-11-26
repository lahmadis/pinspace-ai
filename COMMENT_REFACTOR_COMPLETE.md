# Complete Comment Refactor - All Creation to Supabase

## Summary

All comment creation in PinSpace has been refactored to **always store comments in Supabase** using the `comments` table. No comments are created in localStorage anymore.

### Changed Files

1. **`src/hooks/useCreateComment.ts`** - Enhanced validation and logging for missing fields
2. **`pages/api/comments/index.js`** - Enhanced validation and error logging with detailed diagnostics
3. **`app/board/[id]/page.tsx`** - Updated `handlePostComment` and live crit handler with comprehensive validation

### Comment Creation Flow

```
Frontend Component (e.g., handlePostComment)
    ↓ [Validates: boardId, text, authorName]
useCreateComment Hook (validation + logging)
    ↓ [Logs request payload, field types, validates]
POST /api/comments API Route (validation + logging)
    ↓ [Validates all fields, logs Supabase data]
Supabase INSERT INTO comments
    ↓ [Returns success/error]
Return { data: comment, error: null }
```

## Required Supabase Columns for Comments Table

Based on `SUPABASE_COMMENTS_SCHEMA.sql`, here are all required columns:

### Required Columns (NOT NULL)
1. **`id`** - UUID (auto-generated, PRIMARY KEY)
2. **`board_id`** - UUID (NOT NULL, REFERENCES boards(id))
3. **`text`** - TEXT (NOT NULL) - Comment content
4. **`author_name`** - TEXT (NOT NULL) - Author display name
5. **`created_at`** - TIMESTAMP WITH TIME ZONE (auto-generated, DEFAULT NOW())
6. **`updated_at`** - TIMESTAMP WITH TIME ZONE (auto-generated, DEFAULT NOW())

### Optional Columns (Nullable)
7. **`author_id`** - TEXT - Authenticated user ID (optional)
8. **`target_element_id`** - TEXT - Canvas element ID (optional)
9. **`x`** - NUMERIC - X coordinate for free-floating comments (optional)
10. **`y`** - NUMERIC - Y coordinate for free-floating comments (optional)
11. **`category`** - TEXT - Comment category (default: 'general')
12. **`is_task`** - BOOLEAN - Whether comment is a task (default: FALSE)
13. **`source`** - TEXT - Source of comment (e.g., "liveCrit", "student", optional)

### Legacy/Deprecated Columns (for backward compatibility)
14. **`element_id`** - TEXT - Legacy field (deprecated, use target_element_id)
15. **`pin_id`** - TEXT - Legacy field (deprecated)
16. **`type`** - TEXT - Legacy field (deprecated, default: 'comment')

### Summary
- **Minimum required fields for INSERT**: `board_id`, `text`, `author_name`
- **All other fields are optional** (will use defaults or NULL)

## Validation & Error Handling

### Frontend Validation (`useCreateComment.ts`)

Validates before sending request:
- ✅ `boardId` must be non-empty string
- ✅ `text` must be non-empty string
- ✅ Logs all field types and values for debugging
- ✅ Shows detailed error messages for missing/invalid fields

### API Validation (`pages/api/comments/index.js`)

Validates on server-side:
- ✅ `boardId` required, must be UUID string
- ✅ `text` required, must be non-empty string
- ✅ `authorName` or `author` required (defaults to "Anonymous")
- ✅ `category` must be valid enum value
- ✅ `x`, `y` must be valid numbers if provided
- ✅ `task`/`isTask` must be boolean if provided

### Error Logging

**Frontend logs** (Browser Console):
- Request payload and field types
- Validation errors with missing/invalid fields
- API response status and data
- Full error stack traces

**Server logs** (Terminal):
- Incoming request body
- Validation results
- Prepared Supabase data with types
- Supabase error codes and messages
- Detailed diagnostics for common errors

## Common Error Codes & Fixes

| Error Code | Issue | Fix |
|-----------|-------|-----|
| `23503` | Foreign key violation | Verify `board_id` exists in `boards` table |
| `42501` | RLS policy violation | Run RLS policy SQL from `SUPABASE_COMMENTS_SCHEMA.sql` |
| `23502` | NOT NULL violation | Ensure `board_id`, `text`, `author_name` are provided |
| `23505` | Unique constraint | Duplicate comment detected |

## Testing Checklist

- [ ] Create comment with all required fields → Should succeed
- [ ] Create comment without `boardId` → Should show validation error
- [ ] Create comment without `text` → Should show validation error
- [ ] Create comment without `authorName` → Should default to "Anonymous"
- [ ] Create comment with invalid `category` → Should default to "general"
- [ ] Create comment for non-existent board → Should show "Board not found" error
- [ ] Check browser console for frontend logs
- [ ] Check server terminal for API logs
- [ ] Verify comment appears in Supabase `comments` table

## Migration Notes

- **Old code**: Used `localStorage` functions like `addComment()` from `src/lib/comments.ts`
- **New code**: Uses `useCreateComment()` hook which calls `/api/comments` POST endpoint
- **Backward compatibility**: Old localStorage functions still exist but are no longer used for creation
- **All comments now persist in Supabase** and sync across all users in real-time
