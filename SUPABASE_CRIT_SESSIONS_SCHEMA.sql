-- ============================================================================
-- Supabase Crit Sessions Table Schema
-- ============================================================================
-- 
-- This SQL creates the crit_sessions table in Supabase for managing Live Crit sessions.
-- Crit sessions track active critique sessions for boards, allowing real-time
-- synchronization of comments and feedback via Supabase Realtime.
--
-- Step-by-step instructions for Supabase Dashboard:
-- 1. Open your Supabase project dashboard
-- 2. Go to "SQL Editor" in the left sidebar
-- 3. Click "New Query"
-- 4. Paste this entire file
-- 5. Click "Run" or press Ctrl+Enter (Cmd+Enter on Mac)
-- ============================================================================

-- Create crit_sessions table
CREATE TABLE IF NOT EXISTS crit_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  
  -- Session metadata
  session_id UUID NOT NULL UNIQUE, -- UUID session ID (generated with crypto.randomUUID())
  title TEXT, -- Optional session title/description
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'archived')),
  
  -- Session ownership and participants
  created_by TEXT, -- User ID or name who created the session
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE, -- When session was ended
  
  -- Session settings
  allow_anonymous BOOLEAN DEFAULT TRUE, -- Allow anonymous guest critics
  max_participants INTEGER, -- Optional limit on number of participants
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_crit_sessions_board_id ON crit_sessions(board_id);
CREATE INDEX IF NOT EXISTS idx_crit_sessions_session_id ON crit_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_crit_sessions_status ON crit_sessions(status);
CREATE INDEX IF NOT EXISTS idx_crit_sessions_started_at ON crit_sessions(started_at DESC);

-- Enable Row Level Security
ALTER TABLE crit_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for crit_sessions

-- Policy: Anyone can read active crit sessions (for joining sessions)
CREATE POLICY "Anyone can read active crit sessions"
  ON crit_sessions FOR SELECT
  USING (status = 'active' OR true); -- Allow reading all sessions for now

-- Policy: Anyone can create crit sessions (for now - allow public session creation)
CREATE POLICY "Anyone can create crit sessions"
  ON crit_sessions FOR INSERT
  WITH CHECK (true);

-- Policy: Session creator or board owner can update sessions
CREATE POLICY "Anyone can update crit sessions"
  ON crit_sessions FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Session creator or board owner can delete sessions
CREATE POLICY "Anyone can delete crit sessions"
  ON crit_sessions FOR DELETE
  USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_crit_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_crit_sessions_updated_at
  BEFORE UPDATE ON crit_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_crit_sessions_updated_at();

-- ============================================================================
-- Enable Realtime for crit_sessions table
-- ============================================================================
-- 
-- This enables Supabase Realtime subscriptions for the crit_sessions table.
-- Users can subscribe to changes (INSERT, UPDATE, DELETE) on this table.
--
-- Note: Realtime must be enabled in Supabase Dashboard:
-- 1. Go to Database → Replication
-- 2. Find "crit_sessions" table
-- 3. Toggle on the replication switch
-- ============================================================================

-- Enable Realtime replication for crit_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE crit_sessions;

-- ============================================================================
-- Enable Realtime for comments table (for live crit comments)
-- ============================================================================
-- 
-- This enables Supabase Realtime subscriptions for the comments table.
-- When comments are created/updated during a crit session, all connected
-- users will receive real-time updates.
--
-- Note: Realtime must be enabled in Supabase Dashboard:
-- 1. Go to Database → Replication
-- 2. Find "comments" table
-- 3. Toggle on the replication switch
-- ============================================================================

-- Enable Realtime replication for comments (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE comments;

-- ============================================================================
-- Production RLS Policies (More Secure)
-- ============================================================================
-- 
-- For production, consider more restrictive policies:
--
-- Authenticated users only:
--   DROP POLICY "Anyone can read active crit sessions" ON crit_sessions;
--   CREATE POLICY "Authenticated users can read active crit sessions"
--     ON crit_sessions FOR SELECT
--     USING (status = 'active' AND auth.uid() IS NOT NULL);
--
-- Board owners only:
--   CREATE POLICY "Board owners can manage crit sessions"
--     ON crit_sessions FOR ALL
--     USING (
--       EXISTS (
--         SELECT 1 FROM boards
--         WHERE boards.id = crit_sessions.board_id
--         AND boards.owner_id = auth.uid()::text
--       )
--     );
-- ============================================================================

