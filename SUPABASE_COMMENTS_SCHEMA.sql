-- ============================================================================
-- Supabase Comments Table Schema
-- ============================================================================
-- 
-- This SQL creates the comments table in Supabase for storing board comments.
-- Comments support:
--   - Board-level comments (attached to a board)
--   - Element-level comments (attached to a specific canvas element)
--   - Free-floating comments (positioned at x, y coordinates)
--   - Categories for organizing comments
--   - Tasks (mark comments as tasks)
--   - Source tracking (e.g., "liveCrit" for live critique sessions)
--
-- Step-by-step instructions for Supabase Dashboard:
-- 1. Open your Supabase project dashboard
-- 2. Go to "SQL Editor" in the left sidebar
-- 3. Click "New Query"
-- 4. Paste this entire file
-- 5. Click "Run" or press Ctrl+Enter (Cmd+Enter on Mac)
-- ============================================================================

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  
  -- Comment content
  text TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_id TEXT, -- Optional: link to authenticated user ID
  
  -- Comment positioning and targeting
  target_element_id TEXT, -- If attached to a specific canvas element (e.g., "e_123")
  x NUMERIC, -- If it's a free-floating comment on the canvas
  y NUMERIC, -- If it's a free-floating comment on the canvas
  
  -- Comment metadata
  category TEXT DEFAULT 'general' CHECK (category IN ('concept', 'plan', 'section', 'material', 'circulation', 'structure', 'general')),
  is_task BOOLEAN DEFAULT FALSE, -- Mark comment as a task
  source TEXT, -- Source of comment (e.g., "liveCrit", "regular", etc.)
  
  -- Legacy fields for backward compatibility
  element_id TEXT, -- Deprecated: use target_element_id instead
  pin_id TEXT, -- Deprecated: legacy field for compatibility
  type TEXT CHECK (type IN ('comment', 'crit')), -- Deprecated: legacy field
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_comments_board_id ON comments(board_id);
CREATE INDEX IF NOT EXISTS idx_comments_target_element_id ON comments(target_element_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id) WHERE author_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for comments

-- Policy: Anyone can read comments (for public boards)
CREATE POLICY "Anyone can read comments"
  ON comments FOR SELECT
  USING (true);

-- Policy: Anyone can create comments (for now - allow public commenting)
CREATE POLICY "Anyone can create comments"
  ON comments FOR INSERT
  WITH CHECK (true);

-- Policy: Anyone can update comments (for now - allow public editing)
CREATE POLICY "Anyone can update comments"
  ON comments FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Anyone can delete comments (for now - allow public deletion)
CREATE POLICY "Anyone can delete comments"
  ON comments FOR DELETE
  USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comments_updated_at();

-- ============================================================================
-- Production RLS Policies (More Secure)
-- ============================================================================
-- 
-- For production, consider more restrictive policies:
--
-- Authenticated users only:
--   DROP POLICY "Anyone can read comments" ON comments;
--   CREATE POLICY "Authenticated users can read comments"
--     ON comments FOR SELECT
--     USING (auth.uid() IS NOT NULL);
--
-- Owners and collaborators only:
--   CREATE POLICY "Board members can manage comments"
--     ON comments FOR ALL
--     USING (
--       EXISTS (
--         SELECT 1 FROM boards
--         WHERE boards.id = comments.board_id
--         AND (boards.owner_id = auth.uid()::text OR auth.uid() IS NOT NULL)
--       )
--     );
-- ============================================================================




