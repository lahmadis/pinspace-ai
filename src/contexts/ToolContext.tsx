"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import type { ToolType } from "@/components/CanvasToolbar";

interface ToolContextValue {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  // Helper to check if a tool is active
  isToolActive: (tool: ToolType) => boolean;
  // Get cursor style for current tool
  getCursorStyle: () => string;
}

const ToolContext = createContext<ToolContextValue | undefined>(undefined);

interface ToolProviderProps {
  children: React.ReactNode;
  initialTool?: ToolType;
}

/**
 * Unified tool state provider
 * Manages active tool state and provides it to all child components
 */
export function ToolProvider({ children, initialTool = "select" }: ToolProviderProps) {
  const [activeTool, setActiveToolState] = useState<ToolType>(initialTool);
  const activeToolRef = useRef<ToolType>(initialTool);

  // Keep ref in sync with state for use in event handlers
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  // Set active tool with immediate state update
  const setActiveTool = useCallback((tool: ToolType) => {
    setActiveToolState(tool);
    activeToolRef.current = tool;
  }, []);

  // Check if a specific tool is active
  const isToolActive = useCallback(
    (tool: ToolType) => {
      return activeTool === tool;
    },
    [activeTool]
  );

  // Get cursor style based on active tool
  const getCursorStyle = useCallback(() => {
    switch (activeTool) {
      case "select":
        return "default"; // Arrow cursor
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

  // Keyboard shortcuts for tool switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with typing in inputs
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

      // Tool switching shortcuts
      if (key === "v") {
        e.preventDefault();
        setActiveTool(activeToolRef.current === "select" ? "select" : "select");
        return;
      }
      if (code === "Space" && !e.ctrlKey && !e.metaKey) {
        // Space for hand tool (pan) - only if not typing
        if (activeToolRef.current !== "hand") {
          e.preventDefault();
          setActiveTool("hand");
        }
        return;
      }
      if (key === "n") {
        e.preventDefault();
        setActiveTool(activeToolRef.current === "sticky" ? "select" : "sticky");
        return;
      }
      // Pen and eraser shortcuts are handled by the page component
      // (they need access to pen tool state)
      if (key === "i") {
        e.preventDefault();
        setActiveTool(activeToolRef.current === "image" ? "select" : "image");
        // Trigger file input if available
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        fileInput?.click();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setActiveTool]);

  const value: ToolContextValue = {
    activeTool,
    setActiveTool,
    isToolActive,
    getCursorStyle,
  };

  return <ToolContext.Provider value={value}>{children}</ToolContext.Provider>;
}

/**
 * Hook to access tool context
 * Throws error if used outside ToolProvider
 */
export function useTool(): ToolContextValue {
  const context = useContext(ToolContext);
  if (context === undefined) {
    throw new Error("useTool must be used within a ToolProvider");
  }
  return context;
}

/**
 * Hook to access tool context (optional - returns undefined if not in provider)
 * Use this if you want to use tool state optionally
 */
export function useToolOptional(): ToolContextValue | undefined {
  return useContext(ToolContext);
}


