/**
 * Board Export Utilities
 * 
 * Handles exporting board state to various formats:
 * - PNG/JPEG images
 * - SVG vector graphics
 * - PDF documents
 * 
 * Future: Backend integration
 * - Upload exports to cloud storage (S3, Cloudinary)
 * - Generate shareable links with expiration
 * - Add export templates and customization
 * - Support batch exports
 * - Add export analytics
 */

import type { CanvasElement } from "@/types";
import type { PenStroke } from "@/hooks/usePenDrawing";

/**
 * Board state for export
 */
export interface BoardExportState {
  // REFACTORED: ownerId, text, and src are now part of CanvasElement interface
  // Only include color which is not in the base type
  elements: (CanvasElement & { color?: string })[];
  comments: Array<{ elementId: string; comments: string[] }>;
  penStrokes: PenStroke[];
  boardWidth: number;
  boardHeight: number;
  boardBackground?: string;
}

/**
 * Export options
 * REFACTORED: Added boardBackground field to ExportOptions interface
 */
export interface ExportOptions {
  format: "png" | "jpeg" | "svg" | "pdf";
  quality?: number; // 0-1 for JPEG, ignored for PNG/SVG
  includeComments?: boolean; // Include comment annotations in export
  includeMetadata?: boolean; // Include board metadata in export
  filename?: string;
  boardBackground?: string; // Background color for board export (e.g., "#ffffff")
}

/**
 * Export board as PNG/JPEG image
 * 
 * Uses html2canvas to render the board canvas to an image.
 * 
 * Future: Server-side rendering
 * - Use headless browser (Puppeteer) for server-side export
 * - Support custom dimensions and scaling
 * - Add watermark support
 */
export async function exportBoardAsImage(
  canvasElement: HTMLElement,
  options: ExportOptions
): Promise<Blob> {
  // Dynamic import to avoid SSR issues
  const html2canvas = (await import("html2canvas")).default;

  const canvas = await html2canvas(canvasElement, {
    backgroundColor: options.boardBackground || "#ffffff",
    scale: 2, // Higher quality
    useCORS: true, // Allow cross-origin images
    logging: false,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create image blob"));
        }
      },
      options.format === "jpeg" ? "image/jpeg" : "image/png",
      options.quality || 0.95
    );
  });
}

/**
 * Export board as SVG
 * 
 * Manually constructs SVG from board elements and pen strokes.
 * 
 * Future: Enhanced SVG export
 * - Support all element types with proper rendering
 * - Include images as embedded base64
 * - Add text rendering with proper fonts
 * - Support gradients and complex styling
 */
export function exportBoardAsSVG(
  state: BoardExportState,
  options: ExportOptions
): string {
  const { elements, penStrokes, boardWidth, boardHeight, boardBackground } = state;

  // SVG header
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${boardWidth}" height="${boardHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <style>
      .board-background { fill: ${boardBackground || "#ffffff"}; }
      .element { stroke: #000; stroke-width: 1; }
      .sticky { fill: #ffeb3b; }
      .text { font-family: Arial, sans-serif; font-size: 14px; }
    </style>
  </defs>
  
  <!-- Board Background -->
  <rect class="board-background" width="${boardWidth}" height="${boardHeight}" />
`;

  // Add pen strokes
  penStrokes.forEach((stroke) => {
    if (stroke.points.length < 2) return;

    const pathData = stroke.points
      .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
      .join(" ");

    svg += `  <path d="${pathData}" stroke="${stroke.color}" stroke-width="${stroke.width}" fill="none" />\n`;
  });

  // Add elements
  elements.forEach((element) => {
    if (element.type === "sticky") {
      const text = (element as any).text || "";
      const color = (element as any).color || "#ffeb3b";
      
      svg += `  <rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" fill="${color}" stroke="#000" stroke-width="1" />\n`;
      svg += `  <text x="${element.x + 10}" y="${element.y + 20}" class="text">${escapeXml(text)}</text>\n`;
    } else if (element.type === "image") {
      const src = (element as any).src;
      if (src) {
        // Embed image as base64
        svg += `  <image x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" href="${src}" />\n`;
      } else {
        // Placeholder rectangle
        svg += `  <rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" fill="#e0e0e0" stroke="#000" stroke-width="1" />\n`;
        svg += `  <text x="${element.x + element.width / 2}" y="${element.y + element.height / 2}" text-anchor="middle" class="text">Image</text>\n`;
      }
    }
  });

  // Add comments if requested
  if (options.includeComments) {
    state.comments.forEach(({ elementId, comments }) => {
      const element = elements.find((el) => el.id === elementId);
      if (element && comments.length > 0) {
        const commentX = element.x + element.width;
        const commentY = element.y;
        svg += `  <circle cx="${commentX}" cy="${commentY}" r="8" fill="#ff5722" />\n`;
        svg += `  <text x="${commentX + 12}" y="${commentY + 5}" class="text" font-size="12">${comments.length}</text>\n`;
      }
    });
  }

  svg += `</svg>`;
  return svg;
}

/**
 * Export board as PDF
 * 
 * Uses jsPDF to create a PDF document from the board.
 * 
 * Future: Enhanced PDF export
 * - Multi-page support for large boards
 * - Custom page sizes and orientations
 * - Add metadata (title, author, creation date)
 * - Support vector graphics in PDF
 * - Add bookmarks/outline
 */
export async function exportBoardAsPDF(
  canvasElement: HTMLElement,
  state: BoardExportState,
  options: ExportOptions & { boardBackground?: string }
): Promise<Blob> {
  // Dynamic import to avoid SSR issues
  const { default: jsPDF } = await import("jspdf");
  const html2canvas = (await import("html2canvas")).default;

  // Render canvas to image first
  const canvas = await html2canvas(canvasElement, {
    backgroundColor: options.boardBackground || "#ffffff",
    scale: 2,
    useCORS: true,
    logging: false,
  });

  // Create PDF
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [canvas.width, canvas.height],
  });

  // Add image to PDF
  const imgData = canvas.toDataURL("image/png");
  pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);

  // Add metadata if requested
  if (options.includeMetadata) {
    pdf.setProperties({
      title: options.filename || "Board Export",
      subject: "PinSpace Board Export",
      author: "PinSpace",
      creator: "PinSpace",
    });
  }

  // Generate blob
  const pdfBlob = pdf.output("blob");
  return pdfBlob;
}

/**
 * Download file from blob
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textArea);
      return success;
    }
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
    return false;
  }
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generate shareable link (mock implementation)
 * 
 * Future: Backend integration
 * - Generate unique share codes via API
 * - Store share links in database
 * - Add expiration dates
 * - Add access permissions (view-only, edit, etc.)
 * - Add password protection
 * - Track share analytics
 */
export function generateShareLink(boardId: string): string {
  // Mock implementation - generates a shareable link
  // In production, this would call an API to generate a unique share code
  const shareCode = generateShareCode();
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  return `${baseUrl}/student-board/${boardId}?share=${shareCode}`;
}

/**
 * Generate share code (mock)
 * 
 * Future: Backend integration
 * - Generate unique codes via API
 * - Check for collisions
 * - Store in database with metadata
 */
function generateShareCode(): string {
  // Generate a short, shareable code
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing characters
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Validate share code (mock)
 * 
 * Future: Backend validation
 * - Check code exists in database
 * - Verify expiration
 * - Check permissions
 */
export function validateShareCode(boardId: string, shareCode: string): boolean {
  // Mock validation - always returns true for now
  // Future: Call API to validate share code
  return shareCode.length === 6;
}

