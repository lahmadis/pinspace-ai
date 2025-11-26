"use client";

import React, { useState, useCallback } from "react";
import { extractPDFPages, getPDFMetadata, type PDFPageImage } from "@/lib/pdfUtils";
import type { CanvasElement } from "@/types";

export interface PDFUploadHandlerProps {
  /** Callback when PDF pages are extracted and ready to be added to canvas */
  onPagesExtracted: (elements: CanvasElement[]) => void;
  /** Callback for progress updates */
  onProgress?: (current: number, total: number) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
}

/**
 * Handles PDF file upload, extraction, and conversion to canvas elements
 * This component manages the entire PDF upload workflow with loading states
 */
export function usePDFUpload({
  onPagesExtracted,
  onProgress,
  onError,
}: PDFUploadHandlerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handlePDFUpload = useCallback(async (file: File, baseZ: number = 0) => {
    if (!file.type.includes("pdf")) {
      throw new Error("File is not a PDF");
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: 0 });

    try {
      // Get PDF metadata first to show total pages
      const metadata = await getPDFMetadata(file);
      setProgress({ current: 0, total: metadata.pageCount });

      // Extract all pages
      const pages = await extractPDFPages(
        file,
        2.0, // Scale factor for quality
        (pageNumber, totalPages) => {
          setProgress({ current: pageNumber, total: totalPages });
          if (onProgress) {
            onProgress(pageNumber, totalPages);
          }
        }
      );

      // Convert pages to canvas elements with vertical layout (like a slide deck)
      // All pages stacked vertically with exact 4px spacing between them
      const VERTICAL_SPACING = 4; // Exact spacing between pages (4 pixels - no more, no less)
      const LEFT_ALIGN_X = 100; // Left alignment position (same X for all pages)
      const START_Y = 100; // Starting Y position for first page
      const MAX_PAGE_WIDTH = 800; // Maximum width for pages (maintains aspect ratio)
      
      let currentY = START_Y; // Track cumulative Y position
      
      const elements: CanvasElement[] = pages.map((page, index) => {
        const id = `pdf_page_${Date.now()}_${index}`;
        
        // Calculate display dimensions maintaining aspect ratio
        let displayWidth = page.width;
        let displayHeight = page.height;
        const aspectRatio = page.width / page.height;

        // Scale down if exceeds max width, maintaining aspect ratio
        if (displayWidth > MAX_PAGE_WIDTH) {
          displayWidth = MAX_PAGE_WIDTH;
          displayHeight = displayWidth / aspectRatio;
        }

        // Calculate position: all pages at same X, vertically stacked
        // Formula: Y = START_Y + sum of (previous page heights + spacing)
        // This ensures no overlap even with variable page heights
        const x = LEFT_ALIGN_X; // Same X for all pages (left-aligned)
        const y = currentY; // Current cumulative Y position
        
        // Update currentY for next page: add current page height + spacing
        // This prevents overlap and maintains consistent spacing
        currentY += displayHeight + VERTICAL_SPACING;

        return {
          id,
          type: "image",
          x,
          y,
          width: displayWidth,
          height: displayHeight,
          rotation: 0,
          z: baseZ + 10 + index,
          locked: false,
          text: `PDF Page ${page.pageNumber}`,
          imageUrl: page.dataUrl,
        };
      });

      onPagesExtracted(elements);
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
    } catch (error) {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
      const err = error instanceof Error ? error : new Error("Failed to process PDF");
      if (onError) {
        onError(err);
      } else {
        console.error("[PDFUploadHandler] Error:", err);
        throw err;
      }
    }
  }, [onPagesExtracted, onProgress, onError]);

  return {
    handlePDFUpload,
    isProcessing,
    progress,
  };
}

/**
 * PDF Upload Progress Component
 * Displays loading state and progress during PDF processing
 */
export function PDFUploadProgress({
  current,
  total,
  fileName,
}: {
  current: number;
  total: number;
  fileName?: string;
}) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Processing PDF
          </h3>
          {fileName && (
            <p className="text-sm text-gray-600 truncate">{fileName}</p>
          )}
        </div>
        
        <div className="mb-2">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Extracting pages...</span>
            <span>{current} / {total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        
        <p className="text-xs text-gray-500 text-center">
          {percentage}% complete
        </p>
      </div>
    </div>
  );
}

