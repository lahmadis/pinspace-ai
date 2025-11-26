"use client";

import React, { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";

// Import react-pdf CSS files for text and annotation layers
// These are required for proper rendering of PDF text and annotations
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

// Configure PDF.js worker to use local worker file
// This must only run in the browser (client-side only)
// DOMMatrix and other browser APIs are not available on the server
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
}

export interface PdfViewerProps {
  /** PDF file object (from file input) */
  file?: File | null;
  /** PDF URL (alternative to file) */
  url?: string | null;
  /** Maximum width for the viewer */
  maxWidth?: number;
  /** Callback when PDF is loaded */
  onLoadSuccess?: (numPages: number) => void;
  /** Callback when PDF fails to load */
  onLoadError?: (error: Error) => void;
  /** CSS class name */
  className?: string;
}

/**
 * Reusable PDF Viewer component using react-pdf
 * Supports both file uploads and URLs
 * Multi-page support with navigation
 */
export default function PdfViewer({
  file,
  url,
  maxWidth = 800,
  onLoadSuccess,
  onLoadError,
  className = "",
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageWidth, setPageWidth] = useState(maxWidth);

  // Determine PDF source (file takes precedence over URL)
  const pdfSource = file || url || null;

  // Handle successful PDF load
  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
    onLoadSuccess?.(numPages);
  };

  // Handle PDF load error
  const handleLoadError = (error: Error) => {
    console.error("[PdfViewer] Error loading PDF:", error);
    setError(error.message || "Failed to load PDF");
    setLoading(false);
    onLoadError?.(error);
  };

  // Reset state when source changes
  useEffect(() => {
    if (!pdfSource) {
      setNumPages(null);
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
      setError(null);
    }
  }, [pdfSource]);

  // If no PDF source provided, show placeholder
  if (!pdfSource) {
    return (
      <div className={`flex items-center justify-center p-8 bg-gray-50 rounded border ${className}`}>
        <div className="text-center text-gray-500">
          <p className="text-sm">No PDF selected</p>
          <p className="text-xs mt-1">Upload a PDF file or provide a URL</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`flex items-center justify-center p-8 bg-red-50 rounded border border-red-200 ${className}`}>
        <div className="text-center text-red-600">
          <p className="text-sm font-semibold mb-1">Error loading PDF</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* PDF Document - Multi-page rendering */}
      <div className="mb-4 space-y-4" style={{ maxWidth: `${maxWidth}px`, width: "100%" }}>
        <Document
          file={pdfSource}
          onLoadSuccess={handleLoadSuccess}
          onLoadError={handleLoadError}
          loading={
            <div className="flex items-center justify-center p-8 bg-gray-50 rounded border">
              <div className="text-center text-gray-500">
                <p className="text-sm">Loading PDF...</p>
              </div>
            </div>
          }
          className="flex flex-col items-center"
        >
          {/* Render all pages in the document */}
          {numPages && numPages > 0 && (
            <>
              {Array.from(new Array(numPages), (el, index) => (
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  width={pageWidth}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  loading={
                    <div className="flex items-center justify-center p-8 bg-gray-50 rounded border min-h-[400px]">
                      <p className="text-sm text-gray-500">Loading page {index + 1}...</p>
                    </div>
                  }
                  className="mb-4"
                />
              ))}
            </>
          )}
        </Document>
      </div>

      {/* Page count info */}
      {numPages && numPages > 0 && (
        <div className="text-sm text-gray-600 mt-4">
          {numPages} {numPages === 1 ? "page" : "pages"}
        </div>
      )}
    </div>
  );
}

