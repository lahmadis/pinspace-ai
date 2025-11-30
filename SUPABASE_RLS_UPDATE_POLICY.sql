-- ============================================================================
-- RLS Policy: Allow Public Update for Boards Table
-- ============================================================================
-- 
-- This policy allows all users (including anonymous/unauthenticated users)
-- to update any board in the boards table.
--
-- WARNING: This is permissive and allows anyone to update any board.
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

-- Drop existing update policy if it exists (optional - only if you want to replace it)
-- DROP POLICY IF EXISTS "Users can update their own boards" ON boards;
-- DROP POLICY IF EXISTS "Anyone can update boards" ON boards;

-- Create new policy: Allow anyone (public) to update boards
-- This allows both authenticated and anonymous users to update any board
CREATE POLICY "Anyone can update boards"
  ON boards 
  FOR UPDATE
  USING (true)  -- true means allow all update operations, regardless of user
  WITH CHECK (true);  -- Also allow the updated values (RLS requires both USING and WITH CHECK for UPDATE)

-- ============================================================================
-- Alternative: If you want to restrict to authenticated users only (more secure)
-- ============================================================================
-- Uncomment and use this instead if you want to require authentication:
--
-- CREATE POLICY "Authenticated users can update boards"
--   ON boards 
--   FOR UPDATE
--   USING (auth.uid() IS NOT NULL)  -- Only allow if user is authenticated
--   WITH CHECK (auth.uid() IS NOT NULL);
--
-- ============================================================================
-- Alternative: If you want owners only (most secure)
-- ============================================================================
-- Uncomment and use this instead if you want only board owners to update:
--
-- CREATE POLICY "Owners can update their boards"
--   ON boards 
--   FOR UPDATE
--   USING (auth.uid()::text = owner_id OR owner_id IS NULL)
--   WITH CHECK (auth.uid()::text = owner_id OR owner_id IS NULL);
--
-- ============================================================================






