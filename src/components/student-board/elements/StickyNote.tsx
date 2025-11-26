"use client";

import React from "react";
import type { CanvasElement } from "@/types";

/**
 * Sticky Note Element Component
 * 
 * Displays a sticky note element on the canvas.
 * 
 * Current Features:
 * - ✅ Click to select/deselect
 * - ✅ Visual selection highlight (blue border)
 * 
 * Next Steps:
 * - Add drag handler for movement
 * - Add double-click handler for inline text editing
 * - Add resize handles
 * - Add color picker
 * - Add delete functionality
 */

interface StickyNoteProps {
  element: CanvasElement & { text?: string; color?: string };
  isSelected?: boolean;
  isDragging?: boolean;
  onSelect?: (isShiftKey?: boolean) => void;
  onDragStart?: (clientX: number, clientY: number) => void;
}

/**
 * StickyNote - Component for rendering sticky note elements
 * 
 * Export: Default export (use: import StickyNote from "...")
 * Import: Default import matches default export
 */
export default function StickyNote({ 
  element, 
  isSelected = false,
  isDragging = false,
  onSelect,
  onDragStart,
}: StickyNoteProps): JSX.Element {
  const colors = {
    yellow: {
      bg: "bg-yellow-200 dark:bg-yellow-900/30",
      border: "border-yellow-400 dark:border-yellow-600",
      text: "text-yellow-900 dark:text-yellow-200",
    },
    pink: {
      bg: "bg-pink-200 dark:bg-pink-900/30",
      border: "border-pink-400 dark:border-pink-600",
      text: "text-pink-900 dark:text-pink-200",
    },
    blue: {
      bg: "bg-blue-200 dark:bg-blue-900/30",
      border: "border-blue-400 dark:border-blue-600",
      text: "text-blue-900 dark:text-blue-200",
    },
    green: {
      bg: "bg-green-200 dark:bg-green-900/30",
      border: "border-green-400 dark:border-green-600",
      text: "text-green-900 dark:text-green-200",
    },
  };
  const colorScheme = colors[element.color as keyof typeof colors] || colors.yellow;

  /**
   * Handle click on sticky note
   * 
   * Multi-select behavior:
   * - Single click: Selects element (replaces previous selection)
   * - Shift+Click: Toggles element in/out of selection (additive)
   * - Stops event propagation to prevent canvas click handler from firing
   * - Passes Shift key state to parent for multi-select handling
   * 
   * Note: If onSelect is undefined (e.g., pen/eraser tool active), selection is disabled
   */
  const handleClick = (e: React.MouseEvent) => {
    if (!onSelect) {
      // Don't handle clicks when selection is disabled (e.g., pen/eraser active)
      return;
    }
    e.stopPropagation(); // Prevent canvas click handler from firing
    onSelect(e.shiftKey); // Pass Shift key state for multi-select
  };

  /**
   * Handle mouse down on sticky note (drag start)
   * 
   * Multi-select drag behavior:
   * - Only starts drag if element is in selection
   * - If multiple elements are selected, all will be dragged together
   * - Passes mouse coordinates to parent for drag calculation
   * 
   * Future: Drag improvements
   * - Add drag threshold: only start drag after mouse moves X pixels
   * - Add drag delay: prevent accidental drags on quick clicks
   * - Support touch events for mobile drag
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!onDragStart) {
      // Don't handle drag when dragging is disabled (e.g., pen/eraser active)
      return;
    }
    
    // Only allow drag if element is selected
    if (!isSelected) return;

    e.stopPropagation();
    e.preventDefault(); // Prevent text selection during drag
    
    // Notify parent of drag start with mouse coordinates
    // Parent will handle dragging all selected elements together
    onDragStart(e.clientX, e.clientY);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Sticky note: ${element.text || "Empty sticky note"}. ${isSelected ? "Selected" : "Not selected"}. Press Enter to edit, arrow keys to move.`}
      aria-pressed={isSelected}
      className={`
        absolute rounded-lg border-2 shadow-lg p-3 sm:p-4
        ${colorScheme.bg} ${colorScheme.border}
        transition-all duration-200
        hover:shadow-xl
        focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2
        ${isDragging 
          ? "cursor-grabbing opacity-90 shadow-2xl scale-[1.03] z-[9999]" 
          : isSelected 
            ? "cursor-grab ring-4 ring-blue-500 dark:ring-blue-400 ring-offset-2 shadow-2xl scale-[1.02]" 
            : "cursor-pointer"
        }
      `}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(e.shiftKey);
        }
      }}
      style={{
        left: `${element.x}px`,
        top: `${element.y}px`,
        width: `${element.width}px`,
        height: `${element.height}px`,
        zIndex: isSelected ? element.z + 1000 : element.z, // Bring selected elements to front
      }}
    >
      {/* Sticky Note Header */}
      <div className={`text-xs font-semibold ${colorScheme.text} mb-2 uppercase tracking-wide`}>
        📝 Sticky Note
      </div>
      {/* Sticky Note Content */}
      <div className={`text-sm ${colorScheme.text} whitespace-pre-wrap leading-relaxed`}>
        {element.text || "Double-click to edit..."}
      </div>
    </div>
  );
}

