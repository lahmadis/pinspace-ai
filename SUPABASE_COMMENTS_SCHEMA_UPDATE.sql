-- ========================================================================
-- REFACTORED: Add TEXT column for non-UUID element IDs
-- ========================================================================
-- 
-- This migration adds support for comments attached to elements with
-- non-UUID IDs (e.g., "pdf_page_1764169996932_0").
-- 
-- Schema changes:
-- 1. Add `element_id_text` TEXT column for non-UUID element IDs
-- 2. Keep `element_id` UUID column for UUID element IDs
-- 3. Update queries to check both columns when filtering by element ID
-- 
-- Usage:
-- - UUID element IDs → stored in `element_id` (UUID column)
-- - Non-UUID element IDs → stored in `element_id_text` (TEXT column)
-- - Queries check both columns when filtering by element ID
-- ========================================================================

-- Add TEXT column for non-UUID element IDs
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS element_id_text TEXT;

-- Add index for faster queries on text element IDs
CREATE INDEX IF NOT EXISTS idx_comments_element_id_text 
ON comments(element_id_text) 
WHERE element_id_text IS NOT NULL;

-- Add comment explaining the dual-column approach
COMMENT ON COLUMN comments.element_id IS 
  'UUID element ID (for canvas elements with UUID identifiers). Use element_id_text for non-UUID IDs.';

COMMENT ON COLUMN comments.element_id_text IS 
  'Text element ID (for elements with non-UUID identifiers like "pdf_page_1764169996932_0"). Use element_id for UUID IDs.';

-- ========================================================================
-- Migration complete
-- ========================================================================
-- After running this migration:
-- 1. Update API routes to write to the appropriate column based on ID type
-- 2. Update queries to check both columns when filtering by element ID
-- 3. Update frontend validation to allow both UUID and non-UUID IDs
-- ========================================================================
