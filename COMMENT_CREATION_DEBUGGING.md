# Comment Creation Debugging Guide

## Overview

This guide helps debug comment creation errors by tracking the full request/response lifecycle between frontend and Supabase.

## Request/Response Lifecycle

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │         │  Next.js API │         │   Supabase  │
│   (React)   │         │    Route     │         │   Database  │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │                        │
      │ 1. POST /api/comments  │                        │
      │───────────────────────>│                        │
      │    { boardId, text,    │                        │
      │      authorName, ...}  │                        │
      │                        │                        │
      │                        │ 2. Validate fields     │
      │                        │    Check types         │
      │                        │                        │
      │                        │ 3. Prepare SQL data    │
      │                        │    Map to DB format    │
      │                        │                        │
      │                        │ 4. INSERT INTO         │
      │                        │    comments            │
      │                        │───────────────────────>│
      │                        │                        │
      │                        │ 5. RLS Policy Check    │
      │                        │    Foreign Key Check   │
      │                        │                        │
      │                        │ 6. Response/Error      │
      │                        │<───────────────────────│
      │                        │                        │
      │ 7. { data, error }     │                        │
      │<───────────────────────│                        │
      │                        │                        │
      │ 8. Transform & Update  │                        │
      │    UI State            │                        │
      │                        │                        │
```

## Logging Points

### 1. Frontend Hook (`useCreateComment.ts`)

**Location**: Browser Console

**Logs**:
- `[useCreateComment] 🚀 Starting comment creation` - Request payload and field types
- `🌐 Sending POST request to /api/comments` - Before API call
- `⏱️ Request completed in Xms` - Response timing
- `📥 Response Status: XXX` - HTTP status code
- `✅ API Success Response` - Full API response
- `❌ [useCreateComment] Comment creation failed` - Full error details

**How to view**: Open browser DevTools → Console tab

### 2. API Route (`pages/api/comments/index.js`)

**Location**: Terminal/Server logs (where `npm run dev` is running)

**Logs**:
- `[POST /api/comments] 🔵 Received comment creation request` - Incoming request
- `📥 Raw Request Body` - Request payload received
- `✅ Validation passed` - After validation
- `📤 Prepared Supabase Data` - Data being sent to Supabase
- `📡 Sending insert request to Supabase...` - Before Supabase call
- `⏱️ Supabase request completed in Xms` - Supabase response timing
- `✅ Supabase Insert Successful` - Successful insert
- `❌ [POST /api/comments] Supabase error creating comment` - Full Supabase error

**How to view**: Check terminal where Next.js dev server is running

### 3. Supabase Error Codes

Common Supabase/PostgreSQL error codes:

| Code | Meaning | Fix |
|------|---------|-----|
| `23503` | Foreign key constraint violation | Board ID doesn't exist in `boards` table |
| `23505` | Unique constraint violation | Duplicate comment detected |
| `23502` | Not null constraint violation | Missing required field |
| `42501` | Insufficient privilege | RLS policy blocking insert |
| `PGRST116` | No rows returned | Unexpected - may indicate RLS issue |

## Common Issues & Fixes

### Issue 1: "Board not found" (Error Code 23503)

**Symptoms**:
- Error: `Foreign key constraint violation`
- Details: `The board with ID "xxx" does not exist`

**Debugging**:
1. Check logs: `[POST /api/comments] 📥 Raw Request Body` for `boardId`
2. Verify board exists: Run SQL in Supabase:
   ```sql
   SELECT id FROM boards WHERE id = 'your-board-id';
   ```
3. Check if `boardId` is correct UUID format

**Fix**:
- Ensure board is created before creating comments
- Verify `boardId` matches actual board UUID in database
- Check if board was deleted (CASCADE should delete comments)

### Issue 2: "Permission denied" (Error Code 42501)

**Symptoms**:
- Error: `Permission denied` or `Insufficient privilege`
- Details: `You do not have permission to create comments`

**Debugging**:
1. Check logs for RLS policy violation
2. Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'comments';`
3. Check policies exist: `SELECT * FROM pg_policies WHERE tablename = 'comments';`

**Fix**:
- Run RLS policy SQL from `SUPABASE_COMMENTS_SCHEMA.sql`:
  ```sql
  CREATE POLICY "Anyone can create comments"
    ON comments FOR INSERT
    WITH CHECK (true);
  ```

### Issue 3: "Missing required field" (Error Code 23502)

**Symptoms**:
- Error: `Not null constraint violation`
- Details: `A required field is missing: ...`

**Debugging**:
1. Check logs: `📥 Raw Request Body` - verify all required fields present
2. Check logs: `📤 Prepared Supabase Data` - verify mapping is correct
3. Required fields: `board_id`, `text`, `author_name`

**Fix**:
- Ensure frontend sends `boardId`, `text`, and `authorName` (or `author`)
- Check field mapping: `boardId` → `board_id`, `authorName` → `author_name`

### Issue 4: Type Mismatch

**Symptoms**:
- API validation errors about wrong types
- Logs show: `boardId must be a string. Received: undefined`

**Debugging**:
1. Check logs: `📋 Field Types` in frontend hook
2. Check logs: `📥 Raw Request Body` in API route
3. Verify TypeScript types match actual data

**Fix**:
- Ensure `boardId` is a string (not number or object)
- Ensure `text` is a string (not number or object)
- Ensure `task`/`isTask` is boolean (not string "true"/"false")

### Issue 5: Empty Response (No rows returned)

**Symptoms**:
- No error, but `insertedComment` is null
- Logs show: `No comment returned after insert`

**Debugging**:
1. Check if RLS policy allows INSERT but not SELECT
2. Verify `.select().single()` is being called
3. Check Supabase logs in dashboard

**Fix**:
- Ensure RLS policy allows both INSERT and SELECT:
  ```sql
  CREATE POLICY "Anyone can create comments"
    ON comments FOR INSERT
    WITH CHECK (true);
  
  CREATE POLICY "Anyone can read comments"
    ON comments FOR SELECT
    USING (true);
  ```

## Step-by-Step Debugging

### Step 1: Check Browser Console

1. Open DevTools (F12)
2. Go to Console tab
3. Create a comment
4. Look for `[useCreateComment]` logs
5. Note the request payload and any errors

### Step 2: Check Server Logs

1. Look at terminal where `npm run dev` is running
2. Look for `[POST /api/comments]` logs
3. Note the request body received
4. Note validation results
5. Note Supabase data being sent

### Step 3: Check Supabase Error

1. Look for `❌ [POST /api/comments] Supabase error` logs
2. Note the error code (e.g., `23503`, `42501`)
3. Note the error message and details
4. Match to common issues above

### Step 4: Verify Database State

1. Open Supabase Dashboard
2. Go to Table Editor → `comments` table
3. Check table structure matches schema
4. Verify RLS policies exist
5. Try manual INSERT in SQL Editor:
   ```sql
   INSERT INTO comments (board_id, text, author_name)
   VALUES ('your-board-id', 'Test comment', 'Test User')
   RETURNING *;
   ```

## Example Debug Session

### Successful Flow

```
[useCreateComment] 🚀 Starting comment creation
📤 Request Payload: { "boardId": "abc-123", "text": "Test", ... }
🌐 Sending POST request to /api/comments
⏱️ Request completed in 234ms
📥 Response Status: 201 Created
✅ API Success Response: { "data": { "id": "...", ... }, "error": null }
✅ Successfully created comment: abc-comment-id
```

### Error Flow (RLS Issue)

```
[useCreateComment] 🚀 Starting comment creation
📤 Request Payload: { "boardId": "abc-123", "text": "Test", ... }
🌐 Sending POST request to /api/comments
⏱️ Request completed in 123ms
📥 Response Status: 500 Internal Server Error
❌ [useCreateComment] Comment creation failed
❌ Error: Permission denied - You do not have permission to create comments...

[Server Logs]
[POST /api/comments] 🔵 Received comment creation request
📥 Raw Request Body: { "boardId": "abc-123", ... }
✅ Validation passed
📤 Prepared Supabase Data: { "board_id": "abc-123", ... }
📡 Sending insert request to Supabase...
⏱️ Supabase request completed in 89ms
❌ [POST /api/comments] Supabase error creating comment
❌ Supabase Error Code: 42501
❌ DIAGNOSIS: RLS policy violation - INSERT policy is blocking the operation
❌ FIX: Run the RLS policy SQL...
```

## Quick Fix Checklist

- [ ] Verify `comments` table exists in Supabase
- [ ] Verify RLS policies are created (run SQL from `SUPABASE_COMMENTS_SCHEMA.sql`)
- [ ] Verify `boardId` exists in `boards` table
- [ ] Check browser console for frontend errors
- [ ] Check server terminal for API errors
- [ ] Verify all required fields are being sent
- [ ] Verify field types match (string, number, boolean)
- [ ] Test manual INSERT in Supabase SQL Editor

## Testing Manual Insert

Test if Supabase insert works directly:

```sql
-- Replace with actual values
INSERT INTO comments (
  board_id,
  text,
  author_name,
  category
)
VALUES (
  'your-board-uuid',
  'Test comment',
  'Test User',
  'general'
)
RETURNING *;
```

If this works but API doesn't, check:
- RLS policies (may be different for SQL Editor vs API)
- Field mappings in API route
- Request format from frontend

## Still Having Issues?

1. Copy the full console output (both browser and server)
2. Copy the exact error message from logs
3. Check Supabase Dashboard → Logs → API Logs for detailed errors
4. Verify environment variables are set correctly
5. Try creating a board first, then a comment for that board







