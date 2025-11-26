/**
 * Export Menu Component
 * 
 * Provides UI for exporting board in various formats:
 * - PNG image
 * - JPEG image
 * - SVG vector
 * - PDF document
 * 
 * Also includes share functionality:
 * - Generate shareable link
 * - Copy link to clipboard
 * 
 * Future: Enhanced export
 * - Export templates
 * - Custom export settings
 * - Batch export
 * - Export scheduling
 */

"use client";

import React, { useState } from "react";
import { 
  exportBoardAsImage, 
  exportBoardAsSVG, 
  exportBoardAsPDF,
  downloadFile,
  copyToClipboard,
  generateShareLink,
  type BoardExportState,
  type ExportOptions,
} from "@/lib/boardExport";

interface ExportMenuProps {
  boardId: string;
  boardState: BoardExportState;
  canvasRef: React.RefObject<HTMLElement>;
  onClose?: () => void;
}

export default function ExportMenu({
  boardId,
  boardState,
  canvasRef,
  onClose,
}: ExportMenuProps): JSX.Element {
  const [isExporting, setIsExporting] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  /**
   * Handle image export
   */
  const handleExportImage = async (format: "png" | "jpeg") => {
    if (!canvasRef.current) {
      alert("Canvas not found. Please try again.");
      return;
    }

    // Find the actual canvas element (the white board area)
    const boardContainer = canvasRef.current.querySelector('.bg-white.dark\\:bg-gray-800') as HTMLElement;
    if (!boardContainer) {
      alert("Canvas element not found. Please try again.");
      return;
    }

    setIsExporting(true);
    try {
      const blob = await exportBoardAsImage(boardContainer, {
        format,
        quality: 0.95,
        includeComments: true,
        filename: `board-${boardId}-${Date.now()}.${format}`,
        boardBackground: boardState.boardBackground,
      });

      const filename = `board-${boardId}-${Date.now()}.${format}`;
      downloadFile(blob, filename);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export board. Please try again.");
    } finally {
      setIsExporting(false);
      onClose?.();
    }
  };

  /**
   * Handle SVG export
   */
  const handleExportSVG = async () => {
    setIsExporting(true);
    try {
      const svgContent = exportBoardAsSVG(boardState, {
        format: "svg",
        includeComments: true,
        filename: `board-${boardId}-${Date.now()}.svg`,
      });

      const blob = new Blob([svgContent], { type: "image/svg+xml" });
      const filename = `board-${boardId}-${Date.now()}.svg`;
      downloadFile(blob, filename);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export board. Please try again.");
    } finally {
      setIsExporting(false);
      onClose?.();
    }
  };

  /**
   * Handle PDF export
   */
  const handleExportPDF = async () => {
    if (!canvasRef.current) {
      alert("Canvas not found. Please try again.");
      return;
    }

    // Find the actual canvas element (the white board area)
    // The canvas is inside a div with class "bg-white dark:bg-gray-800"
    const boardContainer = canvasRef.current?.querySelector('.bg-white.dark\\:bg-gray-800') as HTMLElement;
    if (!boardContainer) {
      alert("Canvas element not found. Please try again.");
      return;
    }

    setIsExporting(true);
    try {
      const blob = await exportBoardAsPDF(boardContainer, boardState, {
        format: "pdf",
        includeComments: true,
        includeMetadata: true,
        filename: `board-${boardId}-${Date.now()}.pdf`,
        boardBackground: boardState.boardBackground,
      });

      const filename = `board-${boardId}-${Date.now()}.pdf`;
      downloadFile(blob, filename);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export board. Please try again.");
    } finally {
      setIsExporting(false);
      onClose?.();
    }
  };

  /**
   * Generate share link
   */
  const handleGenerateShareLink = () => {
    const link = generateShareLink(boardId);
    setShareLink(link);
    setLinkCopied(false);
  };

  /**
   * Copy share link to clipboard
   */
  const handleCopyShareLink = async () => {
    if (!shareLink) return;

    const success = await copyToClipboard(shareLink);
    if (success) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } else {
      alert("Failed to copy link. Please try again.");
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 min-w-[280px]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Export Board
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Export your board in various formats
        </p>
      </div>

      {/* Export Options */}
      <div className="space-y-2 mb-4">
        <button
          onClick={() => handleExportImage("png")}
          disabled={isExporting}
          className="w-full px-4 py-2 text-left rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span>🖼️</span>
          <span>Export as PNG</span>
        </button>

        <button
          onClick={() => handleExportImage("jpeg")}
          disabled={isExporting}
          className="w-full px-4 py-2 text-left rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span>🖼️</span>
          <span>Export as JPEG</span>
        </button>

        <button
          onClick={handleExportSVG}
          disabled={isExporting}
          className="w-full px-4 py-2 text-left rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span>📐</span>
          <span>Export as SVG</span>
        </button>

        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="w-full px-4 py-2 text-left rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span>📄</span>
          <span>Export as PDF</span>
        </button>
      </div>

      {isExporting && (
        <div className="mb-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          Exporting...
        </div>
      )}

      {/* Share Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Share Board
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Generate a shareable link for this board
        </p>

        {!shareLink ? (
          <button
            onClick={handleGenerateShareLink}
            className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <span>🔗</span>
            <span>Generate Share Link</span>
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              />
              <button
                onClick={handleCopyShareLink}
                className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                title="Copy to clipboard"
              >
                {linkCopied ? "✓" : "📋"}
              </button>
            </div>
            {linkCopied && (
              <p className="text-xs text-green-600 dark:text-green-400 text-center">
                Link copied to clipboard!
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Share this link to allow others to view the board
            </p>
          </div>
        )}
      </div>

      {/* Future: Backend Integration Note */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">
          Future: Share links will be stored in backend with expiration and permissions
        </p>
      </div>
    </div>
  );
}

