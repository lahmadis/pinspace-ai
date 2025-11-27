"use client";

import React, { useRef, useState } from "react";
import ShapesPopover from "./ShapesPopover";
// Tool state is passed via props

export type ToolType =
  | "select"
  | "hand"
  | "text"
  | "sticky"
  | "shape"
  | "rect"
  | "circle"
  | "triangle"
  | "diamond"
  | "arrow"
  | "bubble"
  | "star"
  | "image"
  | "marquee"
  | "pen"
  | "eraser"
  | "pin"; // REFACTORED: Added "pin" back to ToolType union - used in BoardCanvas.tsx line 997 for pin comment functionality

interface CanvasToolbarProps {
  activeTool?: ToolType; // Optional - will use context if not provided
  onToolChange?: (tool: ToolType) => void; // Optional - will use context if not provided
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  snap: boolean;
  onSnapToggle: () => void;
  onInsertImage?: (dataUrl: string) => void;
  onFileUpload?: (files: FileList) => void; // For multiple files
  minimal?: boolean; // If true, show minimal toolbar (deprecated - Pin tool removed)
  isDemo?: boolean; // If true, disable creation tools
  // Pen tool configuration
  penColor?: string;
  setPenColor?: (color: string) => void;
  penWidth?: number;
  setPenWidth?: (width: number) => void;
  eraserSize?: number;
  setEraserSize?: (size: number) => void;
}

export default function CanvasToolbar({
  activeTool: propActiveTool,
  onToolChange: propOnToolChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  snap,
  onSnapToggle,
  onInsertImage,
  onFileUpload,
  minimal = false,
  isDemo = false,
  penColor = "#000000",
  setPenColor,
  penWidth = 3,
  setPenWidth,
  eraserSize = 20,
  setEraserSize,
}: CanvasToolbarProps) {
  // Use props for tool state (fallback to select if not provided)
  const activeTool = propActiveTool ?? "select";
  const onToolChange = propOnToolChange ?? (() => {});

  // Unified file input ref for attachments (images and PDFs)
  const attachmentsInputRef = React.useRef<HTMLInputElement>(null);
  const [showShapesPopover, setShowShapesPopover] = useState(false);
  const shapesButtonRef = React.useRef<HTMLButtonElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  
  // Pen popover state and refs
  const [showPenPopover, setShowPenPopover] = useState(false);
  const penButtonRef = React.useRef<HTMLButtonElement>(null);
  const penPopoverRef = React.useRef<HTMLDivElement>(null);
  
  // Eraser popover state and refs
  const [showEraserPopover, setShowEraserPopover] = useState(false);
  const eraserButtonRef = React.useRef<HTMLButtonElement>(null);
  const eraserPopoverRef = React.useRef<HTMLDivElement>(null);
  
  // Check if any shape tool is active
  const isShapeToolActive = ["rect", "circle", "triangle", "diamond", "arrow", "bubble", "star"].includes(activeTool);
  
  // Close popover when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showShapesPopover &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        shapesButtonRef.current &&
        !shapesButtonRef.current.contains(event.target as Node)
      ) {
        setShowShapesPopover(false);
      }
    };

    if (showShapesPopover) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showShapesPopover]);

  // UPDATED: Show pen popover automatically when pen tool is active (like Miro)
  React.useEffect(() => {
    if (activeTool === "pen" && setPenColor && setPenWidth) {
      setShowPenPopover(true);
    } else {
      setShowPenPopover(false);
    }
  }, [activeTool, setPenColor, setPenWidth]);

  // Close Pen popover when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showPenPopover &&
        penPopoverRef.current &&
        !penPopoverRef.current.contains(event.target as Node) &&
        penButtonRef.current &&
        !penButtonRef.current.contains(event.target as Node)
      ) {
        // Only close if pen tool is still active (otherwise it's handled by the effect above)
        if (activeTool !== "pen") {
          setShowPenPopover(false);
        }
      }
    };

    if (showPenPopover) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPenPopover, activeTool]);

  // Show Pen popover when Pen tool is activated
  React.useEffect(() => {
    if (activeTool === "pen" && !isDemo) {
      setShowPenPopover(true);
    } else {
      setShowPenPopover(false);
    }
  }, [activeTool, isDemo]);

  // Close Eraser popover when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showEraserPopover &&
        eraserPopoverRef.current &&
        !eraserPopoverRef.current.contains(event.target as Node) &&
        eraserButtonRef.current &&
        !eraserButtonRef.current.contains(event.target as Node)
      ) {
        setShowEraserPopover(false);
      }
    };

    if (showEraserPopover) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEraserPopover]);

  // Show Eraser popover when Eraser tool is activated
  React.useEffect(() => {
    if (activeTool === "eraser" && !isDemo) {
      setShowEraserPopover(true);
    } else {
      setShowEraserPopover(false);
    }
  }, [activeTool, isDemo]);

  /**
   * Handle Attachments button click
   * Opens file picker that accepts both images and PDFs
   * 
   * UX Flow:
   * 1. User clicks "Attachments" button
   * 2. File picker opens with filters for images (PNG, JPEG, GIF, WebP) and PDFs
   * 3. User can select one or multiple files (depending on browser support)
   * 4. Selected files are processed by handleAttachmentsUpload
   */
  const handleAttachmentsButtonClick = () => {
    attachmentsInputRef.current?.click();
  };

  /**
   * Handle attachments upload (images and PDFs)
   * 
   * Unified upload handler that processes both image and PDF files
   * 
   * Workflow:
   * 1. User selects files (images or PDFs or both)
   * 2. If onFileUpload callback is provided:
   *    - Pass all files to the callback (supports multiple files)
   *    - Board page handles file processing (PDF extraction, image display, etc.)
   * 3. If onFileUpload is not provided but onInsertImage is:
   *    - Fall back to single image handling (backward compatibility)
   *    - Only processes first file if it's an image
   * 
   * File Type Detection:
   * - Images: type starts with "image/" (PNG, JPEG, GIF, WebP)
   * - PDFs: type === "application/pdf"
   * 
   * Error Handling:
   * - Invalid file types show alert and reset input
   * - File read errors show alert
   */
  const handleAttachmentsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      e.target.value = "";
      return;
    }

    // If onFileUpload is provided, use unified file upload handler
    // This supports multiple files and handles both images and PDFs
    if (onFileUpload) {
      // Board page will handle file type detection and processing
      // - PDFs: Extract pages, create thumbnails, open PDF viewer
      // - Images: Create image elements on canvas
      onFileUpload(files);
      e.target.value = "";
      onToolChange("select");
      return;
    }

    // Fallback: Single image handling (backward compatibility)
    // Only processes first file if it's an image
    const file = files[0];
    if (!file || !onInsertImage) {
      e.target.value = "";
      return;
    }

    // Validate file type
    const isImage = file.type.startsWith("image/");
    const isPDF = file.type === "application/pdf";

    if (!isImage && !isPDF) {
      alert("Please select an image file (PNG, JPEG, GIF, WebP) or PDF");
      e.target.value = "";
      return;
    }

    // Only handle images in fallback mode (PDFs require onFileUpload)
    if (!isImage) {
      alert("PDF upload requires file upload handler. Please use the full upload functionality.");
      e.target.value = "";
      return;
    }

    // Read image file as data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onInsertImage(dataUrl);
        onToolChange("select");
      }
    };
    reader.onerror = () => {
      alert("Failed to read image file");
    };
    reader.readAsDataURL(file);

    e.target.value = "";
  };

  // Tool configuration with shortcuts
  const toolConfig = {
    select: { label: "Select", shortcut: "V", icon: "↖" },
    hand: { label: "Hand", shortcut: "Space", icon: "✋" },
    sticky: { label: "Sticky", shortcut: "N", icon: "📝" },
    image: { label: "Image", shortcut: "I", icon: "🖼" },
    pen: { label: "Pen", shortcut: "P", icon: "✏️" },
    eraser: { label: "Eraser", shortcut: "E", icon: "🧹" },
    pdf: { label: "PDF", shortcut: "F", icon: "📄" },
  };

  // Pen color options
  const penColors = [
    "#000000", // Black
    "#ef4444", // Red
    "#22c55e", // Green
    "#3b82f6", // Blue
    "#f59e0b", // Amber
    "#a855f7", // Purple
  ];

  // Pen width range (min, max, default)
  const PEN_WIDTH_MIN = 1;
  const PEN_WIDTH_MAX = 20;
  const PEN_WIDTH_DEFAULT = 3;

  // Eraser size range (min, max, default)
  const ERASER_SIZE_MIN = 5;
  const ERASER_SIZE_MAX = 100;
  const ERASER_SIZE_DEFAULT = 20;

  return (
    <div className="absolute left-4 top-4 z-[9999] bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex flex-col gap-2" data-ui-control="true">
      {/* Tools */}
      <div className="flex flex-col gap-1">
        <button
          onClick={() => onToolChange("select")}
          className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
            activeTool === "select"
              ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300"
              : "bg-gray-50 text-gray-700 hover:bg-gray-100"
          }`}
          title={`${toolConfig.select.label} (${toolConfig.select.shortcut})`}
        >
          <span className="flex items-center justify-between gap-2">
            <span>{toolConfig.select.label}</span>
            <span className="text-xs opacity-70">{toolConfig.select.shortcut}</span>
          </span>
        </button>
        <button
          onClick={() => onToolChange("hand")}
          className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
            activeTool === "hand"
              ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300"
              : "bg-gray-50 text-gray-700 hover:bg-gray-100"
          }`}
          title={`${toolConfig.hand.label} (${toolConfig.hand.shortcut})`}
        >
          <span className="flex items-center justify-between gap-2">
            <span>{toolConfig.hand.label}</span>
            <span className="text-xs opacity-70">{toolConfig.hand.shortcut}</span>
          </span>
        </button>
      </div>

      <div className="border-t border-gray-200 my-1"></div>

      {/* Creation Tools */}
      <div className="flex flex-col gap-1">
        <button
          onClick={() => onToolChange("sticky")}
          disabled={isDemo}
          className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
            activeTool === "sticky"
              ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300"
              : "bg-gray-50 text-gray-700 hover:bg-gray-100"
          } ${isDemo ? "opacity-50 cursor-not-allowed" : ""}`}
          title={`${toolConfig.sticky.label} (${toolConfig.sticky.shortcut})`}
        >
          <span className="flex items-center justify-between gap-2">
            <span>{toolConfig.sticky.label}</span>
            <span className="text-xs opacity-70">{toolConfig.sticky.shortcut}</span>
          </span>
        </button>
        <div className="relative">
          <button
            ref={shapesButtonRef}
            onClick={() => {
              if (!isDemo) setShowShapesPopover((prev) => !prev);
            }}
            disabled={isDemo}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
              isShapeToolActive
                ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100"
            } ${isDemo ? "opacity-50 cursor-not-allowed" : ""}`}
            title="Shapes"
          >
            Shapes
          </button>
          {showShapesPopover && !isDemo && (
            <div ref={popoverRef} className="absolute left-full top-0 ml-2">
              <ShapesPopover
                onSelectShape={(shapeTool) => {
                  onToolChange(shapeTool);
                  setShowShapesPopover(false);
                }}
                onClose={() => setShowShapesPopover(false)}
              />
            </div>
          )}
        </div>
        {/* Pin tool button removed - no longer available in toolbar UI */}
        {/* 
          Previously allowed users to pin comments/notes to the canvas.
          Removed to simplify toolbar interface.
          If Pin functionality is needed in the future, consider adding it
          as a feature within the Comments/Panels system rather than a tool.
        */}
        {/* Attachments button - unified upload for images and PDFs */}
        <button
          onClick={handleAttachmentsButtonClick}
          disabled={isDemo || (!onFileUpload && !onInsertImage)}
          className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
            activeTool === "image"
              ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300"
              : "bg-gray-50 text-gray-700 hover:bg-gray-100"
          } ${isDemo || (!onFileUpload && !onInsertImage) ? "opacity-50 cursor-not-allowed" : ""}`}
          title="Attachments - Upload images (PNG, JPEG, GIF, WebP) or PDFs"
        >
          <span className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span>📎</span>
              <span>Attachments</span>
            </span>
          </span>
          {/* Unified file input for both images and PDFs */}
          <input
            ref={attachmentsInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,application/pdf"
            onChange={handleAttachmentsUpload}
            className="hidden"
            disabled={isDemo || (!onFileUpload && !onInsertImage)}
            multiple
          />
        </button>
        {/* Pen button with popover - positioned to the right */}
        <div className="relative">
          <button
            ref={penButtonRef}
            onClick={() => {
              // Toggle pen tool - popover will show automatically when pen is active (via useEffect)
              onToolChange(activeTool === "pen" ? "select" : "pen");
            }}
            disabled={isDemo}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
              activeTool === "pen"
                ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100"
            } ${isDemo ? "opacity-50 cursor-not-allowed" : ""}`}
            title={`${toolConfig.pen.label} (${toolConfig.pen.shortcut})`}
          >
            <span className="flex items-center justify-between gap-2">
              <span>{toolConfig.pen.label}</span>
              <span className="text-xs opacity-70">{toolConfig.pen.shortcut}</span>
            </span>
          </button>
          {/* Pen options popover - appears to the right of the button */}
          {showPenPopover && !isDemo && setPenColor && setPenWidth && (
            <div
              ref={penPopoverRef}
              className="absolute left-full top-0 ml-2 z-[10000] bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[200px]"
              style={{
                // Positioning: 100% to the right of button + spacing
                // Aligned vertically with button (top: 0)
                // High z-index to appear above other elements
              }}
            >
              {/* Pen Color Picker */}
              <div className="mb-3">
                <div className="text-xs font-medium text-gray-700 mb-2">Pen Color</div>
                <div className="flex gap-2 flex-wrap">
                  {penColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setPenColor(color)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        penColor === color
                          ? "border-blue-600 ring-2 ring-blue-300 scale-110"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
              
              {/* Pen Width Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-700">Pen Width</span>
                  <span className="text-xs font-semibold text-blue-600">{penWidth}px</span>
                </div>
                <input
                  type="range"
                  min={PEN_WIDTH_MIN}
                  max={PEN_WIDTH_MAX}
                  value={penWidth}
                  onChange={(e) => setPenWidth(Number(e.target.value))}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerMove={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  data-ui-control="true"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((penWidth - PEN_WIDTH_MIN) / (PEN_WIDTH_MAX - PEN_WIDTH_MIN)) * 100}%, #e5e7eb ${((penWidth - PEN_WIDTH_MIN) / (PEN_WIDTH_MAX - PEN_WIDTH_MIN)) * 100}%, #e5e7eb 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{PEN_WIDTH_MIN}px</span>
                  <span>{PEN_WIDTH_MAX}px</span>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Eraser button with popover - positioned to the right */}
        <div className="relative">
          <button
            ref={eraserButtonRef}
            onClick={() => onToolChange(activeTool === "eraser" ? "select" : "eraser")}
            disabled={isDemo}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
              activeTool === "eraser"
                ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100"
            } ${isDemo ? "opacity-50 cursor-not-allowed" : ""}`}
            title={`${toolConfig.eraser.label} (${toolConfig.eraser.shortcut})`}
          >
            <span className="flex items-center justify-between gap-2">
              <span>{toolConfig.eraser.label}</span>
              <span className="text-xs opacity-70">{toolConfig.eraser.shortcut}</span>
            </span>
          </button>
          {/* Eraser options popover - appears to the right of the button */}
          {showEraserPopover && !isDemo && setEraserSize && (
            <div
              ref={eraserPopoverRef}
              className="absolute left-full top-0 ml-2 z-[10000] bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[200px]"
              style={{
                // Positioning: 100% to the right of button + spacing
                // Aligned vertically with button (top: 0)
                // High z-index to appear above other elements
              }}
            >
              {/* Eraser Size Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-700">Eraser Size</span>
                  <span className="text-xs font-semibold text-blue-600">{eraserSize}px</span>
                </div>
                <input
                  type="range"
                  min={ERASER_SIZE_MIN}
                  max={ERASER_SIZE_MAX}
                  value={eraserSize}
                  onChange={(e) => setEraserSize(Number(e.target.value))}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerMove={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  data-ui-control="true"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((eraserSize - ERASER_SIZE_MIN) / (ERASER_SIZE_MAX - ERASER_SIZE_MIN)) * 100}%, #e5e7eb ${((eraserSize - ERASER_SIZE_MIN) / (ERASER_SIZE_MAX - ERASER_SIZE_MIN)) * 100}%, #e5e7eb 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{ERASER_SIZE_MIN}px</span>
                  <span>{ERASER_SIZE_MAX}px</span>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* PDF button removed - now handled by unified Attachments button above */}
      </div>

      {/* Pen tool options removed - now shown in popover to the right of button */}

      {/* Eraser tool options removed - now shown in popover to the right of button */}

      <div className="border-t border-gray-200 my-1"></div>

      {/* Zoom Controls */}
      <div className="flex flex-col gap-1">
        <button
          onClick={onZoomOut}
          className="px-3 py-2 text-sm font-medium rounded-md bg-gray-50 text-gray-700 hover:bg-gray-100 transition"
          title="Zoom Out (-)"
        >
          −
        </button>
        <div className="px-3 py-1 text-xs text-center text-gray-600">
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={onZoomIn}
          className="px-3 py-2 text-sm font-medium rounded-md bg-gray-50 text-gray-700 hover:bg-gray-100 transition"
          title="Zoom In (+)"
        >
          +
        </button>
        <button
          onClick={onZoomReset}
          className="px-3 py-2 text-xs font-medium rounded-md bg-gray-50 text-gray-700 hover:bg-gray-100 transition"
          title="Reset Zoom (0)"
        >
          Reset
        </button>
      </div>

      <div className="border-t border-gray-200 my-1"></div>

      {/* Snap Toggle */}
      <button
        onClick={onSnapToggle}
        className={`px-3 py-2 text-sm font-medium rounded-md transition ${
          snap
            ? "bg-green-100 text-green-700"
            : "bg-gray-50 text-gray-700 hover:bg-gray-100"
        }`}
        title="Snap to Grid"
      >
        Snap
      </button>
    </div>
  );
}

