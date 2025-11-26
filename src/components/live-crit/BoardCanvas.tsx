"use client";

import React, { useMemo } from "react";
import type { CanvasElement } from "@/types";
import type { PenStroke } from "@/hooks/usePenDrawing";
import StickyNote from "@/components/student-board/elements/StickyNote";
import ImageElement from "@/components/student-board/elements/ImageElement";
import PDFThumbnail from "@/components/student-board/elements/PDFThumbnail";

interface BoardCanvasProps {
  sessionId: string;
}

/**
 * BoardCanvas - Central display area for Live Crit content
 * 
 * This component displays board content in a read-only view for Live Crit sessions.
 * It renders sticky notes, images, PDF pages, and pen strokes in a layout matching
 * the Student Board style.
 * 
 * TODO: Real-time synchronization
 * - Replace mock data with real-time board state from WebSocket/Server-Sent Events
 * - Subscribe to board state changes: elements, pen strokes, comments
 * - Handle optimistic updates for smooth UX
 * - Resolve conflicts when multiple users edit simultaneously
 * - Sync presenter viewport (pan/zoom) to all participants
 * - Track and display other participants' cursors/selections
 * 
 * TODO: Future enhancements
 * - Add zoom/pan controls (read-only for viewers, interactive for presenter)
 * - Add presenter controls (cursor tracking, viewport sync)
 * - Add snapshot/capture functionality
 * - Support annotation overlays (highlights, shapes, arrows)
 * - Add loading and error states
 */
export default function BoardCanvas({ sessionId }: BoardCanvasProps) {
  // ============================================================================
  // MOCK DATA - Will be replaced with real-time board state
  // ============================================================================
  // TODO: Replace with real-time data fetching
  // - Fetch board data from API: GET /api/live-crit/[sessionId]/board
  // - Subscribe to real-time updates via WebSocket/SSE
  // - Handle loading states (show skeleton/spinner)
  // - Handle error states (show error message, retry button)
  // ============================================================================
  
  // Mock elements array - matches Student Board structure
  const mockElements = useMemo<(CanvasElement & { text?: string; color?: string })[]>(() => [
    // Sticky Note 1
    {
      id: "sticky-1",
      type: "sticky",
      x: 120,
      y: 100,
      width: 240,
      height: 180,
      z: 1,
      text: "Key Design Concepts\n\n• Facade treatment\n• Material selection\n• Spatial flow",
      color: "yellow",
    },
    // Sticky Note 2
    {
      id: "sticky-2",
      type: "sticky",
      x: 400,
      y: 100,
      width: 200,
      height: 160,
      z: 2,
      text: "Questions for Review:\n\n- Structural feasibility?\n- Cost implications?",
      color: "pink",
    },
    // Sticky Note 3
    {
      id: "sticky-3",
      type: "sticky",
      x: 650,
      y: 100,
      width: 220,
      height: 150,
      z: 1,
      text: "Next Steps:\n1. Refine details\n2. Material samples\n3. Structural analysis",
      color: "blue",
    },
    // Image Element
    {
      id: "image-1",
      type: "image",
      x: 120,
      y: 320,
      width: 350,
      height: 250,
      z: 1,
      title: "Facade Reference",
      src: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=400&h=300&fit=crop",
    },
    // PDF Element
    {
      id: "pdf-1",
      type: "image" as any, // TODO: Add "pdf" to ElementType union
      x: 500,
      y: 320,
      width: 250,
      height: 320,
      z: 1,
      title: "Project Plans - Page 1",
    },
  ], []);

  // Mock pen strokes - sample drawing curves/lines
  const mockPenStrokes = useMemo<PenStroke[]>(() => [
    {
      id: "stroke-1",
      points: [
        { x: 150, y: 600 },
        { x: 180, y: 580 },
        { x: 220, y: 570 },
        { x: 260, y: 575 },
        { x: 300, y: 590 },
        { x: 340, y: 610 },
      ],
      color: "#000000",
      width: 3,
      timestamp: Date.now() - 10000,
    },
    {
      id: "stroke-2",
      points: [
        { x: 500, y: 650 },
        { x: 520, y: 630 },
        { x: 550, y: 620 },
        { x: 580, y: 625 },
        { x: 610, y: 640 },
        { x: 640, y: 660 },
      ],
      color: "#ef4444", // red
      width: 4,
      timestamp: Date.now() - 8000,
    },
    {
      id: "stroke-3",
      points: [
        { x: 700, y: 500 },
        { x: 750, y: 480 },
        { x: 800, y: 470 },
        { x: 850, y: 475 },
        { x: 900, y: 490 },
      ],
      color: "#3b82f6", // blue
      width: 2,
      timestamp: Date.now() - 5000,
    },
    // Curved annotation line
    {
      id: "stroke-4",
      points: [
        { x: 200, y: 400 },
        { x: 250, y: 380 },
        { x: 300, y: 370 },
        { x: 350, y: 375 },
        { x: 400, y: 390 },
        { x: 450, y: 410 },
      ],
      color: "#22c55e", // green
      width: 3,
      timestamp: Date.now() - 3000,
    },
  ], []);

  // ============================================================================
  // REAL-TIME SYNC INTEGRATION POINT
  // ============================================================================
  // TODO: Replace mock data with real-time state
  // 
  // Example integration:
  // const { elements, penStrokes, isLoading, error } = useLiveCritBoard(sessionId);
  // 
  // Where useLiveCritBoard hook:
  // - Subscribes to WebSocket/SSE for sessionId
  // - Receives board state updates (elements, pen strokes, comments)
  // - Handles reconnection logic
  // - Manages optimistic updates
  // - Resolves conflicts (last-write-wins or operational transforms)
  //
  // Real-time update flow:
  // 1. Presenter makes change → broadcast to server
  // 2. Server validates & persists → broadcast to all participants
  // 3. All participants receive update → update local state
  // 4. UI re-renders with new state
  //
  // Conflict resolution:
  // - Use operational transforms (OT) or CRDTs for conflict-free merging
  // - Or use last-write-wins with timestamps
  // - Or use presenter authority (only presenter can edit, others view-only)
  // ============================================================================

  /**
   * Render a pen stroke as SVG path
   * Matches the rendering logic from StudentBoardCanvas
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

  return (
    <div className="flex-1 relative overflow-auto bg-gray-100 dark:bg-gray-900 p-2 sm:p-4 md:p-8">
      {/* 
        Board Container - Matches Student Board layout
        White board with border, shadow, and responsive dimensions
      */}
      <div className="relative mx-auto bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-300 dark:border-gray-700 shadow-xl w-full max-w-full min-w-[320px] sm:min-w-[600px] md:min-w-[1200px] min-h-[400px] sm:min-h-[600px] md:min-h-[800px] p-4 sm:p-6 md:p-8">
        {/* Canvas Container - Read-only view of board content */}
        <div
          className="relative w-full h-full min-h-[300px] sm:min-h-[400px] md:min-h-[600px]"
          role="application"
          aria-label={`Live Crit board canvas. ${mockElements.length} elements. ${mockPenStrokes.length} pen strokes. Read-only view.`}
        >
          {/* SVG Overlay for Pen Strokes - Rendered above elements */}
          {mockPenStrokes.length > 0 && (
            <svg
              className="absolute inset-0 pointer-events-none z-10"
              style={{ width: "100%", height: "100%" }}
            >
              {/* Render all pen strokes */}
              {mockPenStrokes.map((stroke) => renderStroke(stroke))}
            </svg>
          )}

          {/* Render all elements - matches Student Board element rendering */}
          {mockElements.map((element) => {
            // Read-only mode: no selection, no dragging, no interaction
            const isSelected = false;
            const isDragging = false;
            
            switch (element.type) {
              case "sticky":
                return (
                  <StickyNote
                    key={element.id}
                    element={element as CanvasElement & { text?: string; color?: string }}
                    isSelected={isSelected}
                    isDragging={isDragging}
                    onSelect={undefined} // Read-only: no selection
                    onDragStart={undefined} // Read-only: no dragging
                  />
                );
              case "image":
                // Check if this is a PDF by title (temporary until "pdf" type is added)
                if (element.title?.includes("PDF") || element.title?.includes("pdf") || element.title?.includes("Page")) {
                  return (
                    <PDFThumbnail
                      key={element.id}
                      element={element}
                      isSelected={isSelected}
                      isDragging={isDragging}
                      onSelect={undefined} // Read-only: no selection
                      onDragStart={undefined} // Read-only: no dragging
                    />
                  );
                }
                return (
                  <ImageElement
                    key={element.id}
                    element={element}
                    isSelected={isSelected}
                    isDragging={isDragging}
                    onSelect={undefined} // Read-only: no selection
                    onDragStart={undefined} // Read-only: no dragging
                  />
                );
              default:
                return null;
            }
          })}

          {/* TODO: Add overlay layers for real-time features */}
          {/* - Cursor/tool layer for other participants (when real-time is enabled) */}
          {/* - Selection indicators for presenter (when real-time is enabled) */}
          {/* - Annotation overlays (highlights, shapes, arrows) */}
        </div>
      </div>
    </div>
  );
}

