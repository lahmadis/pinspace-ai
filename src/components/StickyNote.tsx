"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

export interface StickyNoteProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  isSelected?: boolean;
  isReadOnly?: boolean;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onTextChange?: (id: string, newText: string) => void;
  onCancelEdit?: (id: string) => void; // Called when editing is cancelled (Escape key)
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Shared StickyNote component with unified editing logic
 * Handles:
 * - Display of sticky note content
 * - Double-click to enter edit mode
 * - Inline text editing with save/cancel
 * - No duplication - single instance only
 */
export default function StickyNote({
  id,
  x,
  y,
  width,
  height,
  text = "",
  isSelected = false,
  isReadOnly = false,
  onDoubleClick,
  onMouseDown,
  onTextChange,
  onCancelEdit,
  className = "",
  style = {},
}: StickyNoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [previousText, setPreviousText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Normalize text: empty or placeholder becomes empty string
  const normalizedText = text?.trim() === "" || text?.trim() === "New text" ? "" : (text || "");
  const hasText = normalizedText.length > 0;

  // Start editing: save previous text and enter edit mode
  const startEditing = useCallback((e?: React.MouseEvent) => {
    if (isReadOnly) return;
    e?.stopPropagation();
    
    setPreviousText(normalizedText);
    setDraftText(normalizedText);
    setIsEditing(true);
  }, [isReadOnly, normalizedText]);

  // Save changes and exit edit mode
  const saveEdit = useCallback(() => {
    const finalText = draftText.trim();
    onTextChange?.(id, finalText);
    setIsEditing(false);
    setDraftText("");
  }, [id, draftText, onTextChange]);

  // Cancel editing: restore previous text and exit edit mode
  const cancelEdit = useCallback(() => {
    setDraftText("");
    setIsEditing(false);
    // Notify parent that editing was cancelled
    onCancelEdit?.(id);
    // Don't restore text - let parent handle it if needed
    // Note: onTextChange is not called on cancel, so parent state remains unchanged
  }, [id, onCancelEdit]);

  // Handle double-click to start editing
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (isReadOnly) return;
    startEditing(e);
    onDoubleClick?.(e);
  }, [isReadOnly, startEditing, onDoubleClick]);

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      // Small delay to ensure DOM is ready
      const timeout = setTimeout(() => {
        textarea.focus();
        // Place cursor at end
        textarea.selectionStart = textarea.value.length;
        textarea.selectionEnd = textarea.value.length;
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [isEditing]);

  // Click-out handler: save when clicking outside editor
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e: MouseEvent | PointerEvent) => {
      const target = e.target as Node;
      if (textareaRef.current && !textareaRef.current.contains(target)) {
        // Save on click-out
        saveEdit();
      }
    };

    // Use capture phase to intercept before other handlers
    document.addEventListener("pointerdown", handleClickOutside, true);
    document.addEventListener("mousedown", handleClickOutside, true);

    return () => {
      document.removeEventListener("pointerdown", handleClickOutside, true);
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [isEditing, saveEdit]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  const commonStyle: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    width,
    height,
    ...style,
  };

  return (
    <div
      style={commonStyle}
      className={`pointer-events-auto bg-yellow-200 rounded-md shadow p-2 text-sm leading-snug cursor-text ${className}`}
      onDoubleClick={handleDoubleClick}
      onMouseDown={onMouseDown}
    >
      {/* Display layer: only show when NOT editing */}
      {!isEditing && (
        <div className="h-full w-full whitespace-pre-wrap">
          {hasText ? (
            <div className="whitespace-pre-wrap">{normalizedText}</div>
          ) : (
            <div className="opacity-60 italic select-none">New text</div>
          )}
        </div>
      )}

      {/* Selection ring */}
      {isSelected && (
        <div className="absolute inset-0 ring-4 ring-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.4)] pointer-events-none animate-pulse" />
      )}

      {/* Editor overlay: only when editing (covers whole sticky) */}
      {isEditing && (
        <textarea
          ref={textareaRef}
          className="absolute inset-0 w-full h-full bg-transparent outline-none resize-none p-2"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={saveEdit}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="New text"
        />
      )}
    </div>
  );
}

