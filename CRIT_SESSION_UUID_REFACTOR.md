# Crit Session UUID Refactor

## Overview
Refactored PinSpace crit session management to use UUIDs for all session IDs. All session IDs are now generated using `crypto.randomUUID()` instead of custom short strings. This ensures consistency, prevents collisions, and improves compatibility with Supabase UUID columns.

## Changes Made

### 1. Session ID Generation

**File:** `src/lib/realtime.ts`

**Before:**
```javascript
export function makeSessionId(boardId: string): string {
  const base = String(boardId).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
  const rand = Math.random().toString(36).slice(2, 8);
  return sanitizeSessionId(`${base}-${rand}`);
}
// Generated: "abc123-xyz789"
```

**After:**
```javascript
export function makeSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
// Generates: "550e8400-e29b-41d4-a716-446655440000"
```

**Key Changes:**
- Removed `boardId` parameter (UUIDs are globally unique)
- Removed `sanitizeSessionId` function (no longer needed)
- Uses `crypto.randomUUID()` for standard UUID v4 generation
- Added fallback for older environments (should not be needed)

**Added:**
- `isValidUUID(id: string)` helper function to validate UUID format

### 2. Database Schema Update

**File:** `SUPABASE_CRIT_SESSIONS_SCHEMA.sql`

**Before:**
```sql
session_id TEXT NOT NULL UNIQUE, -- Short, shareable session ID (e.g., "abc123-xyz789")
```

**After:**
```sql
session_id UUID NOT NULL UNIQUE, -- UUID session ID (generated with crypto.randomUUID())
```

**Migration Required:**
If you have existing sessions with TEXT session_ids, you'll need to migrate them:

```sql
-- Migration script (run in Supabase SQL Editor)
-- Step 1: Add new UUID column
ALTER TABLE crit_sessions ADD COLUMN session_id_new UUID;

-- Step 2: Generate UUIDs for existing sessions (if any)
UPDATE crit_sessions SET session_id_new = gen_random_uuid() WHERE session_id_new IS NULL;

-- Step 3: Drop old column and rename new one
ALTER TABLE crit_sessions DROP COLUMN session_id;
ALTER TABLE crit_sessions RENAME COLUMN session_id_new TO session_id;
ALTER TABLE crit_sessions ALTER COLUMN session_id SET NOT NULL;
ALTER TABLE crit_sessions ADD CONSTRAINT crit_sessions_session_id_key UNIQUE (session_id);
```

### 3. API Route Updates

**File:** `pages/api/crit-sessions/index.js`

**Changes:**
- Added UUID validation for `sessionId` in POST requests
- Validates `sessionId` is a valid UUID format before inserting
- Returns clear error if `sessionId` is not a valid UUID

**Before:**
```javascript
session_id: sessionId.trim(), // Short shareable ID (TEXT, not UUID)
```

**After:**
```javascript
session_id: normalizedSessionId, // UUID session ID (validated above, must be valid UUID)
```

**File:** `pages/api/crit-sessions/[id].js`

**Changes:**
- Added UUID validation for `sessionIdentifier` in all methods (GET, PATCH, DELETE)
- Returns clear error if session ID is not a valid UUID
- Updated comments to reflect UUID usage

### 4. Frontend Routing

**File:** `app/board/[id]/page.tsx`

**Changes:**
- Updated `makeSessionId()` calls to remove `boardId` parameter
- All session IDs are now UUIDs generated with `crypto.randomUUID()`

**Before:**
```javascript
const sid = makeSessionId(boardId);
```

**After:**
```javascript
const sid = makeSessionId(); // Generates UUID
```

**File:** `app/live/[sessionId]/page.tsx`

**Changes:**
- Removed `extractBoardIdFromSessionId` logic (cannot extract boardId from UUID)
- Removed `hostBoardId` derivation from sessionId (UUIDs don't contain board info)
- Added UUID validation before fetching session from API
- Board ID is now fetched from Supabase session data

**Before:**
```javascript
// Tried to extract boardId from custom session ID string
const extracted = extractBoardIdFromSessionId(sessionId);
```

**After:**
```javascript
// Board ID is fetched from Supabase when session is validated
// Cannot extract boardId from UUID
```

### 5. Session Validation Logic

**File:** `app/live/[sessionId]/page.tsx`

**Changes:**
- Added UUID validation as Step 1 before fetching session
- Updated step numbers in logging (Step 1 → UUID validation, Step 2 → Fetch, etc.)
- Clear error messages if sessionId is not a valid UUID

**Logging Updates:**
- Step 1: Validate sessionId is UUID
- Step 2: Fetch session from Supabase
- Step 3: Check if session is active
- Step 4: Reactivate if inactive
- Step 5: Create new session if not found

### 6. Removed Functions

**Removed:**
- `sanitizeSessionId()` - No longer needed (UUIDs are already safe)
- Custom session ID extraction logic - Cannot extract boardId from UUIDs

## Migration Steps

### 1. Update Database Schema

Run the migration script in Supabase SQL Editor (see section 2 above).

### 2. Deploy Code Changes

All code changes are backward compatible in terms of API structure, but:
- New sessions will use UUIDs
- Old sessions with TEXT IDs will need to be migrated or recreated

### 3. Test Session Creation

1. Start a new crit session → Should generate UUID
2. Join a crit session with UUID → Should work
3. Verify session is created in Supabase with UUID `session_id`

## Benefits

1. **Consistency:** All session IDs are now standard UUIDs
2. **Uniqueness:** UUIDs are globally unique, preventing collisions
3. **Compatibility:** Better compatibility with Supabase UUID columns
4. **Security:** UUIDs are harder to guess than short custom strings
5. **Standards:** Uses standard UUID v4 format (RFC 4122)

## Testing Checklist

- [ ] Create new crit session → Generates UUID
- [ ] Join crit session with UUID → Works correctly
- [ ] Verify session in Supabase → `session_id` is UUID
- [ ] API validation → Rejects non-UUID session IDs
- [ ] Frontend routing → Works with UUID session IDs
- [ ] Session lookup → Finds session by UUID
- [ ] Session creation → Inserts UUID into Supabase successfully

## Files Changed

1. **`src/lib/realtime.ts`**
   - Refactored `makeSessionId()` to generate UUIDs
   - Removed `sanitizeSessionId()` function
   - Added `isValidUUID()` helper function
   - Updated `findOrCreateCritSession()` to validate UUIDs

2. **`SUPABASE_CRIT_SESSIONS_SCHEMA.sql`**
   - Changed `session_id` from TEXT to UUID

3. **`pages/api/crit-sessions/index.js`**
   - Added UUID validation for `sessionId`
   - Updated comments to reflect UUID usage

4. **`pages/api/crit-sessions/[id].js`**
   - Added UUID validation for all methods
   - Updated comments to reflect UUID usage

5. **`app/board/[id]/page.tsx`**
   - Updated `makeSessionId()` calls to remove `boardId` parameter

6. **`app/live/[sessionId]/page.tsx`**
   - Removed boardId extraction from sessionId
   - Added UUID validation before API calls
   - Updated session validation logic

## Breaking Changes

⚠️ **Important:** This is a breaking change for existing sessions:

1. **Existing Sessions:** Sessions created before this refactor will have TEXT `session_id` values. These need to be migrated or recreated.

2. **URLs:** Old session URLs with custom IDs (e.g., `/live/abc123-xyz789`) will no longer work. New URLs use UUIDs (e.g., `/live/550e8400-e29b-41d4-a716-446655440000`).

3. **API:** The API now expects and validates UUIDs for `sessionId`. Non-UUID values will be rejected with a 400 error.

## Backward Compatibility

- **New Sessions:** All new sessions use UUIDs ✅
- **Old Sessions:** Need migration or recreation ⚠️
- **API:** Validates UUIDs, rejects non-UUIDs ⚠️

## Next Steps

1. Run database migration script in Supabase
2. Test session creation with UUIDs
3. Verify all session operations work correctly
4. Update any documentation or external integrations that reference session IDs
