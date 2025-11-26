"use client";

import React from "react";
import type { CanvasElement } from "@/types";

/**
 * PDF Thumbnail Element Component
 * 
 * Displays a PDF page thumbnail on the canvas.
 * 
 * Current Features:
 * - ✅ Click to select/deselect
 * - ✅ Visual selection highlight (blue border)
 * 
 * Next Steps:
 * - Add drag handler for movement
 * - Add PDF upload functionality
 * - Show actual PDF pages (using pdfjs-dist)
 * - Add comment/annotation support
 * - Add PDF viewer modal
 * - Add multi-page support
 */

interface PDFThumbnailProps {
  element: CanvasElement;
  isSelected?: boolean;
  isDragging?: boolean;
  onSelect?: (isShiftKey?: boolean) => void;
  onDragStart?: (clientX: number, clientY: number) => void;
}

/**
 * PDFThumbnail - Component for rendering PDF thumbnail elements
 * 
 * Export: Default export (use: import PDFThumbnail from "...")
 * Import: Default import matches default export
 */
export default function PDFThumbnail({ 
  element, 
  isSelected = false,
  isDragging = false,
  onSelect,
  onDragStart,
}: PDFThumbnailProps): JSX.Element {
  /**
   * Handle click on PDF thumbnail
   * 
   * Multi-select behavior:
   * - Single click: Selects element (replaces previous selection)
   * - Shift+Click: Toggles element in/out of selection (additive)
   * - Stops event propagation to prevent canvas deselection handler from firing
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
   * Handle mouse down on PDF thumbnail (drag start)
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
    e.preventDefault();
    
    // Notify parent of drag start with mouse coordinates
    // Parent will handle dragging all selected elements together
    onDragStart(e.clientX, e.clientY);
  };

  return (
    <div
      className={`
        absolute border-2 rounded-lg shadow-lg overflow-hidden 
        bg-white dark:bg-gray-800 
        transition-all duration-200
        hover:shadow-xl
        ${isDragging 
          ? "cursor-grabbing opacity-90 shadow-2xl scale-[1.03] border-blue-500 dark:border-blue-400 z-[9999]" 
          : isSelected 
            ? "cursor-grab ring-4 ring-blue-500 dark:ring-blue-400 ring-offset-2 shadow-2xl scale-[1.02] border-blue-500 dark:border-blue-400" 
            : "cursor-pointer border-red-400 dark:border-red-600"
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
      <div className="w-full h-full flex flex-col">
        {/* PDF Header - Distinctive red color to differentiate from images */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 text-white px-3 py-2 text-xs font-semibold flex items-center gap-2 shadow-sm">
          <span className="text-base">📄</span>
          <span>{element.title || "PDF Document"}</span>
        </div>
        {/* PDF Content Area */}
        {(element as any).src ? (
          // If PDF has been uploaded and has a source (blob URL or image), display it
          // Future: Use PDF.js to render actual PDF page
          <div className="flex-1 bg-white dark:bg-gray-900 p-2 border-t border-gray-200 dark:border-gray-700 overflow-hidden">
            <img
              src={(element as any).src}
              alt={element.title || "PDF Document"}
              className="w-full h-full object-contain"
              draggable={false}
              onError={() => {
                // If image fails to load (e.g., blob URL expired), show placeholder
                console.warn("Failed to load PDF preview");
              }}
            />
          </div>
        ) : (
          // Placeholder for PDF (before upload or if no preview available)
          <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 flex items-center justify-center border-t border-gray-200 dark:border-gray-700">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-5xl mb-3">📄</div>
              <div className="text-sm font-medium mb-1">PDF Document</div>
              <div className="text-xs opacity-75">Page 1</div>
              <div className="text-xs mt-2 opacity-60">Click to view</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

