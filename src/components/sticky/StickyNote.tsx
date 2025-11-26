'use client';

import React, { useEffect, useRef, useState } from 'react';

export type StickyNoteData = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
};

type StickyNoteProps = {
  note: StickyNoteData;
  isSelected: boolean;
  // Called whenever text changes (on blur or Enter)
  onChangeText: (id: string, text: string) => void;
  // Select this note (pass null to clear selection)
  onSelect: (id: string | null) => void;
};

export default function StickyNote({
  note,
  isSelected,
  onChangeText,
  onSelect,
}: StickyNoteProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.text ?? '');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Keep local draft aligned if external text updates
  useEffect(() => {
    if (!editing) setDraft(note.text ?? '');
  }, [note.text, editing]);

  // Focus the textarea as soon as we start editing
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      // place cursor at end
      const el = textareaRef.current;
      el.selectionStart = el.value.length;
      el.selectionEnd = el.value.length;
    }
  }, [editing]);

  const handleDoubleClickToEdit = (e: React.MouseEvent) => {
    e.stopPropagation(); // don't let the canvas deselect this
    onSelect(note.id);
    setEditing(true);
  };

  const handleMouseDownSelect = (e: React.MouseEvent) => {
    // Selecting the note when clicked (without entering edit mode)
    e.stopPropagation();
    onSelect(note.id);
  };

  const commitAndExit = () => {
    const trimmed = draft.trim();
    onChangeText(note.id, trimmed);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // prevent newline
      // blur triggers onBlur (which calls commit)
      (e.target as HTMLTextAreaElement).blur();
    }
  };

  const handleBlur = () => {
    commitAndExit();
  };

  // "New text" placeholder shows ONLY when not editing and the note is empty
  const showPlaceholder = !editing && (!note.text || note.text.length === 0);

  return (
    <div
      onMouseDown={handleMouseDownSelect}
      onDoubleClick={handleDoubleClickToEdit}
      style={{
        position: 'absolute',
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height,
      }}
      className={[
        // Sticky note visual style
        'bg-yellow-200 rounded-md shadow',
        'outline outline-2',
        isSelected ? 'outline-blue-500' : 'outline-transparent',
        'transition-colors',
        'p-2',
        'cursor-default',
        'select-none',
        'overflow-hidden',
      ].join(' ')}
    >
      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          // Textarea fills the card but stays simple
          className="w-full h-full bg-transparent resize-none outline-none text-black"
          // Intentionally no placeholder while editing so "New text" disappears immediately
        />
      ) : (
        <div className="w-full h-full">
          {showPlaceholder ? (
            <span className="text-black/50 italic">New text</span>
          ) : (
            <span className="text-black">{note.text}</span>
          )}
        </div>
      )}

      {/* If you already have your own resize handle, keep it.
          Otherwise this lightweight handle class is a no-op visual placeholder.
          Resize logic should live in your existing board code. */}
      <div className="absolute right-1 bottom-1 h-3 w-3 rounded-sm bg-black/20 pointer-events-none" />
    </div>
  );
}

