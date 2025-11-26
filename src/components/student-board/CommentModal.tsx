"use client";

import React, { useState, useEffect, useRef } from "react";

/**
 * Comment Modal Component
 * 
 * Displays a modal for viewing and adding comments to board elements.
 * 
 * Current Features:
 * - ✅ View existing comments
 * - ✅ Add new comments
 * - ✅ Close modal on backdrop click or Escape key
 * 
 * Future: Real-time collaboration
 * - Add user avatars and names to comments
 * - Add timestamps to comments
 * - Add threaded replies to comments
 * - Add real-time sync via WebSocket/Server-Sent Events
 * - Add comment reactions (like, emoji)
 * - Add @mentions in comments
 */

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  elementId: string;
  elementTitle?: string;
  comments: string[];
  onAddComment: (elementId: string, comment: string) => void;
}

/**
 * CommentModal - Component for displaying and managing comments
 * 
 * Export: Default export (use: import CommentModal from "...")
 */
export default function CommentModal({
  isOpen,
  onClose,
  elementId,
  elementTitle,
  comments,
  onAddComment,
}: CommentModalProps): JSX.Element | null {
  const [newComment, setNewComment] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when modal opens (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Handle Escape key to close modal (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle adding a new comment
  const handleAddComment = () => {
    const trimmed = newComment.trim();
    if (trimmed) {
      onAddComment(elementId, trimmed);
      setNewComment("");
    }
  };

  // Handle Enter key (Shift+Enter for new line, Enter to submit)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      onClick={handleOverlayClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-40" />

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              💬 Comments
            </h2>
            {elementTitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {elementTitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close comments"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">💭</div>
              <p className="text-sm">No comments yet. Add one below!</p>
            </div>
          ) : (
            comments.map((comment, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
              >
                <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {comment}
                </p>
                {/* Future: Add user info, timestamp, reactions here */}
              </div>
            ))
          )}
        </div>

        {/* Add Comment Input */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment... (Enter to submit, Shift+Enter for new line)"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              aria-label="Add comment"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

