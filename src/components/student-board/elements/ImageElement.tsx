"use client";

import React from "react";
import type { CanvasElement } from "@/types";

/**
 * Image Element Component
 * 
 * Displays an image element on the canvas.
 * 
 * Current Features:
 * - ✅ Click to select/deselect
 * - ✅ Visual selection highlight (blue border)
 * 
 * Next Steps:
 * - Add drag handler for movement
 * - Add image upload functionality
 * - Add resize handles
 * - Add comment/annotation support
 * - Add image editing (crop, rotate, etc.)
 */

interface ImageElementProps {
  element: CanvasElement;
  isSelected?: boolean;
  isDragging?: boolean;
  onSelect?: (isShiftKey?: boolean) => void;
  onDragStart?: (clientX: number, clientY: number) => void;
}

/**
 * ImageElement - Component for rendering image elements
 * 
 * Export: Default export (use: import ImageElement from "...")
 * Import: Default import matches default export
 */
export default function ImageElement({ 
  element, 
  isSelected = false,
  isDragging = false,
  onSelect,
  onDragStart,
}: ImageElementProps): JSX.Element {
  /**
   * Handle click on image element
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
      return;
    }
    e.stopPropagation(); // Prevent canvas click handler from firing
    onSelect(e.shiftKey); // Pass Shift key state for multi-select
  };

  /**
   * Handle mouse down on image element (drag start)
   * 
   * Multi-select drag behavior:
   * - Only starts drag if element is in selection
   * - If multiple elements are selected, all will be dragged together
   * - Passes mouse coordinates to parent for drag calculation
   * 
   * Note: If onDragStart is undefined (e.g., pen/eraser tool active), dragging is disabled
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!onDragStart) {
      return;
    }
    
    // Only allow drag if element is selected
    if (!isSelected) return;

    e.stopPropagation();
    e.preventDefault(); // Prevent image drag (browser default)
    
    // Notify parent of drag start with mouse coordinates
    // Parent will handle dragging all selected elements together
    onDragStart(e.clientX, e.clientY);
  };

  return (
    <div
      className={`
        absolute border-2 rounded-lg shadow-lg overflow-hidden 
        bg-gray-100 dark:bg-gray-800 
        transition-all duration-200
        hover:shadow-xl
        ${isDragging 
          ? "cursor-grabbing opacity-90 shadow-2xl scale-[1.03] border-blue-500 dark:border-blue-400 z-[9999]" 
          : isSelected 
            ? "cursor-grab ring-4 ring-blue-500 dark:ring-blue-400 ring-offset-2 shadow-2xl scale-[1.02] border-blue-500 dark:border-blue-400" 
            : "cursor-pointer border-gray-400 dark:border-gray-600"
        }
      `}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      style={{
        left: `${element.x}px`,
        top: `${element.y}px`,
        width: `${element.width}px`,
        height: `${element.height}px`,
        zIndex: isSelected ? element.z + 1000 : element.z, // Bring selected elements to front
      }}
    >
      {element.src ? (
        <>
          {/* Image Element Header */}
          <div className="absolute top-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 font-medium z-10">
            🖼️ {element.title || "Image"}
          </div>
          {/* Image Content */}
          <img
            src={element.src}
            alt={element.title || "Image"}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <div className="text-5xl mb-3">🖼️</div>
            <div className="text-sm font-medium">Image Placeholder</div>
            <div className="text-xs mt-1 opacity-75">Click to upload</div>
          </div>
        </div>
      )}
    </div>
  );
}

