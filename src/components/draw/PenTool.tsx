"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { usePenDrawing, type PenStroke } from "@/hooks/usePenDrawing";

export interface PenToolProps {
  // Tool state
  activeTool: "pen" | "eraser" | null;
  
  // Drawing configuration
  penColor?: string;
  penWidth?: number;
  eraserSize?: number;
  
  // Canvas transform (for pan/zoom)
  pan?: { x: number; y: number };
  zoom?: number;
  
  // Stroke management
  initialStrokes?: PenStroke[];
  onStrokesChange?: (strokes: PenStroke[]) => void;
  
  // Callbacks
  onUndo?: () => void;
  onRedo?: () => void;
  onClear?: () => void;
  
  // Style
  className?: string;
  style?: React.CSSProperties;
  
  // Enable/disable
  enabled?: boolean;
  
  // Board ID for persistence (optional)
  boardId?: string;
}

// Convert client coordinates to canvas coordinates
// Note: The SVG transform already handles pan/zoom, so we need to convert
// from client coordinates directly to the canvas coordinate space
function clientToCanvas(
  clientX: number,
  clientY: number,
  element: HTMLElement,
  pan: { x: number; y: number },
  zoom: number
): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  // Convert client coordinates to element-local coordinates
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  // Convert to canvas coordinates (accounting for pan and zoom)
  const x = (localX - pan.x) / zoom;
  const y = (localY - pan.y) / zoom;
  return { x, y };
}

// Generate SVG path from points
function pointsToPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${p.y} L ${p.x} ${p.y}`;
  }
  
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  return path;
}

export default function PenTool({
  activeTool,
  penColor = "#000000",
  penWidth = 3,
  eraserSize = 20,
  pan = { x: 0, y: 0 },
  zoom = 1,
  initialStrokes = [],
  onStrokesChange,
  onUndo,
  onRedo,
  onClear,
  className = "",
  style,
  enabled = true,
  boardId,
}: PenToolProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isActive = activeTool === "pen" || activeTool === "eraser";
  const [eraserPosition, setEraserPosition] = useState<{ x: number; y: number } | null>(null);
  const capturedPointerIdRef = useRef<number | null>(null);

  // Use pen drawing hook
  const {
    strokes,
    currentStroke,
    isDrawing,
    isErasing,
    startDrawing,
    continueDrawing,
    endDrawing,
    cancelDrawing,
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
  } = usePenDrawing({
    initialStrokes,
    onStrokesChange,
    penColor,
    penWidth,
    eraserSize,
    enabled: enabled && isActive,
  });

  // Expose undo/redo/clear to parent
  useEffect(() => {
    if (onUndo) {
      // Store undo function for parent to call
      (window as any).__penToolUndo = undo;
    }
    if (onRedo) {
      (window as any).__penToolRedo = redo;
    }
    if (onClear) {
      (window as any).__penToolClear = clear;
    }
    return () => {
      delete (window as any).__penToolUndo;
      delete (window as any).__penToolRedo;
      delete (window as any).__penToolClear;
    };
  }, [onUndo, onRedo, onClear, undo, redo, clear]);

  // Check if pointer event is over a UI control element
  const isOverUIElement = useCallback((target: HTMLElement): boolean => {
    // Check for common UI elements that should not trigger drawing
    if (
      target.closest('button') ||
      target.closest('[role="button"]') ||
      target.closest('input[type="range"]') ||
      target.closest('input[type="range"]') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('textarea') ||
      target.closest('.toolbar') ||
      target.closest('[class*="toolbar"]') ||
      target.closest('[class*="slider"]') ||
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'SELECT' ||
      target.tagName === 'TEXTAREA' ||
      target.getAttribute('role') === 'slider' ||
      target.closest('[data-ui-control]')
    ) {
      return true;
    }
    return false;
  }, []);

  // Handle pointer down
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Only handle if this tool is actually active
      if (!isActive || !enabled || !containerRef.current) {
        return;
      }
      
      // Don't handle if clicking on UI elements (toolbar, buttons, sliders, etc.)
      const target = e.target as HTMLElement;
      if (isOverUIElement(target)) {
        return; // Let UI elements handle their own events
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      const container = containerRef.current;
      container.setPointerCapture(e.pointerId);
      capturedPointerIdRef.current = e.pointerId;
      
      const point = clientToCanvas(e.clientX, e.clientY, container, pan, zoom);
      
      if (activeTool === "pen") {
        startDrawing(point, "pen");
      } else if (activeTool === "eraser") {
        setEraserPosition(point);
        startDrawing(point, "eraser");
      }
    },
    [isActive, enabled, pan, zoom, activeTool, startDrawing, isOverUIElement]
  );

  // Handle pointer move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isActive || !enabled || !containerRef.current) return;
      
      // Don't handle if pointer is over UI elements
      const target = e.target as HTMLElement;
      if (isOverUIElement(target)) {
        // Still update eraser cursor position if hovering (but don't erase)
        if (activeTool === "eraser" && capturedPointerIdRef.current === null) {
          const container = containerRef.current;
          const point = clientToCanvas(e.clientX, e.clientY, container, pan, zoom);
          setEraserPosition(point);
        }
        return; // Let UI elements handle their own events
      }
      
      const container = containerRef.current;
      const point = clientToCanvas(e.clientX, e.clientY, container, pan, zoom);
      
      // For eraser: always show cursor and erase while dragging
      if (activeTool === "eraser") {
        // Always update cursor position when hovering
        setEraserPosition(point);
        
        // If we're actively erasing (mouse down), continue erasing
        if (isErasing || capturedPointerIdRef.current !== null) {
          e.preventDefault();
          e.stopPropagation();
          continueDrawing(point);
        }
      } else if (activeTool === "pen") {
        // For pen: only continue if actively drawing
        if (isDrawing) {
          e.preventDefault();
          e.stopPropagation();
          continueDrawing(point);
        }
      }
    },
    [isActive, enabled, isDrawing, isErasing, pan, zoom, activeTool, continueDrawing, isOverUIElement]
  );

  // Handle pointer up
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isActive || !enabled || !containerRef.current) return;
      
      // Only handle if this is the captured pointer
      if (capturedPointerIdRef.current !== null && capturedPointerIdRef.current !== e.pointerId) {
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      const container = containerRef.current;
      container.releasePointerCapture(e.pointerId);
      capturedPointerIdRef.current = null;
      
      endDrawing();
      
      // Clear eraser position when done
      if (activeTool === "eraser") {
        setEraserPosition(null);
      }
    },
    [isActive, enabled, activeTool, endDrawing]
  );

  // Handle pointer cancel
  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isActive || !enabled) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      if (containerRef.current && capturedPointerIdRef.current !== null) {
        containerRef.current.releasePointerCapture(e.pointerId);
      }
      capturedPointerIdRef.current = null;
      
      cancelDrawing();
      
      // Clear eraser position
      if (activeTool === "eraser") {
        setEraserPosition(null);
      }
    },
    [isActive, enabled, activeTool, cancelDrawing]
  );

  // Handle pointer leave
  const handlePointerLeave = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isActive || !enabled) return;
      
      // End drawing if pointer leaves the canvas (but only if we were actively drawing/erasing)
      if (isDrawing || isErasing) {
        if (containerRef.current && capturedPointerIdRef.current !== null) {
          containerRef.current.releasePointerCapture(e.pointerId);
        }
        capturedPointerIdRef.current = null;
        endDrawing();
      }
      
      // Clear eraser cursor when leaving canvas
      if (activeTool === "eraser") {
        setEraserPosition(null);
      }
    },
    [isActive, enabled, isDrawing, isErasing, activeTool, endDrawing]
  );

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    if (!isActive || !enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Undo: Ctrl/Cmd + Z
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      else if (
        ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) ||
        ((e.ctrlKey || e.metaKey) && e.key === "y")
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive, enabled, undo, redo]);

  // Reset drawing state when tool changes - CRITICAL for preventing lock-in
  useEffect(() => {
    // Immediately cancel any active drawing/erasing when tool changes
    if (!isActive) {
      // Release any captured pointers
      if (containerRef.current && capturedPointerIdRef.current !== null) {
        try {
          containerRef.current.releasePointerCapture(capturedPointerIdRef.current);
        } catch (e) {
          // Ignore errors if pointer is already released
        }
        capturedPointerIdRef.current = null;
      }
      
      // Cancel drawing state
      cancelDrawing();
      
      // Clear eraser position
      setEraserPosition(null);
    }
  }, [activeTool, isActive, cancelDrawing]);
  
  // Also cancel on unmount
  useEffect(() => {
    return () => {
      if (containerRef.current && capturedPointerIdRef.current !== null) {
        try {
          containerRef.current.releasePointerCapture(capturedPointerIdRef.current);
        } catch (e) {
          // Ignore errors
        }
      }
      cancelDrawing();
    };
  }, [cancelDrawing]);

  // Render all strokes
  const allStrokes: PenStroke[] = currentStroke
    ? [...strokes, currentStroke]
    : strokes;

  // Don't render if tool is not active
  if (!isActive) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`pen-tool-overlay ${className}`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: enabled ? "auto" : "none",
        cursor: activeTool === "pen" ? "crosshair" : activeTool === "eraser" ? "grab" : "default",
        touchAction: "none",
        zIndex: 100, // Lower than toolbar (z-[9999]) so toolbar is always on top
        ...style,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerLeave}
    >
      <svg
        width="100%"
        height="100%"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
        }}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {allStrokes.map((stroke) => (
            <path
              key={stroke.id}
              d={pointsToPath(stroke.points)}
              stroke={stroke.color}
              strokeWidth={stroke.width}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {/* Render eraser cursor - visible when eraser tool is active */}
          {activeTool === "eraser" && eraserPosition && (
            <circle
              cx={eraserPosition.x}
              cy={eraserPosition.y}
              r={eraserSize}
              fill="rgba(255, 0, 0, 0.15)"
              stroke="rgba(255, 0, 0, 0.5)"
              strokeWidth={2}
              style={{
                pointerEvents: "none",
              }}
            />
          )}
        </g>
      </svg>
    </div>
  );
}

