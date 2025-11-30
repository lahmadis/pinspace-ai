# Supabase Schema Recommendations for Crit Sessions

## Current Schema Analysis

Based on the current `SUPABASE_CRIT_SESSIONS_SCHEMA.sql`, here are recommendations for ensuring all fields are properly configured:

### Current Schema:
```sql
CREATE TABLE IF NOT EXISTS crit_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  title TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'archived')),
  created_by TEXT, -- ⚠️ Currently TEXT, but we're storing UUIDs
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  allow_anonymous BOOLEAN DEFAULT TRUE,
  max_participants INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Recommended Schema Changes

### Option 1: Change `created_by` to UUID (Recommended)

If you want `created_by` to be a proper UUID type (for referential integrity with a users table):

```sql
-- Alter the column type from TEXT to UUID
ALTER TABLE crit_sessions 
  ALTER COLUMN created_by TYPE UUID USING created_by::UUID;

-- If you have a users table, add foreign key constraint:
-- ALTER TABLE crit_sessions 
--   ADD CONSTRAINT fk_crit_sessions_created_by 
--   FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
```

**Benefits:**
- Type safety (PostgreSQL enforces UUID format)
- Can add foreign key constraint to users table
- Better for referential integrity

**Considerations:**
- Existing data must be valid UUIDs or NULL
- If you don't have a users table yet, you can still use UUID type without FK

### Option 2: Keep `created_by` as TEXT but add CHECK constraint

If you want to keep it as TEXT but ensure it's always a valid UUID format:

```sql
-- Add CHECK constraint to ensure created_by is always a valid UUID format (or NULL)
ALTER TABLE crit_sessions 
  ADD CONSTRAINT check_created_by_uuid_format 
  CHECK (created_by IS NULL OR created_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
```

**Benefits:**
- Keeps TEXT type (flexible)
- Enforces UUID format at database level
- Can store UUIDs as text

**Considerations:**
- No foreign key constraint possible
- Less type safety than UUID type

## Recommended: Option 1 (UUID Type)

I recommend changing `created_by` to UUID type because:
1. The code now always generates/validates UUIDs for this field
2. Better type safety and performance
3. Future-proof for when you add a users table
4. Consistent with `id` and `board_id` fields

## Additional Schema Recommendations

### 1. Add NOT NULL constraint to `created_by` (if using UUID)

If you always want `created_by` to have a value:

```sql
ALTER TABLE crit_sessions 
  ALTER COLUMN created_by SET NOT NULL;
```

**Note:** Only do this if you're always generating UUIDs (which the code now does).

### 2. Verify `boards` table exists and has UUID `id` column

Ensure the foreign key reference is valid:

```sql
-- Check if boards table exists and has UUID id
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'boards' AND column_name = 'id';

-- Should return: id | uuid
```

If `boards.id` is not UUID, you'll need to fix that first.

### 3. Add index on `created_by` (if frequently queried)

If you'll query sessions by creator:

```sql
CREATE INDEX IF NOT EXISTS idx_crit_sessions_created_by 
ON crit_sessions(created_by);
```

### 4. Verify Realtime is enabled

Check that Realtime replication is enabled:

```sql
-- Check if crit_sessions is in the replication publication
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'crit_sessions';
```

If not enabled, enable it in Supabase Dashboard:
1. Go to Database → Replication
2. Find "crit_sessions" table
3. Toggle on the replication switch

## Migration Script

Here's a complete migration script to update the schema:

```sql
-- ============================================================================
-- Migration: Update crit_sessions schema for UUID created_by
-- ============================================================================

-- Step 1: Check current data (optional - for validation)
-- SELECT id, created_by, 
--   CASE 
--     WHEN created_by IS NULL THEN 'NULL'
--     WHEN created_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
--       THEN 'Valid UUID'
--     ELSE 'Invalid UUID'
--   END as uuid_status
-- FROM crit_sessions;

-- Step 2: Update NULL values to generated UUIDs (if needed)
-- UPDATE crit_sessions 
-- SET created_by = gen_random_uuid()::TEXT 
-- WHERE created_by IS NULL;

-- Step 3: Convert TEXT to UUID
-- This will fail if any values are not valid UUIDs
ALTER TABLE crit_sessions 
  ALTER COLUMN created_by TYPE UUID USING created_by::UUID;

-- Step 4: Add NOT NULL constraint (optional - only if you always want a value)
-- ALTER TABLE crit_sessions 
--   ALTER COLUMN created_by SET NOT NULL;

-- Step 5: Add index for performance (optional)
CREATE INDEX IF NOT EXISTS idx_crit_sessions_created_by 
ON crit_sessions(created_by);

-- Step 6: Verify the change
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'crit_sessions' AND column_name = 'created_by';
-- Should show: created_by | uuid | YES (or NO if NOT NULL was added)
```

## Testing Checklist

After schema changes:

- [ ] Verify `created_by` column type is UUID
- [ ] Test creating a session with `created_by` provided
- [ ] Test creating a session without `created_by` (should generate UUID)
- [ ] Verify all existing sessions have valid UUIDs in `created_by`
- [ ] Test foreign key constraint (if added)
- [ ] Verify Realtime replication is working
- [ ] Check RLS policies still work correctly






