-- ============================================================================
-- Supabase Attachments Table Schema
-- ============================================================================
-- 
-- This SQL creates the attachments table in Supabase for storing file attachments.
-- Attachments can be linked to:
--   - Boards (board_id is required)
--   - Comments (comment_id is optional - for comment-specific attachments)
-- 
-- Step-by-step instructions for Supabase Dashboard:
-- 1. Open your Supabase project dashboard
-- 2. Go to "SQL Editor" in the left sidebar
-- 3. Click "New Query"
-- 4. Paste this entire file
-- 5. Click "Run" or press Ctrl+Enter (Cmd+Enter on Mac)
-- ============================================================================

-- Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Required: Link to board
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  
  -- Optional: Link to comment (for comment-specific attachments)
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  
  -- File information
  file_name TEXT NOT NULL, -- Original filename
  file_url TEXT NOT NULL, -- URL to the file (Supabase Storage, S3, etc.)
  file_type TEXT, -- e.g., 'image', 'document', 'pdf', 'video', 'audio'
  file_size BIGINT, -- File size in bytes
  mime_type TEXT, -- e.g., 'image/png', 'application/pdf', 'video/mp4'
  
  -- Metadata
  uploaded_by TEXT, -- User ID or username who uploaded the file
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_attachments_board_id ON attachments(board_id);
CREATE INDEX IF NOT EXISTS idx_attachments_comment_id ON attachments(comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON attachments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for attachments

-- Policy: Anyone can read attachments (for public boards)
CREATE POLICY "Anyone can read attachments"
  ON attachments FOR SELECT
  USING (true);

-- Policy: Anyone can create attachments (for now - allow public uploads)
CREATE POLICY "Anyone can create attachments"
  ON attachments FOR INSERT
  WITH CHECK (true);

-- Policy: Anyone can update attachments (for now - allow public editing)
CREATE POLICY "Anyone can update attachments"
  ON attachments FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Anyone can delete attachments (for now - allow public deletion)
CREATE POLICY "Anyone can delete attachments"
  ON attachments FOR DELETE
  USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_attachments_updated_at
  BEFORE UPDATE ON attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_attachments_updated_at();

-- ============================================================================
-- Production RLS Policies (More Secure)
-- ============================================================================
-- 
-- For production, consider more restrictive policies:
--
-- Authenticated users only:
--   DROP POLICY "Anyone can read attachments" ON attachments;
--   CREATE POLICY "Authenticated users can read attachments"
--     ON attachments FOR SELECT
--     USING (auth.uid() IS NOT NULL);
--
-- Board members only:
--   CREATE POLICY "Board members can manage attachments"
--     ON attachments FOR ALL
--     USING (
--       EXISTS (
--         SELECT 1 FROM boards
--         WHERE boards.id = attachments.board_id
--         AND (boards.owner_id = auth.uid()::text OR auth.uid() IS NOT NULL)
--       )
--     );
-- ============================================================================





