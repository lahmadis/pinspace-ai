"use client";

import React, { useState, useRef, useEffect, useCallback, type Dispatch, type SetStateAction } from "react";
import { Rnd } from "react-rnd";
import type { CanvasElement, Comment } from "@/types";
import type { ToolType } from "./CanvasToolbar";
import { MARQUEE_BOX_CLASS, STICKY_CARD_CLASS, SELECTED_RING_CLASS } from "@/components/canvasStyles";
import StickyNote from "./StickyNote";
import PenTool from "./draw/PenTool";
import type { PenStroke } from "@/hooks/usePenDrawing";
import { saveViewState, getViewState } from "@/lib/storage";
// Tool state is passed via props, no context needed

interface BoardCanvasProps {
  elements: CanvasElement[];
  setElements: (elements: CanvasElement[]) => void;
  selectedIds: string[];
  // REFACTORED: Changed from (ids: string[]) => void to Dispatch<SetStateAction<string[]>>
  // This allows setSelectedIds to accept both direct values and updater functions,
  // which is the standard React state setter pattern and matches how applySelection uses it
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  activeTool: ToolType;
  onSetActiveTool?: (tool: ToolType) => void;
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onSelectionChange?: (ids: string[]) => void; // NEW
  zoom: number;
  setZoom: (z: number) => void;
  pan: { x: number; y: number };
  setPan: (p: { x: number; y: number }) => void;
  snap?: boolean;
  onSaveElements?: (updated?: CanvasElement[]) => void;
  isReadOnly?: boolean;
  pinnedComments?: Comment[];
  onSelectComment?: (commentId: string | null) => void;
  onCreateComment?: (comment: Omit<Comment, "id" | "timestamp" | "boardId" | "author">) => void;
  boardId?: string;
  currentUserName?: string;
  allowPinComments?: boolean; // If true, still allow pin comments even when read-only
  showMinimalToolbar?: boolean; // If true, only show Pin tool
  // Pen tool props
  penColor?: string;
  penWidth?: number;
  eraserSize?: number;
  penStrokes?: PenStroke[];
  onPenStrokesChange?: (strokes: PenStroke[]) => void;
}

// Drag threshold to prevent accidental movement on clicks
const DRAG_THRESHOLD = 4; // pixels

// Zoom constants
const MIN_ZOOM = 0.1; // 10% minimum
const MAX_ZOOM = 3.0; // 300% maximum
const ZOOM_STEP = 1.1; // per wheel notch (~10% step)
const ZOOM_STEP_TRACKPAD = 1.05; // smoother for trackpad pinch (~5% step)

// Utility to deduplicate array by id
function uniqueById<T extends { id: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr ?? []) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

export default function BoardCanvas({
  elements = [],
  setElements = () => {},
  selectedIds = [],
  setSelectedIds = () => {},
  activeTool: propActiveTool,
  onSetActiveTool: propOnSetActiveTool,
  selectedElementId = null,
  onSelectElement = () => {},
  onSelectionChange,
  zoom = 1,
  setZoom = () => {},
  pan = { x: 0, y: 0 },
  setPan = () => {},
  snap = false,
  onSaveElements = () => {},
  isReadOnly = false,
  pinnedComments = [],
  onSelectComment = () => {},
  onCreateComment = () => {},
  boardId = "",
  currentUserName = "User",
  allowPinComments = false,
  showMinimalToolbar = false,
  penColor = "#000000",
  penWidth = 3,
  eraserSize = 20,
  penStrokes = [],
  onPenStrokesChange,
}: BoardCanvasProps) {
  // Use props for tool state (fallback to select if not provided)
  const activeTool = propActiveTool ?? "select";
  const onSetActiveTool = propOnSetActiveTool ?? (() => {});

  // Helper to get cursor style based on active tool
  const getCursorStyle = useCallback(() => {
    switch (activeTool) {
      case "select":
        return "default"; // Arrow cursor
      case "hand":
        return "grab"; // Hand cursor (grab when hovering, grabbing when dragging)
      case "sticky":
        return "crosshair"; // Crosshair for placement
      case "image":
        return "crosshair"; // Crosshair for placement
      case "text":
        return "text"; // Text cursor
      case "rect":
      case "circle":
      case "triangle":
      case "diamond":
      case "arrow":
      case "bubble":
      case "star":
        return "crosshair"; // Crosshair for shape placement
      default:
        return "default";
    }
  }, [activeTool]);

  // Helper to apply selection and notify parent
  const applySelection = useCallback((ids: string[] | ((prev: string[]) => string[])) => {
    setSelectedIds((prev) => {
      const next = typeof ids === "function" ? ids(prev) : ids;
      onSelectionChange?.(next);
      return next;
    });
  }, [setSelectedIds, onSelectionChange]);
  
  // Element mousedown: select + start drag (NO marquee)
  function handleElementMouseDown(
    e: React.MouseEvent,
    el: { id: string; x: number; y: number }
  ) {
    if (activeTool !== "select") return;
    if (e.button !== 0) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // --- compute the selection that SHOULD be active for this click ---
    let nextSelected: string[];
    if (e.shiftKey) {
      // Toggle: if already selected, remove it; otherwise add it
      const set = new Set(selectedIds);
      if (set.has(el.id)) {
        set.delete(el.id);
      } else {
        set.add(el.id);
      }
      nextSelected = Array.from(set);
    } else {
      // clicking another element should immediately switch selection to that one
      nextSelected = [el.id];
    }
    
    // apply selection BEFORE starting drag
    applySelection(nextSelected);
    
    // start drag with the same selection we just applied
    const p = toCanvasPoint(e.clientX, e.clientY);
    dragStartRef.current = p;
    selectedAtDragRef.current = nextSelected;
    
    // snapshot starting positions
    startPosRef.current = {};
    for (const id of nextSelected) {
      const el0 = elementsRef.current.find(x => x.id === id);
      if (el0) startPosRef.current[id] = { x: el0.x, y: el0.y };
    }
    
    // drag threshold reset (from previous step you added)
    dragActiveRef.current = false;
    
    setIsMarquee(false);
    setIsDragging(true);
  }
  
  // Canvas mousedown: start marquee ONLY on empty background (or pan if Space/right/middle)
  function handleCanvasMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    // If clicking on empty canvas while editing, commit and deselect
    if (editingIdRef.current && e.target === e.currentTarget) {
      const currentText = editingTextareaRef.current?.value || "";
      commitStickyEditRef.current?.(currentText);
      return;
    }
    
    if (activeTool !== "select") return;
    
    if (e.button === 2) rightButtonDownRef.current = true; // track RMB
    
    // Start panning if Space is held, or right/middle button
    const isPanButton = e.button === 2 || e.button === 1; // 0=left,1=middle,2=right
    if (spaceDownRef.current || isPanButton) {
      e.preventDefault();
      isPanningRef.current = true;
      mouseStartRef.current = { x: e.clientX, y: e.clientY };
      panStartRef.current = { ...pan };
      return; // do not start marquee
    }
    
    // --- existing marquee start (unchanged) ---
    if (e.button !== 0) return;
    
    const p = toCanvasPoint(e.clientX, e.clientY);
    dragStartRef.current = p;
    
    setIsDragging(false);
    setIsMarquee(true);
    applySelection([]); // clear before marquee
  }
  
  // Debug log - always render
  console.log("[BoardCanvas] render", {
    boardId,
    isReadOnly,
    elementsCount: elements?.length ?? 0,
    commentsCount: pinnedComments?.length ?? 0,
  });

  const canvasRef = useRef<HTMLDivElement>(null);
  // editingId: canonical elementId (CanvasElement.id) for sticky/text editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState(""); // Draft text while editing
  const prevTextRef = useRef<string>(""); // Store previous text for cancel
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const editingTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Panning refs (student canvas)
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const mouseStartRef = useRef<{ x: number; y: number } | null>(null);
  const spaceDownRef = useRef(false);
  const rightButtonDownRef = useRef(false); // tracks RMB held on our canvas
  
  // Marquee selection state
  const [isMarquee, setIsMarquee] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);
  
  // Drag-to-create state
  const [isCreating, setIsCreating] = useState(false);
  const [createStart, setCreateStart] = useState<{ x: number; y: number } | null>(null);
  const [createEnd, setCreateEnd] = useState<{ x: number; y: number } | null>(null);
  const [createTool, setCreateTool] = useState<ToolType | null>(null);
  
  // Drag threshold state - track drag start position and whether we're actually dragging per element
  const dragStateRef = useRef<Map<string, { startPos: { x: number; y: number }; isActuallyDragging: boolean }>>(new Map());
  
  // Custom drag-to-move state for Select tool
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const startPosRef = useRef<Record<string, { x: number; y: number }>>({});
  const selectedAtDragRef = useRef<string[]>([]);
  const dragActiveRef = useRef(false); // becomes true after we move a bit
  const DRAG_THRESHOLD = 3; // px of cursor travel before moving
  
  // Throttle utility for persistence during drag
  const throttleSaveRef = useRef<{ timer: NodeJS.Timeout | null; lastCall: number }>({ timer: null, lastCall: 0 });
  const throttleSave = useCallback((fn: () => void, delay: number = 50) => {
    const now = Date.now();
    if (now - throttleSaveRef.current.lastCall >= delay) {
      throttleSaveRef.current.lastCall = now;
      fn();
    } else {
      if (throttleSaveRef.current.timer) {
        clearTimeout(throttleSaveRef.current.timer);
      }
      throttleSaveRef.current.timer = setTimeout(() => {
        throttleSaveRef.current.lastCall = Date.now();
        fn();
      }, delay - (now - throttleSaveRef.current.lastCall));
    }
  }, []);
  
  // Stable ref for editingId (no state dependency)
  const editingIdRef = useRef<string | null>(null);
  useEffect(() => {
    editingIdRef.current = editingId;
  }, [editingId]);
  
  // Keep ref mirror of elements for safe persistence
  const elementsRef = useRef(elements);
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);
  
  // Ref for commit function to avoid dependency issues
  const commitStickyEditRef = useRef<((text: string) => void) | null>(null);
  
  // Track initial mount to only load saved view on first load
  const isInitialMountRef = useRef(true);

  // Load view state and subscribe to cross-tab/same-tab updates
  useEffect(() => {
    if (!boardId) return;

    const loadView = () => {
      try {
        const saved = getViewState(boardId);
        if (saved) {
          // Only load saved view on initial mount (prevents overwriting user changes during interaction)
          if (isInitialMountRef.current) {
            setPan(saved.pan);
            setZoom(saved.zoom);
            isInitialMountRef.current = false;
          }
        }
      } catch (err) {
        console.error("[BoardCanvas] Failed to load view state", err);
      }
    };

    // Initial load only if this is the first mount
    if (isInitialMountRef.current) {
      loadView();
    }

    // Listen for storage changes (cross-tab updates) - always respond to external changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "pinspace_view" && e.newValue) {
        try {
          const allViews = JSON.parse(e.newValue);
          const saved = allViews[boardId];
          if (saved) {
            setPan(saved.pan);
            setZoom(saved.zoom);
          }
        } catch {}
      }
    };

    // Listen for custom events (same-tab updates) - always respond to external changes
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
    const interval = setInterval(() => {
      try {
        const saved = getViewState(boardId);
        if (saved && !isInitialMountRef.current) {
          // Only update from polling if values differ significantly (avoid jitter)
          const panDiff = Math.abs(pan.x - saved.pan.x) + Math.abs(pan.y - saved.pan.y);
          const zoomDiff = Math.abs(zoom - saved.zoom);
          if (panDiff > 10 || zoomDiff > 0.01) {
            setPan(saved.pan);
            setZoom(saved.zoom);
          }
        }
      } catch {}
    }, 1000);

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
  
  // Track Space key (press to pan temporarily)
  useEffect(() => {
    const isEditable = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = (el.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return true;
      if (el.isContentEditable) return true;
      return false;
    };
    
    const onKeyDown = (e: KeyboardEvent) => {
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
  
  // Suppress browser menu only while panning
  useEffect(() => {
    const onCtx = (e: MouseEvent) => {
      // Block the menu if we're panning OR the right button is held down
      if (isPanningRef.current || rightButtonDownRef.current) {
        e.preventDefault();
      }
    };
    // capture so we intercept before the page handles it
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
  
  // Note: creationType still uses the old tool names (rect, circle, etc.) for backward compatibility
  // but the actual elements created will use type: "shape" with shapeType
  

  // One-time cleanup on mount: deduplicate elements if needed
  useEffect(() => {
    if (!elements || elements.length === 0) return;
    const deduped = uniqueById(elements);
    if (deduped.length !== elements.length) {
      console.warn("[elements] deduped on mount:", elements.length, "→", deduped.length);
      setElements(deduped);
      onSaveElements?.(deduped);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once after initial load

  // Inline comment dialog state (for Pin tool)
  const [newCommentDialog, setNewCommentDialog] = useState<{
    x: number;
    y: number;
    category: "concept" | "plan" | "section" | "material" | "circulation" | "structure" | "general";
    text: string;
    makeTask: boolean;
  } | null>(null);

  // Helper to create new element from tool type with size
  const makeNewElementFromTool = useCallback(
    (tool: "text" | "sticky" | "rect" | "circle" | "triangle" | "diamond" | "arrow" | "bubble" | "star" | "image", x: number, y: number, width: number, height: number): CanvasElement => {
      const id = `e_${crypto.randomUUID()}`;
      
      if (tool === "text") {
        return {
          id,
          type: "text",
          x,
          y,
          width,
          height,
          rotation: 0,
          z: (elements.length + 1) * 10,
          locked: false,
          text: "New text",
          fontSize: 16,
          fontWeight: "normal",
        };
      }
      
      if (tool === "sticky") {
        return {
          id,
          type: "sticky",
          x,
          y,
          width,
          height,
          rotation: 0,
          z: (elements.length + 1) * 10,
          locked: false,
          text: "New note",
          fill: "#fef3c7",
        };
      }
      
      // All geometric shapes now use type "shape" with shapeType
      const shapeTools: ("rect" | "circle" | "triangle" | "diamond" | "arrow" | "bubble" | "star")[] = [
        "rect",
        "circle",
        "triangle",
        "diamond",
        "arrow",
        "bubble",
        "star",
      ];
      
      if (shapeTools.includes(tool as any)) {
        return {
          id,
          type: "shape",
          shapeType: tool as "rect" | "circle" | "triangle" | "diamond" | "arrow" | "bubble" | "star",
          x,
          y,
          width,
          height,
          rotation: 0,
          z: (elements.length + 1) * 10,
          locked: false,
          fillColor: "rgba(0,0,0,0)", // transparent default
          strokeColor: "#2563eb", // blue-600 default
          strokeWidth: 2,
          borderRadius: tool === "bubble" ? 8 : 0,
        };
      }
      
      if (tool === "image") {
        return {
          id,
          type: "image",
          x,
          y,
          width,
          height,
          rotation: 0,
          z: (elements.length + 1) * 10,
          locked: false,
          text: "",
          fill: "#f0f0f0",
          stroke: "#cccccc",
          strokeWidth: 1,
        };
      }
      
      // Default fallback
      return {
        id,
        type: "shape",
        shapeType: "rect",
        x,
        y,
        width,
        height,
        rotation: 0,
        z: (elements.length + 1) * 10,
        locked: false,
        fillColor: "#f8fafc",
        strokeColor: "#9ca3af",
        strokeWidth: 1,
      };
    },
    [elements.length]
  );
  
  // Render shape as SVG (stroke-only, no fill)
  const renderShape = useCallback((el: CanvasElement, selected: boolean = false) => {
    // Use blue-600 for selected, zinc-800 for unselected
    const stroke = selected ? "#2563eb" : "#1f2937";
    const fill = "none"; // Always no fill for shapes
    const sw = el.strokeWidth ?? 2;
    
    const w = Math.max(el.width, 1);
    const h = Math.max(el.height, 1);
    const radius = el.borderRadius ?? (el.shapeType === "bubble" ? 8 : 0);
    
    switch (el.shapeType) {
      case "rect":
        return (
          <rect
            x={0}
            y={0}
            width={w}
            height={h}
            rx={6}
            ry={6}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
        );
      
      case "circle":
        return (
          <ellipse
            cx={w / 2}
            cy={h / 2}
            rx={w / 2}
            ry={h / 2}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
        );
      
      case "triangle":
        const trianglePath = `M ${w/2} 0 L ${w} ${h} L 0 ${h} Z`;
        return (
          <path
            d={trianglePath}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        );
      
      case "diamond":
        const diamondPath = `M ${w/2} 0 L ${w} ${h/2} L ${w/2} ${h} L 0 ${h/2} Z`;
        return (
          <path
            d={diamondPath}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
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
          const r = (i % 2 === 0) ? outer : inner;
          const a = (-Math.PI / 2) + (i * Math.PI / 5);
          starPoints.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
        }
        const starPath = `M ${starPoints[0][0]} ${starPoints[0][1]} ` + 
          starPoints.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(" ") + " Z";
        return (
          <path
            d={starPath}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
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
          <path
            d={arrowPath}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        );
      
      default:
        return (
          <rect
            x={0}
            y={0}
            width={w}
            height={h}
            rx={6}
            ry={6}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
        );
    }
  }, []);

  // Get default size for tool type
  const getDefaultSize = useCallback((tool: "text" | "sticky" | "rect" | "circle" | "triangle" | "diamond" | "arrow" | "bubble" | "star" | "image") => {
    switch (tool) {
      case "text":
        return { width: 200, height: 80 };
      case "sticky":
        return { width: 240, height: 180 };
      case "rect":
      case "circle":
      case "triangle":
      case "diamond":
      case "arrow":
      case "bubble":
      case "star":
        return { width: 200, height: 120 };
      case "image":
        return { width: 200, height: 200 };
      default:
        return { width: 200, height: 120 };
    }
  }, []);
  
  // Start editing element (text only - sticky uses StickyNote component)
  const startEditingElement = useCallback((id: string) => {
    const el = elements.find((e) => e.id === id);
    if (el && el.type === "text") {
      // Normalize starting value: empty/placeholder becomes empty string
      const startValue =
        !el?.text || el.text.trim() === "" || el.text.trim() === "New text" || el.text.trim() === "New note"
          ? ""
          : el.text;
      
      prevTextRef.current = el?.text ?? "";
      setEditingDraft(startValue);
      setEditingId(id);
      
      // Select the element when starting edit
      applySelection([id]);
      onSelectElement?.(id);
      
      setTimeout(() => {
        editingTextareaRef.current?.focus();
        // Place cursor at end
        const textarea = editingTextareaRef.current;
        if (textarea) {
          textarea.selectionStart = textarea.value.length;
          textarea.selectionEnd = textarea.value.length;
        }
      }, 0);
    }
    // For sticky notes, selection is handled by StickyNote component's onDoubleClick
    if (el && el.type === "sticky") {
      applySelection([id]);
      onSelectElement?.(id);
    }
  }, [elements, applySelection, onSelectElement]);

  // Snap-to-grid helper - only apply when user actually drags/resizes
  const GRID_SIZE = 10;
  const snapCoord = useCallback((n: number) => {
    return snap ? Math.round(n / GRID_SIZE) * GRID_SIZE : n;
  }, [snap]);

  // Helper: which tools create elements?
  const isCreationTool = (tool: ToolType): boolean => {
    return tool === "text" ||
      tool === "sticky" ||
      tool === "rect" ||
      tool === "circle" ||
      tool === "triangle" ||
      tool === "diamond" ||
      tool === "arrow" ||
      tool === "bubble" ||
      tool === "star" ||
      tool === "shape";
  };

  // Helper to map tool type to element type
  const mapToolToElementType = (tool: ToolType): CanvasElement["type"] => {
    switch (tool) {
      case "text":
        return "text";
      case "sticky":
        return "sticky";
      case "rect":
      case "circle":
      case "triangle":
      case "diamond":
      case "arrow":
      case "bubble":
      case "star":
      case "shape":
        return "shape";
      default:
        return "shape"; // fallback
    }
  };

  /**
   * Convert screen (mouse) coordinates to canvas (virtual board) coordinates.
   * This properly accounts for the current pan (translation) and zoom (scale) transform.
   * 
   * @param clientX - Mouse X position in screen coordinates (from event.clientX)
   * @param clientY - Mouse Y position in screen coordinates (from event.clientY)
   * @param element - The canvas element (for getting bounding rect)
   * @returns Canvas coordinates {x, y} where the mouse pointer is on the virtual board
   */
  const clientToCanvas = useCallback(
    (clientX: number, clientY: number, element: HTMLElement): { x: number; y: number } => {
      const canvasRect = element.getBoundingClientRect();
      
      // Step 1: Get mouse position relative to canvas element (screen coordinates)
      const screenX = clientX - canvasRect.left;
      const screenY = clientY - canvasRect.top;
      
      // Step 2 & 3: Convert screen coords to canvas coords
      // The canvas is transformed with: translate(pan.x, pan.y) scale(zoom)
      // To reverse: subtract pan offset, then divide by zoom scale
      const canvasX = (screenX - pan.x) / zoom;
      const canvasY = (screenY - pan.y) / zoom;
      
      return { x: canvasX, y: canvasY };
    },
    [pan, zoom]
  );

  // Helper for mouse events: convert client coords to canvas coords
  const clientToCanvasPoint = useCallback(
    (e: React.MouseEvent | MouseEvent): { x: number; y: number } => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      return { x: (cx - pan.x) / zoom, y: (cy - pan.y) / zoom };
    },
    [pan, zoom]
  );

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
  function toCanvasPoint(clientX: number, clientY: number) {
    const root = canvasRef.current;
    if (!root) return { x: 0, y: 0 };
    const rect = root.getBoundingClientRect();
    
    // Step 1: Get mouse position relative to canvas element (screen coordinates)
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    
    // Step 2 & 3: Convert screen coords to canvas coords
    // The canvas is transformed with: translate(pan.x, pan.y) scale(zoom)
    // To reverse: subtract pan offset, then divide by zoom scale
    const canvasX = (screenX - pan.x) / zoom;
    const canvasY = (screenY - pan.y) / zoom;
    
    return { x: canvasX, y: canvasY };
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
    const root = canvasRef.current;
    if (!root) return { x: 0, y: 0 };
    const rect = root.getBoundingClientRect();
    // Screen center coordinates (relative to canvas element)
    const screenCenterX = rect.width / 2;
    const screenCenterY = rect.height / 2;
    // Convert to canvas coordinates by accounting for pan and zoom
    return {
      x: (screenCenterX - pan.x) / zoom,
      y: (screenCenterY - pan.y) / zoom,
    };
  }
  
  // Robust bounds for all element types
  function getBounds(el: any) {
    const w = el.width ?? el.w ?? el.size?.w ?? 0;
    const h = el.height ?? el.h ?? el.size?.h ?? 0;
    return { x0: el.x, y0: el.y, x1: el.x + w, y1: el.y + h };
  }

  // Marquee selection helpers
  function normalizeRect(a: { x: number; y: number }, b: { x: number; y: number }) {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const w = Math.abs(a.x - b.x);
    const h = Math.abs(a.y - b.y);
    return { x, y, w, h, x2: x + w, y2: y + h };
  }

  // Get element bounds in canvas coords (axis-aligned bounding box)
  function getElementAABB(el: CanvasElement) {
    const x = el.x;
    const y = el.y;
    const w = el.width ?? 0;
    const h = el.height ?? 0;
    return { x, y, x2: x + w, y2: y + h };
  }

  // Check if two rectangles intersect
  function rectsIntersect(
    R: { x: number; y: number; x2: number; y2: number },
    E: { x: number; y: number; x2: number; y2: number }
  ) {
    return !(R.x2 < E.x || R.x > E.x2 || R.y2 < E.y || R.y > E.y2);
  }

  // Normalize drag box with optional square/circle constraint
  function normalizeBox(
    a: { x: number; y: number },
    b: { x: number; y: number },
    constrainSquare: boolean
  ) {
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    
    if (constrainSquare) {
      const s = Math.max(Math.abs(dx), Math.abs(dy));
      dx = Math.sign(dx || 1) * s;
      dy = Math.sign(dy || 1) * s;
    }
    
    const x = dx < 0 ? a.x + dx : a.x;
    const y = dy < 0 ? a.y + dy : a.y;
    const w = Math.max(0, Math.abs(dx));
    const h = Math.max(0, Math.abs(dy));
    
    return { x, y, w, h };
  }

  // Core canvas handler for all tools (select, hand, text, sticky, shapes, etc.)
  const handleCanvasPrimaryAction = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) => {
      if (isReadOnly || e.button !== 0) return;

      // Pin tool: open inline comment dialog (allowed even in read-only mode if allowPinComments is true)
      if (activeTool === "pin" && (allowPinComments || !isReadOnly)) {
        const canvasCoords = clientToCanvas(e.clientX, e.clientY, e.currentTarget as HTMLElement);
        setNewCommentDialog({
          x: canvasCoords.x,
          y: canvasCoords.y,
          category: "general",
          text: "",
          makeTask: false,
        });
        return;
      }
      
      // If hand tool, start panning
      if (activeTool === "hand") {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        return;
      }

      // Select tool marquee is handled by handleCanvasMouseDown
      // (element clicks are handled by handleElementMouseDown which stops propagation)

    },
    [isReadOnly, activeTool, pan, clientToCanvas, applySelection, onSelectElement, allowPinComments, setNewCommentDialog, elements, setElements, onSaveElements, onSetActiveTool, setIsMarquee, setMarqueeStart, setMarqueeEnd]
  );

  // Unified pointer down handler - handles all tools including creation
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Ignore events when pen/eraser is active (PenDrawingCanvas handles these)
      if (activeTool === "pen" || activeTool === "eraser") return;
      
      if (isReadOnly) return;
      if (e.button !== 0) return; // left button only
      
      if (!canvasRef.current) return;
      
      const canvasPoint = clientToCanvas(e.clientX, e.clientY, canvasRef.current);
      if (!canvasPoint) return;

      // Creation tools: drag-to-create (start draft on empty canvas)
      if (isCreationTool(activeTool)) {
        // Check if click is on an element - if so, don't create
        const target = e.target as HTMLElement;
        const isClickingOnElement = target.closest('[class*="react-rnd"]') !== null;
        if (isClickingOnElement) return;
        
        // Start drag-to-create
        const pt = canvasPoint;
        setIsCreating(true);
        setCreateStart(pt);
        setCreateEnd(pt);
        setCreateTool(activeTool);
        
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // For ALL OTHER tools (select, hand, pin, etc.)
      // Route to the primary action handler (but NOT creation - that's handled above)
      handleCanvasPrimaryAction(e);
    },
    [activeTool, isReadOnly, clientToCanvas, handleCanvasPrimaryAction, isCreationTool]
  );

  // Global pointer move handler (for tracking movement outside canvas)
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!canvasRef.current) return;
      

      // Custom drag-to-move is handled by window mouse listeners below (not here)

      // Drag-to-create: update end position while dragging
      if (isCreating && createStart) {
        const canvasPoint = clientToCanvas(e.clientX, e.clientY, canvasRef.current);
        if (canvasPoint) {
          setCreateEnd(canvasPoint);
        }
        return;
      }

      // Marquee selection is handled by window mouse listeners below
    };

    const handleGlobalPointerUp = (e?: PointerEvent) => {
      // Custom drag-to-move finalize is handled by window mouse listeners below

      // Drag-to-create: finalize creation on mouse up
      if (isCreating && createStart && createEnd && createTool) {
        const isShapeTool = createTool === "rect" || createTool === "circle" || createTool === "triangle" || 
                           createTool === "diamond" || createTool === "arrow" || createTool === "bubble" || 
                           createTool === "star" || createTool === "shape";
        const constrain = e?.shiftKey && isShapeTool;
        
        // Normalize the drag rectangle (ensures positive width/height regardless of drag direction)
        // createStart and createEnd are already in canvas coordinates (from clientToCanvas conversion)
        const R = normalizeBox(createStart, createEnd, constrain);
        
        const minW = 16;
        const minH = 16;
        const tiny = R.w < 8 && R.h < 8;
        
        // Toolbox defaults
        const toolboxDefaults: Record<string, { w: number; h: number }> = {
          text: { w: 200, h: 120 },
          sticky: { w: 160, h: 120 },
          rect: { w: 200, h: 140 },
          circle: { w: 160, h: 160 },
          ellipse: { w: 160, h: 160 },
          triangle: { w: 160, h: 160 },
          diamond: { w: 160, h: 160 },
          arrow: { w: 160, h: 160 },
          bubble: { w: 160, h: 160 },
          star: { w: 160, h: 160 },
          shape: { w: 200, h: 140 },
        };
        
        const def = toolboxDefaults[createTool] ?? { w: 160, h: 120 };
        const width = tiny ? def.w : Math.max(minW, R.w);
        const height = tiny ? def.h : Math.max(minH, R.h);
        
        // Position calculation: ensure sticky appears exactly where user expects
        let x: number, y: number;
        if (tiny) {
          // For tiny clicks (click-to-create), place at viewport center
          // This ensures the note appears in the center of what the user sees, not offset
          const viewportCenter = getViewportCenter();
          // Center the note on the viewport center (subtract half the note size)
          x = viewportCenter.x - def.w / 2;
          y = viewportCenter.y - def.h / 2;
        } else {
          // For drag-to-create: use the normalized rectangle position
          // R.x and R.y are already in canvas coordinates, correctly accounting for zoom/pan
          // The top-left corner (R.x, R.y) matches where the drag started (min of start/end)
          // This ensures the sticky's top-left appears at the drag start position
          x = R.x;
          y = R.y;
        }
        
        // Generate unique ID
        const newId = (() => {
          const gen = () =>
            (crypto?.randomUUID?.() ??
             `id_${Date.now()}_${Math.random().toString(36).slice(2,8)}`);
          let candidate = gen();
          const existing = new Set((elements ?? []).map(e => e.id));
          while (existing.has(candidate)) candidate = gen();
          return candidate;
        })();
        
        const elementType = mapToolToElementType(createTool);
        
        // Map tool to shapeType if needed
        let shapeType: CanvasElement["shapeType"] | undefined;
        if (elementType === "shape") {
          shapeType = createTool === "rect" ? "rect" :
            createTool === "circle" ? "circle" :
            createTool === "triangle" ? "triangle" :
            createTool === "diamond" ? "diamond" :
            createTool === "arrow" ? "arrow" :
            createTool === "bubble" ? "bubble" :
            createTool === "star" ? "star" :
            createTool === "shape" ? "rect" : "rect";
        }
        
        // Compute z-index properly
        const maxZ = elements.length > 0 ? Math.max(...elements.map(e => e.z ?? 0)) : 0;
        
        const newElement: CanvasElement = {
          id: newId,
          type: elementType,
          x,
          y,
          width,
          height,
          rotation: 0,
          z: maxZ + 10,
          locked: false,
          text: elementType === "text" || elementType === "sticky" ? "New text" : "",
          ...(elementType === "shape" && shapeType ? { shapeType } : {}),
          ...(elementType === "sticky" ? { fill: "#fef3c7" } : {}),
          ...(elementType === "text" ? { fontSize: 16, fontWeight: "normal" as const } : {}),
          ...(elementType === "shape" ? {
            fillColor: "rgba(0,0,0,0)",
            strokeColor: "#2563eb",
            strokeWidth: 2,
            borderRadius: createTool === "bubble" ? 8 : 0,
          } : {}),
        };
        
        console.log("[create] drag-to-create", newElement);
        
        setElements(prev => {
          const updated = uniqueById([...prev, newElement]);
          onSaveElements?.(updated);
          return updated;
        });
        
        // Auto-select the new element
        applySelection([newId]);
        onSelectElement?.(newId);
        
        // Switch back to Select tool after placing (keep existing behavior)
        onSetActiveTool?.("select");
        
        // Clean up creation state
        setIsCreating(false);
        setCreateStart(null);
        setCreateEnd(null);
        setCreateTool(null);
        return;
      }

      // Marquee selection: finalize selection on mouse up
      if (isMarquee && marqueeStart && marqueeEnd) {
        const R = normalizeRect(marqueeStart, marqueeEnd);
        const selectedByMarquee = elements
          .filter((el) => {
            const E = getElementAABB(el);
            return rectsIntersect(R, E);
          })
          .map((el) => el.id);

        setIsMarquee(false);
        setMarqueeStart(null);
        setMarqueeEnd(null);

        if (selectedByMarquee.length > 0) {
          // Toggle with existing selection if Shift is held, otherwise replace
          if (e?.shiftKey) {
            applySelection((prev) => {
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
          } else {
            applySelection(selectedByMarquee);
          }
          // Update selected element to first selected (or null if none)
          if (selectedByMarquee.length > 0) {
            onSelectElement?.(selectedByMarquee[0]);
          } else {
            onSelectElement?.(null);
          }
        } else if (!e?.shiftKey) {
          // Empty drag without Shift clears selection
          applySelection([]);
          onSelectElement?.(null);
        }
        return;
      }

    };

    const pointerUpHandler = (e: PointerEvent) => handleGlobalPointerUp(e);
    
    // Only attach listeners for drag-to-create
    if (isCreating) {
      window.addEventListener("pointermove", handleGlobalPointerMove);
      window.addEventListener("pointerup", pointerUpHandler);
    }

    return () => {
      window.removeEventListener("pointermove", handleGlobalPointerMove);
      window.removeEventListener("pointerup", pointerUpHandler);
    };
  }, [activeTool, clientToCanvas, isCreating, createStart, createEnd, createTool, setElements, onSaveElements, onSetActiveTool, mapToolToElementType, elements, applySelection, onSelectElement, normalizeRect, getElementAABB, rectsIntersect, isMarquee, marqueeStart, marqueeEnd, setIsMarquee, setMarqueeStart, setMarqueeEnd]);
  
  // Global mouse listeners: drag OR marquee
  useEffect(() => {
    // Capture functions we need
    const currentOnSaveElements = onSaveElements;
    const currentApplySelection = applySelection;
    
    function onMove(ev: MouseEvent) {
      // --- PAN ---
      if (isPanningRef.current && mouseStartRef.current && panStartRef.current) {
        const dx = ev.clientX - mouseStartRef.current.x;
        const dy = ev.clientY - mouseStartRef.current.y;
        setPan({ x: panStartRef.current.x + dx, y: panStartRef.current.y + dy });
        return; // don't run marquee/drag in the same gesture
      }
      
      // --- existing DRAG / MARQUEE logic stays as-is below ---
      if (!dragStartRef.current) return;
      
      if (isDragging) {
        const cur = toCanvasPoint(ev.clientX, ev.clientY);
        const dx = cur.x - dragStartRef.current.x;
        const dy = cur.y - dragStartRef.current.y;
        
        // don't actually move until we exceed threshold
        if (!dragActiveRef.current) {
          if (Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
          dragActiveRef.current = true; // start real drag now
        }
        
        const updated = elementsRef.current.map(el => {
          if (!selectedAtDragRef.current.includes(el.id)) return el;
          const start = startPosRef.current[el.id];
          if (!start) return el;
          // round to whole pixels to avoid tiny shifts
          return { ...el, x: Math.round(start.x + dx), y: Math.round(start.y + dy) };
        });
        setElements(updated);
        
        // Throttle persistence during drag
        throttleSave(() => {
          currentOnSaveElements?.(updated);
        }, 50);
        return;
      }
      
      if (isMarquee) {
        const cur = toCanvasPoint(ev.clientX, ev.clientY);
        setMarqueeStart(dragStartRef.current);
        setMarqueeEnd(cur);
        
        // Calculate marquee rectangle
        const R = normalizeRect(dragStartRef.current, cur);
        
        // Find all elements that intersect or are inside the marquee
        const hits = elementsRef.current
          .filter(el => {
            const E = getElementAABB(el);
            // Use intersection check (not just full containment)
            return rectsIntersect(R, E);
          })
          .map(el => el.id);
        
        // Update selection in real-time during drag (for visual feedback)
        currentApplySelection(hits);
      }
    }
    
    function onUp() {
      // end RMB state no matter where it releases
      rightButtonDownRef.current = false;
      
      // finish pan
      isPanningRef.current = false;
      mouseStartRef.current = null;
      panStartRef.current = null;
      
      // --- existing drag/marquee end code stays as-is ---
      if (isDragging && dragActiveRef.current) {
        // Clear any pending throttle timer
        if (throttleSaveRef.current.timer) {
          clearTimeout(throttleSaveRef.current.timer);
          throttleSaveRef.current.timer = null;
        }
        // Final save on drag end
        currentOnSaveElements?.(elementsRef.current);
      }
      
      setIsDragging(false);
      setIsMarquee(false);
      setMarqueeStart(null);
      setMarqueeEnd(null);
      dragStartRef.current = null;
      startPosRef.current = {};
      selectedAtDragRef.current = [];
      dragActiveRef.current = false; // reset
    }
    
    // Always attach listeners (panning uses refs, so we need to always check)
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      // Clean up throttle timer on unmount
      if (throttleSaveRef.current.timer) {
        clearTimeout(throttleSaveRef.current.timer);
        throttleSaveRef.current.timer = null;
      }
    };
  }, [isDragging, isMarquee, pan.x, pan.y, zoom, boardId, setPan, throttleSave, applySelection, onSaveElements]);

  // ESC key handler to cancel creation
  useEffect(() => {
    if (!isCreating) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsCreating(false);
        setCreateStart(null);
        setCreateEnd(null);
        setCreateTool(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCreating]);

  // Delete/Backspace key handler for group deletion
  useEffect(() => {
    if (isReadOnly || activeTool !== "select") return;
    if (selectedIds.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't delete if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        
        // Delete all selected elements
        const updated = elementsRef.current.filter(el => !selectedIds.includes(el.id));
        setElements(updated);
        onSaveElements?.(updated);
        
        // Clear selection after deletion
        applySelection([]);
        onSelectElement?.(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isReadOnly, activeTool, selectedIds, setElements, onSaveElements, applySelection, onSelectElement]);

  // Local pointer move handler (for when pointer is over canvas)
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Pointer move logic is handled in useEffect
    },
    []
  );

  // Local pointer up handler
  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Other tools' mouse up logic is handled in useEffect
  }, []);

  // Local pointer leave handler
  const handlePointerLeave = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Pointer leave logic handled elsewhere if needed
  }, []);


  // Stub handlers for direct mouse events (mouse move/up are handled via window listeners)
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    // Mouse move is handled by window-level listener in useEffect
  }, []);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    // Mouse up is handled by window-level listener in useEffect
  }, []);

  const handleCanvasMouseLeave = useCallback((e: React.MouseEvent) => {
    // Mouse leave is handled by window-level listener in useEffect
  }, []);
  
  // Handle mouse move/up for panning only
  useEffect(() => {
    if (isReadOnly) return;

    function handleMouseMove(ev: MouseEvent) {
      if (!isPanning) return;

      setPan(prev => ({
        x: prev.x + ev.movementX,
        y: prev.y + ev.movementY,
      }));
    }

    function handleMouseUp() {
      // stop panning when mouse is released
      if (isPanning) {
        setIsPanning(false);
      }
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isPanning, isReadOnly, setPan, setIsPanning]);


  // Commit sticky/text edit: save text and exit edit mode + deselect
  const commitStickyEdit = useCallback((nextText: string) => {
    const currentEditingId = editingIdRef.current;
    if (!currentEditingId) return;
    
    // Normalize: empty string keeps placeholder visible later
    const finalText = nextText.trim() === "" ? "" : nextText;
    
    // Update the element by elementId
    const currentElements = elementsRef.current;
    const updated = currentElements.map((el) =>
      el.id === currentEditingId
        ? { ...el, text: finalText, body: finalText }
        : el
    );
    setElements(updated);
    onSaveElements?.(updated);
    
    // Clear editingId and deselect
    setEditingId(null);
    setEditingDraft("");
    applySelection([]);
    onSelectElement?.(null);
  }, [setElements, onSaveElements, applySelection, onSelectElement]);
  
  // Keep ref in sync
  useEffect(() => {
    commitStickyEditRef.current = commitStickyEdit;
  }, [commitStickyEdit]);

  // Cancel sticky/text edit: restore previous text and exit edit mode + deselect
  const cancelStickyEdit = useCallback(() => {
    const currentEditingId = editingIdRef.current;
    if (!currentEditingId) return;
    
    // Restore previous text
    const restore = prevTextRef.current ?? "";
    const currentElements = elementsRef.current;
    const updated = currentElements.map((el) =>
      el.id === currentEditingId
        ? { ...el, text: restore, body: restore }
        : el
    );
    setElements(updated);
    onSaveElements?.(updated);
    
    // Clear editingId and deselect
    setEditingId(null);
    setEditingDraft("");
    applySelection([]);
    onSelectElement?.(null);
  }, [setElements, onSaveElements, applySelection, onSelectElement]);

  // Handle text edit complete (blur)
  const handleTextEditComplete = useCallback(() => {
    commitStickyEdit(editingDraft);
  }, [editingDraft, commitStickyEdit]);

  // Handle keyboard events in editor
  const handleTextEditKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault(); // prevent newline
        commitStickyEdit(editingDraft);
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelStickyEdit();
      }
    },
    [editingDraft, commitStickyEdit, cancelStickyEdit]
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const isTypingInForm = () => {
      const el = document.activeElement as HTMLElement | null;
      const tag = (el?.tagName || "").toLowerCase();
      return tag === "input" || tag === "textarea" || el?.isContentEditable === true;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isReadOnly || editingId !== null) return;
      if (isTypingInForm()) return; // Don't interfere with typing in inputs
      
      // Esc: clear selection
      if (e.key === "Escape") {
        e.preventDefault();
        applySelection([]);
        onSelectElement(null);
        return;
      }
      
      // Cmd/Ctrl+A: select all elements
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "a") {
        e.preventDefault();
        const allIds = elements.map(el => el.id);
        applySelection(allIds);
        if (allIds.length > 0) {
          onSelectElement(allIds[0]);
        }
        return;
      }
      
      // Delete or Backspace: remove selected elements
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length > 0) {
        e.preventDefault();
        const updated = elements.filter((el) => !selectedIds.includes(el.id));
        setElements(updated);
        applySelection([]);
        onSelectElement(null);
        onSaveElements?.(updated);
        return;
      }
      
      // Ctrl+D or Cmd+D: duplicate selected element
      if (meta && e.key === "d" && selectedIds.length === 1) {
        e.preventDefault();
        const elementToDuplicate = elements.find((el) => el.id === selectedIds[0]);
        if (elementToDuplicate) {
          // Generate unique ID that doesn't exist yet
          const newId = (() => {
            const gen = () =>
              (crypto?.randomUUID?.() ??
               `id_${Date.now()}_${Math.random().toString(36).slice(2,8)}`);
            let candidate = gen();
            const existing = new Set((elements ?? []).map(e => e.id));
            while (existing.has(candidate)) candidate = gen();
            return candidate;
          })();
          
          const newElement: CanvasElement = {
            ...elementToDuplicate,
            id: newId,
            x: elementToDuplicate.x + 20,
            y: elementToDuplicate.y + 20,
            z: elementToDuplicate.z + 10,
          };
          const updated = uniqueById([...elements, newElement]);
          setElements(updated);
          applySelection([newElement.id]);
          onSelectElement(newElement.id);
          onSaveElements?.(updated);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isReadOnly, editingId, selectedIds, elements, setElements, applySelection, onSelectElement, onSaveElements]);

  // Zoom around the cursor position
  function zoomAtWheel(ev: WheelEvent) {
    if (isReadOnly) return;
    
    const root = canvasRef.current;
    if (!root) return;
    
    const rect = root.getBoundingClientRect();
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
    if (isReadOnly) return;
    
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
  }, [pan.x, pan.y, zoom, isReadOnly]);

  // Click-out handler: commit edit when clicking outside editor
  useEffect(() => {
    if (!editingId) return;
    
    const handleCanvasPointerDownCapture = (e: PointerEvent | MouseEvent) => {
      const target = e.target as Node;
      // If click is outside the editor, commit
      if (editingTextareaRef.current && !editingTextareaRef.current.contains(target)) {
        // Use the current textarea value
        const currentText = editingTextareaRef.current.value || "";
        commitStickyEdit(currentText);
      }
    };
    
    // Use capture phase to intercept before other handlers
    document.addEventListener("pointerdown", handleCanvasPointerDownCapture, true);
    document.addEventListener("mousedown", handleCanvasPointerDownCapture, true);
    
    return () => {
      document.removeEventListener("pointerdown", handleCanvasPointerDownCapture, true);
      document.removeEventListener("mousedown", handleCanvasPointerDownCapture, true);
    };
  }, [editingId, commitStickyEdit]);

  // Render inline text editor
  const renderInlineEditor = () => {
    if (!editingId) return null;
    
    const element = elements.find((el) => el.id === editingId);
    // Sticky notes now use StickyNote component which handles editing internally
    if (!element || element.type !== "text") return null;
    
    return (
      <div
        key={`edit_${editingId}`}
        style={{
          position: "absolute",
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          zIndex: 10000,
          pointerEvents: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <textarea
          ref={editingTextareaRef}
          value={editingDraft}
          onChange={(e) => setEditingDraft(e.target.value)}
          onBlur={() => commitStickyEdit(editingDraft)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commitStickyEdit(editingDraft);
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancelStickyEdit();
            }
          }}
          style={{
            width: "100%",
            height: "100%",
            padding: "8px",
            border: "2px solid #3b82f6",
            borderRadius: element.type === "sticky" ? "4px" : "0",
            backgroundColor: element.type === "sticky" ? "#fffbe6" : "white",
            fontSize: element.fontSize || 16,
            fontWeight: element.fontWeight || "normal",
            fontFamily: "inherit",
            resize: "none",
            outline: "none",
            boxSizing: "border-box",
          }}
          // Intentionally no placeholder while editing so "New text" disappears immediately
          autoFocus
        />
      </div>
    );
  };

  // Sort elements by z-index
  // Always render, even in read-only mode - use safe arrays
  const safeElements = elements ?? [];
  
  // Deduplicate before rendering
  const elementsToRender = React.useMemo(() => {
    const seen = new Set<string>();
    const uniq = [];
    for (const el of (safeElements ?? [])) {
      if (seen.has(el.id)) {
        console.warn("[elements] duplicate id dropped at render:", el.id);
        continue;
      }
      seen.add(el.id);
      uniq.push(el);
    }
    return uniq;
  }, [safeElements]);
  
  const sortedElements = [...elementsToRender].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  const shapeElements = sortedElements;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[rgb(248,249,250)]">
      {/* Main board surface */}
      <div
        ref={canvasRef}
        className="relative w-full h-full overflow-hidden select-none p-0 m-0"
        style={{ 
          cursor: getCursorStyle(),
          pointerEvents: (activeTool === "pen" || activeTool === "eraser") ? "none" : "auto"
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseDown={handleCanvasMouseDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseLeave}
      >
        {/* Pen Tool Overlay */}
        {(activeTool === "pen" || activeTool === "eraser") && (
          <PenTool
            activeTool={activeTool === "pen" ? "pen" : activeTool === "eraser" ? "eraser" : null}
            penColor={penColor}
            penWidth={penWidth}
            eraserSize={eraserSize}
            pan={pan}
            zoom={zoom}
            initialStrokes={penStrokes}
            onStrokesChange={onPenStrokesChange}
            enabled={!isReadOnly}
            boardId={boardId}
          />
        )}
        {/* Drag-to-create ghost rectangle (non-interactive) */}
        {isCreating && createStart && createEnd && (() => {
          const R = normalizeBox(createStart, createEnd, false); // visual only; constraint is applied on mouseup by Shift
          // Convert canvas coords → screen coords using pan/zoom
          const left = R.x * zoom + pan.x;
          const top = R.y * zoom + pan.y;
          const width = R.w * zoom;
          const height = R.h * zoom;
          return (
            <div
              className={MARQUEE_BOX_CLASS}
              style={{
                left,
                top,
                width,
                height,
              }}
            />
          );
        })()}

        {/* Marquee selection overlay (non-interactive) */}
        {isMarquee && marqueeStart && marqueeEnd && (() => {
          const R = normalizeRect(marqueeStart, marqueeEnd);
          // Convert canvas coords → screen coords using pan/zoom
          const left = R.x * zoom + pan.x;
          const top = R.y * zoom + pan.y;
          const width = R.w * zoom;
          const height = R.h * zoom;
          return (
            <div
              className={MARQUEE_BOX_CLASS}
              style={{
                left,
                top,
                width,
                height,
              }}
            />
          );
        })()}

        {/* Pan + Zoom container */}
        <div
          className="absolute left-0 top-0 will-change-transform"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {/* Canvas background grid */}
          <div
            className="relative"
            style={{
              width: 3000,
              height: 2000,
              backgroundImage:
                "repeating-conic-gradient(#f8f9fa 0% 25%, transparent 0% 50%)",
              backgroundSize: "20px 20px",
            }}
          >
            {/* ==== ELEMENTS ==== */}
            {sortedElements.map((el) => {
              const isEditingThis = editingId === el.id;
              const isSelected = selectedIds.includes(el.id);
              
              // Check if element is highlighted during marquee drag
              const isMarqueeHighlighted = isMarquee && marqueeStart && marqueeEnd && (() => {
                const R = normalizeRect(marqueeStart, marqueeEnd);
                const E = getElementAABB(el);
                return rectsIntersect(R, E);
              })();

              if (isReadOnly) {
                // Read-only mode: simple div rendering
                return (
                  <div
                    key={el.id}
                    style={{
                      position: "absolute",
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height,
                      // PDF pages: no border, padding, or margin to maintain exact 4px spacing
                      // Other elements: keep borders for visual distinction
                      border: el.type === "shape" 
                        ? "none" 
                        : (el.type === "image" && el.text?.startsWith("PDF Page"))
                        ? "none" // No border for PDF pages
                        : "1px solid rgba(0,0,0,0.1)",
                      borderRadius: el.type === "shape" ? "0" : (el.type === "shape" && el.shapeType === "circle" ? "9999px" : "4px"),
                      backgroundColor:
                        el.type === "sticky"
                          ? "#fffbe6"
                          : el.type === "shape"
                          ? "transparent"
                          : el.type === "image" && el.text?.startsWith("PDF Page")
                          ? "transparent" // No background for PDF pages
                          : "#ffffff",
                      padding: el.type === "text" || el.type === "sticky" ? "8px" : "0px", // PDF pages already have 0px padding
                      margin: "0px", // No margin for any elements
                      fontSize: "13px",
                      lineHeight: 1.4,
                      overflow: "visible",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      color: "#1f2937",
                      boxShadow: "none",
                      opacity: isMarqueeHighlighted && !isSelected ? 0.8 : 1,
                    }}
                  >
                    {el.type === "shape" && el.shapeType ? (
                      <svg
                        width={Math.max(el.width, 1)}
                        height={Math.max(el.height, 1)}
                        className="block"
                        viewBox={`0 0 ${Math.max(el.width, 1)} ${Math.max(el.height, 1)}`}
                      >
                        {renderShape(el, isSelected || isMarqueeHighlighted)}
                      </svg>
                    ) : el.type === "image" && (el.src || el.imageUrl) ? (
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
                          className="w-full h-full object-contain"
                          style={{
                            borderRadius: el.text?.startsWith("PDF Page") ? "0px" : "4px", // No border radius for PDF pages
                            userSelect: "none",
                            margin: "0px",
                            padding: "0px",
                            border: "none",
                            display: "block", // Remove any inline spacing
                          }}
                        />
                        {/* Page number overlay for PDF pages */}
                        {el.text?.startsWith("PDF Page") && (() => {
                          const pageMatch = el.text.match(/PDF Page (\d+)/);
                          const pageNumber = pageMatch ? pageMatch[1] : null;
                          if (pageNumber) {
                            return (
                              <div
                                className="absolute top-2 left-2 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded pointer-events-none"
                                style={{ zIndex: 10 }}
                              >
                                Page {pageNumber}
                              </div>
                            );
                          }
                          return null;
                        })()}
                        {/* Calm blue selection border (Miro-style) - only shows when element is selected */}
                        {isSelected && (
                          <div className="absolute inset-0 border-2 border-blue-400 rounded-lg pointer-events-none z-10" />
                        )}
                      </div>
                    ) : (
                      el.text || ""
                    )}
                  </div>
                );
              }

              // Editable mode: use Rnd
              return (
                <Rnd
                  key={el.id}
                  size={{ width: el.width, height: el.height }}
                  position={{ x: el.x, y: el.y }}
                  disableDragging={isReadOnly || isEditingThis || activeTool === "select" || activeTool === "hand"}
                  enableResizing={!isReadOnly && !isEditingThis && activeTool !== "hand"}
                  bounds="parent"
                  onDragStart={(e) => {
                    // Remember where the pointer started for this element
                    if (!isReadOnly && e.clientX !== undefined && e.clientY !== undefined) {
                      dragStateRef.current.set(el.id, {
                        startPos: { x: e.clientX, y: e.clientY },
                        isActuallyDragging: false,
                      });
                    }
                  }}
                  onDrag={(e, d) => {
                    if (isReadOnly) return;
                    
                    const dragState = dragStateRef.current.get(el.id);
                    if (!dragState || !e.clientX || e.clientY === undefined) return;
                    
                    const dx = e.clientX - dragState.startPos.x;
                    const dy = e.clientY - dragState.startPos.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (!dragState.isActuallyDragging && distance > DRAG_THRESHOLD) {
                      dragState.isActuallyDragging = true;
                      console.log("Starting real drag for element", el.id);
                      // Update the map
                      dragStateRef.current.set(el.id, dragState);
                    }
                    
                    // Note: We don't update position in onDrag - Rnd handles the visual update
                    // We only check threshold here and track state
                  }}
                  onDragStop={(e, d) => {
                    if (isReadOnly) return;
                    
                    const dragState = dragStateRef.current.get(el.id);
                    
                    // If we never crossed the threshold, treat this as a click-only, no movement
                    if (!dragState || !dragState.isActuallyDragging) {
                      // Do NOT update x/y here - this was just a click
                      dragStateRef.current.delete(el.id);
                      return;
                    }
                    
                    // If we DID drag, then apply the position change with snapping
                    if (selectedIds.length > 1 && selectedIds.includes(el.id)) {
                      // Move all selected elements together
                      const dx = d.x - el.x;
                      const dy = d.y - el.y;
                      const updated = elements.map((item) =>
                        selectedIds.includes(item.id)
                          ? { 
                              ...item, 
                              x: snapCoord(item.x + dx), 
                              y: snapCoord(item.y + dy) 
                            }
                          : item
                      );
                      setElements(updated);
                      onSaveElements?.(updated);
                    } else {
                      // Single element drag with snapping
                      const updated = elements.map((item) =>
                        item.id === el.id 
                          ? { ...item, x: snapCoord(d.x), y: snapCoord(d.y) }
                          : item
                      );
                      setElements(updated);
                      onSaveElements?.(updated);
                    }
                    
                    // Clean up drag state
                    dragStateRef.current.delete(el.id);
                  }}
                  onResizeStop={(e, direction, ref, delta, position) => {
                    const updated = elements.map((item) =>
                      item.id === el.id
                        ? {
                            ...item,
                            width: snapCoord(parseFloat(ref.style.width)),
                            height: snapCoord(parseFloat(ref.style.height)),
                            x: snapCoord(position.x),
                            y: snapCoord(position.y),
                          }
                        : item
                    );
                    setElements(updated);
                    onSaveElements?.(updated);
                  }}
                  onMouseDown={(e) => handleElementMouseDown(e, el)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  style={{
                    // PDF pages: no border, padding, or margin to maintain exact 4px spacing
                    // Other elements: keep borders for visual distinction
                    border: el.type === "shape" 
                      ? "none" 
                      : (el.type === "image" && el.text?.startsWith("PDF Page"))
                      ? "none" // No border for PDF pages
                      : "1px solid rgba(0,0,0,0.1)",
                    background: "transparent",
                    boxSizing: "border-box",
                    borderRadius: el.type === "shape" ? "0" : (el.type === "shape" && el.shapeType === "circle" ? "9999px" : "4px"),
                    margin: "0px", // No margin for any elements
                    cursor: isReadOnly
                      ? "default"
                      : isEditingThis
                      ? "text"
                      : "move",
                    boxShadow: "none",
                    opacity: isMarqueeHighlighted && !isSelected ? 0.8 : 1,
                  }}
                  className={el.type === "shape" ? "" : ""}
                >
                  {/* Calm blue selection border (Miro-style) - only shows when element is selected */}
                  {isSelected && (
                    <div className="absolute inset-0 border-2 border-blue-400 rounded-lg pointer-events-none z-10" />
                  )}
                  {/* Render element content */}
                  {el.type === "shape" && el.shapeType ? (
                    <svg
                      width={Math.max(el.width, 1)}
                      height={Math.max(el.height, 1)}
                      className="block w-full h-full"
                      viewBox={`0 0 ${Math.max(el.width, 1)} ${Math.max(el.height, 1)}`}
                    >
                      {renderShape(el, isSelected || isMarqueeHighlighted)}
                    </svg>
                  ) : el.type === "sticky" ? (
                    <StickyNote
                      id={el.id}
                      x={0}
                      y={0}
                      width={el.width}
                      height={el.height}
                      text={el.text}
                      isSelected={isSelected}
                      isReadOnly={isReadOnly}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        // StickyNote handles its own editing, just select
                        if (!isReadOnly) {
                          applySelection([el.id]);
                          onSelectElement?.(el.id);
                        }
                      }}
                      onTextChange={(id, newText) => {
                        const updated = elements.map((item) =>
                          item.id === id ? { ...item, text: newText, body: newText } : item
                        );
                        setElements(updated);
                        onSaveElements?.(updated);
                        // Clear editing state when done
                        setEditingId(null);
                        setEditingDraft("");
                      }}
                      onCancelEdit={(id) => {
                        // Clear editing state when editing is cancelled
                        setEditingId(null);
                        setEditingDraft("");
                      }}
                      className={STICKY_CARD_CLASS}
                      style={{ boxSizing: "border-box" }}
                    />
                  ) : el.type === "text" ? (
                    <div
                      className="w-full h-full bg-white rounded border border-gray-300 text-sm p-2"
                      style={{
                        boxSizing: "border-box",
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (isReadOnly) return;
                        startEditingElement(el.id);
                      }}
                    >
                      {/* Placeholder only shows when not editing and there's no text */}
                      {(() => {
                        const hasText = !!el.text && el.text.trim() !== "" && el.text.trim() !== "New text";
                        return hasText ? (
                          <div className="whitespace-pre-wrap">{el.text}</div>
                        ) : (
                          !isEditingThis && <div className="opacity-60 italic select-none">New text</div>
                        );
                      })()}
                    </div>
                  ) : el.type === "image" && (el.src || el.imageUrl) ? (
                    <div
                      className="relative w-full h-full"
                      style={{
                        overflow: "hidden",
                        borderRadius: el.text?.startsWith("PDF Page") ? "0px" : "4px", // No border radius for PDF pages
                        boxSizing: "border-box",
                        margin: "0px",
                        padding: "0px",
                        border: "none",
                      }}
                    >
                      <img
                        src={el.src || el.imageUrl}
                        alt="Canvas image"
                        className="w-full h-full object-contain"
                        style={{
                          userSelect: "none",
                          pointerEvents: "none",
                          margin: "0px",
                          padding: "0px",
                          border: "none",
                          display: "block", // Remove any inline spacing
                        }}
                      />
                      {/* Page number overlay for PDF pages */}
                      {el.text?.startsWith("PDF Page") && (() => {
                        const pageMatch = el.text.match(/PDF Page (\d+)/);
                        const pageNumber = pageMatch ? pageMatch[1] : null;
                        if (pageNumber) {
                          return (
                            <div
                              className="absolute top-2 left-2 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded pointer-events-none"
                              style={{ zIndex: 10 }}
                            >
                              Page {pageNumber}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  ) : (
                    <div
                      className="w-full h-full bg-white rounded border border-gray-300 text-xs p-2"
                      style={{
                        boxSizing: "border-box",
                      }}
                    >
                      {el.text || ""}
                    </div>
                  )}
                </Rnd>
              );
            })}


            {/* ==== PINNED COMMENTS (pins on canvas) ==== */}
            {pinnedComments?.filter((c) => c.x !== undefined && c.y !== undefined).map((comment, index) => (
              <div
                key={comment.id}
                onClick={() => {
                  if (!isReadOnly) {
                    onSelectComment(comment.id);
                  }
                }}
                className="absolute rounded-full bg-blue-600 text-white text-[10px] font-medium leading-none flex items-center justify-center border border-white shadow cursor-pointer hover:bg-blue-700 transition"
                style={{
                  left: (comment.x || 0) - 10,
                  top: (comment.y || 0) - 10,
                  width: 20,
                  height: 20,
                  pointerEvents: isReadOnly ? "none" : "auto",
                  zIndex: 50,
                }}
                title={comment.text || "Pinned comment"}
              >
                {index + 1}
              </div>
            ))}

            {/* ==== INLINE EDITOR OVERLAYS ==== */}
            {renderInlineEditor && renderInlineEditor()}
          </div>
        </div>

      </div>
    </div>
  );
}
