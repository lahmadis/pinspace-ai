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

interface BoardCanvasProps {
  elements: CanvasElement[];
  setElements: Dispatch<SetStateAction<CanvasElement[]>>;
  selectedIds: string[];
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  activeTool: ToolType;
  onSetActiveTool?: (tool: ToolType) => void;
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onSelectionChange?: (ids: string[]) => void;
  zoom: number;
  setZoom: (z: number) => void;
  pan: { x: number; y: number };
  setPan: Dispatch<SetStateAction<{ x: number; y: number }>>;
  snap?: boolean;
  onSaveElements?: (updated?: CanvasElement[]) => void;
  isReadOnly?: boolean;
  pinnedComments?: Comment[];
  onSelectComment?: (commentId: string | null) => void;
  onCreateComment?: (comment: Omit<Comment, "id" | "timestamp" | "boardId" | "author">) => void;
  boardId?: string;
  currentUserName?: string;
  allowPinComments?: boolean;
  showMinimalToolbar?: boolean;
  penColor?: string;
  penWidth?: number;
  eraserSize?: number;
  penStrokes?: PenStroke[];
  onPenStrokesChange?: (strokes: PenStroke[]) => void;
}

// ============================================================================
// ULTRA-SMOOTH ZOOM CONSTANTS (Miro-quality)
// ============================================================================
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5.0;
const ZOOM_STEP = 1.05; // 5% per mouse wheel notch - buttery smooth
const ZOOM_STEP_TRACKPAD = 1.015; // 1.5% per trackpad increment - ultra smooth
const ZOOM_SMOOTHING = 0.15; // Smoothing factor for zoom accumulation
const DRAG_THRESHOLD = 3; // pixels

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

const isMouseEvent = (e: any): e is { clientX: number; clientY: number } => 
  'clientX' in e && typeof e.clientX === 'number';

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
  const activeTool = propActiveTool ?? "select";
  const onSetActiveTool = propOnSetActiveTool ?? (() => {});

  const getCursorStyle = useCallback(() => {
    switch (activeTool) {
      case "select": return "default";
      case "hand": return "grab";
      case "sticky":
      case "image":
      case "rect":
      case "circle":
      case "triangle":
      case "diamond":
      case "arrow":
      case "bubble":
      case "star":
        return "crosshair";
      case "text": return "text";
      default: return "default";
    }
  }, [activeTool]);

  const applySelection = useCallback((ids: string[] | ((prev: string[]) => string[])) => {
    setSelectedIds((prev) => {
      const next = typeof ids === "function" ? ids(prev) : ids;
      onSelectionChange?.(next);
      return next;
    });
  }, [setSelectedIds, onSelectionChange]);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const prevTextRef = useRef<string>("");
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const editingTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const mouseStartRef = useRef<{ x: number; y: number } | null>(null);
  const spaceDownRef = useRef(false);
  const rightButtonDownRef = useRef(false);
  
  const [isMarquee, setIsMarquee] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [createStart, setCreateStart] = useState<{ x: number; y: number } | null>(null);
  const [createEnd, setCreateEnd] = useState<{ x: number; y: number } | null>(null);
  const [createTool, setCreateTool] = useState<ToolType | null>(null);
  const [createConstrainSquare, setCreateConstrainSquare] = useState(false);
  
  const dragStateRef = useRef<Map<string, { startPos: { x: number; y: number }; isActuallyDragging: boolean }>>(new Map());
  
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const startPosRef = useRef<Record<string, { x: number; y: number }>>({});
  const selectedAtDragRef = useRef<string[]>([]);
  const dragActiveRef = useRef(false);
  
  // Smooth zoom accumulator
  const zoomAccumulatorRef = useRef(0);
  const lastZoomTimeRef = useRef(0);
  
  const throttleSaveRef = useRef<{ timer: NodeJS.Timeout | null; lastCall: number }>({ timer: null, lastCall: 0 });
  const throttleSave = useCallback((fn: () => void, delay: number = 50) => {
    const now = Date.now();
    if (now - throttleSaveRef.current.lastCall >= delay) {
      throttleSaveRef.current.lastCall = now;
      fn();
    } else {
      if (throttleSaveRef.current.timer) clearTimeout(throttleSaveRef.current.timer);
      throttleSaveRef.current.timer = setTimeout(() => {
        throttleSaveRef.current.lastCall = Date.now();
        fn();
      }, delay - (now - throttleSaveRef.current.lastCall));
    }
  }, []);
  
  const editingIdRef = useRef<string | null>(null);
  useEffect(() => { editingIdRef.current = editingId; }, [editingId]);
  
  const elementsRef = useRef(elements);
  useEffect(() => { elementsRef.current = elements; }, [elements]);
  
  const commitStickyEditRef = useRef<((text: string) => void) | null>(null);
  const isInitialMountRef = useRef(true);

  const [newCommentDialog, setNewCommentDialog] = useState<{
    x: number;
    y: number;
    category: "concept" | "plan" | "section" | "material" | "circulation" | "structure" | "general";
    text: string;
    makeTask: boolean;
  } | null>(null);

  // Load/save view state
  useEffect(() => {
    if (!boardId) return;

    if (isInitialMountRef.current) {
      try {
        const saved = getViewState(boardId);
        if (saved) {
          setPan(saved.pan);
          setZoom(saved.zoom);
          isInitialMountRef.current = false;
        }
      } catch (err) {
        console.error("[BoardCanvas] Failed to load view state", err);
      }
    }

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

    const interval = setInterval(() => {
      try {
        const saved = getViewState(boardId);
        if (saved && !isInitialMountRef.current) {
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
  
  useEffect(() => {
    if (!boardId) return;
    const id = setTimeout(() => {
      saveViewState(boardId, { pan, zoom });
    }, 150);
    return () => clearTimeout(id);
  }, [boardId, pan.x, pan.y, zoom]);
  
  // Space key panning
  useEffect(() => {
    const isEditable = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = (el.tagName || "").toLowerCase();
      return tag === "input" || tag === "textarea" || el.isContentEditable;
    };
    
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isEditable(e.target)) {
        spaceDownRef.current = true;
        e.preventDefault();
      }
    };
    
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceDownRef.current = false;
    };
    
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown as any);
      window.removeEventListener("keyup", onKeyUp as any);
    };
  }, []);
  
  // Suppress context menu
  useEffect(() => {
    const onCtx = (e: MouseEvent) => {
      if (isPanningRef.current || rightButtonDownRef.current) e.preventDefault();
    };
    window.addEventListener("contextmenu", onCtx, true);
    return () => window.removeEventListener("contextmenu", onCtx, true);
  }, []);
  
  useEffect(() => {
    const root = canvasRef.current as HTMLElement | null;
    if (!root) return;
    
    const blockCtx = (e: MouseEvent) => {
      if (root.contains(e.target as Node)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    document.addEventListener("contextmenu", blockCtx, true);
    return () => document.removeEventListener("contextmenu", blockCtx, true);
  }, []);

  // Deduplicate on mount
  useEffect(() => {
    if (!elements || elements.length === 0) return;
    const deduped = uniqueById(elements);
    if (deduped.length !== elements.length) {
      console.warn("[elements] deduped on mount:", elements.length, "→", deduped.length);
      setElements(deduped);
      onSaveElements?.(deduped);
    }
  }, []);

  const makeNewElementFromTool = useCallback(
    (tool: "text" | "sticky" | "rect" | "circle" | "triangle" | "diamond" | "arrow" | "bubble" | "star" | "image", x: number, y: number, width: number, height: number): CanvasElement => {
      const id = `e_${crypto.randomUUID()}`;
      
      if (tool === "text") {
        return {
          id, type: "text", x, y, width, height, rotation: 0,
          z: (elements.length + 1) * 10, locked: false,
          text: "New text", fontSize: 16, fontWeight: "normal",
        };
      }
      
      if (tool === "sticky") {
        return {
          id, type: "sticky", x, y, width, height, rotation: 0,
          z: (elements.length + 1) * 10, locked: false,
          text: "New note", fill: "#fef3c7",
        };
      }
      
      const shapeTools: ("rect" | "circle" | "triangle" | "diamond" | "arrow" | "bubble" | "star")[] = [
        "rect", "circle", "triangle", "diamond", "arrow", "bubble", "star",
      ];
      
      if (shapeTools.includes(tool as any)) {
        return {
          id, type: "shape",
          shapeType: tool as "rect" | "circle" | "triangle" | "diamond" | "arrow" | "bubble" | "star",
          x, y, width, height, rotation: 0,
          z: (elements.length + 1) * 10, locked: false,
          fillColor: "rgba(0,0,0,0)", strokeColor: "#2563eb", strokeWidth: 2,
          borderRadius: tool === "bubble" ? 8 : 0,
        };
      }
      
      if (tool === "image") {
        return {
          id, type: "image", x, y, width, height, rotation: 0,
          z: (elements.length + 1) * 10, locked: false,
          text: "", fill: "#f0f0f0", stroke: "#cccccc", strokeWidth: 1,
        };
      }
      
      return {
        id, type: "shape", shapeType: "rect", x, y, width, height, rotation: 0,
        z: (elements.length + 1) * 10, locked: false,
        fillColor: "#f8fafc", strokeColor: "#9ca3af", strokeWidth: 1,
      };
    },
    [elements.length]
  );
  
  const renderShape = useCallback((el: CanvasElement, selected: boolean = false) => {
    const stroke = selected ? "#2563eb" : "#1f2937";
    const fill = "none";
    const sw = el.strokeWidth ?? 2;
    const w = Math.max(el.width, 1);
    const h = Math.max(el.height, 1);
    
    switch (el.shapeType) {
      case "rect":
        return <rect x={0} y={0} width={w} height={h} rx={6} ry={6} fill={fill} stroke={stroke} strokeWidth={sw} />;
      case "circle":
        return <ellipse cx={w/2} cy={h/2} rx={w/2} ry={h/2} fill={fill} stroke={stroke} strokeWidth={sw} />;
      case "triangle":
        return <path d={`M ${w/2} 0 L ${w} ${h} L 0 ${h} Z`} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
      case "diamond":
        return <path d={`M ${w/2} 0 L ${w} ${h/2} L ${w/2} ${h} L 0 ${h/2} Z`} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
      case "bubble":
        const tailW = Math.min(w * 0.2, 20);
        const tailH = Math.min(h * 0.2, 20);
        return <path d={`M 8 0 H ${w-8} Q ${w} 0 ${w} 8 V ${h-8} Q ${w} ${h} ${w-8} ${h} H ${tailW+12} L ${tailW} ${h+tailH} L ${tailW+4} ${h} H 8 Q 0 ${h} 0 ${h-8} V 8 Q 0 0 8 0 Z`} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
      case "star":
        const starPoints: Array<[number, number]> = [];
        const cx = w/2, cy = h/2, outer = Math.min(w,h)*0.5, inner = outer*0.5;
        for (let i = 0; i < 10; i++) {
          const r = (i%2===0) ? outer : inner;
          const a = (-Math.PI/2) + (i*Math.PI/5);
          starPoints.push([cx + r*Math.cos(a), cy + r*Math.sin(a)]);
        }
        return <path d={`M ${starPoints[0][0]} ${starPoints[0][1]} ` + starPoints.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(" ") + " Z"} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
      case "arrow":
        const bodyW = w * 0.6;
        return <path d={`M 0 ${h*0.25} L ${bodyW} ${h*0.25} L ${bodyW} ${h*0.1} L ${w} ${h/2} L ${bodyW} ${h*0.9} L ${bodyW} ${h*0.75} L 0 ${h*0.75} Z`} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
      default:
        return <rect x={0} y={0} width={w} height={h} rx={6} ry={6} fill={fill} stroke={stroke} strokeWidth={sw} />;
    }
  }, []);

  const getDefaultSize = useCallback((tool: "text" | "sticky" | "rect" | "circle" | "triangle" | "diamond" | "arrow" | "bubble" | "star" | "image") => {
    switch (tool) {
      case "text": return { width: 200, height: 80 };
      case "sticky": return { width: 240, height: 180 };
      case "image": return { width: 200, height: 200 };
      default: return { width: 200, height: 120 };
    }
  }, []);
  
  const startEditingElement = useCallback((id: string) => {
    const el = elements.find((e) => e.id === id);
    if (el && el.type === "text") {
      const startValue = !el?.text || el.text.trim() === "" || el.text.trim() === "New text" || el.text.trim() === "New note" ? "" : el.text;
      prevTextRef.current = el?.text ?? "";
      setEditingDraft(startValue);
      setEditingId(id);
      applySelection([id]);
      onSelectElement?.(id);
      setTimeout(() => {
        editingTextareaRef.current?.focus();
        const textarea = editingTextareaRef.current;
        if (textarea) {
          textarea.selectionStart = textarea.value.length;
          textarea.selectionEnd = textarea.value.length;
        }
      }, 0);
    }
    if (el && el.type === "sticky") {
      applySelection([id]);
      onSelectElement?.(id);
    }
  }, [elements, applySelection, onSelectElement]);

  const GRID_SIZE = 10;
  const snapCoord = useCallback((n: number) => snap ? Math.round(n/GRID_SIZE)*GRID_SIZE : n, [snap]);

  const isCreationTool = (tool: ToolType): boolean => {
    return tool === "text" || tool === "sticky" || tool === "rect" || tool === "circle" || 
           tool === "triangle" || tool === "diamond" || tool === "arrow" || tool === "bubble" || 
           tool === "star" || tool === "shape";
  };

  const mapToolToElementType = (tool: ToolType): CanvasElement["type"] => {
    if (tool === "text") return "text";
    if (tool === "sticky") return "sticky";
    return "shape";
  };

  const clientToCanvas = useCallback(
    (clientX: number, clientY: number, element: HTMLElement): { x: number; y: number } => {
      const canvasRect = element.getBoundingClientRect();
      const screenX = clientX - canvasRect.left;
      const screenY = clientY - canvasRect.top;
      return {
        x: (screenX - pan.x) / zoom,
        y: (screenY - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  const clientToCanvasPoint = useCallback(
    (e: React.MouseEvent | MouseEvent): { x: number; y: number } => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      return { 
        x: (e.clientX - rect.left - pan.x) / zoom, 
        y: (e.clientY - rect.top - pan.y) / zoom 
      };
    },
    [pan, zoom]
  );

  function toCanvasPoint(clientX: number, clientY: number) {
    const root = canvasRef.current;
    if (!root) return { x: 0, y: 0 };
    const rect = root.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }
  
  function getViewportCenter(): { x: number; y: number } {
    const root = canvasRef.current;
    if (!root) return { x: 0, y: 0 };
    const rect = root.getBoundingClientRect();
    return {
      x: (rect.width/2 - pan.x) / zoom,
      y: (rect.height/2 - pan.y) / zoom,
    };
  }

  function normalizeRect(a: { x: number; y: number }, b: { x: number; y: number }) {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const w = Math.abs(a.x - b.x);
    const h = Math.abs(a.y - b.y);
    return { x, y, w, h, x2: x + w, y2: y + h };
  }

  function getElementAABB(el: CanvasElement) {
    return { x: el.x, y: el.y, x2: el.x + (el.width ?? 0), y2: el.y + (el.height ?? 0) };
  }

  function rectsIntersect(
    R: { x: number; y: number; x2: number; y2: number },
    E: { x: number; y: number; x2: number; y2: number }
  ) {
    return !(R.x2 < E.x || R.x > E.x2 || R.y2 < E.y || R.y > E.y2);
  }

  // ============================================================================
  // PERFECT DRAG-TO-CREATE: No jumps, preview matches final placement exactly
  // ============================================================================
  function normalizeBox(
    a: { x: number; y: number },
    b: { x: number; y: number },
    constrainSquare: boolean
  ): { x: number; y: number; w: number; h: number } {
    let x1 = a.x;
    let y1 = a.y;
    let x2 = b.x;
    let y2 = b.y;
    
    if (constrainSquare) {
      // Constrain to square while maintaining drag direction
      const dx = x2 - x1;
      const dy = y2 - y1;
      const size = Math.max(Math.abs(dx), Math.abs(dy));
      
      x2 = x1 + (dx >= 0 ? size : -size);
      y2 = y1 + (dy >= 0 ? size : -size);
    }
    
    // Normalize to always return top-left corner
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    
    return { x: left, y: top, w: width, h: height };
  }

  function handleElementMouseDown(e: React.MouseEvent, el: { id: string; x: number; y: number }) {
    if (activeTool !== "select" || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    
    let nextSelected: string[];
    if (e.shiftKey) {
      const set = new Set(selectedIds);
      if (set.has(el.id)) set.delete(el.id);
      else set.add(el.id);
      nextSelected = Array.from(set);
    } else {
      nextSelected = [el.id];
    }
    
    applySelection(nextSelected);
    
    const p = toCanvasPoint(e.clientX, e.clientY);
    dragStartRef.current = p;
    selectedAtDragRef.current = nextSelected;
    
    startPosRef.current = {};
    for (const id of nextSelected) {
      const el0 = elementsRef.current.find(x => x.id === id);
      if (el0) startPosRef.current[id] = { x: el0.x, y: el0.y };
    }
    
    dragActiveRef.current = false;
    setIsMarquee(false);
    setIsDragging(true);
  }
  
  function handleCanvasMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (editingIdRef.current && e.target === e.currentTarget) {
      const currentText = editingTextareaRef.current?.value || "";
      commitStickyEditRef.current?.(currentText);
      return;
    }
    
    if (activeTool !== "select") return;
    if (e.button === 2) rightButtonDownRef.current = true;
    
    const isPanButton = e.button === 2 || e.button === 1;
    if (spaceDownRef.current || isPanButton) {
      e.preventDefault();
      isPanningRef.current = true;
      mouseStartRef.current = { x: e.clientX, y: e.clientY };
      panStartRef.current = { ...pan };
      return;
    }
    
    if (e.button !== 0) return;
    
    const p = toCanvasPoint(e.clientX, e.clientY);
    dragStartRef.current = p;
    setIsDragging(false);
    setIsMarquee(true);
    applySelection([]);
  }

  const handleCanvasPrimaryAction = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) => {
      if (isReadOnly || e.button !== 0) return;

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
      
      if (activeTool === "hand") {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        return;
      }
    },
    [isReadOnly, activeTool, pan, clientToCanvas, allowPinComments, setNewCommentDialog]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activeTool === "pen" || activeTool === "eraser") return;
      if (isReadOnly || e.button !== 0 || !canvasRef.current) return;
      
      const canvasPoint = clientToCanvas(e.clientX, e.clientY, canvasRef.current);
      if (!canvasPoint) return;

      if (isCreationTool(activeTool)) {
        const target = e.target as HTMLElement;
        const isClickingOnElement = target.closest('[class*="react-rnd"]') !== null;
        if (isClickingOnElement) return;
        
        setIsCreating(true);
        setCreateStart(canvasPoint);
        setCreateEnd(canvasPoint);
        setCreateTool(activeTool);
        setCreateConstrainSquare(e.shiftKey);
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      handleCanvasPrimaryAction(e);
    },
    [activeTool, isReadOnly, clientToCanvas, handleCanvasPrimaryAction, isCreationTool]
  );

  // Track Shift key for square constraint during drag
  useEffect(() => {
    if (!isCreating) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setCreateConstrainSquare(true);
      if (e.key === "Escape") {
        setIsCreating(false);
        setCreateStart(null);
        setCreateEnd(null);
        setCreateTool(null);
        setCreateConstrainSquare(false);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setCreateConstrainSquare(false);
    };
    
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isCreating]);

  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!canvasRef.current) return;

      if (isCreating && createStart) {
        const canvasPoint = clientToCanvas(e.clientX, e.clientY, canvasRef.current);
        if (canvasPoint) {
          setCreateEnd(canvasPoint);
          // Update constraint state based on current Shift key
          setCreateConstrainSquare(e.shiftKey);
        }
        return;
      }
    };

    const handleGlobalPointerUp = (e?: PointerEvent) => {
      if (isCreating && createStart && createEnd && createTool) {
        const isShapeTool = createTool === "rect" || createTool === "circle" || createTool === "triangle" || 
                           createTool === "diamond" || createTool === "arrow" || createTool === "bubble" || 
                           createTool === "star" || createTool === "shape";
        
        // Use the state-tracked constraint, not just the event's shiftKey
        const constrain = createConstrainSquare && isShapeTool;
        
        const R = normalizeBox(createStart, createEnd, constrain);
        const tiny = R.w < 8 && R.h < 8;
        
        const toolboxDefaults: Record<string, { w: number; h: number }> = {
          text: { w: 200, h: 120 },
          sticky: { w: 160, h: 120 },
          rect: { w: 200, h: 140 },
          circle: { w: 160, h: 160 },
          triangle: { w: 160, h: 160 },
          diamond: { w: 160, h: 160 },
          arrow: { w: 160, h: 160 },
          bubble: { w: 160, h: 160 },
          star: { w: 160, h: 160 },
        };
        
        const def = toolboxDefaults[createTool] ?? { w: 160, h: 120 };
        const width = tiny ? def.w : Math.max(16, R.w);
        const height = tiny ? def.h : Math.max(16, R.h);
        
        let x: number, y: number;
        if (tiny) {
          const viewportCenter = getViewportCenter();
          x = viewportCenter.x - def.w / 2;
          y = viewportCenter.y - def.h / 2;
        } else {
          // Perfect placement: use normalized coordinates directly
          x = R.x;
          y = R.y;
        }
        
        const newId = (() => {
          const gen = () => crypto?.randomUUID?.() ?? `id_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
          let candidate = gen();
          const existing = new Set((elements ?? []).map(e => e.id));
          while (existing.has(candidate)) candidate = gen();
          return candidate;
        })();
        
        const elementType = mapToolToElementType(createTool);
        
        let shapeType: CanvasElement["shapeType"] | undefined;
        if (elementType === "shape") {
          shapeType = createTool === "rect" ? "rect" :
            createTool === "circle" ? "circle" :
            createTool === "triangle" ? "triangle" :
            createTool === "diamond" ? "diamond" :
            createTool === "arrow" ? "arrow" :
            createTool === "bubble" ? "bubble" :
            createTool === "star" ? "star" : "rect";
        }
        
        const maxZ = elements.length > 0 ? Math.max(...elements.map(e => e.z ?? 0)) : 0;
        
        const newElement: CanvasElement = {
          id: newId,
          type: elementType,
          x, y, width, height,
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
        
        setElements(prev => {
          const updated = uniqueById([...prev, newElement]);
          onSaveElements?.(updated);
          return updated;
        });
        
        applySelection([newId]);
        onSelectElement?.(newId);
        onSetActiveTool?.("select");
        
        setIsCreating(false);
        setCreateStart(null);
        setCreateEnd(null);
        setCreateTool(null);
        setCreateConstrainSquare(false);
        return;
      }

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
          if (e?.shiftKey) {
            applySelection((prev) => {
              const set = new Set(prev);
              selectedByMarquee.forEach(id => {
                if (set.has(id)) set.delete(id);
                else set.add(id);
              });
              return Array.from(set);
            });
          } else {
            applySelection(selectedByMarquee);
          }
          if (selectedByMarquee.length > 0) onSelectElement?.(selectedByMarquee[0]);
          else onSelectElement?.(null);
        } else if (!e?.shiftKey) {
          applySelection([]);
          onSelectElement?.(null);
        }
        return;
      }
    };

    if (isCreating) {
      window.addEventListener("pointermove", handleGlobalPointerMove);
      window.addEventListener("pointerup", handleGlobalPointerUp);
    }

    return () => {
      window.removeEventListener("pointermove", handleGlobalPointerMove);
      window.removeEventListener("pointerup", handleGlobalPointerUp);
    };
  }, [activeTool, clientToCanvas, isCreating, createStart, createEnd, createTool, createConstrainSquare, setElements, onSaveElements, onSetActiveTool, mapToolToElementType, elements, applySelection, onSelectElement, normalizeRect, getElementAABB, rectsIntersect, isMarquee, marqueeStart, marqueeEnd, setIsMarquee, setMarqueeStart, setMarqueeEnd]);
  
  useEffect(() => {
    const currentOnSaveElements = onSaveElements;
    const currentApplySelection = applySelection;
    
    function onMove(ev: MouseEvent) {
      if (isPanningRef.current && mouseStartRef.current && panStartRef.current) {
        const dx = ev.clientX - mouseStartRef.current.x;
        const dy = ev.clientY - mouseStartRef.current.y;
        setPan({ x: panStartRef.current.x + dx, y: panStartRef.current.y + dy });
        return;
      }
      
      if (!dragStartRef.current) return;
      
      if (isDragging) {
        const cur = toCanvasPoint(ev.clientX, ev.clientY);
        const dx = cur.x - dragStartRef.current.x;
        const dy = cur.y - dragStartRef.current.y;
        
        if (!dragActiveRef.current) {
          if (Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
          dragActiveRef.current = true;
        }
        
        const updated = elementsRef.current.map(el => {
          if (!selectedAtDragRef.current.includes(el.id)) return el;
          const start = startPosRef.current[el.id];
          if (!start) return el;
          return { ...el, x: Math.round(start.x + dx), y: Math.round(start.y + dy) };
        });
        setElements(updated);
        throttleSave(() => currentOnSaveElements?.(updated), 50);
        return;
      }
      
      if (isMarquee) {
        const cur = toCanvasPoint(ev.clientX, ev.clientY);
        setMarqueeStart(dragStartRef.current);
        setMarqueeEnd(cur);
        
        const R = normalizeRect(dragStartRef.current, cur);
        const hits = elementsRef.current
          .filter(el => {
            const E = getElementAABB(el);
            return rectsIntersect(R, E);
          })
          .map(el => el.id);
        
        currentApplySelection(hits);
      }
    }
    
    function onUp() {
      rightButtonDownRef.current = false;
      isPanningRef.current = false;
      mouseStartRef.current = null;
      panStartRef.current = null;
      
      if (isDragging && dragActiveRef.current) {
        if (throttleSaveRef.current.timer) {
          clearTimeout(throttleSaveRef.current.timer);
          throttleSaveRef.current.timer = null;
        }
        currentOnSaveElements?.(elementsRef.current);
      }
      
      setIsDragging(false);
      setIsMarquee(false);
      setMarqueeStart(null);
      setMarqueeEnd(null);
      dragStartRef.current = null;
      startPosRef.current = {};
      selectedAtDragRef.current = [];
      dragActiveRef.current = false;
    }
    
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (throttleSaveRef.current.timer) {
        clearTimeout(throttleSaveRef.current.timer);
        throttleSaveRef.current.timer = null;
      }
    };
  }, [isDragging, isMarquee, pan.x, pan.y, zoom, boardId, setPan, throttleSave, applySelection, onSaveElements]);

  useEffect(() => {
    if (isReadOnly || activeTool !== "select" || selectedIds.length === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        const updated = elementsRef.current.filter(el => !selectedIds.includes(el.id));
        setElements(updated);
        onSaveElements?.(updated);
        applySelection([]);
        onSelectElement?.(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isReadOnly, activeTool, selectedIds, setElements, onSaveElements, applySelection, onSelectElement]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {}, []);
  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {}, []);
  const handlePointerLeave = useCallback((e: React.PointerEvent<HTMLDivElement>) => {}, []);
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {}, []);
  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {}, []);
  const handleCanvasMouseLeave = useCallback((e: React.MouseEvent) => {}, []);
  
  useEffect(() => {
    if (isReadOnly) return;

    function handleMouseMove(ev: MouseEvent) {
      if (!isPanning) return;
      setPan(prev => ({ x: prev.x + ev.movementX, y: prev.y + ev.movementY }));
    }

    function handleMouseUp() {
      if (isPanning) setIsPanning(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isPanning, isReadOnly, setPan, setIsPanning]);

  const commitStickyEdit = useCallback((nextText: string) => {
    const currentEditingId = editingIdRef.current;
    if (!currentEditingId) return;
    
    const finalText = nextText.trim() === "" ? "" : nextText;
    const currentElements = elementsRef.current;
    const updated = currentElements.map((el) =>
      el.id === currentEditingId ? { ...el, text: finalText, body: finalText } : el
    );
    setElements(updated);
    onSaveElements?.(updated);
    setEditingId(null);
    setEditingDraft("");
    applySelection([]);
    onSelectElement?.(null);
  }, [setElements, onSaveElements, applySelection, onSelectElement]);
  
  useEffect(() => { commitStickyEditRef.current = commitStickyEdit; }, [commitStickyEdit]);

  const cancelStickyEdit = useCallback(() => {
    const currentEditingId = editingIdRef.current;
    if (!currentEditingId) return;
    
    const restore = prevTextRef.current ?? "";
    const currentElements = elementsRef.current;
    const updated = currentElements.map((el) =>
      el.id === currentEditingId ? { ...el, text: restore, body: restore } : el
    );
    setElements(updated);
    onSaveElements?.(updated);
    setEditingId(null);
    setEditingDraft("");
    applySelection([]);
    onSelectElement?.(null);
  }, [setElements, onSaveElements, applySelection, onSelectElement]);

  useEffect(() => {
    const isTypingInForm = () => {
      const el = document.activeElement as HTMLElement | null;
      const tag = (el?.tagName || "").toLowerCase();
      return tag === "input" || tag === "textarea" || el?.isContentEditable === true;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isReadOnly || editingId !== null || isTypingInForm()) return;
      
      if (e.key === "Escape") {
        e.preventDefault();
        applySelection([]);
        onSelectElement(null);
        return;
      }
      
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "a") {
        e.preventDefault();
        const allIds = elements.map(el => el.id);
        applySelection(allIds);
        if (allIds.length > 0) onSelectElement(allIds[0]);
        return;
      }
      
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length > 0) {
        e.preventDefault();
        const updated = elements.filter((el) => !selectedIds.includes(el.id));
        setElements(updated);
        applySelection([]);
        onSelectElement(null);
        onSaveElements?.(updated);
        return;
      }
      
      if (meta && e.key === "d" && selectedIds.length === 1) {
        e.preventDefault();
        const elementToDuplicate = elements.find((el) => el.id === selectedIds[0]);
        if (elementToDuplicate) {
          const newId = (() => {
            const gen = () => crypto?.randomUUID?.() ?? `id_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
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
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isReadOnly, editingId, selectedIds, elements, setElements, applySelection, onSelectElement, onSaveElements]);

  // ============================================================================
  // ULTRA-SMOOTH ZOOM: Like Miro, buttery smooth for both mouse and trackpad
  // ============================================================================
  function zoomAtWheel(ev: WheelEvent) {
    if (isReadOnly) return;
    const root = canvasRef.current;
    if (!root) return;
    
    ev.preventDefault();
    ev.stopPropagation();
    
    const rect = root.getBoundingClientRect();
    const isPinch = ev.ctrlKey || ev.metaKey;
    
    // Normalize delta across different input methods
    let delta = 0;
    if (ev.deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
      delta = ev.deltaY;
    } else if (ev.deltaMode === WheelEvent.DOM_DELTA_LINE) {
      delta = ev.deltaY * 16;
    } else {
      delta = ev.deltaY * 100;
    }
    
    // Determine zoom factor based on input type
    let factor: number;
    
    if (isPinch) {
      // Trackpad pinch: ultra-smooth continuous zoom
      const sensitivity = 0.005; // Lower = smoother
      factor = 1 - (delta * sensitivity);
    } else {
      // Mouse wheel: smooth discrete steps
      const zoomStep = ZOOM_STEP;
      const steps = Math.sign(delta);
      factor = steps < 0 ? zoomStep : 1 / zoomStep;
    }
    
    // Calculate new zoom level
    let nextZoom = zoom * factor;
    nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    
    // Prevent micro-adjustments
    if (Math.abs(nextZoom - zoom) < 0.001) return;
    
    // Zoom towards cursor position
    const mouseX = ev.clientX - rect.left;
    const mouseY = ev.clientY - rect.top;
    
    const canvasX = (mouseX - pan.x) / zoom;
    const canvasY = (mouseY - pan.y) / zoom;
    
    const nextPanX = mouseX - canvasX * nextZoom;
    const nextPanY = mouseY - canvasY * nextZoom;
    
    setZoom(nextZoom);
    setPan({ x: nextPanX, y: nextPanY });
  }
  
  useEffect(() => {
    if (isReadOnly) return;
    const el = canvasRef.current;
    if (!el) return;
    
    const onWheel = (e: WheelEvent) => {
      // Always prevent default for wheel events on canvas
      e.preventDefault();
      e.stopPropagation();
      zoomAtWheel(e);
    };
    
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel as EventListener);
  }, [pan.x, pan.y, zoom, isReadOnly]);

  useEffect(() => {
    if (!editingId) return;
    
    const handleCanvasPointerDownCapture = (e: PointerEvent | MouseEvent) => {
      const target = e.target as Node;
      if (editingTextareaRef.current && !editingTextareaRef.current.contains(target)) {
        const currentText = editingTextareaRef.current.value || "";
        commitStickyEdit(currentText);
      }
    };
    
    document.addEventListener("pointerdown", handleCanvasPointerDownCapture, true);
    document.addEventListener("mousedown", handleCanvasPointerDownCapture, true);
    return () => {
      document.removeEventListener("pointerdown", handleCanvasPointerDownCapture, true);
      document.removeEventListener("mousedown", handleCanvasPointerDownCapture, true);
    };
  }, [editingId, commitStickyEdit]);

  const renderInlineEditor = () => {
    if (!editingId) return null;
    const element = elements.find((el) => el.id === editingId);
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
            borderRadius: "4px",
            backgroundColor: "white",
            fontSize: element.fontSize || 16,
            fontWeight: element.fontWeight || "normal",
            fontFamily: "inherit",
            resize: "none",
            outline: "none",
            boxSizing: "border-box",
          }}
          autoFocus
        />
      </div>
    );
  };

  const safeElements = elements ?? [];
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

  return (
    <div className="relative w-full h-full overflow-hidden bg-[rgb(248,249,250)]">
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
        
        {/* PERFECT PREVIEW: Matches final placement exactly, no jumps */}
        {isCreating && createStart && createEnd && (() => {
          const isShapeTool = createTool === "rect" || createTool === "circle" || createTool === "triangle" || 
                             createTool === "diamond" || createTool === "arrow" || createTool === "bubble" || 
                             createTool === "star" || createTool === "shape";
          const constrain = createConstrainSquare && isShapeTool;
          const R = normalizeBox(createStart, createEnd, constrain);
          
          return (
            <div
              className={MARQUEE_BOX_CLASS}
              style={{
                left: R.x * zoom + pan.x,
                top: R.y * zoom + pan.y,
                width: R.w * zoom,
                height: R.h * zoom,
              }}
            />
          );
        })()}

        {isMarquee && marqueeStart && marqueeEnd && (() => {
          const R = normalizeRect(marqueeStart, marqueeEnd);
          return (
            <div
              className={MARQUEE_BOX_CLASS}
              style={{
                left: R.x * zoom + pan.x,
                top: R.y * zoom + pan.y,
                width: R.w * zoom,
                height: R.h * zoom,
              }}
            />
          );
        })()}

        <div
          className="absolute left-0 top-0 will-change-transform"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          <div
            className="relative"
            style={{
              width: 3000,
              height: 2000,
              backgroundImage: "repeating-conic-gradient(#f8f9fa 0% 25%, transparent 0% 50%)",
              backgroundSize: "20px 20px",
            }}
          >
            {sortedElements.map((el) => {
              const isEditingThis = editingId === el.id;
              const isSelected = selectedIds.includes(el.id);
              const isMarqueeHighlighted = isMarquee && marqueeStart && marqueeEnd && (() => {
                const R = normalizeRect(marqueeStart, marqueeEnd);
                const E = getElementAABB(el);
                return rectsIntersect(R, E);
              })();

              if (isReadOnly) {
                return (
                  <div
                    key={el.id}
                    style={{
                      position: "absolute",
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height,
                      border: el.type === "shape" ? "none" : (el.type === "image" && el.text?.startsWith("PDF Page")) ? "none" : "1px solid rgba(0,0,0,0.1)",
                      borderRadius: el.type === "card" ? "8px" : "4px",
                      backgroundColor: el.type === "sticky" ? "#fffbe6" : el.type === "shape" ? "transparent" : el.type === "image" && el.text?.startsWith("PDF Page") ? "transparent" : "#ffffff",
                      padding: el.type === "text" || el.type === "sticky" ? "8px" : "0px",
                      margin: "0px",
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
                      <svg width={Math.max(el.width,1)} height={Math.max(el.height,1)} className="block" viewBox={`0 0 ${Math.max(el.width,1)} ${Math.max(el.height,1)}`}>
                        {renderShape(el, !!(isSelected || isMarqueeHighlighted))}
                      </svg>
                    ) : el.type === "image" && (el.src || el.imageUrl) ? (
                      <div className="relative w-full h-full" style={{ margin: "0px", padding: "0px", border: "none" }}>
                        <img src={el.src || el.imageUrl} alt="Canvas image" className="w-full h-full object-contain" style={{ borderRadius: el.text?.startsWith("PDF Page") ? "0px" : "4px", userSelect: "none", margin: "0px", padding: "0px", border: "none", display: "block" }} />
                        {el.text?.startsWith("PDF Page") && (() => {
                          const pageMatch = el.text.match(/PDF Page (\d+)/);
                          const pageNumber = pageMatch ? pageMatch[1] : null;
                          if (pageNumber) return <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded pointer-events-none" style={{ zIndex: 10 }}>Page {pageNumber}</div>;
                          return null;
                        })()}
                        {isSelected && <div className="absolute inset-0 border-2 border-blue-400 rounded-lg pointer-events-none z-10" />}
                      </div>
                    ) : (el.text || "")}
                  </div>
                );
              }

              return (
                <Rnd
                  key={el.id}
                  size={{ width: el.width, height: el.height }}
                  position={{ x: el.x, y: el.y }}
                  disableDragging={isReadOnly || isEditingThis || activeTool === "select" || activeTool === "hand"}
                  enableResizing={!isReadOnly && !isEditingThis && activeTool !== "hand"}
                  bounds="parent"
                  onDragStart={(e) => {
                    if (!isReadOnly && isMouseEvent(e)) {
                      dragStateRef.current.set(el.id, {
                        startPos: { x: e.clientX, y: e.clientY },
                        isActuallyDragging: false,
                      });
                    }
                  }}
                  onDrag={(e, d) => {
                    if (isReadOnly) return;
                    const dragState = dragStateRef.current.get(el.id);
                    if (!dragState || !isMouseEvent(e)) return;
                    const dx = e.clientX - dragState.startPos.x;
                    const dy = e.clientY - dragState.startPos.y;
                    const distance = Math.sqrt(dx*dx + dy*dy);
                    if (!dragState.isActuallyDragging && distance > DRAG_THRESHOLD) {
                      dragState.isActuallyDragging = true;
                      dragStateRef.current.set(el.id, dragState);
                    }
                  }}
                  onDragStop={(e, d) => {
                    if (isReadOnly) return;
                    const dragState = dragStateRef.current.get(el.id);
                    if (!dragState || !dragState.isActuallyDragging) {
                      dragStateRef.current.delete(el.id);
                      return;
                    }
                    if (selectedIds.length > 1 && selectedIds.includes(el.id)) {
                      const dx = d.x - el.x;
                      const dy = d.y - el.y;
                      const updated = elements.map((item) =>
                        selectedIds.includes(item.id) ? { ...item, x: snapCoord(item.x + dx), y: snapCoord(item.y + dy) } : item
                      );
                      setElements(updated);
                      onSaveElements?.(updated);
                    } else {
                      const updated = elements.map((item) =>
                        item.id === el.id ? { ...item, x: snapCoord(d.x), y: snapCoord(d.y) } : item
                      );
                      setElements(updated);
                      onSaveElements?.(updated);
                    }
                    dragStateRef.current.delete(el.id);
                  }}
                  onResizeStop={(e, direction, ref, delta, position) => {
                    const updated = elements.map((item) =>
                      item.id === el.id ? {
                        ...item,
                        width: snapCoord(parseFloat(ref.style.width)),
                        height: snapCoord(parseFloat(ref.style.height)),
                        x: snapCoord(position.x),
                        y: snapCoord(position.y),
                      } : item
                    );
                    setElements(updated);
                    onSaveElements?.(updated);
                  }}
                  onMouseDown={(e) => handleElementMouseDown(e as unknown as React.MouseEvent<Element, MouseEvent>, el)}
                  onContextMenu={(e: any) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  style={{
                    border: el.type === "shape" ? "none" : (el.type === "image" && el.text?.startsWith("PDF Page")) ? "none" : "1px solid rgba(0,0,0,0.1)",
                    background: "transparent",
                    boxSizing: "border-box",
                    borderRadius: el.type === "card" ? "8px" : "4px",
                    margin: "0px",
                    cursor: isReadOnly ? "default" : isEditingThis ? "text" : "move",
                    boxShadow: "none",
                    opacity: isMarqueeHighlighted && !isSelected ? 0.8 : 1,
                  }}
                >
                  {isSelected && <div className="absolute inset-0 border-2 border-blue-400 rounded-lg pointer-events-none z-10" />}
                  {el.type === "shape" && el.shapeType ? (
                    <svg width={Math.max(el.width,1)} height={Math.max(el.height,1)} className="block w-full h-full" viewBox={`0 0 ${Math.max(el.width,1)} ${Math.max(el.height,1)}`}>
                      {renderShape(el, !!(isSelected || isMarqueeHighlighted))}
                    </svg>
                  ) : el.type === "sticky" ? (
                    <StickyNote
                      id={el.id} x={0} y={0} width={el.width} height={el.height}
                      text={el.text} isSelected={isSelected} isReadOnly={isReadOnly}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
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
                        setEditingId(null);
                        setEditingDraft("");
                      }}
                      onCancelEdit={(id) => {
                        setEditingId(null);
                        setEditingDraft("");
                      }}
                      className={STICKY_CARD_CLASS}
                      style={{ boxSizing: "border-box" }}
                    />
                  ) : el.type === "text" ? (
                    <div
                      className="w-full h-full bg-white rounded border border-gray-300 text-sm p-2"
                      style={{ boxSizing: "border-box" }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (isReadOnly) return;
                        startEditingElement(el.id);
                      }}
                    >
                      {(() => {
                        const hasText = !!el.text && el.text.trim() !== "" && el.text.trim() !== "New text";
                        return hasText ? <div className="whitespace-pre-wrap">{el.text}</div> : !isEditingThis && <div className="opacity-60 italic select-none">New text</div>;
                      })()}
                    </div>
                  ) : el.type === "image" && (el.src || el.imageUrl) ? (
                    <div className="relative w-full h-full" style={{ overflow: "hidden", borderRadius: el.text?.startsWith("PDF Page") ? "0px" : "4px", boxSizing: "border-box", margin: "0px", padding: "0px", border: "none" }}>
                      <img src={el.src || el.imageUrl} alt="Canvas image" className="w-full h-full object-contain" style={{ userSelect: "none", pointerEvents: "none", margin: "0px", padding: "0px", border: "none", display: "block" }} />
                      {el.text?.startsWith("PDF Page") && (() => {
                        const pageMatch = el.text.match(/PDF Page (\d+)/);
                        const pageNumber = pageMatch ? pageMatch[1] : null;
                        if (pageNumber) return <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded pointer-events-none" style={{ zIndex: 10 }}>Page {pageNumber}</div>;
                        return null;
                      })()}
                    </div>
                  ) : (
                    <div className="w-full h-full bg-white rounded border border-gray-300 text-xs p-2" style={{ boxSizing: "border-box" }}>{el.text || ""}</div>
                  )}
                </Rnd>
              );
            })}

            {pinnedComments?.filter((c) => c.x !== undefined && c.y !== undefined).map((comment, index) => (
              <div
                key={comment.id}
                onClick={() => { if (!isReadOnly) onSelectComment(comment.id); }}
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

            {renderInlineEditor && renderInlineEditor()}
          </div>
        </div>
      </div>
    </div>
  );
}