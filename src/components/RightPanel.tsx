"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import type { Comment, Snapshot, Card, TimelineSnapshot, Task, BoardSnapshot } from "@/types";
import { getBoardComments, type StoredComment } from "@/lib/storage";
import { timeAgo } from "@/lib/time";
import { normalizeId } from "@/lib/id";
import CritCommentsPanel from "./CritCommentsPanel";
import EditCommentModal from "./EditCommentModal";
import AttachmentsList from "./AttachmentsList";
import { useAttachments } from "@/hooks/attachments";
// REFACTORED: Import unified Supabase comments hook for optional use
import { useComments as useSupabaseComments } from "@/hooks/comments";

interface RightPanelProps {
  comments: Comment[];
  viewingSnapshot: Snapshot | null;
  selectedCard: Card | null;
  author: string;
  boardId?: string; // Board ID for timeline snapshots
  boardSnapshots?: BoardSnapshot[]; // Board snapshots for crit analysis
  timelineSnapshots?: TimelineSnapshot[]; // Timeline snapshots for board history
  tasks?: Task[]; // Tasks for this board
  onPostComment: (note: string, opts?: { makeTask?: boolean; category?: string; elementId?: string | null; targetElementId?: string | null }) => void;
  onLoadSnapshot?: (snapshot: TimelineSnapshot) => void;
  onToggleTask?: (taskId: string) => void; // Toggle task status
  onAddTask?: (text: string) => void; // Add new task manually
  onTimelineSnapshotAdded?: () => void; // Callback when snapshot is added
  selectedCommentId?: string | null; // Selected comment ID for highlighting
  onSelectComment?: (commentId: string | null) => void; // Select comment callback
  isCritActive?: boolean; // Whether live crit is currently active
  activeElementId?: string | null; // Currently selected element ID (exactly one element selected)
  selectedElementId?: string | null; // Selected element ID for filtering (exactly one selected)
  // REFACTORED: Added elements prop to RightPanelProps interface
  elements?: import("@/types").CanvasElement[]; // Canvas elements for element summary
  getElementSummary?: (elementId: string) => string; // Helper to get element label
  onJumpToElement?: (elementId: string) => void; // Jump to element callback
  getCritSessionSummary?: (boardId: string) => import("@/types").CritSessionSummary | null; // Get crit session summary
  isDemo?: boolean; // If true, hide inputs and disable interactions
  singleThread?: boolean; // If true, show single thread mode (no tabs, single filtered thread)
  threadTitle?: string; // Title for single thread mode (default: "Comments")
  sortOrder?: "asc" | "desc"; // Sort order for single thread (default: "desc")
  composerAtTop?: boolean; // If true, show composer at top instead of bottom (default: false)
  deletableAuthorName?: string; // name that may delete its own comments (exact match)
  onDeleteComment?: (id: string) => void; // Handler for deleting a comment
  editableAuthorName?: string; // name that may edit its own comments (exact match, defaults to author prop)
  onUpdateComment?: (updatedComment: Comment) => void; // Handler for when a comment is updated
}

type TabType = "comments" | "critNotes" | "prepForCrit" | "tasks" | "summary" | "timeline";

export default function RightPanel({
  comments,
  viewingSnapshot,
  selectedCard,
  author,
  boardId,
  boardSnapshots = [],
  timelineSnapshots = [],
  tasks = [],
  onPostComment,
  onLoadSnapshot,
  onToggleTask,
  onAddTask,
  onTimelineSnapshotAdded,
  selectedCommentId,
  onSelectComment,
  isCritActive = false,
  activeElementId = null,
  selectedElementId,
  elements = [],
  getElementSummary = () => "Element",
  onJumpToElement,
  getCritSessionSummary,
  isDemo = false,
  singleThread = false,
  threadTitle = "Comments",
  sortOrder = "desc",
  composerAtTop = false,
  deletableAuthorName,
  onDeleteComment,
  editableAuthorName, // Optional prop for editable author name (defaults to author prop)
  onUpdateComment, // Callback when comment is updated
}: RightPanelProps) {
  // Fetch attachments for the current board
  // Attachments will be grouped by comment_id for display
  const {
    attachments: allAttachments,
    attachmentsByComment,
    boardAttachments,
    loading: attachmentsLoading,
    error: attachmentsError,
    refetch: refetchAttachments,
  } = useAttachments({
    boardId: boardId || null,
    enabled: !!boardId, // Only fetch if boardId is provided
  });
  const [activeTab, setActiveTab] = useState<"comments" | "crit">(isCritActive ? "crit" : "comments");
  
  // Switch to crit tab when crit becomes active
  useEffect(() => {
    if (isCritActive && activeTab === "comments") {
      setActiveTab("crit");
    }
  }, [isCritActive, activeTab]);
  const [newTaskText, setNewTaskText] = useState("");
  
  // Local state for comment compose box
  const [draftText, setDraftText] = useState("");
  const [draftMakeTask, setDraftMakeTask] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPreviewMode = viewingSnapshot !== null;
  
  // Ref for scroll container and auto-scroll tracking
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastCommentCountRef = useRef<number>(comments.length);
  
  // Track newly added comment IDs for temporary highlighting
  const [newlyAddedCommentIds, setNewlyAddedCommentIds] = useState<Set<string>>(new Set());
  const lastCommentIdsRef = useRef<Set<string>>(new Set());
  
  // State for Edit Comment Modal
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Determine which author name can edit comments (defaults to author prop if editableAuthorName not provided)
  const canEditAuthorName = editableAuthorName || author;
  
  // Auto-scroll to bottom when new comments arrive during crit
  useEffect(() => {
    if (isCritActive && comments.length > lastCommentCountRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
    lastCommentCountRef.current = comments.length;
  }, [comments.length, isCritActive]);

  // Track new comments for temporary highlighting
  useEffect(() => {
    const currentIds = new Set(comments.map(c => c.id));
    const newIds = new Set<string>();
    
    // Find comments that weren't in the previous set
    currentIds.forEach(id => {
      if (!lastCommentIdsRef.current.has(id)) {
        newIds.add(id);
      }
    });
    
    if (newIds.size > 0) {
      setNewlyAddedCommentIds(newIds);
      // Remove highlight after 3 seconds
      const timeout = setTimeout(() => {
        setNewlyAddedCommentIds(prev => {
          const next = new Set(prev);
          newIds.forEach(id => next.delete(id));
          return next;
        });
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
    
    lastCommentIdsRef.current = currentIds;
  }, [comments]);
  
  // Helper to format timestamp for live crit (show "just now" if <1min old)
  // REFACTORED: Accept timestamp as string | number to match Comment type
  const formatTimestamp = (timestamp: string | number, isLiveCrit: boolean) => {
    if (isLiveCrit && isCritActive) {
      const now = new Date();
      const commentTime = new Date(timestamp);
      const diffMs = now.getTime() - commentTime.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      
      if (diffSecs < 60) {
        return "just now";
      }
    }
    return timeAgo(timestamp);
  };


  // REFACTORED: Use unified Supabase comments table when boardId is provided
  // If boardId is provided, fetch from Supabase; otherwise use comments prop (for backward compatibility)
  // Filter by source if in crit mode (isCritActive)
  const supabaseCommentsResult = useSupabaseComments(
    boardId 
      ? { 
          boardId, 
          elementId: null, // Fetch all comments, filter by element in UI
          source: isCritActive ? 'liveCrit' : null // Filter by source if in crit mode
        }
      : null
  );
  
  // Use Supabase comments if boardId is provided, otherwise use comments prop
  // This ensures backward compatibility while migrating to Supabase
  const effectiveComments = boardId && supabaseCommentsResult.comments.length >= 0
    ? supabaseCommentsResult.comments
    : comments;
  
  // Load comments from storage to access target field (for backward compatibility)
  // DEPRECATED: This is kept for backward compatibility but should be removed once all pages use Supabase
  const [storedComments, setStoredComments] = useState<StoredComment[]>([]);
  
  useEffect(() => {
    if (!boardId) return;
    // Only load from storage if not using Supabase (for backward compatibility)
    if (supabaseCommentsResult.comments.length === 0 && comments.length === 0) {
      const loaded = getBoardComments(boardId) ?? [];
      setStoredComments(loaded);
      
      // Poll every 5 seconds for updates (only if not using Supabase)
      const t = setInterval(() => {
        const updated = getBoardComments(boardId) ?? [];
        setStoredComments(updated);
      }, 5000);
      
      return () => clearInterval(t);
    }
  }, [boardId, supabaseCommentsResult.comments.length, comments.length]);
  
  // Helper to create composite key for comments
  const makeKey = (c: Comment) =>
    `${c.id ?? "noid"}-${typeof c.timestamp === "string" ? c.timestamp : String(c.timestamp ?? "")}`;

  // REFACTORED: Single thread mode: filter and sort comments
  // Uses effectiveComments which comes from Supabase when boardId is provided
  const thread = useMemo(() => {
    if (!singleThread) return [];
    if (!selectedElementId) return [];
    return effectiveComments
      .filter(c =>
        (c.elementId && c.elementId === selectedElementId) ||
        (c.targetElementId && c.targetElementId === selectedElementId)
      )
      .slice()
      .sort((a, b) => {
        const ta = new Date(a.timestamp).getTime();
        const tb = new Date(b.timestamp).getTime();
        return sortOrder === "asc" ? ta - tb : tb - ta;
      });
  }, [singleThread, selectedElementId, effectiveComments, sortOrder]);

  // De-duplicate thread for single thread mode
  const threadDedup = useMemo(() => {
    const seen = new Set<string>();
    const out: Comment[] = [];
    for (const c of thread) {
      const k = makeKey(c);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(c);
      }
    }
    return out;
  }, [thread]);

  // Auto-scroll to bottom when sortOrder is asc and thread changes
  useEffect(() => {
    if (singleThread && sortOrder === "asc" && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [singleThread, sortOrder, threadDedup.length]);

  // REFACTORED: Filter comments by selected element (for Crit comments tab)
  // Uses effectiveComments which comes from Supabase when boardId is provided
  const filteredForCrit = useMemo(() => {
    if (!effectiveComments) return [];
    if (!selectedElementId) return []; // Show empty when no element selected (for crit comments)
    // Filter by element ID (supports both elementId and targetElementId for backward compatibility)
    return effectiveComments.filter(c =>
      (c.elementId && c.elementId === selectedElementId) ||
      (c.targetElementId && c.targetElementId === selectedElementId)
    );
  }, [effectiveComments, selectedElementId]);

  // REFACTORED: Simple list: filter by selectedElementId if present, otherwise show all
  // Uses effectiveComments which comes from Supabase when boardId is provided
  const list = useMemo(() => {
    if (selectedElementId) {
      return (effectiveComments || []).filter(c =>
        (c.elementId && c.elementId === selectedElementId) ||
        (c.targetElementId && c.targetElementId === selectedElementId)
      );
    }
    // Legacy filter for backward compatibility (selectedCard)
    if (selectedCard) {
      return (effectiveComments || []).filter((c) => c.pinId === selectedCard.id || c.elementId === selectedCard.id);
    }
    return effectiveComments || [];
  }, [effectiveComments, selectedElementId, selectedCard]);

  // De-duplicate list
  const listDedup = useMemo(() => {
    const seen = new Set<string>();
    const out: Comment[] = [];
    for (const c of list) {
      const k = makeKey(c);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(c);
      }
    }
    return out;
  }, [list]);

  // De-duplicate filteredForCrit
  const filteredForCritDedup = useMemo(() => {
    const seen = new Set<string>();
    const out: Comment[] = [];
    for (const c of filteredForCrit) {
      const k = makeKey(c);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(c);
      }
    }
    return out;
  }, [filteredForCrit]);


  // Extract composer JSX for reuse
  const Composer = ((singleThread) || (activeTab === "comments") || (activeTab === "crit" && isCritActive)) && !isPreviewMode && !isDemo ? (
    <div className="border-t border-gray-200 p-4 space-y-3 bg-white">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Note
        </label>
        <textarea
          value={draftText}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDraftText(e.target.value)}
          className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
            isDemo ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
          rows={3}
          placeholder={
            isDemo 
              ? "Comment input disabled (session not active)" 
              : selectedElementId 
                ? "Write your note…" 
                : "Click an element to attach…"
          }
          title={isDemo ? "Comment input is disabled because the crit session is not active" : "Type your comment here"}
          disabled={isDemo || !selectedElementId}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="makeTask"
          checked={draftMakeTask}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftMakeTask(e.target.checked)}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          disabled={isDemo || !selectedElementId}
        />
        <label htmlFor="makeTask" className="text-xs text-gray-700">
          Make this a task
        </label>
      </div>

      {/* Attachment status */}
      <div className="text-xs text-gray-500 mt-1">
        {selectedElementId ? (
          <>— attached to element: <span className="font-mono">{selectedElementId.slice(0, 8)}…</span></>
        ) : (
          <>— (select an element)</>
        )}
      </div>

      <button
        onClick={async () => {
          // ========================================================================
          // Validation: Check if comment can be submitted
          // ========================================================================
          // Ensure all required conditions are met before submission:
          // 1. Not already submitting
          // 2. Draft text is not empty
          // 3. Element is selected (for live crit mode)
          // 4. Not in demo mode (demo mode disables interactions)
          // ========================================================================
          if (isSubmitting || !draftText.trim() || !selectedElementId || isDemo) return;
          
          setIsSubmitting(true);
          try {
            console.debug("[comment] saving", { elementId: selectedElementId, text: draftText.trim() });
            const textToSubmit = draftText.trim();
            const elementIdToSubmit = selectedElementId;
            
            // Clear draft immediately to prevent double submission
            setDraftText("");
            setDraftMakeTask(false);
            
            await onPostComment(textToSubmit, { 
              category: 'general',
              makeTask: draftMakeTask,
              elementId: elementIdToSubmit,
              targetElementId: elementIdToSubmit
            });
          } catch (error) {
            // Error handling is done in the parent component (handlePostComment)
            console.error("[RightPanel] Error submitting comment:", error);
          } finally {
            // Reset submitting state after a short delay to prevent rapid clicks
            setTimeout(() => setIsSubmitting(false), 500);
          }
        }}
        disabled={isSubmitting || !draftText.trim() || !selectedElementId || isDemo}
        className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        title={
          isDemo 
            ? "Comment input is disabled (demo mode)" 
            : !selectedElementId 
              ? "Please select an element to comment on" 
              : !draftText.trim() 
                ? "Please enter a comment" 
                : "Submit comment"
        }
      >
        {isSubmitting ? "Submitting..." : isDemo ? "Disabled" : "Submit note"}
      </button>
    </div>
  ) : null;

  return (
    <aside className="w-80 bg-white border-l border-gray-200 flex flex-col h-screen">
      {/* Iteration preview banner */}
      {viewingSnapshot && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          <p className="text-xs text-gray-700">
            Iteration preview mode. You are viewing saved feedback from{" "}
            {viewingSnapshot.label}.
          </p>
        </div>
      )}

      {/* Tabs - hidden in single thread mode */}
      {!singleThread && (
        <div className="border-b border-gray-200 flex">
          <button
            onClick={() => setActiveTab("comments")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition ${
              activeTab === "comments"
                ? "text-blue-600 border-b-2 border-blue-600 bg-white font-medium"
                : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent"
            }`}
          >
            Comments
          </button>
          <button
            onClick={() => setActiveTab("crit")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition ${
              activeTab === "crit"
                ? "text-blue-600 border-b-2 border-blue-600 bg-white font-medium"
                : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent"
            }`}
          >
            Crit comments
          </button>
        </div>
      )}

      {/* Composer at top (when composerAtTop is true) */}
      {composerAtTop && Composer}

      {/* Single Thread Mode */}
      {singleThread ? (
        <div ref={scrollContainerRef} className={`flex-1 overflow-auto p-4 space-y-4 ${composerAtTop ? 'border-t border-gray-200' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">
              {threadTitle}
            </h3>
            {selectedElementId && <div className="text-xs text-zinc-500">{threadDedup.length}</div>}
          </div>

          {!selectedElementId ? (
            <div className="text-xs text-zinc-500 text-center py-4">
              {isDemo 
                ? "Session not active. Please wait for the session to be validated or refresh the page." 
                : "Select an element to view its comments."}
            </div>
          ) : threadDedup.length === 0 ? (
            <div className="text-xs text-zinc-500 text-center py-4">
              No comments yet for this element.
            </div>
          ) : (
            <div className="space-y-3">
              {threadDedup.map((comment) => {
                const k = makeKey(comment);
                const isSelected = selectedCommentId === comment.id;
                const isLiveCrit = comment.source === "liveCrit";
                const shouldHighlight = isLiveCrit && isCritActive;
                const isNewlyAdded = newlyAddedCommentIds.has(comment.id);
                
                return (
                  <div
                    key={k}
                    onClick={() => onSelectComment?.(comment.id)}
                    className={`border rounded-lg p-3 cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                        : isNewlyAdded
                        ? "border-green-400 bg-green-50 ring-2 ring-green-300 shadow-md"
                        : shouldHighlight
                        ? "bg-blue-50 border-blue-200 hover:border-blue-300"
                        : "bg-gray-50 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-zinc-500">
                        {comment.author} • {comment.category || "general"}{comment.task ? " • Task" : ""}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-400">
                          {new Date(comment.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {deletableAuthorName && comment.author === deletableAuthorName && (
                          <button
                            type="button"
                            onClick={(e: any) => { 
                              e.stopPropagation(); 
                              onDeleteComment?.(comment.id); 
                            }}
                            className="p-1 rounded hover:bg-red-50 text-red-600"
                            title="Delete this comment"
                            aria-label="Delete comment"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-gray-900">{comment.text}</div>
                    
                    {/* Display attachments for this comment (grouped by comment_id) */}
                    {attachmentsByComment[comment.id] && attachmentsByComment[comment.id].length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <AttachmentsList
                          attachments={attachmentsByComment[comment.id]}
                          deletable={false} // Can enable if needed
                          showTitle={false} // Don't show title for inline display
                          compact={true} // Use compact mode for comments
                        />
                      </div>
                    )}
                    
                    {comment.source === "liveCrit" && (
                      <span className="mt-1 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">
                        LIVE CRIT
                      </span>
                    )}
                    {comment.targetElementId && onJumpToElement && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <button
                          onClick={(e: any) => {
                            e.stopPropagation();
                            onJumpToElement(comment.targetElementId!);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <span>↩</span>
                          <span>View on board</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Tab Content */
        <div ref={scrollContainerRef} className={`flex-1 overflow-auto p-4 space-y-4 ${composerAtTop ? 'border-t border-gray-200' : ''}`}>
          {activeTab === "comments" && (
          <>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Comments</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">{listDedup.length}</span>
                {/* Show attachments loading indicator */}
                {attachmentsLoading && (
                  <span className="text-xs text-blue-500" title="Loading attachments...">
                    ⏳
                  </span>
                )}
              </div>
            </div>
            
            {/* Display board-level attachments (not linked to any comment) */}
            {boardAttachments.length > 0 && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                <AttachmentsList
                  attachments={boardAttachments}
                  deletable={false}
                  showTitle={true}
                  compact={false}
                />
              </div>
            )}
            
            {/* Show attachments error if any */}
            {attachmentsError && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                ⚠️ Error loading attachments: {attachmentsError}
              </div>
            )}
            
            {listDedup.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                {selectedElementId
                  ? "No comments yet for this element."
                  : selectedCard
                  ? `No comments on "${selectedCard.title}" yet.`
                  : "No comments yet."}
              </p>
            ) : (
              <div className="space-y-2">
                {listDedup.map((comment, index) => {
                const k = makeKey(comment);
                // Find pin number (index of comment in all pinned comments with x/y)
                const pinnedComments = comments.filter((c) => c.x !== undefined && c.y !== undefined);
                const pinIndex = pinnedComments.findIndex((c) => c.id === comment.id);
                const pinNumber = pinIndex >= 0 ? pinIndex + 1 : null;
                const isSelected = selectedCommentId === comment.id;
                const isLiveCrit = comment.source === "liveCrit";
                const shouldHighlight = isLiveCrit && isCritActive;
                const isNewlyAdded = newlyAddedCommentIds.has(comment.id);
                
                return (
                  <div
                    key={k}
                    onClick={() => onSelectComment?.(comment.id)}
                    className={`border rounded-lg p-3 cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                        : isNewlyAdded
                        ? "border-green-400 bg-green-50 ring-2 ring-green-300 shadow-md"
                        : shouldHighlight
                        ? "bg-blue-50 border-blue-200 hover:border-blue-300"
                        : "bg-gray-50 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-zinc-500">
                        {comment.author} • {comment.category || "general"}{comment.task ? " • Task" : ""}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-400">
                          {new Date(comment.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {/* Edit and Delete buttons - only show if user is the comment owner */}
                        {canEditAuthorName && comment.author === canEditAuthorName && (
                          <>
                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={(e: any) => {
                                e.stopPropagation();
                                setEditingComment(comment);
                                setIsEditModalOpen(true);
                              }}
                              className="p-1 rounded hover:bg-blue-50 text-blue-600"
                              title="Edit this comment"
                              aria-label="Edit comment"
                            >
                              ✏️
                            </button>
                            {/* Delete Button */}
                            {deletableAuthorName && comment.author === deletableAuthorName && (
                              <button
                                type="button"
                                onClick={(e: any) => {
                                  e.stopPropagation();
                                  onDeleteComment?.(comment.id);
                                }}
                                className="p-1 rounded hover:bg-red-50 text-red-600"
                                title="Delete this comment"
                                aria-label="Delete comment"
                              >
                                🗑️
                              </button>
                            )}
                          </>
                        )}
                        {/* Show delete button only if deletableAuthorName is set and matches, even if edit is not available */}
                        {(!canEditAuthorName || comment.author !== canEditAuthorName) && deletableAuthorName && comment.author === deletableAuthorName && (
                          <button
                            type="button"
                            onClick={(e: any) => {
                              e.stopPropagation();
                              onDeleteComment?.(comment.id);
                            }}
                            className="p-1 rounded hover:bg-red-50 text-red-600"
                            title="Delete this comment"
                            aria-label="Delete comment"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-gray-900">{comment.text}</div>
                    
                    {/* Display attachments for this comment (grouped by comment_id) */}
                    {attachmentsByComment[comment.id] && attachmentsByComment[comment.id].length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <AttachmentsList
                          attachments={attachmentsByComment[comment.id]}
                          deletable={false} // Can enable if needed
                          showTitle={false} // Don't show title for inline display
                          compact={true} // Use compact mode for comments
                        />
                      </div>
                    )}
                    
                    {/* Show element info if not filtering by element */}
                    {!selectedElementId && comment.targetElementId && (
                      <div className="mt-1 text-[11px] text-zinc-500">
                        ↳ element {comment.targetElementId.slice(0, 6)}…
                      </div>
                    )}
                    {/* Show LIVE CRIT badge if from live crit */}
                    {comment.source === "liveCrit" && (
                      <span className="mt-1 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">
                        LIVE CRIT
                      </span>
                    )}
                    {/* Show "View on board" link if comment is attached to an element */}
                    {comment.targetElementId && onJumpToElement && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <button
                          onClick={(e: any) => {
                            e.stopPropagation();
                            onJumpToElement(comment.targetElementId!);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <span>↩</span>
                          <span>View on board</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            )}
          </>
        )}

        {activeTab === "crit" && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                {selectedElementId ? `Crit comments · ${selectedElementId.slice(0, 6)}…` : "Crit comments"}
              </h3>
              <div className="text-xs text-zinc-500">{filteredForCritDedup.length}</div>
            </div>

            {!selectedElementId ? (
              <div className="text-xs text-zinc-500 text-center py-4">
                Select an element to attach and view its comments.
              </div>
            ) : filteredForCritDedup.length === 0 ? (
              <div className="text-xs text-zinc-500 text-center py-4">
                No comments yet for this element.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredForCritDedup
                  .slice()
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((comment) => {
                    const k = makeKey(comment);
                    return (
                    <div key={k} className="rounded-md border px-3 py-2 bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs text-zinc-500">
                          {comment.category}{comment.task ? " • Task" : ""}
                        </div>
                        {deletableAuthorName && comment.author === deletableAuthorName && (
                          <button
                            type="button"
                            onClick={(e: any) => { 
                              e.stopPropagation(); 
                              onDeleteComment?.(comment.id); 
                            }}
                            className="p-1 rounded hover:bg-red-50 text-red-600"
                            title="Delete this comment"
                            aria-label="Delete comment"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                      <div className="text-sm text-gray-900">{comment.text}</div>
                      <div className="text-xs text-zinc-400 mt-1">
                        by {comment.author} • {formatTimestamp(String(comment.timestamp), comment.source === "liveCrit")}
                      </div>
                      {comment.source === "liveCrit" && (
                        <span className="mt-1 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">
                          LIVE CRIT
                        </span>
                      )}
                    </div>
                  );
                  })}
              </div>
            )}
          </>
        )}

        </div>
      )}

      {/* Board History section */}
      <div className={`border-t border-gray-200 p-4 bg-white ${composerAtTop ? '' : ''}`}>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Board History
        </h3>
        {timelineSnapshots.length === 0 ? (
          <p className="text-xs text-gray-500">
            No iterations yet.
          </p>
        ) : (
          <div className="space-y-2">
            {timelineSnapshots.map((snapshot) => (
              <div
                key={snapshot.id}
                className="flex items-start justify-between bg-gray-50 border border-gray-200 rounded-lg p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {snapshot.note}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {timeAgo(snapshot.createdAt)}
                  </p>
                </div>
                {onLoadSnapshot && (
                  <button
                    onClick={() => onLoadSnapshot(snapshot)}
                    className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-md hover:bg-blue-200 transition whitespace-nowrap"
                  >
                    Load
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Composer at bottom (when composerAtTop is false) */}
      {!composerAtTop && Composer}
      
      {/* Edit Comment Modal */}
      {isEditModalOpen && editingComment && (
        <EditCommentModal
          isOpen={isEditModalOpen}
          comment={editingComment}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingComment(null);
          }}
          onUpdate={(updatedComment) => {
            // Call parent callback to refresh comments
            onUpdateComment?.(updatedComment);
            
            // Close modal
            setIsEditModalOpen(false);
            setEditingComment(null);
          }}
        />
      )}
    </aside>
  );
}
