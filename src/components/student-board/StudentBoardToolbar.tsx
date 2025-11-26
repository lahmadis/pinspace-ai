"use client";

import React, { useEffect, useRef } from "react";
import { useUser } from "@/contexts/UserContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useKeyboardNavigation, useFocusManagement } from "@/hooks/useKeyboardNavigation";

/**
 * Student Board Toolbar Component
 * 
 * Displays available tools for the board workspace.
 * 
 * Current Features:
 * - ✅ Interactive tool buttons (click to switch tools)
 * - ✅ Active tool highlighting (visual feedback with blue background)
 * - ✅ Tool change handlers (onToolChange callback)
 * 
 * Tool Modes:
 * - Select: Selection and drag mode (default)
 * - Sticky: Creation mode - click canvas to create sticky notes
 * - Image: Creation mode - click canvas to create image placeholders
 * - PDF: Creation mode - click canvas to create PDF placeholders
 * - Pen, Eraser: Future tools (not yet implemented)
 * 
 * Action Buttons:
 * - Delete: Action button - deletes selected element (disabled when no selection)
 * 
 * Next Steps:
 * - Add tooltips for each tool
 * - Add keyboard shortcuts for tool switching
 * - Add tool groups/categories
 * - Add disabled states for certain tools
 * - Add tool-specific cursors and UI hints
 */

interface StudentBoardToolbarProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  onDelete?: () => void;
  hasSelection?: boolean;
  selectionCount?: number;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onSave?: () => void;
  onReset?: () => void;
  onLockBoard?: () => void;
  isBoardLocked?: boolean;
  onOpenTimeline?: () => void;
  onOpenExport?: () => void;
  onOpenSections?: () => void;
}

/**
 * StudentBoardToolbar - Toolbar component for selecting board tools
 * 
 * Export: Default export (use: import StudentBoardToolbar from "...")
 * Import: Default import matches default export
 */
export default function StudentBoardToolbar({
  activeTool,
  onToolChange,
  onDelete,
  hasSelection = false,
  selectionCount = 0,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onSave,
  onReset,
  onLockBoard,
  isBoardLocked,
  onOpenTimeline,
  onOpenExport,
  onOpenSections,
}: StudentBoardToolbarProps): JSX.Element {
  const { hasPermission, canModerate } = useUser();
  const { theme, setTheme } = useTheme();
  const { announce } = useFocusManagement();
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts for tools
  useKeyboardNavigation({
    shortcuts: {
      "mod+1": () => onToolChange("select"),
      "mod+2": () => onToolChange("sticky"),
      "mod+3": () => onToolChange("image"),
      "mod+4": () => onToolChange("pdf"),
      "mod+5": () => onToolChange("pen"),
      "mod+6": () => onToolChange("eraser"),
      "mod+d": () => hasSelection && onDelete?.(),
      "mod+s": () => onSave?.(),
    },
    enabled: true,
  });

  // Announce tool changes to screen readers
  useEffect(() => {
    announce(`Tool changed to ${activeTool}`);
  }, [activeTool, announce]);

  // Filter tools based on user permissions
  const allTools = [
    { id: "select", label: "Select", icon: "↖", permission: "view" },
    { id: "sticky", label: "Sticky", icon: "📝", permission: "create" },
    { id: "image", label: "Image", icon: "🖼️", permission: "create" },
    { id: "pdf", label: "PDF", icon: "📄", permission: "create" },
    { id: "pen", label: "Pen", icon: "✏️", permission: "annotate" },
    { id: "eraser", label: "Eraser", icon: "🧹", permission: "annotate" },
    // Annotation tools
    { id: "rectangle", label: "Rectangle", icon: "▭", permission: "annotate" },
    { id: "ellipse", label: "Ellipse", icon: "○", permission: "annotate" },
    { id: "arrow", label: "Arrow", icon: "→", permission: "annotate" },
    { id: "textbox", label: "Text Box", icon: "📝", permission: "annotate" },
    { id: "highlight", label: "Highlight", icon: "🖍️", permission: "annotate" },
    { id: "critique", label: "Critique", icon: "💬", permission: "annotate" },
    { id: "delete", label: "Delete", icon: "🗑️", isAction: true, permission: "delete" },
  ];

  const tools = allTools.filter((tool) => {
    if (tool.permission) {
      return hasPermission(tool.permission);
    }
    return true;
  });

  /**
   * Get keyboard shortcut for tool
   */
  const getToolShortcut = (toolId: string): string => {
    const shortcuts: Record<string, string> = {
      select: "Ctrl+1 / Cmd+1",
      sticky: "Ctrl+2 / Cmd+2",
      image: "Ctrl+3 / Cmd+3",
      pdf: "Ctrl+4 / Cmd+4",
      pen: "Ctrl+5 / Cmd+5",
      eraser: "Ctrl+6 / Cmd+6",
    };
    return shortcuts[toolId] || "";
  };

  /**
   * Handle delete button click
   * 
   * When delete button is clicked, trigger deletion of selected element.
   * Delete button is an action button (not a tool mode) - it performs an action immediately.
   * 
   * Future: Confirmation dialog
   * - Show confirmation modal before deletion
   * - Allow user to cancel deletion
   * - Add option to skip confirmation for trusted actions
   */
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (hasSelection && onDelete) {
      onDelete();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 shadow-sm">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Undo/Redo Buttons */}
        <div className="flex items-center gap-2 mr-4 border-r border-gray-300 dark:border-gray-600 pr-4">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`
              px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
              flex items-center gap-2
              ${
                canUndo
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
              }
            `}
            aria-label="Undo (Ctrl+Z or Cmd+Z)"
            title={canUndo ? "Undo last action (Ctrl+Z or Cmd+Z)" : "Nothing to undo"}
            type="button"
          >
            <span className="text-lg" aria-hidden="true">↶</span>
            <span>Undo</span>
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`
              px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
              flex items-center gap-2
              ${
                canRedo
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
              }
            `}
            aria-label="Redo (Ctrl+Y or Cmd+Shift+Z)"
            title={canRedo ? "Redo last undone action (Ctrl+Y or Cmd+Shift+Z)" : "Nothing to redo"}
            type="button"
          >
            <span className="text-lg" aria-hidden="true">↷</span>
            <span>Redo</span>
          </button>
        </div>

        {/* Save and Reset buttons */}
        <div className="flex items-center gap-2 mr-4 border-r border-gray-300 dark:border-gray-600 pr-4">
          <button
            onClick={onSave}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-700 shadow-md hover:shadow-lg"
            aria-label="Save board"
            title="Save board state (Ctrl+S)"
            type="button"
          >
            <span className="text-lg" aria-hidden="true">💾</span>
            <span>Save</span>
          </button>
          <button
            onClick={onReset}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 bg-orange-600 text-white hover:bg-orange-700 dark:hover:bg-orange-700 shadow-md hover:shadow-lg"
            aria-label="Reset board"
            title="Reset board to initial state"
            type="button"
          >
            <span className="text-lg" aria-hidden="true">🔄</span>
            <span>Reset</span>
          </button>
        </div>

        {/* Timeline Button */}
        {onOpenTimeline && (
          <button
            onClick={onOpenTimeline}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 dark:hover:bg-indigo-700 shadow-md hover:shadow-lg"
            aria-label="Open activity timeline"
            title="View activity timeline and time travel"
            type="button"
          >
            <span className="text-lg" aria-hidden="true">📜</span>
            <span>Timeline</span>
          </button>
        )}

        {/* Export Button */}
        {onOpenExport && (
          <button
            onClick={onOpenExport}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 bg-purple-600 text-white hover:bg-purple-700 dark:hover:bg-purple-700 shadow-md hover:shadow-lg"
            aria-label="Export board"
            title="Export board as image or PDF, or share"
            type="button"
          >
            <span className="text-lg" aria-hidden="true">📤</span>
            <span>Export</span>
          </button>
        )}

        {/* Sections Button */}
        {onOpenSections && (
          <button
            onClick={onOpenSections}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 bg-teal-600 text-white hover:bg-teal-700 dark:hover:bg-teal-700 shadow-md hover:shadow-lg"
            aria-label="Manage sections"
            title="Create and manage board sections"
            type="button"
          >
            <span className="text-lg" aria-hidden="true">📋</span>
            <span>Sections</span>
          </button>
        )}

        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 mr-2">
          Tools:
        </span>
        {tools.map((tool) => {
          // Delete button is an action button (not a tool mode)
          if (tool.id === "delete") {
            return (
              <button
                key={tool.id}
                onClick={handleDeleteClick}
                disabled={!hasSelection}
                className={`
                  px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  flex items-center gap-2 min-w-[100px] justify-center
                  ${
                    hasSelection
                      ? "bg-red-600 text-white shadow-md hover:bg-red-700 dark:hover:bg-red-700 hover:shadow-lg"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
                  }
                `}
                aria-label={hasSelection ? `Delete ${selectionCount} selected element${selectionCount > 1 ? 's' : ''}` : "No element selected"}
                title={hasSelection ? `Delete ${selectionCount} selected element${selectionCount > 1 ? 's' : ''} (or press Delete/Backspace)` : "No element selected"}
                type="button"
              >
                <span className="text-lg" aria-hidden="true">
                  {tool.icon}
                </span>
                <span>{tool.label}</span>
              </button>
            );
          }

          // Regular tool buttons (Select, Sticky, Image, etc.)
          return (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={`
                px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                flex items-center gap-2 min-w-[100px] justify-center
                ${
                  activeTool === tool.id
                    ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300 dark:ring-blue-500"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-sm border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                }
              `}
              aria-label={`Select ${tool.label} tool`}
              aria-pressed={activeTool === tool.id}
              type="button"
            >
              <span className="text-lg" aria-hidden="true">
                {tool.icon}
              </span>
              <span>{tool.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

