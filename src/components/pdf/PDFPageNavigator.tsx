"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { CanvasElement } from "@/types";

export interface PDFPageNavigatorProps {
  /** All PDF page elements on the canvas */
  pdfPages: CanvasElement[];
  /** Currently selected element IDs */
  selectedIds: string[];
  /** Callback when user wants to jump to a page */
  onJumpToPage?: (elementId: string) => void;
  /** Maximum height for the navigator */
  maxHeight?: number;
  /** Show thumbnails (default: true if >5 pages) */
  showThumbnails?: boolean;
}

/**
 * PDF Page Navigator Component
 * Shows a compact sidebar with page thumbnails and navigation for PDFs with many pages
 * Appears when PDF pages are selected
 */
export default function PDFPageNavigator({
  pdfPages,
  selectedIds,
  onJumpToPage,
  maxHeight = 400,
  showThumbnails,
}: PDFPageNavigatorProps) {
  // Sort pages by Y position (top to bottom)
  const sortedPages = useMemo(() => {
    return [...pdfPages].sort((a, b) => a.y - b.y);
  }, [pdfPages]);

  // Determine if we should show thumbnails
  const shouldShowThumbnails = showThumbnails ?? (sortedPages.length > 5);

  // Find current page index based on selected IDs
  const currentPageIndex = useMemo(() => {
    if (selectedIds.length === 0) return -1;
    const selectedId = selectedIds[0];
    return sortedPages.findIndex(page => page.id === selectedId);
  }, [selectedIds, sortedPages]);

  // Jump to a specific page
  const handleJumpToPage = (pageIndex: number) => {
    if (pageIndex >= 0 && pageIndex < sortedPages.length) {
      const page = sortedPages[pageIndex];
      onJumpToPage?.(page.id);
    }
  };

  if (sortedPages.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3" style={{ maxHeight: `${maxHeight}px` }}>
      <div className="text-xs font-semibold text-gray-700 mb-2">
        PDF Pages ({sortedPages.length})
      </div>
      
      {shouldShowThumbnails ? (
        // Thumbnail view for many pages
        <div className="space-y-2 overflow-y-auto" style={{ maxHeight: `${maxHeight - 50}px` }}>
          {sortedPages.map((page, index) => {
            const isActive = index === currentPageIndex;
            const pageNumber = index + 1;
            const thumbnailScale = 0.1; // Scale down for thumbnails
            
            return (
              <button
                key={page.id}
                onClick={() => handleJumpToPage(index)}
                className={`w-full p-2 rounded border-2 transition text-left ${
                  isActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
                title={`Page ${pageNumber}`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded border overflow-hidden">
                    {page.imageUrl && (
                      <img
                        src={page.imageUrl}
                        alt={`Page ${pageNumber}`}
                        className="w-full h-full object-contain"
                        style={{
                          width: page.width * thumbnailScale,
                          height: page.height * thumbnailScale,
                        }}
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-700 truncate">
                      Page {pageNumber}
                    </div>
                    <div className="text-xs text-gray-500">
                      {Math.round(page.width)} × {Math.round(page.height)}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        // Simple list view for few pages
        <div className="space-y-1">
          {sortedPages.map((page, index) => {
            const isActive = index === currentPageIndex;
            const pageNumber = index + 1;
            
            return (
              <button
                key={page.id}
                onClick={() => handleJumpToPage(index)}
                className={`w-full px-2 py-1 rounded text-xs text-left transition ${
                  isActive
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Page {pageNumber}
              </button>
            );
          })}
        </div>
      )}
      
      {/* Quick navigation buttons */}
      {sortedPages.length > 1 && (
        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={() => handleJumpToPage(Math.max(0, currentPageIndex - 1))}
            disabled={currentPageIndex <= 0}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            ↑ Prev
          </button>
          <div className="text-xs text-gray-500">
            {currentPageIndex >= 0 ? `${currentPageIndex + 1} / ${sortedPages.length}` : '—'}
          </div>
          <button
            onClick={() => handleJumpToPage(Math.min(sortedPages.length - 1, currentPageIndex + 1))}
            disabled={currentPageIndex >= sortedPages.length - 1}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Next ↓
          </button>
        </div>
      )}
    </div>
  );
}










