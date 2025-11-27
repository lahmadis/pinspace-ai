"use client";

import React, { useState, useEffect } from "react";

export interface PDFPageRendererProps {
  /** Base64 data URL of the rendered PDF page */
  dataUrl: string;
  /** Original width of the page */
  width: number;
  /** Original height of the page */
  height: number;
  /** Maximum display width (default: 800) */
  maxWidth?: number;
  /** Maximum display height (default: 600) */
  maxHeight?: number;
  /** CSS class name */
  className?: string;
  /** Style object */
  style?: React.CSSProperties;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
}

/**
 * Renders a single PDF page as an image
 * This component efficiently displays a rendered PDF page that was converted to an image
 */
export default function PDFPageRenderer({
  dataUrl,
  width,
  height,
  maxWidth = 800,
  maxHeight = 600,
  className = "",
  style,
  isLoading = false,
  error = null,
}: PDFPageRendererProps) {
  const [displayWidth, setDisplayWidth] = useState(maxWidth);
  const [displayHeight, setDisplayHeight] = useState(maxHeight);

  // Calculate display dimensions maintaining aspect ratio
  useEffect(() => {
    const aspectRatio = width / height;
    let w = width;
    let h = height;

    // Scale down if exceeds max dimensions
    if (w > maxWidth) {
      w = maxWidth;
      h = w / aspectRatio;
    }
    if (h > maxHeight) {
      h = maxHeight;
      w = h * aspectRatio;
    }

    setDisplayWidth(w);
    setDisplayHeight(h);
  }, [width, height, maxWidth, maxHeight]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-red-50 border border-red-200 rounded p-4 ${className}`}
        style={{ width: displayWidth, height: displayHeight, ...style }}
      >
        <div className="text-red-600 text-sm text-center">
          <div className="font-semibold mb-1">Error loading PDF page</div>
          <div className="text-xs">{error}</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 border border-gray-200 rounded ${className}`}
        style={{ width: displayWidth, height: displayHeight, ...style }}
      >
        <div className="text-gray-500 text-sm">Loading page...</div>
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt="PDF page"
      className={`object-contain ${className}`}
      style={{
        width: displayWidth,
        height: displayHeight,
        maxWidth: "100%",
        maxHeight: "100%",
        ...style,
      }}
      loading="lazy"
    />
  );
}












