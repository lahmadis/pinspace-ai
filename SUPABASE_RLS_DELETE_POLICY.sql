-- ============================================================================
-- RLS Policy: Allow Public Delete for Boards Table
-- ============================================================================
-- 
-- This policy allows all users (including anonymous/unauthenticated users)
-- to delete any board from the boards table.
--
-- WARNING: This is permissive and allows anyone to delete any board.
-- For production, consider restricting this to:
--   - Board owners only: USING (auth.uid()::text = owner_id)
--   - Or authenticated users only: USING (auth.uid() IS NOT NULL)
--
-- Step-by-step instructions for Supabase Dashboard:
-- 1. Open your Supabase project dashboard
-- 2. Go to "SQL Editor" in the left sidebar
-- 3. Click "New Query"
-- 4. Paste the SQL below
-- 5. Click "Run" or press Ctrl+Enter (Cmd+Enter on Mac)
-- ============================================================================

-- Drop existing delete policy if it exists (optional - only if you want to replace it)
-- DROP POLICY IF EXISTS "Users can delete their own boards" ON boards;
-- DROP POLICY IF EXISTS "Anyone can delete boards" ON boards;

-- Create new policy: Allow anyone (public) to delete boards
-- This allows both authenticated and anonymous users to delete any board
CREATE POLICY "Anyone can delete boards"
  ON boards 
  FOR DELETE
  USING (true);  -- true means allow all delete operations, regardless of user

-- ============================================================================
-- Alternative: If you want to restrict to authenticated users only (more secure)
-- ============================================================================
-- Uncomment and use this instead if you want to require authentication:
--
-- CREATE POLICY "Authenticated users can delete boards"
--   ON boards 
--   FOR DELETE
--   USING (auth.uid() IS NOT NULL);  -- Only allow if user is authenticated
--
-- ============================================================================
-- Alternative: If you want owners only (most secure)
-- ============================================================================
-- Uncomment and use this instead if you want only board owners to delete:
--
-- CREATE POLICY "Owners can delete their boards"
--   ON boards 
--   FOR DELETE
--   USING (auth.uid()::text = owner_id OR owner_id IS NULL);
--
-- ============================================================================






