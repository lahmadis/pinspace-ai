"use client";

import { useState, use, useCallback, useRef, useEffect } from "react";
import SidebarNav from "@/components/SidebarNav";
// Import components directly from their files (not from index.ts)
// This ensures we get the default export correctly
import StudentBoardToolbar from "@/components/student-board/StudentBoardToolbar";
import StudentBoardCanvas from "@/components/student-board/StudentBoardCanvas";
import type { CanvasElement } from "@/types";
import { useBoardHistory } from "@/hooks/useBoardHistory";
import type { PenStroke } from "@/hooks/usePenDrawing";
import { saveBoardState, loadBoardState, clearBoardState, hasSavedBoardState } from "@/lib/studentBoardStorage";
import { useBoardCollaboration } from "@/hooks/useBoardCollaboration";
import PresenceIndicators from "@/components/student-board/PresenceIndicators";
import { useUser } from "@/contexts/UserContext";
import { useBoards } from "@/contexts/BoardsContext";
import UserRoleSelector from "@/components/student-board/UserRoleSelector";
import ActiveParticipants from "@/components/student-board/ActiveParticipants";
import { useBoardActivity } from "@/hooks/useBoardActivity";
import ActivityTimeline from "@/components/student-board/ActivityTimeline";
import ExportMenu from "@/components/student-board/ExportMenu";
import BoardsSidebar from "@/components/boards/BoardsSidebar";
import BoardNavigator from "@/components/boards/BoardNavigator";
import SectionManager from "@/components/boards/SectionManager";
import ThemeSelector from "@/components/ThemeSelector";
import { useAnnotationTools } from "@/hooks/useAnnotationTools";
import { useCritiquePoints } from "@/hooks/useCritiquePoints";
import AnnotationRenderer from "@/components/annotation/AnnotationRenderer";
import CritiquePointMarker from "@/components/annotation/CritiquePointMarker";
import CritiquePointDialog from "@/components/annotation/CritiquePointDialog";
import { generateCritiqueSummary, exportSummaryToHTML, exportSummaryToJSON, downloadFile } from "@/lib/critiqueExport";
import type { BoardExportState } from "@/lib/boardExport";
import type { AnnotationShape, CritiquePoint } from "@/types/annotation";

/**
 * Student Board Page
 * 
 * A simplified board workspace for students to create and organize their work.
 * 
 * Current Features:
 * - ✅ Toolbar with tool buttons (interactive tool switching)
 * - ✅ Canvas area for displaying elements
 * - ✅ Mock elements displayed statically
 * - ✅ Multi-element selection (click to select, Shift+Click to add/remove from selection)
 * - ✅ Visual selection highlight (blue ring) for all selected elements
 * - ✅ Group drag (all selected elements move together maintaining relative positions)
 * - ✅ Element creation (click creation tool, then click canvas to place new elements)
 * - ✅ Batch deletion (Delete button or Delete/Backspace key removes all selected elements)
 * 
 * Next Steps (in order):
 * 1. ✅ Add element selection (click to select, visual highlight) - DONE
 * 2. ✅ Add drag and drop (move selected elements) - DONE
 * 3. ✅ Add element creation (click tool, then click canvas to place) - DONE
 * 4. ✅ Add element deletion (Delete button or keyboard shortcut) - DONE
 * 4. Add element deletion (Delete key or toolbar button)
 * 5. Add inline editing (double-click to edit text)
 * 6. Add comments/annotations (for images and PDFs)
 * 7. Add undo/redo functionality
 * 8. Connect to backend API for persistence
 * 9. Extend to multi-select (Shift+Click, marquee selection)
 */

interface StudentBoardPageProps {
  params: Promise<{ id: string }>;
}

/**
 * StudentBoardPage - Main page component for the Student Board
 * 
 * Export: Default export (required for Next.js page components)
 * Next.js expects: export default function ComponentName
 * 
 * All sub-components use default exports and are imported with default imports:
 * - StudentBoardToolbar: default export, default import ✓
 * - StudentBoardCanvas: default export, default import ✓
 * - Element components: default exports, default imports ✓
 */
export default function StudentBoardPage({ params }: StudentBoardPageProps): JSX.Element {
  // Extract boardId from async params (Next.js 16+)
  // NOTE: use() hook always resolves - no conditional rendering based on params
  // This is safe because Next.js always provides params for route segments
  const { id: routeBoardId } = use(params);
  
  // Get boards context
  const { currentBoardId, currentBoard, switchBoard } = useBoards();
  
  // Use route board ID or current board ID
  const boardId = routeBoardId || currentBoardId || "";
  
  // Sync route with context
  useEffect(() => {
    if (routeBoardId && routeBoardId !== currentBoardId) {
      switchBoard(routeBoardId);
    }
  }, [routeBoardId, currentBoardId, switchBoard]);
  
  // ============================================================================
  // INITIAL DATA - Define initial elements before state declarations
  // ============================================================================
  const initialElements: (CanvasElement & { text?: string; color?: string })[] = [
    {
      id: "sticky-1",
      type: "sticky",
      x: 100,
      y: 80,
      width: 220,
      height: 180,
      z: 1,
      text: "Project Ideas\n\n• Concept A\n• Concept B\n• Research notes",
      color: "yellow",
    },
    {
      id: "image-1",
      type: "image",
      x: 400,
      y: 80,
      width: 350,
      height: 250,
      z: 1,
      src: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=400&h=300&fit=crop",
      title: "Reference Image",
    },
    {
      id: "pdf-1",
      type: "image" as any, // TODO: Add "pdf" to ElementType union
      x: 100,
      y: 320,
      width: 250,
      height: 320,
      z: 1,
      title: "PDF Document",
    },
  ];

  // ============================================================================
  // ALL useState HOOKS - Declared FIRST before any other hooks or functions
  // ============================================================================
  // CRITICAL: All useState hooks must be declared at the top to avoid
  // "Cannot access before initialization" errors. No useEffect, useCallback,
  // or functions should be declared before these.
  // ============================================================================
  
  // Tool state
  const [activeTool, setActiveTool] = useState("select");
  
  // Elements state - MUST be declared before any hooks that reference it
  // Store owner ID for each element to enforce permissions
  const [elements, setElements] = useState<(CanvasElement & { text?: string; color?: string; ownerId?: string })[]>(initialElements);

  // Comments state - Use function initializer for stable reference
  const [comments, setComments] = useState<Map<string, string[]>>(() => new Map());

  // Pen strokes state - Store all drawn strokes
  const [penStrokes, setPenStrokes] = useState<PenStroke[]>([]);

  // Selection state - Use function initializer for stable reference
  const [selectedElementIds, setSelectedElementIds] = useState<Set<string>>(() => new Set());

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  // Use function initializer for stable reference
  const [draggingElementIds, setDraggingElementIds] = useState<Set<string>>(() => new Set());
  const dragStartRef = useRef<{ 
    x: number; 
    y: number; 
    elementPositions: Map<string, { x: number; y: number }> 
  } | null>(null);

  // File upload refs - Hidden file inputs for image and PDF uploads
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadPositionRef = useRef<{ x: number; y: number; type: "image" | "pdf" } | null>(null);

  // ============================================================================
  // CUSTOM HOOKS - Declared after all useState hooks
  // ============================================================================
  // Undo/Redo history hook - uses initialElements (constant), not elements state
  const {
    present: historyState,
    canUndo,
    canRedo,
    recordHistory,
    updatePresent,
    undo: undoHistory,
    redo: redoHistory,
  } = useBoardHistory({
    elements: initialElements,
    comments: new Map<string, string[]>(), // Static empty map for initial state
    penStrokes: [], // Static empty array for initial state
  });

  // ============================================================================
  // USER AUTHENTICATION AND ROLE MANAGEMENT
  // ============================================================================
  // Get current user and role from context
  // Future: Real authentication integration
  // - Replace useUser() with NextAuth.js session
  // - Get user from JWT token or session cookie
  // - Fetch role from backend API
  // - Handle token refresh and expiration
  const { user, canEdit, canDelete, canModerate, canLockBoard, hasPermission } = useUser();
  
  // Track board lock state (instructors can lock/unlock)
  const [isBoardLocked, setIsBoardLocked] = useState(false);

  // ============================================================================
  // ACTIVITY TRACKING AND TIME TRAVEL
  // ============================================================================
  // Track all board actions for activity history and time travel
  // Records who did what, when, and what changed
  //
  // Future: Backend persistence
  // - Store activity in database
  // - Add activity API endpoints
  // - Support activity search and filtering
  // - Add activity export/analytics
  // ============================================================================
  const {
    activities,
    isTimeTraveling,
    timeTravelTarget,
    recordActivity,
    getStateAtTime,
    enterTimeTravel,
    exitTimeTravel,
    revertToTime,
  } = useBoardActivity({
    boardId,
    userId: user?.id || "",
    userName: user?.name,
    userRole: user?.role,
    maxActivities: 1000,
  });

  // Timeline panel state
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  // Export menu state
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Sections menu state
  const [isSectionsMenuOpen, setIsSectionsMenuOpen] = useState(false);

  // Critique menu state
  const [isCritiqueMenuOpen, setIsCritiqueMenuOpen] = useState(false);
  const [selectedCritiquePointId, setSelectedCritiquePointId] = useState<string | null>(null);

  // Debug info state - Only show on client-side to prevent hydration mismatch
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // Canvas ref for export
  const canvasRef = useRef<HTMLDivElement>(null);

  // Annotation tools
  const annotationTools = useAnnotationTools({
    enabled: ["rectangle", "ellipse", "arrow", "textbox", "highlight"].includes(activeTool),
    onAnnotationCreate: (annotation) => {
      // Add to history
      updatePresent({
        elements,
        comments,
        penStrokes,
        annotations: [...annotationTools.annotations, annotation],
      });
      // Record activity
      recordActivity("annotation_created", {
        annotationId: annotation.id,
        type: annotation.type,
      });
    },
  });

  // Critique points
  const critiquePoints = useCritiquePoints({
    boardId,
    enabled: activeTool === "critique",
    onPointCreate: (point) => {
      // Record activity
      recordActivity("critique_point_created", {
        pointId: point.id,
        number: point.number,
      });
    },
  });

  // Current time (for time travel)
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Pen drawing state
  const [currentStroke, setCurrentStroke] = useState<PenStroke | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const penColor = "#000000"; // Default black pen
  const penWidth = 3; // Default stroke width
  const eraserSize = 20; // Eraser radius in pixels

  // Update current time periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ============================================================================
  // REAL-TIME COLLABORATION
  // ============================================================================
  // Enable real-time collaboration with WebSocket
  // Syncs board state (elements, comments, pen strokes) across multiple users
  // Shows presence indicators (cursors, selections) for other users
  //
  // Future: Enhanced collaboration
  // - User identity and authentication (get userId from auth system)
  // - Permission roles (viewer, editor, admin) - restrict actions based on role
  // - User avatars and names in presence indicators
  // - Typing indicators for text editing
  // - Conflict resolution strategies (operational transforms, CRDTs)
  // - Message queuing for offline support with sync on reconnect
  // - Rate limiting and throttling for high-frequency updates
  // - Replace with Liveblocks/Ably/Yjs for production scalability
  // ============================================================================
  const {
    isConnected,
    connectionError,
    remoteUsers,
    broadcastStateUpdate,
    broadcastPresence,
    userId: collaborationUserId,
  } = useBoardCollaboration({
    boardId,
    userId: user?.id || "", // Use authenticated user ID
    enabled: true, // Enable collaboration
    onStateUpdate: (update) => {
      // Handle remote state updates
      // Future: Add conflict resolution (last-write-wins for now)
      if (update.elements) {
        setElements(update.elements);
        updatePresent({
          elements: update.elements,
          comments: comments, // Keep local comments
          penStrokes: penStrokes, // Keep local strokes
        });
      }
      if (update.comments) {
        const commentsMap = new Map<string, string[]>();
        update.comments.forEach(({ elementId, comments }) => {
          commentsMap.set(elementId, comments);
        });
        setComments(commentsMap);
        updatePresent({
          elements: elements,
          comments: commentsMap,
          penStrokes: penStrokes,
        });
      }
      if (update.penStrokes) {
        setPenStrokes(update.penStrokes);
        updatePresent({
          elements: elements,
          comments: comments,
          penStrokes: update.penStrokes,
        });
      }
    },
  });

  // ============================================================================
  // LOAD SAVED STATE ON MOUNT
  // ============================================================================
  // Load saved board state from localStorage on component mount
  // If saved state exists, restore elements, comments, and pen strokes
  // 
  // Future: Backend sync
  // - Load from server API instead of localStorage
  // - Handle loading states and errors
  // - Add conflict resolution for concurrent edits
  // - Add real-time sync on mount
  useEffect(() => {
    if (typeof window === "undefined") return; // SSR guard

    const savedState = loadBoardState(boardId);
    if (savedState) {
      // Restore elements
      setElements(savedState.elements);
      
      // Restore comments (convert array back to Map)
      const commentsMap = new Map<string, string[]>();
      savedState.comments.forEach(({ elementId, comments }) => {
        commentsMap.set(elementId, comments);
      });
      setComments(commentsMap);
      
      // Restore pen strokes
      setPenStrokes(savedState.penStrokes);
      
      // Update history with loaded state
      updatePresent({
        elements: savedState.elements,
        comments: commentsMap,
        penStrokes: savedState.penStrokes,
      });
      
      console.log(`Loaded saved board state for board ${boardId}`);
    } else {
      // No saved state - use initial elements
      setElements(historyState.elements);
      setComments(historyState.comments);
      setPenStrokes(historyState.penStrokes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]); // Only run once on mount when boardId is available

  // ============================================================================
  // SYNC EFFECTS - Keep local state in sync with history
  // ============================================================================
  // Sync local state with history state when undo/redo occurs
  useEffect(() => {
    setElements(historyState.elements);
    setComments(historyState.comments);
    setPenStrokes(historyState.penStrokes);
  }, [historyState]);

  // ============================================================================
  // HANDLERS - All handlers declared after all state and hooks, BEFORE any useEffect
  // ============================================================================
  // IMPORTANT: All handlers must be defined BEFORE any useEffect that references them
  // This prevents "Cannot access before initialization" errors
  // ============================================================================
  
  /**
   * Handle tool change
   */
  const handleToolChange = (tool: string) => {
    setActiveTool(tool);
    // Clear pending upload position when switching tools
    pendingUploadPositionRef.current = null;
  };
  
  /**
   * Handle element selection
   */
  const handleElementSelect = (elementId: string, isShiftKey: boolean = false) => {
    setSelectedElementIds((prev) => {
      const next = new Set(prev);
      
      if (isShiftKey) {
        // Shift+Click: Toggle element in/out of selection
        if (next.has(elementId)) {
          next.delete(elementId);
        } else {
          next.add(elementId);
        }
      } else {
        // Single click: Replace selection with single element
        if (next.has(elementId) && next.size === 1) {
          return new Set(); // Deselect if clicking the only selected element
        }
        return new Set([elementId]);
      }
      
      return next;
    });
  };
  
  /**
   * Handle deselection (clicking empty canvas space)
   */
  const handleDeselect = () => {
    setSelectedElementIds(new Set());
  };

  /**
   * Save current board state to localStorage
   */
  const handleSave = useCallback(() => {
    if (typeof window === "undefined") return;

    saveBoardState(boardId, elements, comments, penStrokes);
    console.log("Board state saved");
    
    // Future: Show success notification
    // toast.success("Board saved successfully");
  }, [boardId, elements, comments, penStrokes]);

  /**
   * Reset board to initial state and clear saved state
   * 
   * Clears all elements, comments, and pen strokes.
   * Removes saved state from localStorage.
   * Resets to initial empty state.
   * 
   * Future: Backend sync
   * - Clear state on server as well
   * - Add confirmation dialog before reset
   * - Add undo for reset action
   */
  const handleReset = useCallback(() => {
    if (typeof window === "undefined") return;

    // Confirm reset action
    if (!confirm("Are you sure you want to reset the board? This will clear all elements, comments, and drawings.")) {
      return;
    }

    // Clear saved state from localStorage
    clearBoardState(boardId);

    // Reset to initial state
    setElements(initialElements);
    setComments(new Map());
    setPenStrokes([]);
    setSelectedElementIds(new Set());

    // Reset history
    updatePresent({
      elements: initialElements,
      comments: new Map(),
      penStrokes: [],
    });

    console.log("Board reset to initial state");
    
    // Future: Show success notification
    // toast.success("Board reset successfully");
  }, [boardId, initialElements, updatePresent]);

  /**
   * Handle undo action
   * 
   * Restores the previous board state from history.
   * The history hook will update `historyState`, which triggers the useEffect
   * that syncs elements and comments. Selection is cleared to prevent confusion.
   */
  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    
    undoHistory();
    // Clear selection when undoing (prevents confusion with restored state)
    setSelectedElementIds(new Set());
  }, [canUndo, undoHistory]);

  /**
   * Handle redo action
   * 
   * Restores the next board state from history (re-applies undone action).
   * The history hook will update `historyState`, which triggers the useEffect
   * that syncs elements and comments. Selection is cleared to prevent confusion.
   */
  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    
    redoHistory();
    // Clear selection when redoing (prevents confusion with restored state)
    setSelectedElementIds(new Set());
  }, [canRedo, redoHistory]);

  /**
   * Handle element deletion
   * 
   * Batch deletion behavior:
   * - Deletes all selected elements at once
   * - Removes all selected elements from elements array in a single update
   * - Clears selection after deletion
   * - Records state in history before deletion for undo/redo
   * 
   * Future: Confirmation dialog
   * - Show confirmation for bulk deletions (e.g., "Delete 5 elements?")
   * - Add option to skip confirmation for trusted actions
   */
  const handleDelete = useCallback(() => {
    // Only delete if elements are selected
    if (selectedElementIds.size === 0) {
      return;
    }

    // Check if board is locked
    if (isBoardLocked && !canModerate()) {
      alert("Board is locked. Only instructors can make changes.");
      return;
    }

    // Check permissions for each selected element
    const elementsToDelete = elements.filter((el) => selectedElementIds.has(el.id));
    const unauthorizedElements = elementsToDelete.filter((el) => !canDelete((el as any).ownerId));
    
    if (unauthorizedElements.length > 0) {
      alert(`You don't have permission to delete ${unauthorizedElements.length} element(s).`);
      return;
    }

    // Record current state in history before deletion
    recordHistory();

    // Remove all selected elements from state in a single batch update
    setElements((prevElements) => {
      const newElements = prevElements.filter((el) => !selectedElementIds.has(el.id));
      // Update history with new state
      updatePresent({
        elements: newElements,
        comments: comments,
        penStrokes: penStrokes,
      });
      return newElements;
    });

    // Clear selection after deletion
    setSelectedElementIds(new Set());

    // Record activity
    const deletedElements = elements.filter((el) => selectedElementIds.has(el.id));
    recordActivity("element_delete", {
      elements: newElements,
      comments: Array.from(comments.entries()).map(([id, comments]) => ({ elementId: id, comments })),
      penStrokes,
    }, {
      elementCount: deletedElements.length,
      elementType: deletedElements[0]?.type,
    });
  }, [selectedElementIds, elements, comments, penStrokes, recordHistory, updatePresent, canDelete, canModerate, isBoardLocked, recordActivity]);

  /**
   * Handle keyboard shortcuts for deletion, undo, and redo
   * 
   * Listens for Delete, Backspace, Ctrl+Z, Ctrl+Y, Cmd+Z, Cmd+Shift+Z keys.
   * Only works when user is not typing in an input.
   * 
   * NOTE: This useEffect only runs client-side, so document is safe to use.
   */
  useEffect(() => {
    // Ensure we're client-side before accessing document
    if (typeof window === "undefined") return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const activeElement = document.activeElement;
      const isTyping =
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.getAttribute("contenteditable") === "true";

      if (isTyping) {
        return;
      }

      // Handle Delete or Backspace key
      if ((e.key === "Delete" || e.key === "Backspace") && selectedElementIds.size > 0) {
        e.preventDefault();
        e.stopPropagation();
        handleDelete();
        return;
      }

      // Handle Save: Ctrl+S (Windows/Linux) or Cmd+S (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        e.stopPropagation();
        handleSave();
        return;
      }

      // Handle Undo: Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleUndo();
        return;
      }

      // Handle Redo: Ctrl+Y (Windows/Linux) or Cmd+Shift+Z (Mac) or Ctrl+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z")
      ) {
        e.preventDefault();
        e.stopPropagation();
        handleRedo();
        return;
      }
    };

    // Attach global keyboard listener (client-side only)
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup on unmount
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedElementIds, handleDelete, handleUndo, handleRedo, handleSave]);

  /**
   * Handle drag start for an element
   * 
   * Multi-select drag behavior:
   * - Only allows dragging if element is in selection
   * - If multiple elements are selected, drags all selected elements together
   * - Stores initial mouse position and positions of all selected elements
   * - Maintains relative positions between elements during group drag
   * - Records state in history before drag starts (for undo/redo)
   * 
   * Future: Drag improvements
   * - Add drag threshold: only start drag after mouse moves X pixels
   * - Add drag delay: prevent accidental drags on quick clicks
   * - Support touch events for mobile devices
   */
  const handleDragStart = useCallback((elementId: string, clientX: number, clientY: number) => {
    // Check if board is locked
    if (isBoardLocked && !canModerate()) {
      return;
    }

    // Don't allow element dragging when pen/eraser tools are active
    if (["pen", "eraser"].includes(activeTool)) {
      return;
    }

    // Only allow dragging if element is in selection
    if (!selectedElementIds.has(elementId)) {
      return;
    }

    // Check edit permissions for selected elements
    const element = elements.find((el) => el.id === elementId);
    if (element && !canEdit((element as any).ownerId)) {
      alert("You don't have permission to move this element.");
      return;
    }

    // Record state in history before drag starts
    // This allows undoing the entire drag operation
    recordHistory();

    // Get all selected elements
    const selectedElements = elements.filter((el) => selectedElementIds.has(el.id));
    if (selectedElements.length === 0) return;

    // Store drag start information for all selected elements
    const elementPositions = new Map<string, { x: number; y: number }>();
    selectedElements.forEach((el) => {
      elementPositions.set(el.id, { x: el.x, y: el.y });
    });

    dragStartRef.current = {
      x: clientX,
      y: clientY,
      elementPositions,
    };

    setIsDragging(true);
    setDraggingElementIds(new Set(selectedElementIds));
  }, [activeTool, selectedElementIds, elements, recordHistory, canEdit, canModerate, isBoardLocked]);

  /**
   * Handle drag move (mouse move during drag)
   * 
   * Multi-select drag behavior:
   * - Calculates offset from drag start for all selected elements
   * - Updates positions of all selected elements simultaneously
   * - Maintains relative positions between elements (group drag)
   * - Does NOT record history during drag (only on drag end)
   * 
   * Future: Grid snapping
   * - Round positions to nearest grid cell: Math.round(newX / gridSize) * gridSize
   * - Apply snapping only if snap is enabled
   * 
   * Future: Boundary constraints
   * - Clamp positions to canvas bounds: Math.max(0, Math.min(newX, canvasWidth - elementWidth))
   * - Prevent dragging outside visible canvas area
   */
  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !dragStartRef.current || draggingElementIds.size === 0) {
      return;
    }

    // Calculate offset from drag start
    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;

    // Update positions of all selected elements
    // Note: History is NOT recorded during drag - only on drag end
    setElements((prevElements) =>
      prevElements.map((el) => {
        if (draggingElementIds.has(el.id)) {
          const startPos = dragStartRef.current!.elementPositions.get(el.id);
          if (startPos) {
            return {
              ...el,
              x: startPos.x + deltaX,
              y: startPos.y + deltaY,
            };
          }
        }
        return el;
      })
    );
  }, [isDragging, draggingElementIds]);

  /**
   * Handle drag end (mouse up after drag)
   * 
   * Cleans up drag state and finalizes element positions.
   * Records state in history after drag completes for undo/redo.
   * 
   * Future: Auto-save
   * - Trigger save to backend after drag completes
   * - Debounce saves if multiple rapid drags occur
   */
  const handleDragEnd = useCallback(() => {
    // Record state in history after drag completes
    // This allows undoing the entire drag operation
    recordHistory();
    updatePresent({
      elements: elements,
      comments: comments,
      penStrokes: penStrokes,
    });

    setIsDragging(false);
    setDraggingElementIds(new Set());
    dragStartRef.current = null;

    // Record activity
    const movedElements = elements.filter((el) => draggingElementIds.has(el.id));
    recordActivity("element_move", {
      elements: elements,
      comments: Array.from(comments.entries()).map(([id, comments]) => ({ elementId: id, comments })),
      penStrokes,
    }, {
      elementCount: movedElements.length,
    });
  }, [elements, comments, penStrokes, recordHistory, updatePresent, draggingElementIds, recordActivity]);

  // ============================================================================
  // ELEMENT CREATION - Create new elements on canvas
  // ============================================================================
  // Current Implementation: Click-to-create
  // - When creation tool is active (sticky, image, pdf), clicking canvas creates element
  // - New elements are added to elements array with unique IDs
  // - New elements are automatically selected after creation
  //
  // Future: File upload integration
  // - For images: Add file input, handle image upload, convert to data URL
  // - For PDFs: Add file input, handle PDF upload, extract pages, create thumbnails
  // - Add upload progress indicators
  // - Add error handling for invalid files
  // - Store files in backend/storage service
  // ============================================================================
  
  /**
   * Generate unique element ID
   * 
   * Creates a unique ID for new elements based on type and timestamp.
   * 
   * NOTE: This function uses Date.now() and Math.random() which are non-deterministic.
   * It should ONLY be called in client-side event handlers (useCallback), never during render.
   * This ensures SSR and client render match, preventing hydration errors.
   * 
   * Future: Better ID generation
   * - Use UUID library (uuid package)
   * - Use backend-generated IDs
   * - Ensure IDs are globally unique across sessions
   */
  const generateElementId = (type: string): string => {
    // Only called in client-side event handlers, safe from hydration issues
    if (typeof window === "undefined") {
      // Fallback for SSR (should never be called during SSR)
      return `${type}-ssr-0`;
    }
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${type}-${timestamp}-${random}`;
  };

  /**
   * Handle canvas click for element creation
   * 
   * When a creation tool is active, clicking the canvas:
   * - "sticky": Creates a sticky note immediately
   * - "image": Opens file picker for image upload (Shift+Click creates mock placeholder)
   * - "pdf": Opens file picker for PDF upload (Shift+Click creates mock placeholder)
   * 
   * For image/PDF tools, the file picker opens and the click position is stored.
   * After file selection, the element is created at that position.
   * 
   * Mock/Demo mode: Shift+Click with Image/PDF tool creates placeholder without file picker
   * This is useful for testing and demos without requiring actual file uploads.
   * 
   * Future: Server-side file storage
   * - Upload file to server/storage service (S3, Cloudinary, etc.)
   * - Get server URL instead of data URL
   * - Store file metadata (size, type, upload date)
   * - Add upload progress indicators
   * - Handle upload errors gracefully
   * 
   * Future: Multi-page PDF support
   * - Extract all pages from PDF
   * - Create multiple elements (one per page) or single element with page navigation
   * - Use PDF.js or similar library for rendering
   */
  const handleCanvasCreate = useCallback((canvasX: number, canvasY: number, isShiftKey?: boolean) => {
    // Check permissions
    if (!hasPermission("create")) {
      alert("You don't have permission to create elements.");
      return;
    }
    if (isBoardLocked && !canModerate()) {
      alert("Board is locked. Only instructors can make changes.");
      return;
    }

    // Only create if a creation tool is active
    if (!["sticky", "image", "pdf"].includes(activeTool)) {
      return;
    }

    // For image/PDF tools, open file picker (unless Shift+Click for mock creation)
    if (activeTool === "image") {
      if (isShiftKey) {
        // Shift+Click: Create mock placeholder without file picker
        createMockImageElement(canvasX, canvasY);
      } else {
        // Normal click: Open file picker
        pendingUploadPositionRef.current = { x: canvasX, y: canvasY, type: "image" };
        imageInputRef.current?.click();
      }
      return;
    }

    if (activeTool === "pdf") {
      if (isShiftKey) {
        // Shift+Click: Create mock placeholder without file picker
        createMockPDFElement(canvasX, canvasY);
      } else {
        // Normal click: Open file picker
        pendingUploadPositionRef.current = { x: canvasX, y: canvasY, type: "pdf" };
        pdfInputRef.current?.click();
      }
      return;
    }

    // For sticky notes, create immediately (no file upload needed)
    if (activeTool === "sticky") {
      const defaultWidth = 200;
      const defaultHeight = 150;
      const defaultZ = 1;

      const newElement: CanvasElement & { text?: string; color?: string; ownerId?: string } = {
        id: generateElementId("sticky"),
        type: "sticky",
        x: canvasX - defaultWidth / 2,
        y: canvasY - defaultHeight / 2,
        width: defaultWidth,
        height: defaultHeight,
        z: defaultZ,
        text: "New Sticky",
        color: "yellow",
        ownerId: user?.id, // Track who created this element
      };

      // Record state in history before creating new element
      recordHistory();

      // Add new element to state
      setElements((prevElements) => {
        const newElements = [...prevElements, newElement];
        updatePresent({
          elements: newElements,
          comments: comments,
          penStrokes: penStrokes,
        });
        return newElements;
      });

      // Automatically select the newly created element
      setSelectedElementIds(new Set([newElement.id]));

      // Record activity
      recordActivity("element_create", {
        elements: newElements,
        comments: Array.from(comments.entries()).map(([id, comments]) => ({ elementId: id, comments })),
        penStrokes,
      }, {
        elementId: newElement.id,
        elementType: newElement.type,
      });
    }
  }, [activeTool, comments, penStrokes, recordHistory, updatePresent, generateElementId, hasPermission, canModerate, isBoardLocked, user, recordActivity]);

  /**
   * Create mock image element (for testing/demo without file upload)
   */
  const createMockImageElement = useCallback((canvasX: number, canvasY: number) => {
    const defaultWidth = 300;
    const defaultHeight = 200;
    const defaultZ = 1;

    const newElement: CanvasElement & { text?: string; color?: string; ownerId?: string } = {
      id: generateElementId("image"),
      type: "image",
      x: canvasX - defaultWidth / 2,
      y: canvasY - defaultHeight / 2,
      width: defaultWidth,
      height: defaultHeight,
      z: defaultZ,
      title: "Image Placeholder",
      ownerId: user?.id, // Track who created this element
      // No src - will show placeholder UI
    };

    recordHistory();
    setElements((prevElements) => {
      const newElements = [...prevElements, newElement];
      updatePresent({
        elements: newElements,
        comments: comments,
        penStrokes: penStrokes,
      });
      return newElements;
    });
    setSelectedElementIds(new Set([newElement.id]));
  }, [comments, penStrokes, recordHistory, updatePresent, generateElementId]);

  /**
   * Create mock PDF element (for testing/demo without file upload)
   */
  const createMockPDFElement = useCallback((canvasX: number, canvasY: number) => {
    const defaultWidth = 250;
    const defaultHeight = 320;
    const defaultZ = 1;

    const newElement: CanvasElement & { text?: string; color?: string } = {
      id: generateElementId("pdf"),
      type: "image" as any, // TODO: Add "pdf" to ElementType union
      x: canvasX - defaultWidth / 2,
      y: canvasY - defaultHeight / 2,
      width: defaultWidth,
      height: defaultHeight,
      z: defaultZ,
      title: "PDF Document",
      // No src - will show placeholder UI
    };

    recordHistory();
    setElements((prevElements) => {
      const newElements = [...prevElements, newElement];
      updatePresent({
        elements: newElements,
        comments: comments,
        penStrokes: penStrokes,
      });
      return newElements;
    });
    setSelectedElementIds(new Set([newElement.id]));
  }, [comments, penStrokes, recordHistory, updatePresent, generateElementId]);

  /**
   * Handle image file upload
   * 
   * Processes selected image file and creates a board element at the stored position.
   * Converts image to data URL for display (client-side storage).
   * 
   * Future: Server-side storage
   * - Upload file to server: const response = await fetch('/api/upload', { method: 'POST', body: formData })
   * - Get server URL: const imageUrl = response.json().url
   * - Store server URL instead of data URL
   * - Add error handling for upload failures
   * - Add upload progress tracking
   */
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !pendingUploadPositionRef.current) {
      e.target.value = ""; // Reset input
      pendingUploadPositionRef.current = null;
      return;
    }

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      e.target.value = "";
      pendingUploadPositionRef.current = null;
      return;
    }

    const position = pendingUploadPositionRef.current;
    pendingUploadPositionRef.current = null;

    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        alert("Failed to read image file");
        e.target.value = "";
        return;
      }

      // Get image dimensions to set element size
      const img = new Image();
      img.onload = () => {
        // Constrain image size to reasonable bounds
        const maxWidth = 800;
        const maxHeight = 600;
        const aspectRatio = img.width / img.height;
        
        let width = Math.min(img.width, maxWidth);
        let height = Math.min(img.height, maxHeight);
        
        // Maintain aspect ratio
        if (width === maxWidth && img.width > maxWidth) {
          height = width / aspectRatio;
        } else if (height === maxHeight && img.height > maxHeight) {
          width = height * aspectRatio;
        }

        // Minimum size
        width = Math.max(width, 100);
        height = Math.max(height, 100);

        const newElement: CanvasElement & { text?: string; color?: string; src?: string; ownerId?: string } = {
          id: generateElementId("image"),
          type: "image",
          x: position.x - width / 2,
          y: position.y - height / 2,
          width: width,
          height: height,
          z: 1,
          title: file.name || "Uploaded Image",
          src: dataUrl, // Store data URL for display
          ownerId: user?.id, // Track who created this element
          // Future: Store server URL instead: imageUrl: serverUrl
        };

        // Record state in history before creating new element
        recordHistory();

        // Add new element to state
        setElements((prevElements) => {
          const newElements = [...prevElements, newElement];
          updatePresent({
            elements: newElements,
            comments: comments,
            penStrokes: penStrokes,
          });
          return newElements;
        });

        // Automatically select the newly created element
        setSelectedElementIds(new Set([newElement.id]));

        // Switch back to select tool after upload
        setActiveTool("select");
      };
      img.onerror = () => {
        alert("Failed to load image");
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      alert("Failed to read image file");
    };
    reader.readAsDataURL(file);

    e.target.value = ""; // Reset input for next upload
  }, [comments, penStrokes, recordHistory, updatePresent, generateElementId]);

  /**
   * Handle PDF file upload
   * 
   * Processes selected PDF file and creates a board element at the stored position.
   * For now, creates a placeholder element. In the future, will render first page.
   * 
   * Future: PDF rendering
   * - Use PDF.js or similar library to render first page
   * - Convert first page to image: const pageImage = await pdf.getPage(1).render({ scale: 2 })
   * - Store page image as data URL or server URL
   * - Add page navigation controls for multi-page PDFs
   * 
   * Future: Server-side PDF processing
   * - Upload PDF to server: const response = await fetch('/api/upload-pdf', { method: 'POST', body: formData })
   * - Server extracts first page and returns image URL
   * - Store PDF file reference and first page image URL
   * - Add endpoint to fetch other pages on demand
   */
  const handlePDFUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !pendingUploadPositionRef.current) {
      e.target.value = "";
      pendingUploadPositionRef.current = null;
      return;
    }

    const file = files[0];
    if (file.type !== "application/pdf") {
      alert("Please select a PDF file");
      e.target.value = "";
      pendingUploadPositionRef.current = null;
      return;
    }

    const position = pendingUploadPositionRef.current;
    pendingUploadPositionRef.current = null;

    // For now, create a placeholder element
    // Future: Use PDF.js to render first page
    // const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    // const firstPage = await pdf.getPage(1);
    // const viewport = firstPage.getViewport({ scale: 2 });
    // const canvas = document.createElement('canvas');
    // const context = canvas.getContext('2d');
    // await firstPage.render({ canvasContext: context, viewport }).promise;
    // const dataUrl = canvas.toDataURL('image/png');

    const defaultWidth = 250;
    const defaultHeight = 320;
    const defaultZ = 1;

    // Store file reference (for future processing)
    // Future: Upload to server and get URL
    const fileUrl = URL.createObjectURL(file); // Temporary blob URL

    const newElement: CanvasElement & { 
      text?: string; 
      color?: string; 
      src?: string;
      pdfFile?: File;
      pdfUrl?: string;
    } = {
      id: generateElementId("pdf"),
      type: "image" as any, // TODO: Add "pdf" to ElementType union
      x: position.x - defaultWidth / 2,
      y: position.y - defaultHeight / 2,
      width: defaultWidth,
      height: defaultHeight,
      z: defaultZ,
      title: file.name || "PDF Document",
      src: fileUrl, // Temporary blob URL (for future: first page image)
      ownerId: user?.id, // Track who created this element
      // Future: Store PDF-specific properties
      // pdfFile: file, // Store file reference for processing
      // pdfUrl: serverUrl, // Server URL for PDF file
      // pageCount: pdf.numPages, // Total number of pages
      // currentPage: 1, // Currently displayed page
    };

    // Record state in history before creating new element
    recordHistory();

    // Add new element to state
    setElements((prevElements) => {
      const newElements = [...prevElements, newElement];
      updatePresent({
        elements: newElements,
        comments: comments,
        penStrokes: penStrokes,
      });
      return newElements;
    });

    // Automatically select the newly created element
    setSelectedElementIds(new Set([newElement.id]));

    // Switch back to select tool after upload
    setActiveTool("select");

    // Record activity
    recordActivity("file_upload", {
      elements: newElements,
      comments: Array.from(comments.entries()).map(([id, comments]) => ({ elementId: id, comments })),
      penStrokes,
    }, {
      elementId: newElement.id,
      elementType: "pdf",
    });

    e.target.value = ""; // Reset input for next upload
  }, [comments, penStrokes, recordHistory, updatePresent, generateElementId, user, recordActivity]);

  // ============================================================================
  // PEN/ERASER TOOL HANDLERS
  // ============================================================================
  // Pen tool: Draw freehand strokes on the canvas
  // Eraser tool: Erase strokes by clicking/dragging over them
  //
  // Future: Tablet/touch support
  // - Add touch event handlers (touchstart, touchmove, touchend)
  // - Support pressure sensitivity for tablets
  // - Add palm rejection for touch devices
  //
  // Future: Collaborative drawing sync
  // - Sync strokes via WebSocket/Server-Sent Events
  // - Add user attribution to strokes (who drew what)
  // - Handle concurrent drawing from multiple users
  // - Add stroke conflict resolution
  // ============================================================================
  
  // Pen drawing state - Moved to top with other state declarations
  // NOTE: These are declared earlier in the component with other useState hooks
  // They are referenced here for documentation purposes only

  /**
   * Generate unique stroke ID (client-side only)
   */
  const generateStrokeId = useCallback((): string => {
    if (typeof window === "undefined") {
      return `stroke-ssr-0`;
    }
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback
    return `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Calculate distance from point to line segment (for eraser hit testing)
   */
  const distanceToSegment = useCallback((
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;
    
    if (lengthSq === 0) {
      const ddx = px - x1;
      const ddy = py - y1;
      return Math.sqrt(ddx * ddx + ddy * ddy);
    }
    
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    const ddx = px - projX;
    const ddy = py - projY;
    return Math.sqrt(ddx * ddx + ddy * ddy);
  }, []);

  /**
   * Check if a point intersects with a stroke (for eraser)
   */
  const hitTestStroke = useCallback((
    point: { x: number; y: number },
    stroke: PenStroke,
    eraserRadius: number
  ): boolean => {
    if (stroke.points.length < 2) {
      // Single point stroke
      const p = stroke.points[0];
      const dx = point.x - p.x;
      const dy = point.y - p.y;
      return Math.sqrt(dx * dx + dy * dy) <= eraserRadius;
    }
    
    // Check each segment
    for (let i = 0; i < stroke.points.length - 1; i++) {
      const p1 = stroke.points[i];
      const p2 = stroke.points[i + 1];
      const distance = distanceToSegment(point.x, point.y, p1.x, p1.y, p2.x, p2.y);
      if (distance <= eraserRadius) {
        return true;
      }
    }
    
    return false;
  }, [distanceToSegment]);

  /**
   * Handle pen/eraser start (mouse down on canvas)
   */
  const handlePenStart = useCallback((canvasX: number, canvasY: number) => {
    if (activeTool === "pen") {
      // Start drawing a new stroke
      const newStroke: PenStroke = {
        id: generateStrokeId(),
        points: [{ x: canvasX, y: canvasY }],
        color: penColor,
        width: penWidth,
        timestamp: Date.now(),
      };
      setCurrentStroke(newStroke);
      setIsDrawing(true);
      
      // Record state in history before drawing
      recordHistory();
    } else if (activeTool === "eraser") {
      // Start erasing - erase strokes at this point
      setIsDrawing(true);
      recordHistory();
      
      const erasedStrokes = penStrokes.filter(
        (stroke) => !hitTestStroke({ x: canvasX, y: canvasY }, stroke, eraserSize)
      );
      
      if (erasedStrokes.length !== penStrokes.length) {
        setPenStrokes(erasedStrokes);
        updatePresent({
          elements: elements,
          comments: comments,
          penStrokes: erasedStrokes,
        });
      }
    }
  }, [activeTool, penStrokes, elements, comments, generateStrokeId, hitTestStroke, eraserSize, recordHistory, updatePresent, hasPermission, canModerate, isBoardLocked]);

  /**
   * Handle pen/eraser move (mouse move while drawing)
   */
  const handlePenMove = useCallback((canvasX: number, canvasY: number) => {
    if (!isDrawing) return;

    if (activeTool === "pen" && currentStroke) {
      // Add point to current stroke
      setCurrentStroke((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          points: [...prev.points, { x: canvasX, y: canvasY }],
        };
      });
    } else if (activeTool === "eraser") {
      // Continuously erase strokes as cursor moves
      const erasedStrokes = penStrokes.filter(
        (stroke) => !hitTestStroke({ x: canvasX, y: canvasY }, stroke, eraserSize)
      );
      
      if (erasedStrokes.length !== penStrokes.length) {
        setPenStrokes(erasedStrokes);
        updatePresent({
          elements: elements,
          comments: comments,
          penStrokes: erasedStrokes,
        });
      }
    }
  }, [isDrawing, activeTool, currentStroke, penStrokes, elements, comments, hitTestStroke, eraserSize, updatePresent]);

  /**
   * Handle pen/eraser end (mouse up)
   */
  const handlePenEnd = useCallback(() => {
    if (!isDrawing) return;

    if (activeTool === "pen" && currentStroke) {
      // Save completed stroke
      if (currentStroke.points.length > 0) {
        const newStrokes = [...penStrokes, currentStroke];
        setPenStrokes(newStrokes);
        updatePresent({
          elements: elements,
          comments: comments,
          penStrokes: newStrokes,
        });

        // Record activity
        recordActivity("pen_stroke", {
          elements,
          comments: Array.from(comments.entries()).map(([id, comments]) => ({ elementId: id, comments })),
          penStrokes: newStrokes,
        }, {
          strokeCount: 1,
        });
      }
      setCurrentStroke(null);
    } else if (activeTool === "eraser") {
      // Finalize erasure - state already updated during move
      updatePresent({
        elements: elements,
        comments: comments,
        penStrokes: penStrokes,
      });

      // Record activity if strokes were erased
      const erasedCount = penStrokes.length;
      if (erasedCount > 0) {
        recordActivity("pen_erase", {
          elements,
          comments: Array.from(comments.entries()).map(([id, comments]) => ({ elementId: id, comments })),
          penStrokes,
        });
      }
    }

    setIsDrawing(false);
  }, [isDrawing, activeTool, currentStroke, penStrokes, elements, comments, updatePresent, recordActivity]);

  /**
   * Handle pen/eraser cancel (e.g., mouse leaves canvas)
   */
  const handlePenCancel = useCallback(() => {
    setCurrentStroke(null);
    setIsDrawing(false);
  }, []);

  // ============================================================================
  // SAVE/LOAD FUNCTIONALITY
  // ============================================================================
  // Save board state to localStorage
  // Includes all elements, comments, and pen strokes
  //
  // Future: Backend sync
  // - Replace localStorage with API call to backend
  // - Add authentication headers
  // - Handle save conflicts
  // - Add optimistic updates with rollback on failure
  // - Add save progress indicators
  // - Add auto-save with debouncing
  // NOTE: handleSave and handleReset are defined above with other handlers

  // ============================================================================
  // BROADCAST STATE CHANGES FOR COLLABORATION
  // ============================================================================
  // Broadcast state updates to other users when local state changes
  // Debounced to avoid excessive network traffic
  //
  // Future: Enhanced collaboration sync
  // - Use operational transforms for conflict-free merging
  // - Add per-operation sync (not just full state)
  // - Add compression for large states
  // - Add batching for rapid changes
  useEffect(() => {
    if (!isConnected) return; // Only broadcast when connected

    const timeoutId = setTimeout(() => {
      // Convert comments Map to array for serialization
      const commentsArray = Array.from(comments.entries()).map(([elementId, comments]) => ({
        elementId,
        comments,
      }));

      broadcastStateUpdate(elements, commentsArray, penStrokes);
    }, 200); // 200ms debounce for collaboration

    return () => clearTimeout(timeoutId);
  }, [isConnected, elements, comments, penStrokes, broadcastStateUpdate]);

  // ============================================================================
  // BROADCAST PRESENCE UPDATES (Cursor, Selection, Tool)
  // ============================================================================
  // Broadcast presence information (cursor position, selection, active tool)
  // Updates other users' presence indicators
  //
  // Future: Enhanced presence
  // - Track mouse movement more smoothly
  // - Add viewport/zoom information
  // - Add typing indicators
  // - Add user activity status
  useEffect(() => {
    if (!isConnected) return;

    const timeoutId = setTimeout(() => {
      // Broadcast selection and tool state
      broadcastPresence(
        undefined, // Cursor position would be tracked separately on mouse move
        Array.from(selectedElementIds),
        activeTool
      );
    }, 500); // Update presence every 500ms

    return () => clearTimeout(timeoutId);
  }, [isConnected, selectedElementIds, activeTool, broadcastPresence]);

  // ============================================================================
  // AUTO-SAVE ON STATE CHANGES (Debounced)
  // ============================================================================
  // Automatically save board state when elements, comments, or pen strokes change
  // Uses debouncing to avoid excessive saves during rapid changes
  //
  // Future: Backend sync
  // - Replace with API call
  // - Add save queue for offline support
  // - Add conflict resolution
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Debounce auto-save to avoid excessive saves
    const timeoutId = setTimeout(() => {
      // Only auto-save if board has been loaded (not on initial mount)
      // This prevents overwriting saved state with initial state on first load
      if (hasSavedBoardState(boardId) || elements.length > 0 || comments.size > 0 || penStrokes.length > 0) {
        saveBoardState(boardId, elements, comments, penStrokes);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [boardId, elements, comments, penStrokes]);

  // ============================================================================
  // CLIENT-SIDE ONLY RENDERING (Debug Info)
  // ============================================================================
  // Show debug info only on client-side to prevent hydration mismatch
  // Server renders nothing, client sets flag in useEffect after mount
  // This ensures server and client HTML always match during initial render
  useEffect(() => {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      setShowDebugInfo(true);
    }
  }, []);

  // ============================================================================
  // RETURN STATEMENT - Always renders visible content
  // ============================================================================
  // This return statement ALWAYS renders:
  // 1. SidebarNav (always visible, fixed width)
  // 2. Page header with title (always visible, white background)
  // 3. Toolbar with buttons (always visible, white background)
  // 4. Canvas with 3 mock elements (always visible, white board with elements)
  // 5. Debug info in dev mode (conditional but doesn't affect main content)
  // 
  // No conditional rendering that could hide main content
  // All elements use explicit Tailwind classes for visibility
  // ============================================================================
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-row">
      {/* Boards Sidebar - Board management and switching */}
      <BoardsSidebar />
      
      {/* Sidebar Navigation - Always visible, fixed width 256px (w-64) */}
      {/* NOTE: SidebarNav is a regular aside, not fixed, so it takes up space in flex layout */}
      <SidebarNav />

      {/* Main Content Area - Always visible, takes remaining space after sidebar */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Page Header - Always visible with white background and text */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-6 py-3 sm:py-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {currentBoard?.title || "Student Board"}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                {currentBoard?.description || "Workspace for organizing your projects and ideas"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeSelector />
            </div>
            <div className="flex items-center gap-4">
              {/* Active Participants */}
              <ActiveParticipants 
                remoteUsers={remoteUsers}
                currentUserId={collaborationUserId}
              />
              {/* User Role Selector */}
              <UserRoleSelector />
            </div>
          </div>
        </div>

        {/* Toolbar - Always visible with white background and tool buttons */}
        <StudentBoardToolbar 
          activeTool={activeTool} 
          onToolChange={handleToolChange}
          onDelete={handleDelete}
          hasSelection={selectedElementIds.size > 0}
          selectionCount={selectedElementIds.size}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onSave={handleSave}
          onReset={handleReset}
          onLockBoard={() => {
            const newLocked = !isBoardLocked;
            setIsBoardLocked(newLocked);
            // Record activity
            recordActivity(newLocked ? "board_lock" : "board_unlock", {
              elements,
              comments: Array.from(comments.entries()).map(([id, comments]) => ({ elementId: id, comments })),
              penStrokes,
            });
          }}
          isBoardLocked={isBoardLocked}
          onOpenTimeline={() => setIsTimelineOpen(true)}
          onOpenExport={() => setIsExportMenuOpen(true)}
          onOpenSections={() => setIsSectionsMenuOpen(true)}
        />

        {/* Hidden file inputs for image and PDF uploads */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
          aria-label="Upload image file"
        />
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handlePDFUpload}
          aria-label="Upload PDF file"
        />

        {/* Canvas Area - Always visible with white board and 3 mock elements */}
        <div className="relative flex-1" ref={canvasRef}>
          {/* Board Navigator - Minimap, pan/zoom controls */}
          <BoardNavigator
            canvasRef={canvasRef}
            sections={currentBoard?.sections || []}
            onSectionFocus={(sectionId) => {
              // Focus on section - could highlight or scroll to it
              console.log("Focus on section:", sectionId);
            }}
          />
          
          <StudentBoardCanvas 
            elements={elements}
            selectedElementIds={selectedElementIds}
            activeTool={activeTool}
            onElementSelect={handleElementSelect}
            onDeselect={handleDeselect}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onCanvasCreate={handleCanvasCreate}
            isDragging={isDragging}
            draggingElementIds={draggingElementIds}
            penStrokes={penStrokes}
            currentStroke={currentStroke}
            onPenStart={handlePenStart}
            onPenMove={handlePenMove}
            onPenEnd={handlePenEnd}
            onPenCancel={handlePenCancel}
            penColor={penColor}
            penWidth={penWidth}
            eraserSize={eraserSize}
            onMouseMove={(x, y) => {
              // Broadcast cursor position for presence
              if (isConnected) {
                broadcastPresence({ x, y }, Array.from(selectedElementIds), activeTool);
              }
            }}
          />
          
          {/* Presence Indicators - Show other users' cursors and selections */}
          <PresenceIndicators 
            remoteUsers={remoteUsers}
            currentUserId={collaborationUserId}
          />
          
          {/* Connection Status Indicator */}
          <div className="absolute top-4 right-4 z-50">
            <div className={`px-3 py-1.5 rounded-full text-xs font-medium shadow-lg ${
              isConnected 
                ? "bg-green-500 text-white" 
                : connectionError
                  ? "bg-red-500 text-white"
                  : "bg-yellow-500 text-white"
            }`}>
              {isConnected ? "🟢 Connected" : connectionError ? "🔴 Offline" : "🟡 Connecting..."}
            </div>
            {remoteUsers.size > 0 && (
              <div className="mt-2 px-3 py-1.5 rounded-full bg-blue-500 text-white text-xs font-medium shadow-lg">
                {remoteUsers.size} other user{remoteUsers.size > 1 ? "s" : ""}
              </div>
            )}
            {/* Time Travel Mode Indicator */}
            {isTimeTraveling && (
              <div className="mt-2 px-3 py-1.5 rounded-full bg-yellow-500 text-white text-xs font-medium shadow-lg flex items-center gap-2">
                <span>⏰</span>
                <span>Time Travel Mode</span>
              </div>
            )}
          </div>
        </div>

        {/* Activity Timeline Panel */}
        <ActivityTimeline
          activities={activities}
          isTimeTraveling={isTimeTraveling}
          timeTravelTarget={timeTravelTarget}
          currentTime={currentTime}
          onTimeTravel={(timestamp) => {
            enterTimeTravel(timestamp);
            const state = getStateAtTime(timestamp);
            if (state) {
              setElements(state.elements);
              const commentsMap = new Map<string, string[]>();
              state.comments.forEach(({ elementId, comments }) => {
                commentsMap.set(elementId, comments);
              });
              setComments(commentsMap);
              setPenStrokes(state.penStrokes);
              updatePresent({
                elements: state.elements,
                comments: commentsMap,
                penStrokes: state.penStrokes,
              });
            }
          }}
          onExitTimeTravel={() => {
            exitTimeTravel();
            // Reload current state (would reload from server in production)
            const savedState = loadBoardState(boardId);
            if (savedState) {
              setElements(savedState.elements);
              const commentsMap = new Map<string, string[]>();
              savedState.comments.forEach(({ elementId, comments }) => {
                commentsMap.set(elementId, comments);
              });
              setComments(commentsMap);
              setPenStrokes(savedState.penStrokes);
              updatePresent({
                elements: savedState.elements,
                comments: commentsMap,
                penStrokes: savedState.penStrokes,
              });
            }
          }}
          onRevertToTime={(timestamp) => {
            const state = revertToTime(timestamp);
            if (state) {
              setElements(state.elements);
              const commentsMap = new Map<string, string[]>();
              state.comments.forEach(({ elementId, comments }) => {
                commentsMap.set(elementId, comments);
              });
              setComments(commentsMap);
              setPenStrokes(state.penStrokes);
              updatePresent({
                elements: state.elements,
                comments: commentsMap,
                penStrokes: state.penStrokes,
              });
              exitTimeTravel();
            }
          }}
          isOpen={isTimelineOpen}
          onClose={() => setIsTimelineOpen(false)}
        />

        {/* Export Menu Modal */}
        {isExportMenuOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsExportMenuOpen(false)}>
            <div onClick={(e) => e.stopPropagation()}>
              <ExportMenu
                boardId={boardId}
                boardState={{
                  elements,
                  comments: Array.from(comments.entries()).map(([elementId, comments]) => ({ elementId, comments })),
                  penStrokes,
                  boardWidth: 1200, // Default board width - could be dynamic
                  boardHeight: 800, // Default board height - could be dynamic
                  boardBackground: "#ffffff",
                }}
                canvasRef={canvasRef}
                onClose={() => setIsExportMenuOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Sections Manager Modal */}
        {isSectionsMenuOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsSectionsMenuOpen(false)}>
            <div onClick={(e) => e.stopPropagation()}>
              <SectionManager
                boardId={boardId}
                onSectionFocus={(sectionId) => {
                  // Focus on section - handled by BoardNavigator
                  console.log("Focus on section:", sectionId);
                }}
              />
            </div>
          </div>
        )}

        {/* Future Components to Add: */}
        {/* 
        - Right Panel: Element properties, comments, layers
        - Bottom Status Bar: Zoom level, coordinates, grid toggle
        - Context Menu: Right-click actions for elements
        - Keyboard Shortcuts: Cmd/Ctrl+S to save, Delete to remove, etc.
        */}
      </div>
      
      {/* Debug Info - Only in development, client-side only to prevent hydration mismatch */}
      {/* NOTE: Using state flag (showDebugInfo) instead of typeof window check to prevent hydration mismatch */}
      {/* Server renders nothing, client sets flag in useEffect after mount */}
      {showDebugInfo && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-2 rounded z-50">
          Board ID: {boardId} | Tool: {activeTool} | Elements: {elements.length} | Selected: {selectedElementIds.size} | Dragging: {isDragging ? draggingElementIds.size : "no"}
        </div>
      )}
    </div>
  );
}
