'use client';

import React, { useCallback, useMemo, useState } from 'react';
import StickyNote, { StickyNoteData } from '@/components/sticky/StickyNote';
// REFACTORED: Replaced PenOverlay (doesn't exist) with PenTool component
import PenTool from '@/components/draw/PenTool';
// (We won't use the PenToolbar component for now to avoid any z-index/import confusion)
// import PenToolbar from '@/components/draw/PenToolbar';
import { DrawTool, PEN_COLORS, PEN_SIZES, PenColor, PenSize } from '@/lib/draw';
import { useComments } from '@/lib/useComments';
import { currentUser } from '@/lib/currentUser';
import CritCommentsPanel from '@/components/CritCommentsPanel';
import { validateAndNormalizeElementId } from '@/lib/uuidValidator';

type BoardState = {
  notes: StickyNoteData[];
  selectedId: string | null;
};

const INITIAL: BoardState = {
  notes: [
    { id: 'n1', x: 24, y: 24, width: 240, height: 180, text: '' },
  ],
  selectedId: null,
};

export default function LiveCritBoard() {
  const [state, setState] = useState<BoardState>(INITIAL);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elementIdError, setElementIdError] = useState<string | null>(null);

  const byId = useMemo(() => {
    const map: Record<string, number> = {};
    state.notes.forEach((n, i) => (map[n.id] = i));
    return map;
  }, [state.notes]);

  // Drawing state
  const [tool, setTool] = useState<DrawTool>('none');
  const [penColor, setPenColor] = useState<PenColor>(PEN_COLORS[0]);
  const [penSize, setPenSize] = useState<PenSize>(PEN_SIZES[1]); // 4px default

  // Derive boardId from the current pathname last segment
  const boardId = useMemo(() => {
    if (typeof window === 'undefined') return 'live';
    const url = new URL(window.location.href);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || 'live';
  }, []);

  // ========================================================================
  // COMMENTS DATA SOURCE - Supabase Database (NOT React State)
  // ========================================================================
  // 
  // ⚠️ IMPORTANT: Comments are NOT stored in React state or local memory.
  // All comments are fetched from and persisted to Supabase database.
  // 
  // This hook:
  // - Fetches comments from Supabase 'comments' table via /api/comments endpoint
  // - Filters by board (boardId) and source="liveCrit" to show only crit session comments
  // - Subscribes to real-time updates via Supabase postgres_changes
  // - Automatically re-fetches when comments are INSERTED/UPDATED/DELETED in Supabase
  // 
  // Real-time subscription:
  // - Listens to postgres_changes events on 'comments' table
  // - Filters by board_id to only receive relevant updates
  // - Automatically updates the comments array when changes occur
  // - No manual state management needed - fully reactive
  // 
  // ❌ NOT from:
  // - React useState (no local comments state)
  // - localStorage (no localStorage.getItem)
  // - Session storage
  // - Any local memory or cache
  // 
  // ✅ FROM:
  // - Supabase 'comments' table (persistent database)
  // - Real-time updates via Supabase subscriptions
  // ========================================================================
  const [comments] = useComments({ 
    boardId, 
    elementId: null, // Fetch all comments for the board, filter by element in UI when selected
    source: 'liveCrit' // Only show live crit session comments (filters at API level)
  });

  // REFACTORED: Fixed scope issue - s is only available inside state updater function
  // Check if selectedId changed by comparing with current state before updating
  // Clear comment text and errors only when selection actually changes
  const setSelected = useCallback((id: string | null) => {
    // Check if selection is actually changing by comparing with current state
    // This avoids the scope issue where s was referenced outside the updater function
    const selectionChanged = id !== state.selectedId;
    
    // Update state
    setState((s) => ({ ...s, selectedId: id }));
    
    // Clear comment text and errors when selection changes
    if (selectionChanged) {
      setCommentText('');
      setElementIdError(null);
    }
  }, [state.selectedId]);

  const handleChangeText = useCallback((id: string, text: string) => {
    setState((s) => {
      const idx = byId[id];
      if (idx == null) return s;
      const nextNotes = s.notes.slice();
      nextNotes[idx] = { ...nextNotes[idx], text };
      return { ...s, notes: nextNotes };
    });
  }, [byId]);

  /**
   * ========================================================================
   * COMMENT SUBMISSION HANDLER - Supabase Integration
   * ========================================================================
   * 
   * ⚠️ IMPORTANT: This handler does NOT save comments to React state or local memory.
   * All comments are persisted directly to Supabase via the /api/comments endpoint.
   * 
   * Flow:
   * 1. Validates element ID is a valid UUID (required by database)
   * 2. POSTs to /api/comments → inserts into Supabase 'comments' table
   * 3. Real-time subscription (useComments hook) automatically detects the new comment
   * 4. UI updates automatically via Supabase postgres_changes subscription
   * 
   * What happens in /api/comments:
   * - Validates all input data
   * - Inserts into Supabase: supabase.from('comments').insert(commentData)
   * - Returns the created comment with ID and timestamp
   * - Triggers real-time notifications to all subscribed clients
   * 
   * Real-time updates:
   * - useComments hook subscribes to postgres_changes on 'comments' table
   * - Filters by board_id to only receive relevant updates
   * - Automatically re-fetches comments when INSERT/UPDATE/DELETE occurs
   * - No manual state updates needed - everything is reactive
   * 
   * ❌ NOT saved to:
   * - React useState (no setComments or comments.push)
   * - localStorage (no localStorage.setItem)
   * - Session storage
   * - Any local memory or cache
   * 
   * ✅ Saved to:
   * - Supabase 'comments' table (persistent database)
   * - Automatically synced to all clients via real-time subscriptions
   * ========================================================================
   */
  const handleSubmitComment = useCallback(async () => {
    if (!commentText.trim() || !state.selectedId) return;

    // Clear previous errors
    setElementIdError(null);

    // ========================================================================
    // Step 1: Validate element ID (supports both UUID and non-UUID IDs)
    // ========================================================================
    // REFACTORED: Now supports both UUID and non-UUID element IDs
    // - UUID IDs → stored in target_element_id (UUID column)
    // - Non-UUID IDs (e.g., "pdf_page_...") → stored in target_element_id_text (TEXT column)
    // ========================================================================
    const validation = validateAndNormalizeElementId(state.selectedId);
    if (!validation.valid) {
      setElementIdError(validation.error || 'Invalid element ID');
      return;
    }

    if (!validation.normalizedId) {
      setElementIdError('Element ID cannot be empty. Please select a valid element.');
      return;
    }

    // REFACTORED: Both UUID and non-UUID IDs are now supported
    // No need to check isUUID - both types are valid

    // ========================================================================
    // Step 2: POST to /api/comments endpoint (saves to Supabase)
    // ========================================================================
    setIsSubmitting(true);
    try {
      // POST request to API endpoint - this inserts into Supabase database
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardId,
          text: commentText.trim(),
          author: currentUser.name || currentUser.username || 'Anonymous',
          authorName: currentUser.name || currentUser.username || 'Anonymous',
          targetElementId: validation.normalizedId, // Normalized UUID (validated above)
          elementId: validation.normalizedId, // Backward compatibility (normalized UUID)
          category: 'general',
          source: 'liveCrit', // Mark as Live Crit comment (filters at API level)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[LiveCritBoard] Failed to post comment to Supabase:', errorData);
        const errorMessage = errorData.error?.message || errorData.error || 'Unknown error';
        setElementIdError(errorMessage);
        return;
      }

      // ========================================================================
      // Step 3: Success - clear form (comment is now in Supabase)
      // ========================================================================
      // Note: We do NOT manually update comments state here.
      // The useComments hook's real-time subscription will automatically detect
      // the new comment via Supabase postgres_changes and re-fetch the comments list.
      setCommentText('');
      setElementIdError(null);
      
      // The comment is now persisted in Supabase and will appear automatically
      // via the real-time subscription in useComments hook
      console.log('[LiveCritBoard] Comment posted successfully to Supabase. Real-time update will appear shortly.');
      
    } catch (error) {
      console.error('[LiveCritBoard] Error posting comment to Supabase:', error);
      setElementIdError('Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [commentText, state.selectedId, boardId]);

  // Click on blank canvas => clear selection
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) setSelected(null);
  };

  // REFACTORED: Get normalized element ID for the selected element
  // This is used to pass to CritCommentsPanel for filtering
  // The panel handles all comment filtering, so we just need to normalize the ID
  const normalizedSelectedElementId = useMemo(() => {
    if (!state.selectedId) return undefined;
    
    // Validate and normalize element ID (must be a valid UUID)
    const validation = validateAndNormalizeElementId(state.selectedId);
    if (!validation.valid || !validation.isUUID || !validation.normalizedId) {
      // Invalid UUID - return undefined so panel doesn't filter
      return undefined;
    }
    
    return validation.normalizedId;
  }, [state.selectedId]);

  // REFACTORED: Get comment count for selected element from the same data source
  // This ensures consistency with what's shown in CritCommentsPanel
  const selectedElementCommentCount = useMemo(() => {
    if (!normalizedSelectedElementId) return 0;
    return comments.filter(c => c.elementId === normalizedSelectedElementId).length;
  }, [comments, normalizedSelectedElementId]);

  return (
    <div className="w-full h-[calc(100dvh)] bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22><rect width=%2220%22 height=%2220%22 fill=%22%23ffffff%22/><path d=%22M20 0H0v20%22 fill=%22none%22 stroke=%22%23f0f0f0%22/></svg>')]">
      <div className="flex h-full">
        {/* Main canvas area */}
        <div className="flex-1 relative">
          <div
            className="relative w-full h-full"
            onMouseDown={handleCanvasMouseDown}
            role="application"
            tabIndex={-1}
          >
            {/* ==== TEMP INLINE PEN TOOLBAR (guaranteed visible) ==== */}
            <div className="fixed left-6 top-20 z-[9999] flex items-center gap-2 rounded-2xl bg-white/95 backdrop-blur px-3 py-2 shadow border">
              <button
                onClick={() => setTool(tool === 'pen' ? 'none' : 'pen')}
                className={`px-2 py-1 rounded-md border ${tool === 'pen' ? 'bg-black text-white' : 'bg-white'}`}
                title="Pen"
              >
                Pen
              </button>
              <button
                onClick={() => setTool(tool === 'eraser' ? 'none' : 'eraser')}
                className={`px-2 py-1 rounded-md border ${tool === 'eraser' ? 'bg-black text-white' : 'bg-white'}`}
                title="Eraser"
              >
                Eraser
              </button>

              <div className="mx-2 h-5 w-px bg-neutral-300" />

              {PEN_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setPenColor(c)}
                  className={`h-6 w-6 rounded-full border ${penColor === c ? 'ring-2 ring-black' : ''}`}
                  style={{ backgroundColor: c }}
                  title={`Color ${c}`}
                />
              ))}

              <div className="mx-2 h-5 w-px bg-neutral-300" />

              {PEN_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setPenSize(s as PenSize)}
                  className={`px-2 py-1 rounded-md border ${penSize === s ? 'bg-black text-white' : 'bg-white'}`}
                  title={`Size ${s}px`}
                >
                  {s}px
                </button>
              ))}
            </div>
            {/* ==== END TEMP INLINE PEN TOOLBAR ==== */}

            {/* REFACTORED: Replaced PenOverlay with PenTool component
                - Changed tool prop to activeTool (PenTool expects "pen" | "eraser" | null)
                - Changed color prop to penColor
                - Changed size prop to penWidth (for pen) and eraserSize (for eraser)
                - PenTool handles both pen and eraser modes based on activeTool
            */}
            <PenTool
              activeTool={tool === 'pen' ? 'pen' : tool === 'eraser' ? 'eraser' : null}
              penColor={penColor}
              penWidth={penSize}
              eraserSize={penSize}
              boardId={boardId}
              className="absolute inset-0 z-20"
              pan={{ x: 0, y: 0 }}
              zoom={1}
            />

            {/* Sticky notes */}
            {state.notes.map((n) => (
              <StickyNote
                key={n.id}
                note={n}
                isSelected={state.selectedId === n.id}
                onChangeText={handleChangeText}
                onSelect={setSelected}
              />
            ))}
          </div>
        </div>

        {/* Right sidebar: Comments panel and comment form */}
        <div className="w-80 border-l bg-white flex flex-col">
          {/* REFACTORED: Comments panel using unified Supabase comments table
              - Fetches comments from Supabase via useComments hook
              - Filters by board, source="liveCrit", and element (when selected)
              - Updates in real-time via Supabase subscriptions
              - All comment filtering is handled by CritCommentsPanel */}
          <div className="flex-1 overflow-hidden">
            <CritCommentsPanel
              boardId={boardId}
              attachedElementId={normalizedSelectedElementId}
              source="liveCrit" // Only show live crit session comments
            />
          </div>

          {/* Comment form (only shown when an element is selected) */}
          {state.selectedId && (
            <div className="border-t p-4 bg-gray-50">
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comment on selected element
                </label>
                <textarea
                  value={commentText}
                  onChange={(e) => {
                    setCommentText(e.target.value);
                    // Clear error when user starts typing
                    if (elementIdError) setElementIdError(null);
                  }}
                  onKeyDown={(e) => {
                    // Submit on Ctrl+Enter or Cmd+Enter
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmitComment();
                    }
                  }}
                  placeholder="Add a comment... (Ctrl+Enter to submit)"
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 resize-none ${
                    elementIdError
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  rows={3}
                  disabled={isSubmitting}
                />
                {/* Element ID validation error */}
                {elementIdError && (
                  <div className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>{elementIdError}</span>
                  </div>
                )}
                {/* Element ID info (for debugging) */}
                {state.selectedId && !elementIdError && (
                  <div className="mt-1 text-xs text-gray-400">
                    Element ID: {state.selectedId}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {selectedElementCommentCount} comment{selectedElementCommentCount !== 1 ? 's' : ''} on this element
                </span>
                <button
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || isSubmitting || !!elementIdError}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  {isSubmitting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          )}

          {/* Prompt to select an element when nothing is selected */}
          {!state.selectedId && (
            <div className="border-t p-4 bg-gray-50 text-center">
              <p className="text-sm text-gray-500">
                Click on an element (sticky note, image, etc.) to add a comment
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
