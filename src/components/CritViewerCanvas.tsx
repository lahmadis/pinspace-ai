"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getElements, saveElements, getViewState, saveViewState } from "@/lib/storage";
import { makeElementKey } from "@/lib/elementKey";
import type { CanvasElement } from "@/types";
import { MARQUEE_BOX_CLASS, STICKY_CARD_CLASS, SELECTED_RING_CLASS } from "@/components/canvasStyles";
import { normalizeRect, getElementAABB, rectsIntersect } from "@/components/canvasShared";
import { emitSelection } from "@/lib/eventBus";
import StickyNote from "./StickyNote";
import PenTool from "./draw/PenTool";
import type { PenStroke } from "@/hooks/usePenDrawing";

export type CritViewerCanvasProps = {
  boardId: string;
  onSelectionChange?: (elementId: string | null) => void; // NEW: single canonical elementId or null
  onSelectTarget: (
    t: { type: "element"; elementId: string; elementKey?: string } | { type: "point"; point: { x: number; y: number } },
    view: { pan: { x: number; y: number }; zoom: number }
  ) => void;
  tool?: "select" | "hand" | "sticky" | "pen" | "eraser";
  overlayElements?: any[]; // crit session stickies
  setOverlayElements?: (els: any[] | ((prev: any[]) => any[])) => void; // update overlay elements
  liveUserName?: string; // for sticky author
  onSelectionChangeIds?: (ids: string[]) => void; // expose selectedIds array to parent (renamed to avoid conflict)
  onDeleteElements?: (ids: string[]) => void; // callback to delete elements from base board
  editingId?: string | null; // which sticky is being edited
  onBeginEdit?: (el: { id: string; text?: string }) => void; // start editing a sticky
  onCommitEdit?: (save: boolean) => void; // commit or cancel edit
  editingText?: string; // current editing text
  setEditingText?: (text: string) => void; // update editing text
  editingTextRef?: React.RefObject<HTMLTextAreaElement>; // ref to textarea
  // Pen tool props
  penColor?: string;
  penWidth?: number;
  eraserSize?: number;
  penStrokes?: PenStroke[];
  onPenStrokesChange?: (strokes: PenStroke[]) => void;
};

// View persistence helpers - now using unified storage

// Zoom constants
const MIN_ZOOM = 0.1; // 10% minimum
const MAX_ZOOM = 3.0; // 300% maximum
const ZOOM_STEP = 1.1; // per wheel notch (~10% step)
const ZOOM_STEP_TRACKPAD = 1.05; // smoother for trackpad pinch (~5% step)

// Shallow array equality helper for string arrays
const arraysEqual = (a?: string[], b?: string[]): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

export default function CritViewerCanvas({ boardId, onSelectionChange, onSelectTarget, tool = "select", overlayElements = [], setOverlayElements, liveUserName, onSelectionChangeIds, onDeleteElements, editingId, onBeginEdit, onCommitEdit, editingText, setEditingText, editingTextRef, penColor = "#000000", penWidth = 3, eraserSize = 20, penStrokes = [], onPenStrokesChange }: CritViewerCanvasProps) {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const outerRef = useRef<HTMLDivElement | null>(null); // visual only (border)
  const canvasRef = useRef<HTMLDivElement | null>(null); // math + events; NO border
  
  // Marquee selection state
  const [isMarquee, setIsMarquee] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);
  
  // Drag-to-create sticky state (NEW: for Sticky tool)
  const stickyDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isStickyDraggingRef = useRef(false);
  const [createRect, setCreateRect] = useState<null | { x: number; y: number; w: number; h: number }>(null);
  const DRAG_CREATE_MIN = 6; // px in canvas space; below this we do nothing
  
  // Legacy drag-to-create state (kept for compatibility)
  const [isCreating, setIsCreating] = useState(false);
  const [createStart, setCreateStart] = useState<{ x: number; y: number } | null>(null);
  const [createEnd, setCreateEnd] = useState<{ x: number; y: number } | null>(null);
  
  // Drag-to-move state for Select tool
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const startPosRef = useRef<Record<string, { x: number; y: number }>>({});
  const selectedAtDragRef = useRef<string[]>([]);
  const dragActiveRef = useRef(false);
  const DRAG_THRESHOLD = 3;
  
  // Keep refs for safe access in listeners
  const elementsRef = useRef(elements);
  const overlayElementsRef = useRef(overlayElements);
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);
  useEffect(() => {
    overlayElementsRef.current = overlayElements;
  }, [overlayElements]);
  
  // Refs keep latest values for render helpers and event listeners
  const selectedIdsRef = useRef<string[]>([]);
  const hoverIdRef = useRef<string | null>(null);
  
  // Track last emitted selection values to prevent infinite loops
  const lastEmittedSelectionRef = useRef<string[] | undefined>(undefined);
  const lastEmittedActiveIdRef = useRef<string | null | undefined>(undefined);
  
  // Pointer/click bookkeeping to avoid clearing on hover/move
  const isDownRef = useRef(false);            // pointer is currently down on canvas
  const downIdRef = useRef<string | null>(null); // elementId pressed on; null = background
  const movedRef = useRef(false);             // moved enough to consider a drag
  
  // Prevent sticky drag-create when we clicked an existing sticky
  const skipCreateRef = useRef(false);
  
  // Update ref for internal use (this is safe and doesn't trigger re-renders)
  useEffect(() => {
    selectedIdsRef.current = selectedIds ?? [];
  }, [selectedIds]);
  
  // Emit selection changes only when selection actually changes
  useEffect(() => {
    // Only emit if the array has actually changed
    if (arraysEqual(lastEmittedSelectionRef.current, selectedIds)) return;
    
    lastEmittedSelectionRef.current = selectedIds ? [...selectedIds] : undefined;
    onSelectionChangeIds?.(selectedIds ?? []);
  }, [selectedIds, onSelectionChangeIds]);
  
  // Emit single active element ID only when it actually changes
  useEffect(() => {
    // Compute the active element ID
    let elementId: string | null = null;
    if (selectedIds.length === 1) {
      const selectedId = selectedIds[0];
      // Check base board elements first
      const baseEl = elements.find(e => e.id === selectedId);
      if (baseEl) {
        elementId = baseEl.id; // Use the element's id directly
      } else {
        // Check overlay elements
        const overlayEl = overlayElements.find(e => e.id === selectedId);
        if (overlayEl) {
          elementId = overlayEl.elementId || overlayEl.id;
        }
      }
    }
    
    // Only emit if the active element ID has actually changed
    if (lastEmittedActiveIdRef.current === elementId) return;
    
    lastEmittedActiveIdRef.current = elementId;
    onSelectionChange?.(elementId);
    queueMicrotask(() => emitSelection({ boardId, elementId }));
  }, [selectedIds, onSelectionChange, boardId, elements, overlayElements]);
  
  useEffect(() => {
    hoverIdRef.current = hoverId ?? null;
  }, [hoverId]);
  
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const mouseStartRef = useRef<{ x: number; y: number } | null>(null);
  const spaceDownRef = useRef(false);
  const rightButtonDownRef = useRef(false); // tracks RMB held on our canvas
  
  // NEW: right-click panning state (independent of tool/selection)
  const isRmbPanningRef = useRef(false);
  const lastScreenPtRef = useRef<{ x: number; y: number } | null>(null);
  

  // Load elements and subscribe to cross-tab/same-tab updates
  useEffect(() => {
    if (!boardId) {
      setElements([]);
      return;
    }

    const loadElements = () => {
      try {
        const loaded = getElements(boardId) ?? [];
        console.log(`[CritViewerCanvas] Loading elements with boardId:`, boardId, { elementCount: loaded.length });
        setElements(loaded);
      } catch (err) {
        console.error("[CritViewerCanvas] Failed to load elements", err);
        setElements([]);
      }
    };

    // Initial load
    loadElements();

    // Listen for storage changes (cross-tab updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "pinspace_elements" && e.newValue) {
        loadElements();
      }
    };

    // Listen for custom events (same-tab updates)
    const handleElementsChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ boardId: string }>;
      if (customEvent.detail?.boardId === boardId) {
        loadElements();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("pinspace-elements-changed", handleElementsChanged);

    // Poll as fallback (every 2 seconds, similar to comments)
    const interval = setInterval(loadElements, 2000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("pinspace-elements-changed", handleElementsChanged);
      clearInterval(interval);
    };
  }, [boardId]);

  // Load view state and subscribe to cross-tab/same-tab updates
  useEffect(() => {
    if (!boardId) return;

    const loadView = () => {
      try {
        const saved = getViewState(boardId);
        if (saved) {
          setPan(saved.pan);
          setZoom(saved.zoom);
        } else {
          // Default values if no saved view
          setPan({ x: 0, y: 0 });
          setZoom(1);
        }
      } catch (err) {
        console.error("[CritViewerCanvas] Failed to load view state", err);
        setPan({ x: 0, y: 0 });
        setZoom(1);
      }
    };

    // Initial load
    loadView();

    // Listen for storage changes (cross-tab updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "pinspace_view" && e.newValue) {
        loadView();
      }
    };

    // Listen for custom events (same-tab updates)
    const handleViewChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ boardId: string; viewState: { pan: { x: number; y: number }; zoom: number } }>;
      if (customEvent.detail?.boardId === boardId) {
        const { viewState } = customEvent.detail;
        setPan(viewState.pan);
        setZoom(viewState.zoom);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("pinspace-view-changed", handleViewChanged);

    // Poll as fallback (every 1 second for view state)
    const interval = setInterval(loadView, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("pinspace-view-changed", handleViewChanged);
      clearInterval(interval);
    };
  }, [boardId]);

  // Persist view whenever pan/zoom changes (debounced)
  useEffect(() => {
    if (!boardId) return;
    const id = setTimeout(() => {
      saveViewState(boardId, { pan, zoom });
    }, 150);
    return () => clearTimeout(id);
  }, [boardId, pan.x, pan.y, zoom]);

  // --- Live-crit inline sticky editor state (deduped) ---
  // editingId: canonical elementId for base board stickies (uses CanvasElement.id)
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineEditingDraft, setInlineEditingDraft] = useState(""); // Draft text while editing
  const prevTextRef = useRef<string>(""); // Store previous text for cancel
  const inlineEditorRef = useRef<HTMLTextAreaElement | null>(null);
  
  // Overlay sticky editing state (for crit session stickies)
  // Note: StickyNote component handles editing internally, but we keep this state
  // for compatibility and to track which overlay sticky is being edited
  const [overlayEditingId, setOverlayEditingId] = useState<string | null>(null);
  const [overlayEditingDraft, setOverlayEditingDraft] = useState<string>("");
  
  // Refs for backward compatibility
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingEditIdRef = useRef<string | null>(null);
  
  // Stable refs for editing IDs
  const inlineEditingIdRef = useRef<string | null>(null);
  const overlayEditingIdRef = useRef<string | null>(null);
  useEffect(() => {
    inlineEditingIdRef.current = inlineEditingId;
  }, [inlineEditingId]);
  useEffect(() => {
    overlayEditingIdRef.current = overlayEditingId;
  }, [overlayEditingId]);

  function startEdit(el: { id: string; type: string; text?: string }) {
    if (el.type !== "sticky") return;
    
    // Normalize starting value: empty/placeholder becomes empty string
    const startValue =
      !el?.text || el.text.trim() === "" || el.text.trim() === "New text"
        ? ""
        : el.text;
    
    prevTextRef.current = el?.text ?? "";
    setInlineEditingDraft(startValue);
    setInlineEditingId(el.id);
    
    // Select the element when starting edit
    setSelectedIds([el.id]);
  }

  // Commit sticky edit: save text and exit edit mode + deselect
  function commitEdit(boardId: string, textOverride?: string) {
    const currentEditingId = inlineEditingIdRef.current;
    if (!currentEditingId) return;
    
    // Use override text if provided (for click-out), otherwise use current draft
    const textToCommit = textOverride !== undefined ? textOverride : inlineEditingDraft;
    
    // Normalize: empty string keeps placeholder visible later
    const finalText = textToCommit.trim() === "" ? "" : textToCommit;
    
    const els = getElements(boardId) || [];
    const next = els.map((e) =>
      e.id === currentEditingId ? { ...e, text: finalText, body: finalText } : e
    );
    saveElements(boardId, next);
    // Refresh local state
    setElements(next);
    setInlineEditingId(null);
    setInlineEditingDraft("");
    // Clear selection
    setSelectedIds([]);
  }

  // Cancel sticky edit: restore previous text and exit edit mode + deselect
  function cancelEdit() {
    const currentEditingId = inlineEditingIdRef.current;
    if (!currentEditingId) return;
    
    // Restore previous text
    const restore = prevTextRef.current ?? "";
    const els = getElements(boardId) || [];
    const next = els.map((e) =>
      e.id === currentEditingId ? { ...e, text: restore, body: restore } : e
    );
    saveElements(boardId, next);
    setElements(next);
    
    setInlineEditingId(null);
    setInlineEditingDraft("");
    // Clear selection
    setSelectedIds([]);
  }

  // Note: StickyNote component now handles editing internally for overlay stickies
  // These functions are no longer needed but kept for reference

  // Auto-focus textarea when editing starts
  useEffect(() => {
    if (inlineEditingId) {
      const t = setTimeout(() => {
        inlineEditorRef.current?.focus();
        // Place cursor at end
        const el = inlineEditorRef.current;
        if (el) {
          el.selectionStart = el.value.length;
          el.selectionEnd = el.value.length;
        }
      }, 0);
      return () => clearTimeout(t);
    }
  }, [inlineEditingId]);
  
  // Note: StickyNote component handles focus internally

  // Click-out handler: commit edit when clicking outside editor
  useEffect(() => {
    if (!inlineEditingId) return;
    
    const handleCanvasPointerDownCapture = (e: PointerEvent | MouseEvent) => {
      const target = e.target as Node;
      // If click is outside the editor, commit
      if (inlineEditorRef.current && !inlineEditorRef.current.contains(target)) {
        // Use the current text value from the textarea directly
        const currentText = inlineEditorRef.current.value || "";
        commitEdit(boardId, currentText);
      }
    };
    
    // Use capture phase to intercept before other handlers
    document.addEventListener("pointerdown", handleCanvasPointerDownCapture, true);
    document.addEventListener("mousedown", handleCanvasPointerDownCapture, true);
    
    return () => {
      document.removeEventListener("pointerdown", handleCanvasPointerDownCapture, true);
      document.removeEventListener("mousedown", handleCanvasPointerDownCapture, true);
    };
  }, [inlineEditingId, boardId]);

  // Track Space key (to toggle "hand" temporarily)
  useEffect(() => {
    const isEditable = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = (el.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return true;
      if (el.isContentEditable) return true;
      return false;
    };
    
    // Delete/Backspace key handler for group deletion
    const handleDeleteKey = (e: KeyboardEvent) => {
      if (tool !== "select") return;
      if (selectedIdsRef.current.length === 0) return;
      
      // Don't delete if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        
        const idsToDelete = selectedIdsRef.current;
        
        // Delete overlay elements (crit stickies)
        const overlayIds = idsToDelete.filter(id => 
          overlayElementsRef.current.some(el => el.id === id)
        );
        if (overlayIds.length > 0 && setOverlayElements) {
          setOverlayElements(prev => prev.filter(el => !overlayIds.includes(el.id)));
        }
        
        // Delete base board elements via callback
        const baseIds = idsToDelete.filter(id => 
          elementsRef.current.some(el => el.id === id)
        );
        if (baseIds.length > 0 && onDeleteElements) {
          onDeleteElements(baseIds);
        }
        
        // Clear selection after deletion
        setSelectedIds([]);
        queueMicrotask(() => onSelectionChange?.(null));
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      handleDeleteKey(e);
      if (e.code === "Space") {
        // Do NOT steal space when user is typing in fields
        if (isEditable(e.target)) return;
        spaceDownRef.current = true;
        e.preventDefault(); // block page scroll only when we're using space to pan
      }
    };
    
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceDownRef.current = false;
      }
    };
    
    // Keep these on window so you don't need focus on the canvas
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown as any);
      window.removeEventListener("keyup", onKeyUp as any);
    };
  }, []);
  
  // Zoom around the cursor position
  function zoomAtWheel(ev: WheelEvent) {
    const rect = getCanvasRect();
    if (!rect) return;
    
    const clientX = ev.clientX;
    const clientY = ev.clientY;
    
    // Detect trackpad pinch gesture (Ctrl/Cmd + wheel on Mac/Windows)
    const isPinch = ev.ctrlKey || ev.metaKey;
    
    // Get zoom delta - handle different delta modes
    let delta = 0;
    if (ev.deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
      // Pixel mode (most common for trackpads)
      delta = ev.deltaY;
    } else if (ev.deltaMode === WheelEvent.DOM_DELTA_LINE) {
      // Line mode (mouse wheel)
      delta = ev.deltaY * 16; // approximate pixels per line
    } else {
      // Page mode (rare)
      delta = ev.deltaY * 100;
    }
    
    // Use smoother zoom step for trackpad pinch, regular step for mouse wheel
    const zoomStep = isPinch ? ZOOM_STEP_TRACKPAD : ZOOM_STEP;
    
    // Calculate zoom factor based on delta
    // Negative delta = zoom in, positive = zoom out
    // Scale factor based on delta magnitude for smoother trackpad experience
    const deltaMagnitude = Math.abs(delta);
    const baseFactor = delta < 0 ? zoomStep : 1 / zoomStep;
    
    // For trackpad, use smaller increments based on delta magnitude
    // For mouse wheel, use fixed step
    const factor = isPinch 
      ? Math.pow(baseFactor, Math.min(deltaMagnitude / 100, 1)) // Smooth scaling for trackpad
      : baseFactor; // Fixed step for mouse wheel
    
    // Calculate board coordinates of the point under cursor before zoom
    const preX = (clientX - rect.left - pan.x) / zoom;
    const preY = (clientY - rect.top - pan.y) / zoom;
    
    // Apply zoom factor
    let nextZoom = zoom * factor;
    nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    
    // If zoom didn't change (hit limit), don't update
    if (Math.abs(nextZoom - zoom) < 0.001) return;
    
    // Calculate new pan to keep the point under cursor in the same screen position
    const nextPanX = clientX - rect.left - preX * nextZoom;
    const nextPanY = clientY - rect.top - preY * nextZoom;
    
    // Update zoom and pan atomically
    setZoom(nextZoom);
    setPan({ x: nextPanX, y: nextPanY });
  }
  
  // Native wheel listener for zoom (supports mouse wheel and trackpad pinch)
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    
    const onWheel = (e: WheelEvent) => {
      // Always prevent default to block page scroll
      e.preventDefault();
      e.stopPropagation();
      
      // Handle zoom (works for both mouse wheel and trackpad pinch)
      zoomAtWheel(e);
    };
    
    // IMPORTANT: passive:false so preventDefault actually works
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel as EventListener);
  }, [pan.x, pan.y, zoom]);


  // Robust coordinate helpers
  function getCanvasRect(target?: HTMLElement | null) {
    const node = target ?? canvasRef.current;
    return node ? node.getBoundingClientRect() : null;
  }

  function toBoardPoint(clientX: number, clientY: number, target?: HTMLElement | null) {
    const rect = getCanvasRect(target);
    if (!rect) return { x: 0, y: 0 }; // early guard
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }
  
  /**
   * Calculate the center of the visible viewport in canvas coordinates.
   * This accounts for the current zoom level and pan offset, so the center
   * represents the actual canvas position that appears at the middle of the screen.
   * 
   * Formula:
   * 1. Get viewport dimensions from canvas element's bounding rect
   * 2. Calculate screen center: (viewportWidth / 2, viewportHeight / 2)
   * 3. Convert screen center to canvas coords: ((screenX - pan.x) / zoom, (screenY - pan.y) / zoom)
   * 
   * This ensures sticky notes appear at the visual center of what the user sees,
   * regardless of zoom level or pan position.
   */
  function getViewportCenter(): { x: number; y: number } {
    const rect = getCanvasRect();
    if (!rect) return { x: 0, y: 0 };
    // Screen center coordinates (relative to canvas element)
    const screenCenterX = rect.width / 2;
    const screenCenterY = rect.height / 2;
    // Convert to canvas coordinates by accounting for pan and zoom
    return {
      x: (screenCenterX - pan.x) / zoom,
      y: (screenCenterY - pan.y) / zoom,
    };
  }

  const clientToCanvas = (e: React.MouseEvent | MouseEvent) => {
    return toBoardPoint(e.clientX, e.clientY);
  };

  // Helper to normalize rectangle from two points
  function normRect(a: { x: number; y: number }, b: { x: number; y: number }) {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const w = Math.max(1, Math.abs(b.x - a.x));
    const h = Math.max(1, Math.abs(b.y - a.y));
    return { x, y, w, h };
  }

  /**
   * Convert screen (mouse) coordinates to canvas (virtual board) coordinates.
   * This is the inverse of the canvas transform: translate(pan.x, pan.y) scale(zoom)
   * 
   * Formula breakdown:
   * 1. Get mouse position relative to canvas element: clientX/Y - rect.left/top
   * 2. Account for pan offset: subtract pan.x/y (pan moves the canvas in screen space)
   * 3. Account for zoom: divide by zoom (zoom scales the canvas, so we need to "unscale")
   * 
   * Result: The canvas coordinate where the mouse pointer is, accounting for current view transform.
   */
  function toCanvasPoint(e: PointerEvent | WheelEvent | MouseEvent | React.PointerEvent) {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Step 1: Get mouse position relative to canvas element (screen coordinates)
    const screenX = (e as PointerEvent).clientX - rect.left;
    const screenY = (e as PointerEvent).clientY - rect.top;
    
    // Step 2 & 3: Convert screen coords to canvas coords
    // The canvas is transformed with: translate(pan.x, pan.y) scale(zoom)
    // To reverse: subtract pan offset, then divide by zoom scale
    const canvasX = (screenX - pan.x) / zoom;
    const canvasY = (screenY - pan.y) / zoom;
    
    return { x: canvasX, y: canvasY };
  }

  // Helper to hit-test at screen coordinates
  function hitTestAt(clientX: number, clientY: number, opts?: { allowImages?: boolean }) {
    if (!canvasRef.current) return { hit: null };
    const rect = canvasRef.current.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    const pt = {
      x: (screenX - pan.x) / (zoom || 1),
      y: (screenY - pan.y) / (zoom || 1),
    };
    const allowImages = opts?.allowImages ?? true;
    const hit = hitTest(pt, allowImages);
    if (!hit) return { hit: null };
    // Return hit with elementId for canonical ID
    const elementId = (hit as any).elementId || hit.id;
    return { hit: { ...hit, elementId } };
  }

  const hitTest = (pt: { x: number; y: number }, allowImages: boolean = true) => {
    // Check overlay elements first (they're on top)
    for (let i = overlayElements.length - 1; i >= 0; i--) {
      const el = overlayElements[i];
      if (el.type === "sticky" && el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
        const x2 = el.x + el.width;
        const y2 = el.y + el.height;
        if (pt.x >= el.x && pt.x <= x2 && pt.y >= el.y && pt.y <= y2) {
          return { ...el, id: el.id, type: "sticky" as const, x: el.x, y: el.y, width: el.width, height: el.height };
        }
      }
    }
    // Then check base elements
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      // Skip images when allowImages is false (sticky mode)
      if (!allowImages && el.type === "image") continue;
      const x2 = el.x + el.width;
      const y2 = el.y + el.height;
      if (pt.x >= el.x && pt.x <= x2 && pt.y >= el.y && pt.y <= y2) {
        return el;
      }
    }
    return null;
  };
  
  // Helper to get all elements (base + overlay) for selection/marquee.
  // Uses refs, so it does not need to be memoized with a hook.
  function getAllElements() {
    const all: Array<{ id: string; x: number; y: number; width: number; height: number }> = [];
    // Add base elements from ref
    (elementsRef.current ?? []).forEach(el => {
      all.push({ id: el.id, x: el.x, y: el.y, width: el.width, height: el.height });
    });
    // Add overlay stickies from ref
    (overlayElementsRef.current ?? []).forEach(el => {
      if (el.type === "sticky" && el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
        all.push({ id: el.id, x: el.x, y: el.y, width: el.width, height: el.height });
      }
    });
    return all;
  }
  

  // Global mouse listeners for spacebar panning only (drag/marquee handled by pointer handlers)
  useEffect(() => {
    function onMove(ev: MouseEvent) {
      // Only handle spacebar panning here
      if (isPanningRef.current && mouseStartRef.current && panStartRef.current && spaceDownRef.current) {
        const dx = ev.clientX - mouseStartRef.current.x;
        const dy = ev.clientY - mouseStartRef.current.y;
        setPan({ x: panStartRef.current.x + dx, y: panStartRef.current.y + dy });
        return;
      }
    }
    
    function onUp() {
      // End spacebar panning
      if (isPanningRef.current && spaceDownRef.current) {
        isPanningRef.current = false;
        mouseStartRef.current = null;
        panStartRef.current = null;
        return;
      }
    }
    
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [pan]);
  
  // Suppress browser menu while panning
  useEffect(() => {
    const onCtx = (e: MouseEvent) => {
      // Block the menu if we're panning OR the right button is held down
      if (isPanningRef.current || rightButtonDownRef.current) {
        e.preventDefault();
      }
    };
    // capture=true so we intercept before the page handles it
    window.addEventListener("contextmenu", onCtx, true); // capture=true
    return () => window.removeEventListener("contextmenu", onCtx, true);
  }, []);
  
  // Disable context menu entirely inside the canvas
  useEffect(() => {
    const root = canvasRef.current as HTMLElement | null;
    if (!root) return;
    
    const blockCtx = (e: MouseEvent) => {
      // If the event happened inside the canvas, kill it
      if (root.contains(e.target as Node)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    // Capture phase so we intercept before the page handles it
    document.addEventListener("contextmenu", blockCtx, true);
    return () => document.removeEventListener("contextmenu", blockCtx, true);
  }, []);
  
  // Keyboard shortcuts handler
  useEffect(() => {
    const isTypingInForm = () => {
      const el = document.activeElement as HTMLElement | null;
      const tag = (el?.tagName || "").toLowerCase();
      return tag === "input" || tag === "textarea" || el?.isContentEditable === true;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingInForm()) return; // Don't interfere with typing in inputs
      if (inlineEditingId) return; // Don't interfere with editing base board stickies
      // Note: Overlay stickies editing is handled by StickyNote component
      
      // Esc: clear selection
      if (e.key === "Escape") {
        if (isStickyDraggingRef.current) {
          // Cancel sticky creation
          isStickyDraggingRef.current = false;
          stickyDragStartRef.current = null;
          setCreateRect(null);
        } else {
          // Clear selection
          setSelectedIds([]);
          queueMicrotask(() => onSelectionChange?.(null));
        }
        return;
      }
      
      // Cmd/Ctrl+A: select all elements
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "a") {
        e.preventDefault();
        const allEls = getAllElements();
        const allIds = allEls.map(el => el.id);
        setSelectedIds(allIds);
        if (allIds.length > 0) {
          const firstEl = allEls.find(e => e.id === allIds[0]);
          if (firstEl) {
            const canonicalElementId = (firstEl as any).elementId || firstEl.id;
            queueMicrotask(() => onSelectionChange?.(canonicalElementId));
          }
        }
        return;
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inlineEditingId, overlayEditingId, onSelectionChange]);

  // Render shape as SVG (stroke-only, no fill)
  const renderShape = (el: CanvasElement, selected: boolean = false) => {
    const stroke = selected ? "#2563eb" : "#1f2937";
    const fill = "none";
    const sw = el.strokeWidth ?? 2;

    const w = Math.max(el.width, 1);
    const h = Math.max(el.height, 1);

    switch (el.shapeType) {
      case "rect":
        return (
          <rect x={0} y={0} width={w} height={h} rx={6} ry={6} fill={fill} stroke={stroke} strokeWidth={sw} />
        );
      case "circle":
        return (
          <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={fill} stroke={stroke} strokeWidth={sw} />
        );
      case "triangle":
        const trianglePath = `M ${w / 2} 0 L ${w} ${h} L 0 ${h} Z`;
        return (
          <path d={trianglePath} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        );
      case "diamond":
        const diamondPath = `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`;
        return (
          <path d={diamondPath} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        );
      case "bubble":
        const tailW = Math.min(w * 0.2, 20);
        const tailH = Math.min(h * 0.2, 20);
        return (
          <path
            d={`
              M 8 0
              H ${w - 8}
              Q ${w} 0 ${w} 8
              V ${h - 8}
              Q ${w} ${h} ${w - 8} ${h}
              H ${tailW + 12}
              L ${tailW} ${h + tailH}
              L ${tailW + 4} ${h}
              H 8
              Q 0 ${h} 0 ${h - 8}
              V 8
              Q 0 0 8 0
              Z
            `}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        );
      case "star":
        const starPoints: Array<[number, number]> = [];
        const cx = w / 2;
        const cy = h / 2;
        const outer = Math.min(w, h) * 0.5;
        const inner = outer * 0.5;
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? outer : inner;
          const a = (-Math.PI / 2) + (i * Math.PI / 5);
          starPoints.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
        }
        const starPath = `M ${starPoints[0][0]} ${starPoints[0][1]} ` +
          starPoints.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(" ") + " Z";
        return (
          <path d={starPath} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        );
      case "arrow":
        const bodyW = w * 0.6;
        const arrowPath = `
          M 0 ${h * 0.25}
          L ${bodyW} ${h * 0.25}
          L ${bodyW} ${h * 0.1}
          L ${w} ${h / 2}
          L ${bodyW} ${h * 0.9}
          L ${bodyW} ${h * 0.75}
          L 0 ${h * 0.75}
          Z
        `;
        return (
          <path d={arrowPath} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        );
      default:
        return (
          <rect x={0} y={0} width={w} height={h} rx={6} ry={6} fill={fill} stroke={stroke} strokeWidth={sw} />
        );
    }
  };

  // Render readonly element
  const renderReadonlyElement = (el: CanvasElement) => {
    const isSelected = selectedIdsRef.current?.includes(el.id) ?? false;
    const isHovered = hoverIdRef.current === el.id;
    
    // Check if element is highlighted during marquee drag
    const isMarqueeHighlighted = isMarquee && marqueeStart && marqueeEnd && (() => {
      const R = normalizeRect(marqueeStart, marqueeEnd);
      const E = getElementAABB(el);
      return rectsIntersect(R, E);
    })();

    if (el.type === "shape" && el.shapeType) {
      return (
        <svg
          width={Math.max(el.width, 1)}
          height={Math.max(el.height, 1)}
          className="block"
          viewBox={`0 0 ${Math.max(el.width, 1)} ${Math.max(el.height, 1)}`}
        >
          {renderShape(el, isSelected || isHovered)}
        </svg>
      );
    }

    if (el.type === "text") {
      return (
        <div className="w-full h-full bg-white rounded border border-gray-300 text-sm p-2 overflow-auto">
          {el.text || ""}
        </div>
      );
    }

    if (el.type === "sticky") {
      return (
        <StickyNote
          id={el.id}
          x={0}
          y={0}
          width={el.width}
          height={el.height}
          text={el.text}
          isSelected={selectedIdsRef.current?.includes(el.id) ?? false}
          isReadOnly={true}
          onTextChange={(id, newText) => {
            // Update base board sticky
            const els = getElements(boardId) || [];
            const next = els.map((e) =>
              e.id === id ? { ...e, text: newText, body: newText } : e
            );
            saveElements(boardId, next);
            setElements(next);
          }}
          className={STICKY_CARD_CLASS}
          style={{ boxSizing: "border-box", overflow: "auto" }}
        />
      );
    }

    if (el.type === "image" && (el.src || el.imageUrl)) {
      const isPdfPage = el.text?.startsWith("PDF Page");
      return (
        <div 
          className="relative w-full h-full"
          style={{
            margin: "0px",
            padding: "0px",
            border: "none",
          }}
        >
          <img
            src={el.src || el.imageUrl}
            alt="Canvas image"
            className="w-full h-full object-contain block"
            draggable={false}
            style={{ 
              userSelect: "none", 
              pointerEvents: "none",
              margin: "0px",
              padding: "0px",
              border: "none",
              borderRadius: isPdfPage ? "0px" : "4px", // No border radius for PDF pages
            }}
          />
          {/* Page number overlay for PDF pages */}
          {el.text?.startsWith("PDF Page") && (() => {
            const pageMatch = el.text.match(/PDF Page (\d+)/);
            const pageNumber = pageMatch ? pageMatch[1] : null;
            if (pageNumber) {
              return (
                <div
                  className="absolute top-2 left-2 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded pointer-events-none z-10"
                >
                  Page {pageNumber}
                </div>
              );
            }
            return null;
          })()}
        </div>
      );
    }

    return null;
  };


  // Sort elements by z-index (z field)
  const sortedElements = useMemo(() => {
    return [...elements].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  }, [elements]);

  // Commit editors on click-outside (for base board stickies only - overlay uses StickyNote)
  const handleEditorCommit = (e: React.PointerEvent<HTMLDivElement>) => {
    // If clicking on empty canvas while editing base sticky, commit and deselect
    if (inlineEditingIdRef.current && e.target === e.currentTarget) {
      const currentText = inlineEditorRef.current?.value || "";
      commitEdit(boardId, currentText);
      return true;
    }
    // Note: Overlay stickies are handled by StickyNote component's click-outside handler
    return false;
  };

  // Extract handlers for cleaner JSX
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Commit editors first
    if (handleEditorCommit(e)) return;

    // Prevent drag/select while editing stickies
    // Note: StickyNote component handles editing UI, but we track state here
    if (inlineEditingId || overlayEditingId) return;

    // PRIORITY: Right-button pans regardless of selection/tool
    if (e.button === 2) {
      isRmbPanningRef.current = true;
      lastScreenPtRef.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Panning with space or middle button
    if (e.button === 1 || spaceDownRef.current) {
      e.preventDefault();
      isPanningRef.current = true;
      mouseStartRef.current = { x: e.clientX, y: e.clientY };
      panStartRef.current = { ...pan };
      return;
    }

    if (e.button !== 0) return; // only left mouse button

    // Sticky tool: check double-click/single-click on stickies BEFORE create
    if (tool === "sticky") {
      // Hit-test but SKIP images in sticky tool
      const { hit } = hitTestAt(e.clientX, e.clientY, { allowImages: false });
      
      // If the pointer is over an EXISTING STICKY:
      if (hit && hit.type === "sticky") {
        e.stopPropagation();
        
        // Double-click → select only (StickyNote handles editing internally)
        if ((e as any).detail >= 2) {
          setSelectedIds([hit.id]);
          setHoverId(hit.id);
          queueMicrotask(() => onSelectionChange?.(hit.elementId));
          // Make sure no create happens on this gesture
          skipCreateRef.current = true;
          return;
        }
        
        // Single-click on sticky: select only; DO NOT start drag-create
        setSelectedIds([hit.id]);
        setHoverId(hit.id);
        queueMicrotask(() => onSelectionChange?.(hit.elementId));
        skipCreateRef.current = true;   // block create on pointerup
        return;
      }
      
      // Otherwise (background or image): normal sticky drag-create
      isDownRef.current = true;
      movedRef.current = false;
      downIdRef.current = null;
      (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
      
      // Sticky tool drag-create
      const pt = toCanvasPoint(e);
      stickyDragStartRef.current = pt;
      isStickyDraggingRef.current = true;
      setCreateRect({ x: pt.x, y: pt.y, w: 1, h: 1 });
      return;
    }

    // Hit-test at the pointer (allow images for Select/Hand tools)
    const { hit } = hitTestAt(e.clientX, e.clientY, { allowImages: true });

    isDownRef.current = true;
    movedRef.current = false;
    downIdRef.current = hit ? hit.elementId : null;

    // Capture the pointer so 'leave' does not clear selection
    (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);

    if (hit) {
      // --- existing select/move start for elements ---
      e.stopPropagation();
      
      // Handle shift-click toggle
      let nextSelected: string[];
      if (e.shiftKey) {
        const set = new Set(selectedIds);
        if (set.has(hit.id)) {
          set.delete(hit.id);
        } else {
          set.add(hit.id);
        }
        nextSelected = Array.from(set);
      } else {
        nextSelected = [hit.id];
      }
      
      setSelectedIds(nextSelected);
      setHoverId(hit.id);
      
      // Notify parent for ALL element types (only if single selection)
      if (nextSelected.length === 1) {
        queueMicrotask(() => onSelectionChange?.(hit.elementId));
      } else {
        queueMicrotask(() => onSelectionChange?.(null));
      }

      // Start drag
      setIsDragging(true);
      dragStartRef.current = toCanvasPoint(e);
      selectedAtDragRef.current = nextSelected;
      nextSelected.forEach(id => {
        const el = [...elementsRef.current, ...overlayElementsRef.current].find(e => e.id === id);
        if (el && el.x !== undefined && el.y !== undefined) {
          startPosRef.current[id] = { x: el.x, y: el.y };
        }
      });
      dragActiveRef.current = false;
    } else {
      // Background press = prepare for potential deselect, but do not clear yet.
      // Start marquee for select tool
      if (tool === "select") {
        const pt = toCanvasPoint(e);
        setIsMarquee(true);
        setMarqueeStart(pt);
        setMarqueeEnd(pt);
        dragStartRef.current = pt;
      }
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // RMB pan path (takes precedence)
    if (isRmbPanningRef.current && lastScreenPtRef.current) {
      const prev = lastScreenPtRef.current;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      lastScreenPtRef.current = { x: e.clientX, y: e.clientY };

      setPan((p) => ({
        x: p.x + dx,
        y: p.y + dy,
      }));

      e.preventDefault();
      return;
    }

    if (!isDownRef.current) {
      // Hover-only: update hoverId; do not touch selection
      // Skip images when sticky tool is active
      const { hit } = hitTestAt(e.clientX, e.clientY, { allowImages: tool !== "sticky" });
      setHoverId(hit?.id ?? null);
      return;
    }

    movedRef.current = true;

    // If you are dragging an element or marquee, run that code here.
    if (isDragging && dragStartRef.current) {
      const cur = toCanvasPoint(e);
      if (cur.x === 0 && cur.y === 0 && !canvasRef.current) return;
      const dx = cur.x - dragStartRef.current.x;
      const dy = cur.y - dragStartRef.current.y;
      
      if (!dragActiveRef.current) {
        if (Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
        dragActiveRef.current = true;
      }
      
      // Update overlay elements (crit stickies)
      setOverlayElements?.(prev =>
        prev.map(el => {
          if (!selectedAtDragRef.current.includes(el.id)) return el;
          const start = startPosRef.current[el.id];
          if (!start) return el;
          return { ...el, x: Math.round(start.x + dx), y: Math.round(start.y + dy) };
        })
      );
      return;
    }

    // Marquee selection - update in real-time during drag
    if (isMarquee && marqueeStart && dragStartRef.current) {
      const cur = toCanvasPoint(e);
      if (cur.x === 0 && cur.y === 0 && !canvasRef.current) return;
      setMarqueeEnd(cur);
      
      const R = normalizeRect(marqueeStart, cur);
      const allEls = getAllElements();
      const hits = allEls
        .filter(el => {
          const E = getElementAABB(el);
          // Use intersection check (not just full containment)
          return rectsIntersect(R, E);
        })
        .map(el => el.id);
      
      // Update selection in real-time during drag (for visual feedback)
      setSelectedIds(hits);
      return;
    }

    // Sticky tool drag-create logic
    if (tool === "sticky" && isStickyDraggingRef.current && stickyDragStartRef.current) {
      const pt = toCanvasPoint(e);
      const r = normRect(stickyDragStartRef.current, pt);
      setCreateRect(r);
      e.preventDefault();
      return;
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    // Release capture
    (e.currentTarget as HTMLDivElement).releasePointerCapture?.(e.pointerId);

    // If we deliberately skipped create (clicked/double-clicked an existing sticky)
    if (skipCreateRef.current) {
      skipCreateRef.current = false;
      // Do NOT create a new sticky for this gesture
      isDownRef.current = false;
      movedRef.current = false;
      downIdRef.current = null;
      return;
    }

    // End RMB panning first
    if (isRmbPanningRef.current) {
      isRmbPanningRef.current = false;
      lastScreenPtRef.current = null;
      isDownRef.current = false;
      movedRef.current = false;
      downIdRef.current = null;
      e.preventDefault();
      return;
    }

    // End panning
    if (isPanningRef.current) {
      isPanningRef.current = false;
      mouseStartRef.current = null;
      panStartRef.current = null;
      isDownRef.current = false;
      movedRef.current = false;
      downIdRef.current = null;
      return;
    }

    // End any drag/marquee code here
    if (isDragging && dragActiveRef.current) {
      // Positions already updated in onMove, just clean up
      setIsDragging(false);
      dragStartRef.current = null;
      startPosRef.current = {};
      selectedAtDragRef.current = [];
      dragActiveRef.current = false;
      isDownRef.current = false;
      movedRef.current = false;
      downIdRef.current = null;
      return;
    }

    // Finish marquee selection
    if (isMarquee && marqueeStart && marqueeEnd) {
      const R = normalizeRect(marqueeStart, marqueeEnd);
      const allEls = getAllElements();
      const selectedByMarquee = allEls
        .filter(el => {
          const E = getElementAABB(el);
          return rectsIntersect(R, E);
        })
        .map(el => el.id);
      
      setIsMarquee(false);
      setMarqueeStart(null);
      setMarqueeEnd(null);
      
      if (selectedByMarquee.length > 0) {
        if (e.shiftKey) {
          // Shift+click: toggle with existing selection
          setSelectedIds((prev) => {
            const set = new Set(prev);
            selectedByMarquee.forEach(id => {
              if (set.has(id)) {
                set.delete(id);
              } else {
                set.add(id);
              }
            });
            return Array.from(set);
          });
          queueMicrotask(() => onSelectionChange?.(null));
        } else {
          // Normal marquee: replace selection
          setSelectedIds(selectedByMarquee);
          
          // if exactly one, report it; else clear
          const onlyOne = selectedByMarquee.length === 1 ? selectedByMarquee[0] : null;
          if (onlyOne) {
            // Get canonical elementId
            const el = [...elementsRef.current, ...overlayElementsRef.current].find(e => e.id === onlyOne);
            const canonicalElementId = el ? ((el as any).elementId || el.id) : onlyOne;
            queueMicrotask(() => onSelectionChange?.(canonicalElementId));
          } else {
            queueMicrotask(() => onSelectionChange?.(null));
          }
        }
      } else if (!e.shiftKey) {
        setSelectedIds([]);
        queueMicrotask(() => onSelectionChange?.(null));
      }
      
      isDownRef.current = false;
      movedRef.current = false;
      downIdRef.current = null;
      return;
    }

    // Sticky tool drag-create logic
    if (tool === "sticky" && isStickyDraggingRef.current && stickyDragStartRef.current) {
      // Convert mouse release position to canvas coordinates
      // This ensures the sticky appears exactly where the user released the mouse,
      // accounting for current zoom and pan transform
      const end = toCanvasPoint(e);
      
      // Normalize the drag rectangle (ensures positive width/height regardless of drag direction)
      const r = normRect(stickyDragStartRef.current, end);

      isStickyDraggingRef.current = false;
      stickyDragStartRef.current = null;

      // Check if drag was too small (click-to-create)
      const isTinyClick = r.w < DRAG_CREATE_MIN || r.h < DRAG_CREATE_MIN;
      
      // Default sticky size
      const DEFAULT_STICKY_WIDTH = 160;
      const DEFAULT_STICKY_HEIGHT = 120;
      
      // For tiny clicks, place at viewport center; for drags, use drag rectangle
      let stickyX: number, stickyY: number, stickyWidth: number, stickyHeight: number;
      if (isTinyClick) {
        // Get viewport center in canvas coordinates
        const viewportCenter = getViewportCenter();
        // Center the sticky on the viewport center (subtract half the sticky size)
        stickyX = viewportCenter.x - DEFAULT_STICKY_WIDTH / 2;
        stickyY = viewportCenter.y - DEFAULT_STICKY_HEIGHT / 2;
        stickyWidth = DEFAULT_STICKY_WIDTH;
        stickyHeight = DEFAULT_STICKY_HEIGHT;
      } else {
        // For drag-to-create: use the normalized rectangle position
        // r.x and r.y are already in canvas coordinates, correctly accounting for zoom/pan
        // The top-left corner (r.x, r.y) matches where the drag started (min of start/end)
        stickyX = r.x;
        stickyY = r.y;
        stickyWidth = r.w;
        stickyHeight = r.h;
      }

      // CREATE sticky
      // Generate unique ID to prevent duplicates
      const id = `critSticky_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const elementId = id; // Use same id for elementId in overlay elements
      
      // Check if ID already exists (prevent duplicates)
      const existingIds = new Set((overlayElementsRef.current ?? []).map(el => el.id));
      if (existingIds.has(id)) {
        // If somehow duplicate, skip creation
        setCreateRect(null);
        isDownRef.current = false;
        movedRef.current = false;
        downIdRef.current = null;
        return;
      }
      
      const newSticky = {
        id,
        elementId,
        type: "sticky" as const,
        x: stickyX,
        y: stickyY,
        width: stickyWidth,
        height: stickyHeight,
        text: "", // start empty; placeholder shown when not editing
        placeholder: "New text",
        color: "#FFF8B1",
        source: "liveCrit",
        author: liveUserName || "Guest",
        createdAt: Date.now(),
      };
      
      // 1) add to elements (ensure no duplicates)
      setOverlayElements((els) => {
        const existing = new Set(els.map(el => el.id));
        if (existing.has(id)) {
          console.warn("[sticky] Duplicate ID detected, skipping creation:", id);
          return els; // Don't add if duplicate
        }
        return [...els, newSticky];
      });

      // 2) select it immediately
      setSelectedIds([elementId]);
      setHoverId(elementId);
      
      // 3) tell the right panel about the selection (for Submit notes)
      queueMicrotask(() => onSelectionChange?.(elementId));

      // 4) StickyNote component handles its own editing - no need to call beginEditSticky
      // User can double-click to edit after creation
      pendingEditIdRef.current = null; // Clear any pending edit

      setCreateRect(null);
      isDownRef.current = false;
      movedRef.current = false;
      downIdRef.current = null;
      e.preventDefault();
      return;
    }

    // If we didn't move: it's a click. Decide deselect vs keep.
    if (!movedRef.current) {
      if (downIdRef.current === null) {
        // Clicked on empty canvas -> deselect
        setSelectedIds([]);
        setHoverId(undefined);
        setInlineEditingId(null);
        setOverlayEditingId(null);
        queueMicrotask(() => onSelectionChange?.(null));
      } else {
        // Clicked an element -> keep selection (already set on pointerdown)
        // no-op
      }
    }

    // Reset refs
    isDownRef.current = false;
    movedRef.current = false;
    downIdRef.current = null;
  };

  // React wheel handler (calls native zoomAtWheel)
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Convert React event to native WheelEvent for zoomAtWheel
    zoomAtWheel(e.nativeEvent);
  };

  return (
    <div
      ref={outerRef}
      className="relative w-full h-full overflow-hidden rounded-lg border border-neutral-300 bg-[rgb(248,249,250)]"
    >
      <div
        ref={canvasRef}
        className="relative w-full h-full overflow-hidden select-none p-0 m-0"
        style={{
          pointerEvents: (tool === "pen" || tool === "eraser") ? "none" : "auto",
        }}
        onContextMenu={(e) => e.preventDefault()}
        onWheel={handleWheel}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
      >
        {/* Pen Tool Overlay */}
        {(tool === "pen" || tool === "eraser") && (
          <PenTool
            activeTool={tool === "pen" ? "pen" : tool === "eraser" ? "eraser" : null}
            penColor={penColor}
            penWidth={penWidth}
            eraserSize={eraserSize}
            pan={pan}
            zoom={zoom}
            initialStrokes={penStrokes}
            onStrokesChange={onPenStrokesChange}
            enabled={true}
            boardId={boardId}
          />
        )}
      {/* WORLD LAYER — apply pan/zoom once */}
      <div
        className="absolute left-0 top-0 will-change-transform"
        style={{
          transform: `translate3d(${Math.round(pan.x)}px, ${Math.round(pan.y)}px, 0) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        {/* Canvas background grid */}
        <div
          className="relative"
          style={{
            width: 3000,
            height: 2000,
            backgroundImage: "repeating-conic-gradient(#f8f9fa 0% 25%, transparent 0% 50%)",
            backgroundSize: "20px 20px",
          }}
        >

          {/* Element layer in WORLD COORDS */}
          {/* Render base board elements (already sorted by zIndex) */}
          {sortedElements.map((el) => {
            const isSelected = selectedIds.includes(el.id);
            const isHovered = hoverId === el.id;
            
            // Check if element is highlighted during marquee drag
            const isMarqueeHighlighted = isMarquee && marqueeStart && marqueeEnd && (() => {
              const R = normalizeRect(marqueeStart, marqueeEnd);
              const E = getElementAABB(el);
              return rectsIntersect(R, E);
            })();
            
            const common = {
              position: "absolute" as const,
              left: el.x,
              top: el.y,
              width: el.width,
              height: el.height,
            };

            if (el.type === "image") {
              const isStickyTool = tool === "sticky";
              const isPdfPage = el.text?.startsWith("PDF Page");
              return (
                <div
                  key={el.id}
                  style={{
                    ...common,
                    transform: `rotate(${el.rotation ?? 0}deg)`,
                    margin: "0px",
                    padding: "0px",
                    border: isPdfPage ? "none" : undefined, // No border for PDF pages
                  }}
                  // Images don't eat pointer while sticky tool is active
                  className={isStickyTool ? "relative pointer-events-none" : "relative pointer-events-auto"}
                  onMouseDown={(e) => {
                    if (isPanningRef.current || spaceDownRef.current || e.button === 2) return;
                    // Selection/drag handled by handleCanvasMouseDown
                  }}
                >
                  {/* Pin the image to the box and cover it fully */}
                  <img
                    src={el.src || el.imageUrl}
                    alt=""
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-contain block"
                    style={{
                      pointerEvents: isStickyTool ? "none" : "auto",
                      userSelect: "none",
                      margin: "0px",
                      padding: "0px",
                      border: "none",
                      borderRadius: isPdfPage ? "0px" : undefined, // No border radius for PDF pages
                    }}
                  />
                  {/* Page number overlay for PDF pages */}
                  {el.text?.startsWith("PDF Page") && (() => {
                    const pageMatch = el.text.match(/PDF Page (\d+)/);
                    const pageNumber = pageMatch ? pageMatch[1] : null;
                    if (pageNumber) {
                      return (
                        <div
                          className="absolute top-2 left-2 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded pointer-events-none z-10"
                        >
                          Page {pageNumber}
                        </div>
                      );
                    }
                    return null;
                  })()}
                  {/* Calm blue selection border (Miro-style) - only shows when element is selected */}
                  {isSelected && (
                    <div className="absolute inset-0 border-2 border-blue-400 rounded-lg pointer-events-none" />
                  )}
                </div>
              );
            }

            if (el.type === "sticky") {
              return (
                <StickyNote
                  key={el.id}
                  id={el.id}
                  x={el.x}
                  y={el.y}
                  width={el.width}
                  height={el.height}
                  text={el.text}
                  isSelected={isSelected}
                  isReadOnly={false}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    // Select when double-clicking
                    setSelectedIds([el.id]);
                    setHoverId(el.id);
                    queueMicrotask(() => onSelectionChange?.(el.elementId || el.id));
                  }}
                  onMouseDown={(e) => {
                    if (isPanningRef.current || spaceDownRef.current || e.button === 2) return;
                    // Selection/drag handled by handleCanvasMouseDown
                  }}
                  onTextChange={(id, newText) => {
                    // Update base board sticky
                    const els = getElements(boardId) || [];
                    const next = els.map((e) =>
                      e.id === id ? { ...e, text: newText, body: newText } : e
                    );
                    saveElements(boardId, next);
                    setElements(next);
                    // Clear inline editing state when done
                    setInlineEditingId(null);
                    setInlineEditingDraft("");
                  }}
                  onCancelEdit={(id) => {
                    // Clear inline editing state when editing is cancelled
                    setInlineEditingId(null);
                    setInlineEditingDraft("");
                  }}
                  className="pointer-events-auto"
                />
              );
            }

            if (el.type === "text") {
              return (
                <div
                  key={el.id}
                  style={common}
                  className="bg-white rounded border border-gray-300 text-sm p-2 pointer-events-auto"
                  onMouseDown={(e) => {
                    if (isPanningRef.current || spaceDownRef.current || e.button === 2) return;
                    // Selection/drag handled by handleCanvasMouseDown
                  }}
                >
                  {(() => {
                    const hasText =
                      !!el.text && el.text.trim() !== "" && el.text.trim() !== "New text";
                    return hasText ? (
                      <div className="whitespace-pre-wrap">{el.text}</div>
                    ) : (
                      <div className="opacity-60 italic select-none">New text</div>
                    );
                  })()}
                  {/* Calm blue selection border (Miro-style) - only shows when element is selected */}
                  {isSelected && (
                    <div className="absolute inset-0 border-2 border-blue-400 rounded pointer-events-none" />
                  )}
                </div>
              );
            }

            if (el.type === "shape" && el.shapeType) {
              return (
                <div
                  key={el.id}
                  style={common}
                  className="pointer-events-auto"
                  onMouseDown={(e) => {
                    if (isPanningRef.current || spaceDownRef.current || e.button === 2) return;
                    // Selection/drag handled by handleCanvasMouseDown
                  }}
                >
                  <svg
                    width={Math.max(el.width, 1)}
                    height={Math.max(el.height, 1)}
                    className="block"
                    viewBox={`0 0 ${Math.max(el.width, 1)} ${Math.max(el.height, 1)}`}
                  >
                    {renderShape(el, isSelected || isHovered || isMarqueeHighlighted)}
                  </svg>
                  {/* Calm blue selection border (Miro-style) - only shows when element is selected */}
                  {isSelected && (
                    <div className="absolute inset-0 border-2 border-blue-400 rounded pointer-events-none" />
                  )}
                </div>
              );
            }

            return null;
          })}
          
          {/* Render overlay stickies (crit session elements) - sorted by createdAt for consistent ordering */}
          {overlayElements
            .slice()
            .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
            .map((el) => {
            if (el.type !== "sticky" || el.x === undefined || el.y === undefined || el.width === undefined || el.height === undefined) {
              return null;
            }
            
            const isSelected = selectedIds.includes(el.id);
            
            // Check if element is highlighted during marquee drag
            const isMarqueeHighlighted = isMarquee && marqueeStart && marqueeEnd && (() => {
              const R = normalizeRect(marqueeStart, marqueeEnd);
              const E = getElementAABB(el);
              return rectsIntersect(R, E);
            })();

            return (
              <StickyNote
                key={el.id}
                id={el.id}
                x={el.x}
                y={el.y}
                width={el.width}
                height={el.height}
                text={el.text}
                isSelected={isSelected}
                isReadOnly={false}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  // Select when double-clicking and set overlay editing state
                  setSelectedIds([el.id]);
                  setHoverId(el.id);
                  setOverlayEditingId(el.id); // Track which overlay sticky is being edited
                  queueMicrotask(() => onSelectionChange?.(el.elementId || el.id));
                }}
                onTextChange={(id, newText) => {
                  // Update overlay sticky (crit session element)
                  setOverlayElements((els) =>
                    els.map((item) =>
                      (item.elementId || item.id) === id ? { ...item, text: newText.trim() } : item
                    )
                  );
                  // Clear overlay editing state when done
                  setOverlayEditingId(null);
                  setOverlayEditingDraft("");
                }}
                onCancelEdit={(id) => {
                  // Clear overlay editing state when editing is cancelled
                  setOverlayEditingId(null);
                  setOverlayEditingDraft("");
                }}
                className="pointer-events-auto"
              />
            );
          })}
          
          {/* Visual feedback: draw the drag box for sticky creation (board coords, inside transformed layer) */}
          {createRect && (
            <div
              className="pointer-events-none absolute border-2 border-yellow-400/70 bg-yellow-200/20"
              style={{
                left: createRect.x,
                top: createRect.y,
                width: createRect.w,
                height: createRect.h,
              }}
            />
          )}

          {/* Marquee selection overlay (board coords, inside transformed layer) */}
          {isMarquee && marqueeStart && marqueeEnd && (() => {
            const R = normalizeRect(marqueeStart, marqueeEnd);
            return (
              <div
                className={MARQUEE_BOX_CLASS}
                style={{
                  left: R.x,      // BOARD COORDS
                  top: R.y,       // BOARD COORDS
                  width: R.w,
                  height: R.h,
                }}
              />
            );
          })()}
          
          {/* Drag-to-create sticky draft box (board coords, inside transformed layer) */}
          {isCreating && createStart && createEnd && (() => {
            const MIN_W = 80;
            const MIN_H = 60;
            
            function makeRect(x0: number, y0: number, x1: number, y1: number) {
              let left = Math.min(x0, x1);
              let top = Math.min(y0, y1);
              let width = Math.max(Math.abs(x1 - x0), MIN_W);
              let height = Math.max(Math.abs(y1 - y0), MIN_H);
              return { left, top, width, height };
            }
            
            const { left, top, width, height } = makeRect(
              createStart.x,
              createStart.y,
              createEnd.x,
              createEnd.y
            );
            
            return (
              <div
                className={MARQUEE_BOX_CLASS}
                style={{
                  left,   // BOARD COORDS
                  top,    // BOARD COORDS
                  width,
                  height,
                }}
              />
            );
          })()}
        </div>
      </div>
    </div>
    </div>
  );
}

