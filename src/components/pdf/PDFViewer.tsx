"use client";

import React, { useState, useCallback } from "react";
import PDFPageRenderer from "./PDFPageRenderer";
import type { PDFPageImage } from "@/lib/pdfUtils";

export interface PDFViewerProps {
  /** Array of PDF page images */
  pages: PDFPageImage[];
  /** Current page number (1-indexed) */
  currentPage?: number;
  /** Callback when page changes */
  onPageChange?: (pageNumber: number) => void;
  /** Show thumbnail navigation (default: true if >5 pages) */
  showThumbnails?: boolean;
  /** Maximum display width for pages */
  maxWidth?: number;
  /** Maximum display height for pages */
  maxHeight?: number;
  /** CSS class name */
  className?: string;
}

/**
 * PDF Viewer component with thumbnail navigation for PDFs with more than 5 pages
 * Efficiently renders and navigates through PDF pages
 */
export default function PDFViewer({
  pages,
  currentPage: controlledCurrentPage,
  onPageChange,
  showThumbnails,
  maxWidth = 800,
  maxHeight = 600,
  className = "",
}: PDFViewerProps) {
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);
  
  // Use controlled page if provided, otherwise use internal state
  const currentPage = controlledCurrentPage ?? internalCurrentPage;
  const shouldShowThumbnails = showThumbnails ?? (pages.length > 5);

  const handlePageChange = useCallback((pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= pages.length) {
      if (onPageChange) {
        onPageChange(pageNumber);
      } else {
        setInternalCurrentPage(pageNumber);
      }
    }
  }, [pages.length, onPageChange]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  }, [currentPage, handlePageChange]);

  const goToNextPage = useCallback(() => {
    if (currentPage < pages.length) {
      handlePageChange(currentPage + 1);
    }
  }, [currentPage, pages.length, handlePageChange]);

  if (pages.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-gray-500">No pages to display</div>
      </div>
    );
  }

  const currentPageData = pages[currentPage - 1];

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Main page display */}
      <div className="flex-1 flex items-center justify-center mb-4">
        <PDFPageRenderer
          dataUrl={currentPageData.dataUrl}
          width={currentPageData.width}
          height={currentPageData.height}
          maxWidth={maxWidth}
          maxHeight={maxHeight}
        />
      </div>

      {/* Navigation controls */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={goToPreviousPage}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          ← Previous
        </button>
        
        <div className="text-sm text-gray-600">
          Page {currentPage} of {pages.length}
        </div>
        
        <button
          onClick={goToNextPage}
          disabled={currentPage === pages.length}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Next →
        </button>
      </div>

      {/* Thumbnail navigation (shown if >5 pages or explicitly enabled) */}
      {shouldShowThumbnails && (
        <div className="mt-4">
          <div className="text-xs text-gray-500 mb-2">Jump to page:</div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {pages.map((page, index) => {
              const pageNumber = index + 1;
              const isActive = pageNumber === currentPage;
              const thumbnailScale = 0.15; // Scale down for thumbnails
              
              return (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  className={`border-2 rounded p-1 transition ${
                    isActive
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  title={`Page ${pageNumber}`}
                >
                  <img
                    src={page.dataUrl}
                    alt={`Page ${pageNumber} thumbnail`}
                    className="block"
                    style={{
                      width: page.width * thumbnailScale,
                      height: page.height * thumbnailScale,
                      maxWidth: 80,
                      maxHeight: 80,
                    }}
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}










