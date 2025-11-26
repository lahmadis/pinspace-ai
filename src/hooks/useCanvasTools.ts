"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ToolType } from "@/components/CanvasToolbar";

export interface UseCanvasToolsOptions {
  initialTool?: ToolType;
  onToolChange?: (tool: ToolType) => void;
}

export interface UseCanvasToolsReturn {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  getCursor: () => string;
  isToolActive: (tool: ToolType) => boolean;
}

/**
 * Unified tool state management hook
 * Handles tool switching, cursor updates, and keyboard shortcuts
 */
export function useCanvasTools({
  initialTool = "select",
  onToolChange,
}: UseCanvasToolsOptions = {}): UseCanvasToolsReturn {
  const [activeTool, setActiveToolState] = useState<ToolType>(initialTool);
  const activeToolRef = useRef<ToolType>(initialTool);

  // Keep ref in sync
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  // Set tool with immediate update
  const setActiveTool = useCallback(
    (tool: ToolType) => {
      setActiveToolState(tool);
      activeToolRef.current = tool;
      onToolChange?.(tool);
    },
    [onToolChange]
  );

  // Get cursor style for current tool
  const getCursor = useCallback(() => {
    switch (activeTool) {
      case "select":
        return "default";
      case "hand":
        return "grab";
      case "sticky":
      case "text":
        return "crosshair";
      case "image":
        return "crosshair";
      case "rect":
      case "circle":
      case "triangle":
      case "diamond":
      case "arrow":
      case "bubble":
      case "star":
      case "shape":
        return "crosshair";
      default:
        return "default";
    }
  }, [activeTool]);

  // Check if tool is active
  const isToolActive = useCallback(
    (tool: ToolType) => {
      return activeTool === tool;
    },
    [activeTool]
  );

  // Keyboard shortcuts for tool switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with typing
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const code = e.code;

      // Tool shortcuts (always work, never get stuck)
      if (key === "v") {
        e.preventDefault();
        setActiveTool("select");
        return;
      }
      if (code === "Space" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveTool("hand");
        return;
      }
      if (key === "n") {
        e.preventDefault();
        setActiveTool("sticky");
        return;
      }
      // Pen and eraser shortcuts are handled by the page component
      // (they need access to pen tool state)
      if (key === "i") {
        e.preventDefault();
        setActiveTool(activeTool === "image" ? "select" : "image");
        // Trigger file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        fileInput?.click();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTool, setActiveTool]);

  return {
    activeTool,
    setActiveTool,
    getCursor,
    isToolActive,
  };
}


