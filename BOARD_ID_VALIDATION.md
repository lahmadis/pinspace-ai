# Board ID Validation for Attachments

## Overview

Every attachment in PinSpace **MUST** be linked to a board via the `board_id` column. This is enforced at multiple levels:

1. **Database Schema**: `board_id` is `NOT NULL` with a foreign key constraint to the `boards` table
2. **API Route**: Validates `boardId` is present in request body before insert
3. **React Hook**: Validates `boardId` is present before upload
4. **Components**: Pass `boardId` from current board context/state

## Validation Layers

### 1. Database Schema (Supabase)

**Column Definition:**
```sql
board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE
```

**Constraints:**
- `NOT NULL` - Cannot be null or empty
- `REFERENCES boards(id)` - Must reference an existing board
- `ON DELETE CASCADE` - Deleting a board deletes all its attachments

**Error Codes:**
- `23503` - Foreign key constraint violation (board doesn't exist)
- `23502` - Not null constraint violation (board_id is missing)

### 2. API Route (`/api/attachments`)

**Location:** `pages/api/attachments/index.js`

**Validation Steps:**
1. Check if `boardId` is present in request body
2. Validate `boardId` is a string
3. Validate `boardId` is not empty (after trimming)
4. Normalize `boardId` by trimming whitespace
5. Final validation before insert (ensure `board_id` is in attachment data)

**Error Responses:**
```json
{
  "error": "boardId is required",
  "details": "Please provide a boardId field in the request body. Every attachment must be linked to a board.",
  "statusCode": 400
}
```

**Logging:**
- Logs validation failures with details
- Logs normalized `board_id` before insert
- Logs foreign key violations with board ID

### 3. React Hook (`useCreateAttachment`)

**Location:** `src/hooks/attachments/useCreateAttachment.ts`

**Validation Steps:**
1. Check if `boardId` is provided in options
2. Validate `boardId` is a string (not null, undefined, or other type)
3. Validate `boardId` is not empty (after trimming)
4. Normalize `boardId` by trimming whitespace
5. Final validation before API call (ensure `board_id` is in attachment data)

**Error Messages:**
- `"boardId is required - every attachment must be linked to a board"`
- `"boardId must be a string, but received ${typeof boardId}"`
- `"boardId cannot be empty - please provide a valid board ID"`

**Logging:**
- Logs validation failures with details
- Logs normalized `board_id` after validation
- Logs `board_id` in storage path and metadata

### 4. Components (Board Page)

**Location:** `app/board/[id]/page.tsx`

**Validation:**
- Checks if `boardId` exists in page params before upload
- Shows user-friendly error message if `boardId` is missing
- Continues processing other files if one fails

**Error Handling:**
```typescript
if (!boardId) {
  const errorMsg = 'Cannot upload attachment: board ID is missing from current board context';
  console.error('[handleFileDrop] ❌ Missing boardId:', errorMsg);
  alert(errorMsg);
  continue; // Skip this file and continue with others
}
```

## Error Handling Flow

### Scenario 1: Missing boardId in Component

**Flow:**
1. Component checks if `boardId` exists
2. If missing, shows error message and skips file
3. Logs error with context

**User Experience:**
- Error message: `"Cannot upload {filename}: board ID is missing from current board context"`
- File upload is skipped
- Other files continue processing

### Scenario 2: Missing boardId in Hook

**Flow:**
1. Hook validates `boardId` in options
2. If missing, throws error and sets error state
3. Component catches error and shows to user

**User Experience:**
- Error message: `"boardId is required - every attachment must be linked to a board"`
- Upload fails early (before storage upload)
- Error displayed in UI

### Scenario 3: Missing boardId in API

**Flow:**
1. API validates `boardId` in request body
2. If missing, returns 400 error response
3. Hook catches error and displays to user

**User Experience:**
- Error message: `"boardId is required"`
- Upload fails (after storage upload, before database insert)
- Automatic cleanup removes uploaded file from storage

### Scenario 4: Invalid boardId (Board Doesn't Exist)

**Flow:**
1. All validations pass
2. Storage upload succeeds
3. Database insert fails with foreign key violation (23503)
4. API returns 500 error with details
5. Hook attempts cleanup (deletes file from storage)

**User Experience:**
- Error message: `"Board or comment not found - The board with ID '{boardId}' does not exist"`
- Upload fails after storage upload
- File is automatically cleaned up from storage

### Scenario 5: Not Null Constraint Violation

**Flow:**
1. All validations pass
2. Storage upload succeeds
3. Database insert fails with not null violation (23502)
4. API returns 500 error with details
5. Hook attempts cleanup

**User Experience:**
- Error message: `"Missing required field: board_id"`
- Upload fails after storage upload
- File is automatically cleaned up from storage
- This should not happen if validation is working correctly

## Code Annotations

All code sections are annotated with:

- **Purpose comments** - Why `board_id` is required
- **Validation points** - Where `board_id` is checked
- **Normalization** - How `board_id` is normalized (trimmed)
- **Error handling** - How missing `board_id` is handled
- **Database constraints** - Reference to NOT NULL constraint

**Example:**
```typescript
// ========================================================================
// VALIDATION: board_id is REQUIRED - every attachment must be linked to a board
// ========================================================================
// IMPORTANT: The attachments table has board_id as NOT NULL with a foreign key
// constraint. This ensures every attachment is linked to a board.
// The board_id comes from the current board context/state in the component.
```

## Testing Checklist

- [ ] Upload file from board page → Verify `board_id` is included in database
- [ ] Check browser console for validation logs
- [ ] Check server terminal for API validation logs
- [ ] Test missing `boardId` in component → Should show error and skip file
- [ ] Test missing `boardId` in hook → Should fail early with clear error
- [ ] Test missing `boardId` in API → Should return 400 error
- [ ] Test invalid `boardId` (non-existent board) → Should return foreign key violation
- [ ] Verify automatic cleanup on database insert failure
- [ ] Check attachment metadata includes correct `board_id`
- [ ] Verify foreign key constraint works (deleting board deletes attachments)

## Database Schema Reference

```sql
CREATE TABLE attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Required: Link to board
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  
  -- Optional: Link to comment
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  
  -- File information
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Summary

✅ **Database enforces `board_id` NOT NULL** - Cannot create attachment without board  
✅ **API validates `boardId`** - Returns 400 error if missing  
✅ **Hook validates `boardId`** - Fails early with clear error  
✅ **Components check `boardId`** - Shows user-friendly error if missing  
✅ **Error handling at all levels** - Clear error messages and automatic cleanup  
✅ **Comprehensive logging** - Easy debugging of validation failures  

Every attachment is guaranteed to have a `board_id` linked to an existing board!




