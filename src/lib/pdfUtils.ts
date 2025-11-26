// PDF utilities for extracting and rendering PDF pages
"use client";

export interface PDFPageImage {
  pageNumber: number;
  width: number;
  height: number;
  dataUrl: string; // Base64 data URL
}

// Configure PDF.js worker to use local worker file
// This must be set before any PDF operations
// The worker file should be in /public/pdf.worker.min.js and accessible at /pdf.worker.min.js
if (typeof window !== "undefined") {
  // Initialize worker configuration when module loads (similar to react-pdf pattern)
  // This ensures the worker is configured before any PDF operations
  import("pdfjs-dist/build/pdf.mjs").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  }).catch(() => {
    // Worker config will be set in getPdfjsLib if this fails
  });
}

// Lazy load pdfjs-dist only in the browser
let pdfjsLib: any = null;

async function getPdfjsLib() {
  if (typeof window === "undefined") {
    throw new Error("PDF utilities can only be used in the browser");
  }

  if (!pdfjsLib) {
    // Dynamic import of pdfjs-dist
    pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");
    
    // Configure worker path - use local worker file
    // This is set here as a fallback/ensure it's configured
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  }

  return pdfjsLib;
}

/**
 * Extracts all pages from a PDF file and converts them to images
 * @param file - PDF File object
 * @param scale - Scale factor for rendering (default: 2.0 for better quality)
 * @param onProgress - Optional callback for progress updates (pageNumber, totalPages)
 * @returns Promise resolving to array of page images
 */
export async function extractPDFPages(
  file: File,
  scale: number = 2.0,
  onProgress?: (pageNumber: number, totalPages: number) => void
): Promise<PDFPageImage[]> {
  if (typeof window === "undefined") {
    throw new Error("extractPDFPages can only be used in the browser");
  }

  try {
    const pdfjs = await getPdfjsLib();
    
    // Load PDF document
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const pages: PDFPageImage[] = [];

    // Extract each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      // Create canvas for this page
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Failed to get canvas context");
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render page to canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL("image/png");
      
      pages.push({
        pageNumber: pageNum,
        width: viewport.width,
        height: viewport.height,
        dataUrl,
      });

      // Report progress
      if (onProgress) {
        onProgress(pageNum, numPages);
      }
    }

    return pages;
  } catch (error) {
    console.error("[pdfUtils] Error extracting PDF pages:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("worker") || error.message.includes("Worker")) {
        throw new Error("PDF worker failed to load. Please refresh the page and try again.");
      }
      if (error.message.includes("CMap") || error.message.includes("font")) {
        throw new Error("PDF font/CMap loading failed. The PDF may use unsupported fonts.");
      }
      if (error.message.includes("canvas") || error.message.includes("Canvas")) {
        throw new Error("Canvas API not available. This function must run in a browser environment.");
      }
    }
    
    throw error;
  }
}

/**
 * Get PDF metadata (page count, etc.) without rendering
 */
export async function getPDFMetadata(file: File): Promise<{ pageCount: number }> {
  if (typeof window === "undefined") {
    throw new Error("getPDFMetadata can only be used in the browser");
  }

  try {
    const pdfjs = await getPdfjsLib();
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    return {
      pageCount: pdf.numPages,
    };
  } catch (error) {
    console.error("[pdfUtils] Error getting PDF metadata:", error);
    throw error;
  }
}

