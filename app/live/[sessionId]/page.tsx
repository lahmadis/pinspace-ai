"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// ========================================================================
// Supabase Realtime imports for Live Crit guest connections
// ========================================================================
// Updated to use Supabase Realtime instead of PeerJS
// ========================================================================
import { createGuestWithRetry, type CritMessage } from "@/lib/realtime";
import CritViewerCanvas from "@/components/CritViewerCanvas";
import RightPanel from "@/components/RightPanel";
import { getBoards, getCritSessionElements, saveCritSessionElements } from "@/lib/storage";
import type { CommentTarget } from "@/lib/storage";
// ========================================================================
// Supabase-based comment hooks
// ========================================================================
// Replaced localStorage-based comment operations with Supabase hooks:
// - useComments: Fetches comments from Supabase API with automatic polling
// - useCreateComment: Creates comments in Supabase via API
// - useDeleteComment: Deletes comments from Supabase via API
// ========================================================================
import { useComments, useCreateComment, useDeleteComment } from "@/hooks/comments";
import type { Comment } from "@/types";

import type { PenStroke } from "@/hooks/usePenDrawing";
import { getPenStrokes, savePenStrokes, type StoredPenStroke } from "@/lib/storage";

interface LocalComment {
  id: string;
  boardId: string;
  author: string;
  category: string;
  note: string;
  isTask?: boolean;
  source: "liveCrit";
  createdAt: number;
  target?: CommentTarget;
}

// ========================================================================
// REFACTORED: Session ID is now a UUID, cannot extract boardId from it
// ========================================================================
// Since session IDs are now UUIDs (generated with crypto.randomUUID()),
// we cannot extract the boardId from the sessionId string.
// Instead, we must fetch the session from Supabase to get the boardId.
// 
// This function is kept for backward compatibility but will return null.
// The boardId will be fetched from the session validation effect instead.
// ========================================================================
function extractBoardIdFromSessionId(sessionId: string): string | null {
  // REFACTORED: Session IDs are now UUIDs, cannot extract boardId from UUID
  // The boardId will be fetched from Supabase when validating the session
  console.log('[live] ⚠️ extractBoardIdFromSessionId called - session IDs are now UUIDs, cannot extract boardId from UUID');
  return null;
}

export default function LiveSessionPage() {
  // REFACTORED: Safely handle null params from useParams
  // useParams can return null, so we need to handle that case
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId as string | undefined;

  // ========================================================================
  // REFACTORED: hostBoardId is no longer derived from sessionId
  // ========================================================================
  // Since session IDs are now UUIDs, we cannot extract boardId from the UUID.
  // The boardId will be fetched from Supabase when the session is validated.
  // This useMemo is kept for backward compatibility but returns empty string.
  // ========================================================================
  const hostBoardId = useMemo(() => {
    // REFACTORED: Session IDs are UUIDs, cannot extract boardId from UUID
    // The boardId will be set from the session validation effect when the
    // session is fetched from Supabase
    console.log('[live] ⚠️ hostBoardId useMemo - session IDs are now UUIDs, boardId will come from Supabase session');
    return "";
  }, [sessionId]);

  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [rtReady, setRtReady] = useState(false);
  // ========================================================================
  // Crit Session Validation State
  // ========================================================================
  // Track session validation status to show clear errors if session is missing
  // ========================================================================
  const [sessionValid, setSessionValid] = useState<boolean | null>(null); // null = checking, true = valid, false = invalid
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  // ========================================================================
  // Supabase Realtime guest connection reference
  // ========================================================================
  // Stores the guest connection object returned by createGuestWithRetry
  // This includes the channel subscription and send/onMessage methods
  // ========================================================================
  const rtRef = useRef<Awaited<ReturnType<typeof createGuestWithRetry>> | null>(null);
  const [isOnline, setIsOnline] = useState(false); // Track if Supabase Realtime is connected
  const [name, setName] = useState("");
  const [hasName, setHasName] = useState(false);
  const [target, setTarget] = useState<CommentTarget | undefined>(undefined);
  
  // ========================================================================
  // Comment Submission Feedback State
  // ========================================================================
  // Track success/error messages for user feedback
  // ========================================================================
  const [commentFeedback, setCommentFeedback] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const [myCommentsByElement, setMyCommentsByElement] = useState<Record<string, LocalComment[]>>({});
  
  // Selection state - must be declared before activeElementId
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedIdsRef = useRef<Set<string>>(new Set());

  // Derive activeElementId from selectedIds for consistent filtering
  const activeElementId = selectedIds.length === 1 ? selectedIds[0] : null;

  // ========================================================================
  // Supabase Comments: Fetch comments from database
  // ========================================================================
  // useComments hook automatically:
  // - Fetches comments from Supabase via /api/comments?boardId={boardId}
  // - Polls for updates every 5 seconds (real-time synchronization)
  // - Handles loading and error states
  // - Filters to only show liveCrit comments
  // ========================================================================
  const { 
    comments: allComments, 
    loading: commentsLoading, 
    error: commentsError, 
    refetch: refetchComments 
  } = useComments(activeBoardId);
  
  // Filter to only show liveCrit comments (from this session)
  const comments = useMemo(() => {
    if (!allComments) return [];
    // Filter to only show comments with source === 'liveCrit'
    // This ensures we only see comments from the live crit session
    return allComments.filter(c => c.source === 'liveCrit');
  }, [allComments]);

  // Stabilize the handler to prevent redundant updates and infinite loops
  const setSelectedIdsSafe = useCallback((next: string[]) => {
    setSelectedIds(prev => {
      // Shallow equality check to avoid redundant updates
      if (prev.length === next.length && prev.every((v, i) => v === next[i])) return prev;
      return next;
    });
  }, []);

  // Handler for single element selection (stabilized)
  const handleSelectElement = useCallback((id: string | null) => {
    setSelectedIdsSafe(id ? [id] : []);
  }, [setSelectedIdsSafe]);

  // Stabilize onSelectTarget handler
  const handleSelectTarget = useCallback((t: CommentTarget, view: { pan: { x: number; y: number }; zoom: number }) => {
    setTarget({ ...t, viewport: view });
    setPan(view.pan);
    setZoom(view.zoom);
    // Note: activeElementId is now derived from selectedIds above
  }, []);

  // Canvas tools (now includes pen/eraser)
  type LiveTool = "select" | "hand" | "sticky" | "pen" | "eraser";
  const LIVE_ALLOWED_TOOLS: LiveTool[] = ["select", "sticky", "pen", "eraser"];
  const [tool, setTool] = useState<LiveTool>("select");
  function setToolSafe(next: LiveTool) {
    setTool(LIVE_ALLOWED_TOOLS.includes(next) ? next : "select");
  }

  // Pen tool state
  const [penColor, setPenColor] = useState("#111111");
  const [penWidth, setPenWidth] = useState(4);
  const [eraserSize, setEraserSize] = useState(20);
  const [penStrokes, setPenStrokes] = useState<PenStroke[]>([]);
  const [penOpen, setPenOpen] = useState(false);
  const [eraserOpen, setEraserOpen] = useState(false);

  // Pen color palette
  const PEN_PALETTE = [
    "#111111", // black
    "#ef4444", // red
    "#22c55e", // green
    "#3b82f6", // blue
    "#f59e0b", // amber
    "#a855f7", // purple
  ];

  // Pen width options
  const PEN_WIDTHS = [1, 2, 4, 6, 8, 12];

  // Eraser size options
  const ERASER_SIZES = [10, 20, 30, 40, 50];

  // Overlay elements (stickies on top)
  const [critEls, setCritEls] = useState<any[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // Focus + select all for sticky editing
  useEffect(() => {
    if (editingId) {
      const t = setTimeout(() => {
        if (textRef.current) {
          textRef.current.focus();
          textRef.current.select();
        }
      }, 0);
      return () => clearTimeout(t);
    }
  }, [editingId]);

  function beginEdit(el: { id: string; text?: string }) {
    setEditingId(el.id);
    setEditingText(el.text ?? "");
  }
  function commitEdit(save: boolean) {
    if (!editingId) return;
    if (save) {
      setCritEls(prev => prev.map(el => (el.id === editingId ? { ...el, text: editingText } : el)));
    }
    setEditingId(null);
    setEditingText("");
  }

  useEffect(() => { selectedIdsRef.current = new Set(selectedIds); }, [selectedIds]);

  useEffect(() => {
    if (activeBoardId && sessionId) setCritEls(getCritSessionElements(activeBoardId, sessionId));
  }, [activeBoardId, sessionId]);

  useEffect(() => {
    if (activeBoardId && sessionId) saveCritSessionElements(activeBoardId, sessionId, critEls);
  }, [activeBoardId, sessionId, critEls]);

  // Load pen strokes
  useEffect(() => {
    if (activeBoardId) {
      const storedStrokes = getPenStrokes(activeBoardId);
      if (storedStrokes && storedStrokes.length > 0) {
        const penStrokesData: PenStroke[] = storedStrokes.map((stroke) => ({
          id: stroke.id,
          points: stroke.points,
          color: stroke.color,
          width: stroke.width,
          timestamp: stroke.timestamp,
        }));
        setPenStrokes(penStrokesData);
      } else {
        setPenStrokes([]);
      }
    }
  }, [activeBoardId]);

  // Save pen strokes
  const persistPenStrokes = useCallback((strokes: PenStroke[]) => {
    if (!activeBoardId) return;
    setPenStrokes(strokes);
    const storedStrokes: StoredPenStroke[] = strokes.map((stroke) => ({
      ...stroke,
      boardId: activeBoardId,
    }));
    savePenStrokes(activeBoardId, storedStrokes);
  }, [activeBoardId]);

  const deleteSelected = useCallback(() => {
    const ids = selectedIdsRef.current;
    if (!ids || ids.size === 0) return;
    setCritEls(prev => prev.filter(el => !ids.has(el.id)));
    setSelectedIds([]); // clear selection after delete
  }, []);

  function isTypingInForm() {
    const el = document.activeElement as HTMLElement | null;
    const tag = (el?.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || el?.isContentEditable === true;
  }

  // Unified keyboard handler for both canvas and window listeners
  const handleKeyDown = useCallback((e: KeyboardEvent | React.KeyboardEvent) => {
    const key = (e as KeyboardEvent).key;
    const code = (e as KeyboardEvent).code;
    
    if (isTypingInForm()) return;

    // Delete/Backspace: delete selected elements
    if (key === "Delete" || key === "Backspace" || code === "Delete" || code === "Backspace") {
      if (selectedIdsRef.current.size > 0) {
        e.preventDefault?.();
        deleteSelected();
        return;
      }
    }

    // Tool hotkeys
    if (key === "v" || key === "V") {
      setToolSafe("select");
      setPenOpen(false);
      setEraserOpen(false);
    } else if (key === "n" || key === "N") {
      setToolSafe("sticky");
      setPenOpen(false);
      setEraserOpen(false);
    } else if (key === "p" || key === "P") {
      setTool(tool === "pen" ? "select" : "pen");
      setPenOpen(tool !== "pen");
      setEraserOpen(false);
    } else if (key === "e" || key === "E") {
      setTool(tool === "eraser" ? "select" : "eraser");
      setEraserOpen(tool !== "eraser");
      setPenOpen(false);
    } else if (key === "Escape") {
      // Only clear drawing tools if not clearing selection
      if (selectedIdsRef.current && selectedIdsRef.current.size > 0) {
        setSelectedIds([]);
        return;
      }
      setPenOpen(false);
      setEraserOpen(false);
    }

    // Cmd/Ctrl+A: select all elements
    const metaKey = e.ctrlKey || e.metaKey;
    if (metaKey && key.toLowerCase() === "a") {
      e.preventDefault?.();
      const all = critEls.map(el => el.id);
      setSelectedIds(all);
      return;
    }
  }, [deleteSelected, tool, critEls, setToolSafe]);

  // Focus canvas on mount and make it focusable
  useEffect(() => {
    canvasRef.current?.setAttribute("tabindex", "0");
    canvasRef.current?.focus();
  }, []);

  // Window fallback for keyboard events
  useEffect(() => {
    const wHandler = (e: KeyboardEvent) => handleKeyDown(e);
    window.addEventListener("keydown", wHandler);
    return () => {
      window.removeEventListener("keydown", wHandler);
    };
  }, [handleKeyDown]);

  // Normalize comments (ensure elementId is set from targetElementId if missing)
  const normalizedComments = useMemo(() => {
    return (comments || []).map(c => ({
      ...c,
      elementId: c.elementId ?? (c as any).targetElementId ?? null,
      targetElementId: (c as any).targetElementId ?? c.elementId ?? null,
    }));
  }, [comments]);

  // Filter comments by selected element (for Crit comments panel)
  const commentsForPanel = useMemo(() => {
    if (!activeElementId) return [];
    return normalizedComments.filter(c =>
      (c.elementId && c.elementId === activeElementId) ||
      (c.targetElementId && c.targetElementId === activeElementId)
    );
  }, [normalizedComments, activeElementId]);


  // ========================================================================
  // REFACTORED: Removed hostBoardId fallback effect
  // ========================================================================
  // The boardId is now always extracted from the session response in the
  // session validation effect. This effect is no longer needed.
  // ========================================================================

  // ========================================================================
  // Find or Create Crit Session on Page Load
  // ========================================================================
  // REFACTORED: Always fetch session first, then use its board_id to load the board
  // 
  // This effect ensures:
  // 1. Session is always fetched from Supabase using sessionId (no boardId needed)
  // 2. board_id is extracted from the session response
  // 3. activeBoardId is set from the session's board_id
  // 4. Board automatically loads because CritViewerCanvas uses activeBoardId
  // 
  // This removes the circular dependency where we needed boardId to fetch session,
  // but needed session to get boardId. Now we always fetch session first.
  // ========================================================================
  // REFACTORED: Early return if sessionId is missing (handles null params case)
  // This ensures we don't proceed with undefined sessionId
  useEffect(() => {
    // Early return if sessionId is missing (params was null or sessionId is undefined)
    if (!sessionId) {
      console.error('[live] ❌ No session ID provided in URL (params may be null)');
      setSessionValid(false);
      setSessionError('No session ID provided in URL. Please use a valid crit session link.');
      setSessionLoading(false);
      return;
    }

    const findOrCreateSession = async () => {
      setSessionLoading(true);
      setSessionError(null);

      try {
        // ========================================================================
        // Log session ID check
        // ========================================================================
        console.log('[live] ========================================');
        console.log('[live] 🔍 SESSION VALIDATION START');
        console.log('[live] ========================================');
        console.log('[live] Session ID from URL:', sessionId);
        console.log('[live] Fetching session from Supabase to get board_id...');
        console.log('[live] ========================================');

        // ========================================================================
        // Step 1: Check if session exists in Supabase
        // REFACTORED: Always fetch session first, no boardId needed
        // ========================================================================
        console.log('[live] 📡 Step 1: Fetching session from Supabase API...');
        const getSessionResponse = await fetch(`/api/crit-sessions/${sessionId}`);
        
        if (getSessionResponse.ok) {
          const getSessionResponseData = await getSessionResponse.json();
          const existingSession = getSessionResponseData.data || getSessionResponseData;
          
          if (existingSession) {
            console.log('[live] ✅ Step 2: Session found in Supabase:', {
              id: existingSession.id,
              sessionId: existingSession.sessionId,
              boardId: existingSession.boardId,
              status: existingSession.status,
              startedAt: existingSession.startedAt,
            });

            // ========================================================================
            // REFACTORED: Always set activeBoardId from session's board_id
            // This ensures the board is always loaded from the session
            // ========================================================================
            if (existingSession.boardId) {
              console.log('[live] 📋 Step 2.5: Setting activeBoardId from session:', existingSession.boardId);
              setActiveBoardId(existingSession.boardId);
            } else {
              console.error('[live] ❌ Step 2.5: Session found but boardId is missing');
              setSessionValid(false);
              setSessionError('Session found but board ID is missing. Cannot load board.');
              setSessionLoading(false);
              return;
            }

            // ========================================================================
            // Step 3: Check if session is active
            // ========================================================================
            if (existingSession.status === 'active') {
              console.log('[live] ✅ Step 3: Session is active');
              console.log('[live] ========================================');
              console.log('[live] ✅ SESSION VALIDATION SUCCESS');
              console.log('[live] ========================================');
              
              setSessionValid(true);
              setSessionError(null);
              setSessionLoading(false);
              return;
            } else {
              // ========================================================================
              // Step 4: Reactivate inactive session
              // ========================================================================
              console.log('[live] ⚠️ Step 3: Session is inactive, reactivating...');
              console.log('[live] Current status:', existingSession.status);
              
              const patchSessionResponse = await fetch(`/api/crit-sessions/${sessionId}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  status: 'active',
                  endedAt: null,
                }),
              });
              
              if (patchSessionResponse.ok) {
                const patchSessionResponseData = await patchSessionResponse.json();
                const reactivatedSession = patchSessionResponseData.data || patchSessionResponseData;
                
                console.log('[live] ✅ Step 4: Session reactivated successfully:', {
                  id: reactivatedSession.id,
                  sessionId: reactivatedSession.sessionId,
                  boardId: reactivatedSession.boardId,
                  status: reactivatedSession.status,
                });
                console.log('[live] ========================================');
                console.log('[live] ✅ SESSION VALIDATION SUCCESS (REACTIVATED)');
                console.log('[live] ========================================');
                
                // ========================================================================
                // REFACTORED: Ensure boardId is set from reactivated session
                // ========================================================================
                if (reactivatedSession.boardId) {
                  console.log('[live] 📋 Step 4.5: Setting activeBoardId from reactivated session:', reactivatedSession.boardId);
                  setActiveBoardId(reactivatedSession.boardId);
                }
                
                setSessionValid(true);
                setSessionError(null);
                setSessionLoading(false);
                return;
              } else {
                const patchErrorData = await patchSessionResponse.json().catch(() => ({}));
                const errorMessage = patchErrorData.error?.message || patchErrorData.error || 'Failed to reactivate session';
                
                console.error('[live] ❌ Step 4: Failed to reactivate session:', errorMessage);
                setSessionValid(false);
                setSessionError(`Failed to reactivate session: ${errorMessage}`);
                setSessionLoading(false);
                return;
              }
            }
          } else {
            console.log('[live] ⚠️ Step 2: Session not found in Supabase');
          }
        } else {
          // Session not found (404) or other error
          const getErrorData = await getSessionResponse.json().catch(() => ({}));
          console.log('[live] ⚠️ Step 1: Session not found or error:', {
            status: getSessionResponse.status,
            error: getErrorData,
          });
        }

        // ========================================================================
        // Step 5: Session not found - cannot create without boardId
        // REFACTORED: We cannot create a session without a boardId
        // If session doesn't exist, we need to show an error
        // The session should have been created by the host before sharing the link
        // ========================================================================
        console.log('[live] ❌ Step 5: Session not found in Supabase');
        console.log('[live] ========================================');
        console.log('[live] ❌ SESSION NOT FOUND');
        console.log('[live] ========================================');
        console.log('[live] The session with ID', sessionId, 'does not exist.');
        console.log('[live] This usually means:');
        console.log('[live]   1. The session link is invalid or expired');
        console.log('[live]   2. The session was never created by the host');
        console.log('[live]   3. The session was deleted from the database');
        console.log('[live] ========================================');
        
        setSessionValid(false);
        setSessionError(`Session not found. The crit session with ID "${sessionId}" does not exist. Please check the session link or ask the host to start a new crit session.`);
        setSessionLoading(false);
        return;
      } catch (error) {
        console.error('[live] ========================================');
        console.error('[live] ❌ SESSION VALIDATION ERROR');
        console.error('[live] ========================================');
        console.error('[live] Error:', error);
        console.error('[live] Error type:', typeof error);
        console.error('[live] Error message:', error instanceof Error ? error.message : 'Unknown error');
        console.error('[live] ========================================');
        
        setSessionValid(false);
        setSessionError(error instanceof Error ? error.message : 'Failed to validate or create session');
      } finally {
        setSessionLoading(false);
      }
    };

    findOrCreateSession();
    // ========================================================================
    // DEPENDENCY ARRAY: Only stable values
    // REFACTORED: Removed activeBoardId and hostBoardId dependencies
    // Session validation now always runs on mount and only depends on sessionId
    // The boardId is extracted from the session response, not needed as input
    // - sessionId: from URL params (stable reference when unchanged)
    // ========================================================================
  }, [sessionId]);

  // ========================================================================
  // Supabase Realtime message sending
  // ========================================================================
  // Sends messages via the guest connection's send method
  // With Supabase Realtime, comments are created via API which triggers
  // Realtime events automatically
  // ========================================================================
  const sendRealtime = useCallback(async (msg: CritMessage) => {
    try {
      if (rtRef.current) {
        await rtRef.current.send(msg);
      } else {
        console.warn("[live] Realtime connection not ready, message not sent:", msg);
      }
    } catch (e) {
      console.error("[live] sendRealtime failed", e);
    }
  }, []);

  // ========================================================================
  // Initialize Supabase Realtime guest connection
  // ========================================================================
  // This subscribes to real-time comment updates for the session's board.
  // When comments are created via API, Supabase Realtime broadcasts them
  // to all subscribers, and we receive them via the onMessage callback.
  // 
  // DEPENDENCY ARRAY FIX:
  // - Only includes stable values: sessionId, activeBoardId
  // - refetchComments is accessed via closure (from useComments hook)
  // - Async function is inside the effect, not in dependency array
  // ========================================================================
  useEffect(() => {
    // Early return if dependencies are not ready
    if (!activeBoardId || !sessionId) {
      console.log("[live] Waiting for activeBoardId before connecting to Realtime", {
        activeBoardId,
        sessionId,
      });
      return;
    }

    let mounted = true;
    
    // ========================================================================
    // Async function moved inside effect (not in dependency array)
    // ========================================================================
    const connectToRealtime = async () => {
      console.log("[live] 🔌 Connecting to Supabase Realtime as guest:", {
        sessionId,
        boardId: activeBoardId,
      });

      try {
        // ========================================================================
        // Create guest connection using Supabase Realtime
        // ========================================================================
        // createGuestWithRetry will:
        // 1. Verify the session exists and is active via API
        // 2. Subscribe to real-time comment updates for the board
        // 3. Provide send/onMessage methods for communication
        // ========================================================================
        const guest = await createGuestWithRetry(sessionId, activeBoardId);
        
        if (!mounted) {
          guest?.destroy();
          return;
        }

        if (!guest) {
          console.error("[live] ❌ Failed to create guest connection");
          setRtReady(true); // Mark as ready even if failed (offline mode)
          setIsOnline(false);
          return;
        }

        // ========================================================================
        // Set up message handler for incoming comments via Supabase Realtime
        // ========================================================================
        // When a comment is created by another user:
        // 1. Supabase Realtime broadcasts the INSERT event
        // 2. This handler receives the message
        // 3. We trigger a refetch to update the UI with the new comment
        // 
        // Note: The useComments hook also polls every 5 seconds as a fallback,
        // so comments will appear even if Realtime events are missed.
        // 
        // IMPORTANT: refetchComments is accessed via closure from useComments hook.
        // It's stable and doesn't need to be in the dependency array.
        // ========================================================================
        guest.onMessage((msg: CritMessage) => {
          if (msg.type === "comment") {
            console.log("[live] 📨 Received comment via Supabase Realtime:", msg.payload);
            
            // ========================================================================
            // Trigger refetch to update UI with new comment
            // ========================================================================
            // Comments are already in the database (created via API), so we just
            // need to refetch to update the UI. The useComments hook will handle
            // the refetch and update the comments state automatically.
            // ========================================================================
            // Access refetchComments via closure (stable function from useComments)
            refetchComments().catch((err) => {
              console.error("[live] Failed to refetch comments after Realtime update:", err);
            });
          }
        });

        rtRef.current = guest;
      setRtReady(true);
        setIsOnline(guest.isOpen()); // Track if Supabase Realtime is connected
        
        console.log("[live] ✅ Successfully connected to Supabase Realtime");
      } catch (error) {
        console.error("[live] ❌ Error connecting to Supabase Realtime:", error);
        setRtReady(true); // Mark as ready even if failed (offline mode)
        setIsOnline(false);
      }
    };

    // Call async function
    connectToRealtime();

    // ========================================================================
    // Cleanup function
    // ========================================================================
    return () => {
      mounted = false;
      if (rtRef.current) {
        console.log("[live] 🛑 Cleaning up Supabase Realtime guest connection");
        rtRef.current.destroy();
        rtRef.current = null;
      }
    };
    // ========================================================================
    // DEPENDENCY ARRAY: Only stable values (sessionId, activeBoardId)
    // ========================================================================
    // - sessionId: string from URL params (stable)
    // - activeBoardId: state value (stable reference when unchanged)
    // - refetchComments: NOT included - accessed via closure (stable from useComments)
    // ========================================================================
  }, [sessionId, activeBoardId]);

  // ========================================================================
  // Supabase Comment Creation Hook
  // ========================================================================
  // useCreateComment hook provides:
  // - createComment function to create comments in Supabase
  // - loading state for UI feedback
  // - error state for error handling
  // ========================================================================
  const { 
    createComment: createCommentApi, 
    loading: creatingComment, 
    error: createCommentError 
  } = useCreateComment();

  // ========================================================================
  // Handler for RightPanel onPostComment
  // ========================================================================
  // Creates a comment in Supabase via API. The comment will automatically
  // appear for all users via:
  // 1. Supabase Realtime subscription (instant updates)
  // 2. useComments polling (fallback, every 5 seconds)
  // ========================================================================
  const handlePostComment = useCallback(async (text: string, opts?: { category?: string; elementId?: string | null; makeTask?: boolean }) => {
    // ========================================================================
    // Validation: Check session and required fields
    // ========================================================================
    // Ensure session is valid before allowing comment submission
    // ========================================================================
    if (sessionValid === false) {
      const errorMsg = 'Cannot post comment: Session is invalid or not found. Please check the session ID.';
      setCommentFeedback({ type: 'error', message: errorMsg });
      console.error('[live] ❌', errorMsg);
      setTimeout(() => setCommentFeedback({ type: null, message: '' }), 5000);
      return;
    }

    if (sessionLoading) {
      const errorMsg = 'Please wait while the session is being validated...';
      setCommentFeedback({ type: 'error', message: errorMsg });
      console.warn('[live] ⚠️', errorMsg);
      setTimeout(() => setCommentFeedback({ type: null, message: '' }), 3000);
      return;
    }

    const eid = opts?.elementId ?? activeElementId ?? null;
    if (!eid) {
      const errorMsg = 'Please select an element to comment on';
      setCommentFeedback({ type: 'error', message: errorMsg });
      console.warn("[live] ⚠️ Cannot create comment without elementId");
      setTimeout(() => setCommentFeedback({ type: null, message: '' }), 3000);
      return;
    }
    
    if (!activeBoardId) {
      const errorMsg = 'Board ID is missing. Please refresh the page.';
      setCommentFeedback({ type: 'error', message: errorMsg });
      console.warn("[live] ⚠️ Cannot create comment without boardId");
      setTimeout(() => setCommentFeedback({ type: null, message: '' }), 5000);
      return;
    }

    const textBody = text.trim();
    if (!textBody) {
      const errorMsg = 'Comment text cannot be empty';
      setCommentFeedback({ type: 'error', message: errorMsg });
      console.warn("[live] ⚠️ Cannot create comment with empty text");
      setTimeout(() => setCommentFeedback({ type: null, message: '' }), 3000);
      return;
    }

    // Clear any previous feedback
    setCommentFeedback({ type: null, message: '' });

    console.debug("[live] Creating comment in Supabase", { 
      elementId: eid,
      text: textBody,
      boardId: activeBoardId,
      author: name || "Guest",
    });

    const cat = 'general' as const; // override to default

    try {
      // ========================================================================
      // Create comment in Supabase via API
      // ========================================================================
      // This will:
      // 1. Insert comment into Supabase comments table
      // 2. Trigger Supabase Realtime event (all subscribers receive update)
      // 3. Return the created comment for optimistic UI update
      // ========================================================================
      const newComment = await createCommentApi({
      boardId: activeBoardId,
        text: textBody,
        authorName: name || "Guest",
        author: name || "Guest", // Backward compatibility
      targetElementId: eid,
        elementId: eid, // Backward compatibility
        category: cat,
      task: opts?.makeTask || false,
        isTask: opts?.makeTask || false, // Backward compatibility
        source: "liveCrit", // Mark as live crit comment
      });

      if (newComment) {
        console.log("[live] ✅ Comment created successfully in Supabase:", newComment.id);
        
        // ========================================================================
        // Success Feedback
        // ========================================================================
        setCommentFeedback({ type: 'success', message: 'Comment posted successfully!' });
        setTimeout(() => setCommentFeedback({ type: null, message: '' }), 3000);
        
        // ========================================================================
        // Optimistic UI Update
        // ========================================================================
        // The comment will appear automatically via:
        // 1. Supabase Realtime subscription (instant, via useComments)
        // 2. useComments polling (fallback, every 5 seconds)
        // 
        // We can also trigger a manual refetch for instant feedback:
        // ========================================================================
        await refetchComments();
      } else {
        console.error("[live] ❌ Comment creation returned null");
        const errorMsg = createCommentError || 'Failed to create comment. Please try again.';
        setCommentFeedback({ type: 'error', message: errorMsg });
        console.error("[live] ❌ Create comment error:", createCommentError);
        setTimeout(() => setCommentFeedback({ type: null, message: '' }), 5000);
      }
    } catch (err) {
      console.error("[live] ❌ Failed to create comment:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setCommentFeedback({ type: 'error', message: `Failed to create comment: ${errorMessage}` });
      setTimeout(() => setCommentFeedback({ type: null, message: '' }), 5000);
    }
    // ========================================================================
    // DEPENDENCY ARRAY: Only stable values
    // ========================================================================
    // - activeElementId: derived state (stable reference when unchanged)
    // - activeBoardId: state value (stable reference when unchanged)
    // - name: string state (stable reference when unchanged)
    // - createCommentError: state value (stable reference when unchanged)
    // - sessionValid: state value (stable reference when unchanged)
    // - sessionLoading: state value (stable reference when unchanged)
    // - createCommentApi: NOT included - stable from useCreateComment hook, accessed via closure
    // - refetchComments: NOT included - stable from useComments hook, accessed via closure
    // ========================================================================
  }, [activeElementId, activeBoardId, name, createCommentError, sessionValid, sessionLoading]);

  // ========================================================================
  // Supabase Comment Deletion Hook
  // ========================================================================
  // useDeleteComment hook provides:
  // - deleteComment function to delete comments from Supabase
  // - loading state for UI feedback
  // - error state for error handling
  // ========================================================================
  const { 
    deleteComment: deleteCommentApi, 
    loading: deletingComment, 
    error: deleteCommentError 
  } = useDeleteComment();

  // ========================================================================
  // Handler for deleting comments
  // ========================================================================
  // Deletes a comment from Supabase via API. The deletion will automatically
  // appear for all users via:
  // 1. Supabase Realtime subscription (instant updates)
  // 2. useComments polling (fallback, every 5 seconds)
  // 
  // DEPENDENCY ARRAY FIX:
  // - Only includes stable values: activeBoardId, deleteCommentError
  // - deleteCommentApi and refetchComments are stable from hooks, accessed via closure
  // ========================================================================
  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!activeBoardId) {
      console.warn("[live] Cannot delete comment without boardId");
      return;
    }

    const ok = confirm("Delete this comment? This cannot be undone.");
    if (!ok) return;

    try {
      console.debug("[live] Deleting comment from Supabase", { commentId, boardId: activeBoardId });

      // ========================================================================
      // Delete comment from Supabase via API
      // ========================================================================
      // This will:
      // 1. Delete comment from Supabase comments table
      // 2. Trigger Supabase Realtime event (all subscribers receive update)
      // 3. useComments hook will automatically refetch and update UI
      // 
      // Access deleteCommentApi and refetchComments via closure (stable from hooks)
      // ========================================================================
      await deleteCommentApi(commentId);
      
      console.log("[live] ✅ Comment deleted successfully from Supabase:", commentId);
      
      // ========================================================================
      // Manual refetch for instant UI update
      // ========================================================================
      // The comment will be removed automatically via:
      // 1. Supabase Realtime subscription (instant, via useComments)
      // 2. useComments polling (fallback, every 5 seconds)
      // 
      // We can also trigger a manual refetch for instant feedback:
      // ========================================================================
      await refetchComments();
    } catch (err) {
      console.error("[live] ❌ Failed to delete comment:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      alert(`Failed to delete comment: ${errorMessage}`);
      
      if (deleteCommentError) {
        console.error("[live] ❌ Delete comment error:", deleteCommentError);
      }
    }
    // ========================================================================
    // DEPENDENCY ARRAY: Only stable values
    // ========================================================================
    // - activeBoardId: state value (stable reference when unchanged)
    // - deleteCommentError: state value (stable reference when unchanged)
    // - deleteCommentApi: NOT included - stable from useDeleteComment hook, accessed via closure
    // - refetchComments: NOT included - stable from useComments hook, accessed via closure
    // ========================================================================
  }, [activeBoardId, deleteCommentError]);

  // ========================================================================
  // Effect to send hello message when ready
  // ========================================================================
  // Sends a "hello" message via Supabase Realtime when:
  // - User has entered their name (hasName === true)
  // - Realtime connection is ready (rtReady === true)
  // - Name is not empty
  // 
  // DEPENDENCY ARRAY FIX:
  // - Only includes stable values: hasName, rtReady, name
  // - sendRealtime is from useCallback (stable), but accessed via closure
  // ========================================================================
  useEffect(() => {
    if (hasName && rtReady && name) {
      // Access sendRealtime via closure (stable function from useCallback)
      sendRealtime({ type: "hello", name });
    }
    // ========================================================================
    // DEPENDENCY ARRAY: Only stable values (hasName, rtReady, name)
    // ========================================================================
    // - hasName: boolean state (stable)
    // - rtReady: boolean state (stable)
    // - name: string state (stable reference when unchanged)
    // - sendRealtime: NOT included - accessed via closure (stable from useCallback)
    // ========================================================================
  }, [hasName, rtReady, name]);

  // Final render: no early return, use ternary instead
  return (
    <div className="min-h-screen">
      {!hasName ? (
        <div className="h-full w-full flex items-center justify-center p-6 min-h-screen bg-gray-50">
          <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Join Live Crit</h2>
            <p className="text-sm text-gray-600 mb-4">Enter your name to join the live crit session.</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) setHasName(true); }}
            />
            <button
              className="mt-4 w-full rounded-md bg-blue-600 text-white py-2 text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setHasName(true)}
              disabled={!name.trim()}
            >
              Continue
            </button>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50 p-6">
      {/* Online/Offline Status Indicator */}
      <div className="fixed top-4 right-4 z-50">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-md ${
          sessionValid === true && isOnline
            ? "bg-green-100 text-green-700 border border-green-300" 
            : sessionValid === true && !isOnline
            ? "bg-amber-100 text-amber-700 border border-amber-300"
            : sessionValid === false
            ? "bg-red-100 text-red-700 border border-red-300"
            : "bg-gray-100 text-gray-700 border border-gray-300"
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            sessionValid === true && isOnline 
              ? "bg-green-500 animate-pulse" 
              : sessionValid === true && !isOnline
              ? "bg-amber-500"
              : sessionValid === false
              ? "bg-red-500"
              : "bg-gray-500"
          }`} />
          <span>
            {sessionLoading 
              ? "Validating..." 
              : sessionValid === false 
              ? "Session Invalid" 
              : isOnline 
              ? "Live" 
              : "Offline"}
          </span>
        </div>
      </div>

      {/* Diagnostic HUD (temporary) */}
      {process.env.NODE_ENV !== "production" && (
        <div style={{position:"fixed",bottom:8,left:8,background:"#111",color:"#fff",padding:"8px 10px",borderRadius:8,zIndex:9999,fontSize:12,opacity:0.9,fontFamily:"monospace"}}>
          <div>activeElementId: {String(activeElementId || "null")}</div>
          <div>comments: {comments.length}</div>
          <div>filteredForActive: {commentsForPanel.length}</div>
        </div>
      )}
      
      <div className="h-full w-full grid grid-cols-12 gap-6">
        {/* LEFT: Viewer + Drawing */}
        <div 
          ref={canvasRef} 
          className="col-span-9 min-h-[75vh] rounded-xl border bg-white overflow-hidden relative z-0"
          tabIndex={0}
          onKeyDown={(e) => handleKeyDown(e)}
        >
          {/* Toolbar */}
          <div
            className="absolute left-4 top-4 z-[60] flex items-center gap-2 bg-white/90 backdrop-blur rounded-md shadow px-2 py-1 pointer-events-auto"
          >
            {/* Select */}
            <button
              type="button"
              className={`px-3 py-1 rounded-md border text-sm ${tool === "select" ? "bg-blue-100 border-blue-300" : "bg-white border-neutral-300"}`}
              onClick={() => { setToolSafe("select"); setPenOpen(false); setEraserOpen(false); }}
              title="Select (V)"
            >
              Select
            </button>

            {/* Sticky */}
            <button
              type="button"
              className={`px-3 py-1 rounded-md border text-sm ${tool === "sticky" ? "bg-blue-100 border-blue-300" : "bg-white border-neutral-300"}`}
              onClick={() => { setToolSafe("sticky"); setPenOpen(false); setEraserOpen(false); }}
              title="Sticky (N)"
            >
              Sticky
            </button>

            {/* Divider */}
            <div className="mx-2 h-5 w-px bg-neutral-300" />

            {/* Pen dropdown */}
            <div className="relative">
              <button
                type="button"
                className={`px-3 py-1 rounded-md border text-sm ${tool === "pen" ? "bg-black text-white" : "bg-white border-neutral-300"}`}
                onClick={() => {
                  setTool(tool === "pen" ? "select" : "pen");
                  setPenOpen(tool !== "pen");
                  setEraserOpen(false);
                }}
                title="Pen (P)"
              >
                Pen
              </button>

              {penOpen && (
                <div
                  className="absolute left-0 mt-2 w-[280px] rounded-lg border bg-white shadow z-[70] p-3"
                >
                  <div className="text-xs text-zinc-600 mb-2">Pen options</div>

                  {/* Colors */}
                  <div className="mb-3">
                    <div className="text-xs mb-1">Color</div>
                    <div className="flex flex-wrap gap-2">
                      {PEN_PALETTE.map((c) => (
                        <button
                          key={c}
                          onClick={() => { setPenColor(c); setTool("pen"); }}
                          className={`h-7 w-7 rounded-full border ${penColor === c ? "ring-2 ring-black" : ""}`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Thickness */}
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-xs">Thickness</div>
                    <div className="text-xs tabular-nums text-zinc-600">{penWidth}px</div>
                  </div>
                  <div className="flex gap-1">
                    {PEN_WIDTHS.map((width) => (
                      <button
                        key={width}
                        onClick={() => setPenWidth(width)}
                        className={`px-2 py-1 text-xs rounded ${
                          penWidth === width
                            ? "bg-black text-white"
                            : "bg-white text-gray-700 border border-gray-300"
                        }`}
                        title={`${width}px`}
                      >
                        {width}
                      </button>
                    ))}
                  </div>

                  {/* Undo / Redo / Clear - handled by PenTool component */}
                  <div className="mt-3 text-xs text-zinc-500">
                    Use Ctrl/Cmd+Z to undo, Ctrl/Cmd+Shift+Z to redo
                  </div>
                </div>
              )}
            </div>

            {/* Eraser dropdown */}
            <div className="relative">
              <button
                type="button"
                className={`px-3 py-1 rounded-md border text-sm ${tool === "eraser" ? "bg-black text-white" : "bg-white border-neutral-300"}`}
                onClick={() => {
                  setTool(tool === "eraser" ? "select" : "eraser");
                  setEraserOpen(tool !== "eraser");
                  setPenOpen(false);
                }}
                title="Eraser (E)"
              >
                Eraser
              </button>

              {eraserOpen && (
                <div
                  className="absolute left-0 mt-2 w-[280px] rounded-lg border bg-white shadow z-[70] p-3"
                >
                  <div className="text-xs text-zinc-600 mb-2">Eraser options</div>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-xs">Size</div>
                    <div className="text-xs tabular-nums text-zinc-600">{eraserSize}px</div>
                  </div>
                  <div className="flex gap-1">
                    {ERASER_SIZES.map((size) => (
                      <button
                        key={size}
                        onClick={() => setEraserSize(size)}
                        className={`px-2 py-1 text-xs rounded ${
                          eraserSize === size
                            ? "bg-black text-white"
                            : "bg-white text-gray-700 border border-gray-300"
                        }`}
                        title={`${size}px`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>

                  {/* Undo / Redo / Clear - handled by PenTool component */}
                  <div className="mt-3 text-xs text-zinc-500">
                    Use Ctrl/Cmd+Z to undo, Ctrl/Cmd+Shift+Z to redo
                  </div>
                </div>
              )}
            </div>

            {/* Delete button - only show when something is selected */}
            {selectedIds.length > 0 && (
              <>
                <div className="mx-2 h-5 w-px bg-neutral-300" />
                <button
                  type="button"
                  onClick={deleteSelected}
                  className="px-3 py-1 rounded-md border text-sm bg-white border-red-300 text-red-600 hover:bg-red-50"
                  title="Delete selection (Del/Backspace)"
                >
                  Delete
                </button>
              </>
            )}

            {/* Hint */}
            <div className="ml-2 text-[11px] text-zinc-500 hidden sm:block">
              V Select · N Sticky · P Pen · E Eraser · Hold Space to pan
            </div>
          </div>

          {/* Viewer */}
          {activeBoardId ? (
            <CritViewerCanvas
              boardId={activeBoardId}
              key={`canvas-${activeBoardId}`} // Force remount when boardId changes
              onSelectionChange={handleSelectElement}
              tool={tool}
              overlayElements={critEls}
              setOverlayElements={setCritEls}
              liveUserName={name}
              onSelectionChangeIds={setSelectedIdsSafe}
              // Note: StickyNote component now handles editing internally
              // These props are kept for backward compatibility but are no longer used
              editingId={null}
              onBeginEdit={() => {}}
              onCommitEdit={() => {}}
              editingText=""
              setEditingText={() => {}}
              editingTextRef={textRef as React.RefObject<HTMLTextAreaElement>}
              onSelectTarget={handleSelectTarget}
              onDeleteElements={deleteSelected}
              penColor={penColor}
              penWidth={penWidth}
              eraserSize={eraserSize}
              penStrokes={penStrokes}
              onPenStrokesChange={persistPenStrokes}
            />
          ) : (
            <div className="h-full w-full grid place-items-center text-zinc-500">
              {sessionLoading ? (
                <div className="text-center">
                  <div className="mb-2">Loading session and board...</div>
                  <div className="text-sm">Fetching crit session from Supabase</div>
                </div>
              ) : sessionError ? (
                <div className="text-center">
                  <div className="mb-2 text-red-500">Failed to load session</div>
                  <div className="text-sm">{sessionError}</div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="mb-2">Waiting for session...</div>
                  <div className="text-sm">Please wait while we load the crit session</div>
                </div>
              )}
            </div>
          )}

          {/* Drawing overlay - now handled by CritViewerCanvas PenDrawingCanvas */}
        </div>

        {/* RIGHT: Comments Panel */}
        <div className="col-span-3 relative z-10">
          <RightPanel
            comments={commentsForPanel}
            viewingSnapshot={null}
            selectedCard={null}
            author={name}
            boardId={activeBoardId || undefined}
            onPostComment={handlePostComment}
            onDeleteComment={handleDeleteComment}
            deletableAuthorName={name}
            selectedElementId={activeElementId || null}
            isCritActive={true}
            isDemo={false}
            singleThread={true}
            threadTitle="Comments"
            sortOrder="asc"
            composerAtTop={true}
          />
        </div>
      </div>
      </div>
      )}
    </div>
  );
}

