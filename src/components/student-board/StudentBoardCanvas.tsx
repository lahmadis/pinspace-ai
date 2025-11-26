"use client";

import React, { useEffect, useRef, useState } from "react";
import StickyNote from "./elements/StickyNote";
import ImageElement from "./elements/ImageElement";
import PDFThumbnail from "./elements/PDFThumbnail";
import type { CanvasElement } from "@/types";
import type { PenStroke } from "@/hooks/usePenDrawing";
import { useTouchSupport } from "@/hooks/useTouchSupport";
import { useKeyboardNavigation, useFocusManagement } from "@/hooks/useKeyboardNavigation";

/**
 * Student Board Canvas Component
 * 
 * The main workspace area where elements are displayed.
 * 
 * Current Features:
 * - ✅ Multi-element selection (click to select, Shift+Click to add/remove from selection)
 * - ✅ Visual selection highlight (blue ring, shadow, scale) for all selected elements
 * - ✅ Group drag (all selected elements move together)
 * - ✅ Visual drag feedback (opacity, cursor change, enhanced shadow)
 * - ✅ Element creation (click creation tool, then click canvas to place)
 * - ✅ Batch deletion (delete all selected elements at once)
 * - ✅ Selection state flows from Page → Canvas → Elements
 * 
 * Selection Flow:
 * 1. User clicks element → Element's onClick fires
 * 2. Element calls onSelect() → Canvas receives callback
 * 3. Canvas calls onElementSelect(elementId) → Page updates state
 * 4. Page re-renders → Canvas receives new selectedElementId prop
 * 5. Canvas passes isSelected to elements → Elements show/hide highlight
 * 
 * Next Steps:
 * - Add pan and zoom functionality
 * - Add grid overlay (optional, toggleable)
 * - Add selection marquee (drag rectangle to select multiple elements)
 * - Add drop zones for file uploads
 * - Add canvas background patterns/colors
 * - Add scroll/zoom controls
 * - ✅ Add drag and drop for moving selected elements - DONE
 * - ✅ Extend to multi-select (Shift+Click) - DONE
 * - Add marquee selection (drag rectangle to select multiple)
 * - Add grid snapping during drag
 * - Add boundary constraints (prevent dragging outside canvas)
 * - Add undo/redo for drag operations
 */

interface StudentBoardCanvasProps {
  elements: (CanvasElement & { text?: string; color?: string })[];
  selectedElementIds: Set<string>;
  activeTool: string;
  onElementSelect: (elementId: string, isShiftKey?: boolean) => void;
  onDeselect: () => void;
  onDragStart: (elementId: string, clientX: number, clientY: number) => void;
  onDragMove: (clientX: number, clientY: number) => void;
  onDragEnd: () => void;
  onCanvasCreate: (canvasX: number, canvasY: number, isShiftKey?: boolean) => void;
  isDragging: boolean;
  draggingElementIds: Set<string>;
  penStrokes: PenStroke[];
  currentStroke: PenStroke | null;
  onPenStart: (canvasX: number, canvasY: number) => void;
  onPenMove: (canvasX: number, canvasY: number) => void;
  onPenEnd: () => void;
  onPenCancel: () => void;
  penColor: string;
  penWidth: number;
  eraserSize: number;
  onMouseMove?: (canvasX: number, canvasY: number) => void;
}

/**
 * StudentBoardCanvas - Main canvas area for displaying board elements
 * 
 * Export: Default export (use: import StudentBoardCanvas from "...")
 * Import: Default import matches default export
 */
export default function StudentBoardCanvas({
  elements,
  selectedElementIds,
  activeTool,
  onElementSelect,
  onDeselect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onCanvasCreate,
  isDragging,
  draggingElementIds,
  penStrokes,
  currentStroke,
  onPenStart,
  onPenMove,
  onPenEnd,
  onPenCancel,
  penColor,
  penWidth,
  eraserSize,
  onMouseMove,
}: StudentBoardCanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [focusedElementId, setFocusedElementId] = useState<string | null>(null);
  const { announce } = useFocusManagement();

  // Touch support for pen/eraser tools
  const touchHandlers = useTouchSupport({
    onTouchStart: (x, y, identifier) => {
      if (["pen", "eraser"].includes(activeTool)) {
        onPenStart(x, y);
      }
    },
    onTouchMove: (x, y, identifier) => {
      if (["pen", "eraser"].includes(activeTool)) {
        onPenMove(x, y);
      }
    },
    onTouchEnd: (identifier) => {
      if (["pen", "eraser"].includes(activeTool)) {
        onPenEnd();
      }
    },
    onTouchCancel: (identifier) => {
      if (["pen", "eraser"].includes(activeTool)) {
        onPenCancel();
      }
    },
    enabled: ["pen", "eraser"].includes(activeTool),
  });

  // Keyboard navigation for canvas elements
  useKeyboardNavigation({
    shortcuts: {
      "arrowup": () => {
        if (focusedElementId) {
          moveFocusedElement(0, -10);
        }
      },
      "arrowdown": () => {
        if (focusedElementId) {
          moveFocusedElement(0, 10);
        }
      },
      "arrowleft": () => {
        if (focusedElementId) {
          moveFocusedElement(-10, 0);
        }
      },
      "arrowright": () => {
        if (focusedElementId) {
          moveFocusedElement(10, 0);
        }
      },
      "escape": () => {
        if (focusedElementId) {
          setFocusedElementId(null);
          onDeselect();
          announce("Selection cleared");
        }
      },
      "enter": () => {
        if (focusedElementId && activeTool === "select") {
          announce(`Element ${focusedElementId} selected. Press Delete to remove or arrow keys to move.`);
        }
      },
    },
    enabled: true,
  });

  /**
   * Move focused element with arrow keys
   */
  const moveFocusedElement = (deltaX: number, deltaY: number) => {
    if (!focusedElementId || !canvasRef.current) return;
    
    const element = elements.find(el => el.id === focusedElementId);
    if (!element) return;

    // Simulate drag for keyboard movement
    const rect = canvasRef.current.getBoundingClientRect();
    const startX = rect.left + element.x;
    const startY = rect.top + element.y;
    
    onDragStart(focusedElementId, startX, startY);
    
    // Small delay to ensure drag started
    setTimeout(() => {
      onDragMove(startX + deltaX, startY + deltaY);
      setTimeout(() => {
        onDragEnd();
      }, 10);
    }, 10);
  };

  // ============================================================================
  // DRAG EVENT HANDLERS - Global mouse move/up handlers
  // ============================================================================
  // These handlers are attached to document to track mouse movement
  // even when cursor moves outside the canvas area during drag.
  //
  // Future: Improve drag handling
  // - Add touch event support for mobile devices
  // - Add drag constraints (boundaries, grid snapping)
  // - Add drag preview/ghost element
  // ============================================================================
  useEffect(() => {
    // Client-side only - ensure we're not in SSR
    if (typeof window === "undefined") return;
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      onDragMove(e.clientX, e.clientY);
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      onDragEnd();
    };

    // Attach global handlers during drag (client-side only)
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // Cleanup on unmount or when drag ends
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, onDragMove, onDragEnd]);

  // ============================================================================
  // PEN/ERASER EVENT HANDLERS - Global mouse handlers for drawing
  // ============================================================================
  // These handlers track mouse movement for pen/eraser tools
  // Attached to document to track movement outside canvas during drawing
  //
  // Future: Tablet/touch support
  // - Add touchstart, touchmove, touchend handlers
  // - Support pressure sensitivity (pressure property in pointer events)
  // - Add palm rejection for touch devices
  // ============================================================================
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!["pen", "eraser"].includes(activeTool)) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;
      
      onPenMove(canvasX, canvasY);
    };

    const handleMouseUp = (e: MouseEvent) => {
      onPenEnd();
    };

    const handleMouseLeave = () => {
      // Cancel drawing if mouse leaves window
      onPenCancel();
    };

    // Attach global handlers during pen/eraser mode
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [activeTool, onPenMove, onPenEnd, onPenCancel]);

  /**
   * Handle clicks on the canvas background (empty space)
   * 
   * Behavior depends on active tool:
   * - Creation tools (sticky, image, pdf): Create new element at click position
   *   - Image/PDF: Opens file picker (Shift+Click creates mock placeholder)
   * - Pen/Eraser: Start drawing/erasing
   * - Select tool: Deselect any currently selected element
   */
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only handle if clicking directly on the canvas (not on an element)
    if (e.target !== e.currentTarget) {
      return;
    }

    // Calculate canvas-relative coordinates
    const rect = e.currentTarget.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    // Check if a creation tool is active
    if (["sticky", "image", "pdf"].includes(activeTool)) {
      // Create new element at click position (pass Shift key for mock creation)
      onCanvasCreate(canvasX, canvasY, e.shiftKey);
    } else if (["pen", "eraser"].includes(activeTool)) {
      // Start drawing/erasing
      onPenStart(canvasX, canvasY);
    } else {
      // Select tool: deselect any currently selected element
      onDeselect();
    }
  };

  /**
   * Handle mouse down on canvas (for pen/eraser)
   * 
   * Only handles pen/eraser tools. Other tools (select, creation tools) use onClick.
   * This allows pen/eraser to start drawing immediately on mouse down for smoother drawing.
   */
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only handle pen/eraser tools
    if (!["pen", "eraser"].includes(activeTool)) return;
    
    // Only handle if clicking directly on the canvas (not on an element)
    if (e.target !== e.currentTarget) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    onPenStart(canvasX, canvasY);
  };

  /**
   * Render a stroke as SVG path
   * 
   * Renders strokes as smooth SVG paths for optimal performance.
   * Single points are rendered as circles, multi-point strokes as paths.
   * 
   * Future: Performance optimizations
   * - Use canvas 2D context for better performance with many strokes
   * - Implement stroke simplification (reduce points for smoother rendering)
   * - Add stroke caching for static strokes
   * - Use WebGL for very large stroke counts
   */
  const renderStroke = (stroke: PenStroke): JSX.Element | null => {
    if (!stroke || stroke.points.length === 0) return null;
    
    if (stroke.points.length === 1) {
      // Single point - render as circle
      const p = stroke.points[0];
      return (
        <circle
          key={stroke.id}
          cx={p.x}
          cy={p.y}
          r={stroke.width / 2}
          fill={stroke.color}
        />
      );
    }

    // Multiple points - render as smooth path
    const pathData = stroke.points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");

    return (
      <path
        key={stroke.id}
        d={pathData}
        stroke={stroke.color}
        strokeWidth={stroke.width}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  };

  // Get cursor style based on active tool
  const getCursorStyle = () => {
    if (activeTool === "pen") return "crosshair";
    if (activeTool === "eraser") return "grab";
    if (["sticky", "image", "pdf"].includes(activeTool)) return "crosshair";
    if (isDragging) return "grabbing";
    return "default";
  };

  // ============================================================================
  // RETURN STATEMENT - Always renders visible board content
  // ============================================================================
  // This component ALWAYS renders:
  // 1. Outer container with gray background (always visible)
  // 2. White board container with border and shadow (always visible)
  // 3. Canvas area with elements (elements array is always provided)
  // 
  // Elements are mapped and rendered - if elements array is empty, board still shows
  // All styling uses explicit Tailwind classes for guaranteed visibility
  // ============================================================================
  return (
    <div 
      className="flex-1 relative overflow-auto bg-gray-100 dark:bg-gray-900 p-2 sm:p-4 md:p-8"
      role="main"
      aria-label="Board canvas area"
    >
      {/* 
        Board Container - ALWAYS VISIBLE workspace area with:
        - White background (bg-white) - clearly visible
        - Clear border (border-2 border-gray-300) - clearly visible
        - Shadow (shadow-xl) - clearly visible
        - Responsive dimensions - adapts to screen size
        - Padding (p-4 sm:p-8) - responsive padding
      */}
      <div className="relative mx-auto bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-300 dark:border-gray-700 shadow-xl w-full max-w-full min-w-[320px] sm:min-w-[600px] md:min-w-[1200px] min-h-[400px] sm:min-h-[600px] md:min-h-[800px] p-4 sm:p-6 md:p-8">
        {/* Canvas Container - This will be the scrollable/zoomable area */}
        <div
          ref={canvasRef}
          className={`relative w-full h-full min-h-[300px] sm:min-h-[400px] md:min-h-[600px]`}
          style={{
            cursor: getCursorStyle(),
            // Future: Add transform for zoom/pan
            // transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
          role="application"
          aria-label={`Board canvas. ${elements.length} elements. ${selectedElementIds.size} selected. Active tool: ${activeTool}`}
          tabIndex={0}
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onTouchStart={touchHandlers.handleTouchStart}
          onTouchMove={touchHandlers.handleTouchMove}
          onTouchEnd={touchHandlers.handleTouchEnd}
          onTouchCancel={touchHandlers.handleTouchCancel}
          onMouseMove={(e) => {
            // Track mouse movement for presence indicators
            if (onMouseMove && e.target === e.currentTarget) {
              const rect = e.currentTarget.getBoundingClientRect();
              const canvasX = e.clientX - rect.left;
              const canvasY = e.clientY - rect.top;
              onMouseMove(canvasX, canvasY);
            }
          }}
          onKeyDown={(e) => {
            // Handle keyboard navigation for canvas
            if (e.key === "Tab") {
              // Tab navigation between elements
              const selectableElements = elements.filter(el => 
                !["pen", "eraser"].includes(activeTool)
              );
              
              if (selectableElements.length > 0) {
                const currentIndex = focusedElementId 
                  ? selectableElements.findIndex(el => el.id === focusedElementId)
                  : -1;
                
                if (e.shiftKey) {
                  // Shift+Tab: previous element
                  const prevIndex = currentIndex > 0 
                    ? currentIndex - 1 
                    : selectableElements.length - 1;
                  const prevElement = selectableElements[prevIndex];
                  setFocusedElementId(prevElement.id);
                  onElementSelect(prevElement.id, false);
                  announce(`Focused on ${prevElement.type} element`);
                } else {
                  // Tab: next element
                  const nextIndex = currentIndex < selectableElements.length - 1
                    ? currentIndex + 1
                    : 0;
                  const nextElement = selectableElements[nextIndex];
                  setFocusedElementId(nextElement.id);
                  onElementSelect(nextElement.id, false);
                  announce(`Focused on ${nextElement.type} element`);
                }
                e.preventDefault();
              }
            }
          }}
          title={
            activeTool === "sticky" 
              ? "Click to create a sticky note" 
              : activeTool === "image" 
                ? "Click to create an image placeholder" 
                : activeTool === "pdf" 
                  ? "Click to create a PDF placeholder"
                  : activeTool === "pen"
                    ? "Click and drag to draw, or touch and drag on mobile"
                    : activeTool === "eraser"
                      ? "Click and drag to erase strokes, or touch and drag on mobile"
                      : "Click to select elements or create new ones. Use Tab to navigate between elements, arrow keys to move selected element."
          }
        >
          {/* SVG Overlay for Pen Strokes - Rendered above elements */}
          {(penStrokes.length > 0 || currentStroke) && (
            <svg
              className="absolute inset-0 pointer-events-none z-10"
              style={{ width: "100%", height: "100%" }}
            >
              {/* Render all completed strokes */}
              {penStrokes.map((stroke) => renderStroke(stroke))}
              
              {/* Render current stroke being drawn */}
              {currentStroke && renderStroke(currentStroke)}
            </svg>
          )}

          {/* Eraser Cursor Indicator (when eraser tool is active and drawing) */}
          {activeTool === "eraser" && (
            <div
              className="absolute pointer-events-none z-20 border-2 border-red-500 rounded-full bg-red-500/20"
              style={{
                width: `${eraserSize * 2}px`,
                height: `${eraserSize * 2}px`,
                marginLeft: `-${eraserSize}px`,
                marginTop: `-${eraserSize}px`,
                display: "none", // Will be shown via mouse tracking if needed
              }}
            />
          )}
          {/* Render all elements - elements array is always provided from parent */}
          {/* NOTE: If elements array is empty, board still renders (just empty board) */}
          {elements.length > 0 ? (
            elements.map((element) => {
              const isSelected = selectedElementIds.has(element.id);
              const isDraggingElement = draggingElementIds.has(element.id);
              // Disable selection/dragging when pen/eraser tools are active
              const isPenEraserActive = ["pen", "eraser"].includes(activeTool);
              
              switch (element.type) {
                case "sticky":
                  return (
                    <StickyNote
                      key={element.id}
                      element={element as CanvasElement & { text?: string; color?: string }}
                      isSelected={isSelected && !isPenEraserActive}
                      isDragging={isDraggingElement && !isPenEraserActive}
                      onSelect={isPenEraserActive ? undefined : (isShiftKey) => onElementSelect(element.id, isShiftKey)}
                      onDragStart={isPenEraserActive ? undefined : (clientX, clientY) => onDragStart(element.id, clientX, clientY)}
                    />
                  );
                case "image":
                  // Check if this is a PDF by title (temporary until "pdf" type is added)
                  if (element.title?.includes("PDF") || element.title?.includes("pdf")) {
                    return (
                      <PDFThumbnail
                        key={element.id}
                        element={element}
                        isSelected={isSelected && !isPenEraserActive}
                        isDragging={isDraggingElement && !isPenEraserActive}
                        onSelect={isPenEraserActive ? undefined : (isShiftKey) => onElementSelect(element.id, isShiftKey)}
                        onDragStart={isPenEraserActive ? undefined : (clientX, clientY) => onDragStart(element.id, clientX, clientY)}
                      />
                    );
                  }
                  return (
                    <ImageElement
                      key={element.id}
                      element={element}
                      isSelected={isSelected && !isPenEraserActive}
                      isDragging={isDraggingElement && !isPenEraserActive}
                      onSelect={isPenEraserActive ? undefined : (isShiftKey) => onElementSelect(element.id, isShiftKey)}
                      onDragStart={isPenEraserActive ? undefined : (clientX, clientY) => onDragStart(element.id, clientX, clientY)}
                    />
                  );
                // Future: Add handling for other element types (text, shapes, etc.)
                default:
                  return null;
              }
            })
          ) : (
            // Fallback: Show message if no elements (shouldn't happen with mock data)
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <p className="text-lg font-medium">No elements on board</p>
                <p className="text-sm mt-2">Elements will appear here</p>
              </div>
            </div>
          )}

          {/* Future: Add grid overlay, selection marquee, drop zones */}
        </div>
      </div>
    </div>
  );
}

