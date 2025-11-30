"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import type { Comment, Snapshot, Card, TimelineSnapshot, Task, BoardSnapshot } from "@/types";
import { getBoardComments, type StoredComment } from "@/lib/storage";
import { timeAgo } from "@/lib/time";
import { normalizeId } from "@/lib/id";
import CritCommentsPanel from "./CritCommentsPanel";
import EditCommentModal from "./EditCommentModal";
import AttachmentsList from "./AttachmentsList";
import { useAttachments } from "@/hooks/attachments";
import { useComments as useSupabaseComments } from "@/hooks/comments";

interface RightPanelProps {
  comments: Comment[];
  viewingSnapshot: Snapshot | null;
  selectedCard: Card | null;
  author: string;
  boardId?: string;
  boardSnapshots?: BoardSnapshot[];
  timelineSnapshots?: TimelineSnapshot[];
  tasks?: Task[];
  onPostComment: (note: string, opts?: { makeTask?: boolean; category?: string; elementId?: string | null; targetElementId?: string | null }) => void;
  onLoadSnapshot?: (snapshot: TimelineSnapshot) => void;
  onToggleTask?: (taskId: string) => void;
  onAddTask?: (text: string) => void;
  onTimelineSnapshotAdded?: () => void;
  selectedCommentId?: string | null;
  onSelectComment?: (commentId: string | null) => void;
  isCritActive?: boolean;
  activeElementId?: string | null;
  selectedElementId?: string | null;
  elements?: import("@/types").CanvasElement[];
  getElementSummary?: (elementId: string) => string;
  onJumpToElement?: (elementId: string) => void;
  getCritSessionSummary?: (boardId: string) => import("@/types").CritSessionSummary | null;
  isDemo?: boolean;
  singleThread?: boolean;
  threadTitle?: string;
  sortOrder?: "asc" | "desc";
  composerAtTop?: boolean;
  deletableAuthorName?: string;
  onDeleteComment?: (id: string) => void;
  editableAuthorName?: string;
  onUpdateComment?: (updatedComment: Comment) => void;
  onLoadSession?: (session: any) => void;
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
  editableAuthorName,
  onUpdateComment,
  onLoadSession,
}: RightPanelProps) {
  const {
    attachments: allAttachments,
    attachmentsByComment,
    boardAttachments,
    loading: attachmentsLoading,
    error: attachmentsError,
    refetch: refetchAttachments,
  } = useAttachments({
    boardId: boardId || null,
    enabled: !!boardId,
  });

  const [activeTab, setActiveTab] = useState<"comments" | "crit" | "attachments">(isCritActive ? "crit" : "comments");
  
  useEffect(() => {
    if (isCritActive && activeTab === "comments") {
      setActiveTab("crit");
    }
  }, [isCritActive, activeTab]);
  
  const [newTaskText, setNewTaskText] = useState("");
  const [draftText, setDraftText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPreviewMode = viewingSnapshot !== null;
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastCommentCountRef = useRef<number>(comments.length);
  
  const [newlyAddedCommentIds, setNewlyAddedCommentIds] = useState<Set<string>>(new Set());
  const lastCommentIdsRef = useRef<Set<string>>(new Set());
  
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const canEditAuthorName = editableAuthorName || author;
  
  useEffect(() => {
    if (isCritActive && comments.length > lastCommentCountRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
    lastCommentCountRef.current = comments.length;
  }, [comments.length, isCritActive]);

  useEffect(() => {
    const currentIds = new Set(comments.map(c => c.id));
    const newIds = new Set<string>();
    
    currentIds.forEach(id => {
      if (!lastCommentIdsRef.current.has(id)) {
        newIds.add(id);
      }
    });
    
    if (newIds.size > 0) {
      setNewlyAddedCommentIds(newIds);
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

  const supabaseCommentsResult = useSupabaseComments(
    boardId 
      ? { 
          boardId, 
          elementId: null,
          source: isCritActive ? 'liveCrit' : null
        }
      : null
  );
  
  const effectiveComments = boardId && supabaseCommentsResult.comments.length >= 0
    ? supabaseCommentsResult.comments
    : comments;
  
  const [storedComments, setStoredComments] = useState<StoredComment[]>([]);
  
  useEffect(() => {
    if (!boardId) return;
    if (supabaseCommentsResult.comments.length === 0 && comments.length === 0) {
      const loaded = getBoardComments(boardId) ?? [];
      setStoredComments(loaded);
      
      const t = setInterval(() => {
        const updated = getBoardComments(boardId) ?? [];
        setStoredComments(updated);
      }, 5000);
      
      return () => clearInterval(t);
    }
  }, [boardId, supabaseCommentsResult.comments.length, comments.length]);
  
  const makeKey = (c: Comment) =>
    `${c.id ?? "noid"}-${typeof c.timestamp === "string" ? c.timestamp : String(c.timestamp ?? "")}`;

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

  useEffect(() => {
    if (singleThread && sortOrder === "asc" && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [singleThread, sortOrder, threadDedup.length]);

  const filteredForCrit = useMemo(() => {
    if (!effectiveComments) return [];
    if (!selectedElementId) return [];
    return effectiveComments.filter(c =>
      c.source === "liveCrit" &&
      ((c.elementId && c.elementId === selectedElementId) ||
       (c.targetElementId && c.targetElementId === selectedElementId))
    );
  }, [effectiveComments, selectedElementId]);

  const list = useMemo(() => {
    const filteredComments = (effectiveComments || []).filter(c => 
      c.source !== "liveCrit"
    );
    
    if (selectedElementId) {
      return filteredComments.filter(c =>
        (c.elementId && c.elementId === selectedElementId) ||
        (c.targetElementId && c.targetElementId === selectedElementId)
      );
    }
    if (selectedCard) {
      return filteredComments.filter((c) => c.pinId === selectedCard.id || c.elementId === selectedCard.id);
    }
    return filteredComments;
  }, [effectiveComments, selectedElementId, selectedCard]);

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

  const handleSubmitComment = useCallback(async () => {
    if (isSubmitting || !draftText.trim() || !selectedElementId || isDemo) return;
    
    setIsSubmitting(true);
    try {
      console.debug("[comment] saving", { elementId: selectedElementId, text: draftText.trim() });
      const textToSubmit = draftText.trim();
      const elementIdToSubmit = selectedElementId;
      
      setDraftText("");
      
      await onPostComment(textToSubmit, { 
        category: 'general',
        elementId: elementIdToSubmit,
        targetElementId: elementIdToSubmit
      });
    } catch (error) {
      console.error("[RightPanel] Error submitting comment:", error);
    } finally {
      setTimeout(() => setIsSubmitting(false), 500);
    }
  }, [isSubmitting, draftText, selectedElementId, isDemo, onPostComment]);

  const Composer = ((singleThread) || (activeTab === "comments") || (activeTab === "crit" && isCritActive)) && !isPreviewMode && !isDemo ? (
    <div className="border-t border-gray-200 p-4 space-y-3 bg-white">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Note
        </label>
        <textarea
          value={draftText}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDraftText(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmitComment();
            }
          }}
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
          title={isDemo ? "Comment input is disabled because the crit session is not active" : "Type your comment here. Press Enter to submit, Shift+Enter for newline."}
          disabled={isDemo || !selectedElementId}
        />
      </div>

      <div className="text-xs text-gray-500 mt-1">
        {selectedElementId ? (
          <>— attached to element: <span className="font-mono">{selectedElementId.slice(0, 8)}…</span></>
        ) : (
          <>— (select an element)</>
        )}
      </div>

      <button
        onClick={handleSubmitComment}
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
      {viewingSnapshot && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          <p className="text-xs text-gray-700">
            Iteration preview mode. You are viewing saved feedback from{" "}
            {viewingSnapshot.label}.
          </p>
        </div>
      )}

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
          <button
            onClick={() => setActiveTab("attachments")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition ${
              activeTab === "attachments"
                ? "text-blue-600 border-b-2 border-blue-600 bg-white font-medium"
                : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent"
            }`}
          >
            Attachments
          </button>
        </div>
      )}

      {composerAtTop && Composer}

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
                      <div className="text-xs font-semibold text-zinc-700">
                        {comment.author || comment.author_name || "Anonymous"}
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
                    
                    {attachmentsByComment[comment.id] && attachmentsByComment[comment.id].length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <AttachmentsList
                          attachments={attachmentsByComment[comment.id]}
                          deletable={false}
                          showTitle={false}
                          compact={true}
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
        <div ref={scrollContainerRef} className={`flex-1 overflow-auto p-4 space-y-4 ${composerAtTop ? 'border-t border-gray-200' : ''}`}>
          {activeTab === "comments" && (
          <>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Comments</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">{listDedup.length}</span>
              </div>
            </div>
            
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
                      <div className="text-xs font-semibold text-zinc-700">
                        {comment.author || comment.author_name || "Anonymous"}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-400">
                          {new Date(comment.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {canEditAuthorName && comment.author === canEditAuthorName && (
                          <>
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
                    
                    {attachmentsByComment[comment.id] && attachmentsByComment[comment.id].length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <AttachmentsList
                          attachments={attachmentsByComment[comment.id]}
                          deletable={false}
                          showTitle={false}
                          compact={true}
                        />
                      </div>
                    )}
                    
                    {!selectedElementId && comment.targetElementId && (
                      <div className="mt-1 text-[11px] text-zinc-500">
                        ↳ element {comment.targetElementId.slice(0, 6)}…
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
                        <div className="text-xs font-semibold text-zinc-700">
                          {comment.author || comment.author_name || "Anonymous"}
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
                      <div className="text-sm text-gray-900 mt-1">{comment.text}</div>
                      <div className="text-xs text-zinc-400 mt-1">
                        {formatTimestamp(String(comment.timestamp), comment.source === "liveCrit")}
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

        {activeTab === "attachments" && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Attachments</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">
                  {allAttachments.length} {allAttachments.length === 1 ? 'file' : 'files'}
                </span>
                {attachmentsLoading && (
                  <span className="text-xs text-blue-500" title="Loading attachments...">
                    ⏳
                  </span>
                )}
              </div>
            </div>
            
            {attachmentsError && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                ⚠️ Error loading attachments: {attachmentsError}
              </div>
            )}
            
            {allAttachments.length === 0 ? (
              <div className="text-xs text-zinc-500 text-center py-4">
                No attachments yet.
              </div>
            ) : (
              <div className="space-y-4">
                {boardAttachments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">Board Attachments</h4>
                    <AttachmentsList
                      attachments={boardAttachments}
                      deletable={false}
                      showTitle={false}
                      compact={false}
                    />
                  </div>
                )}
                
                {Object.keys(attachmentsByComment).length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">Comment Attachments</h4>
                    {Object.entries(attachmentsByComment).map(([commentId, commentAttachments]) => {
                      const comment = effectiveComments.find(c => c.id === commentId);
                      return (
                        <div key={commentId} className="mb-4 pb-4 border-b border-gray-200 last:border-b-0 last:pb-0 last:mb-0">
                          {comment && (
                            <div className="text-xs text-gray-600 mb-2">
                              From comment: "{comment.text.substring(0, 50)}{comment.text.length > 50 ? '...' : ''}"
                            </div>
                          )}
                          <AttachmentsList
                            attachments={commentAttachments}
                            deletable={false}
                            showTitle={false}
                            compact={false}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
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

      {!composerAtTop && Composer}
      
      {isEditModalOpen && editingComment && (
        <EditCommentModal
          isOpen={isEditModalOpen}
          comment={editingComment}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingComment(null);
          }}
          onUpdate={(updatedComment) => {
            onUpdateComment?.(updatedComment);
            setIsEditModalOpen(false);
            setEditingComment(null);
          }}
        />
      )}
    </aside>
  );
}