"use client";

/**
 * EditCommentModal Component
 * 
 * Modal dialog for editing an existing comment.
 * Allows users to update comment text, category, and task status.
 * 
 * Features:
 * - Pre-filled form with current comment data
 * - Validation for required fields
 * - Loading and error states
 * - Automatic UI refresh after successful update
 * 
 * Usage:
 *   <EditCommentModal
 *     isOpen={isOpen}
 *     comment={comment}
 *     onClose={() => setIsOpen(false)}
 *     onUpdate={handleCommentUpdate}
 *   />
 */

import React, { useState, useEffect, useRef } from "react";
import type { Comment } from "@/types";
import { useUpdateComment } from "@/hooks/useUpdateComment";

interface EditCommentModalProps {
  isOpen: boolean;
  comment: Comment | null;
  onClose: () => void;
  onUpdate?: (updatedComment: Comment) => void; // Callback when comment is successfully updated
}

export default function EditCommentModal({
  isOpen,
  comment,
  onClose,
  onUpdate,
}: EditCommentModalProps) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<Comment["category"]>("general");
  const [isTask, setIsTask] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Use the update comment hook
  const { updateComment, loading, error } = useUpdateComment();

  // Pre-fill form when comment changes
  useEffect(() => {
    if (comment) {
      setText(comment.text || "");
      setCategory(comment.category || "general");
      setIsTask(comment.task || false);
    }
  }, [comment]);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
      // Select all text for easy editing
      textareaRef.current.select();
    }
  }, [isOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, loading, onClose]);

  // Handle backdrop click
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const trimmedText = text.trim();
    if (!trimmedText) {
      alert("Comment text cannot be empty.");
      return;
    }

    if (!comment) {
      alert("No comment selected for editing.");
      return;
    }

    try {
      console.log("[EditCommentModal] 📝 Updating comment:", comment.id, {
        text: trimmedText,
        category,
        task: isTask,
      });

      // Update comment via API
      const updatedComment = await updateComment(comment.id, {
        text: trimmedText,
        category,
        task: isTask,
        isTask: isTask, // Backward compatibility
      });

      if (updatedComment) {
        console.log("[EditCommentModal] ✅ Comment updated successfully:", updatedComment.id);
        
        // Call onUpdate callback to refresh parent component
        onUpdate?.(updatedComment);
        
        // Close modal
        onClose();
      } else {
        // updateComment returned null - error should be in hook's error state
        console.error("[EditCommentModal] ❌ Comment update returned null");
      }
    } catch (err) {
      // Error is already set in hook's error state
      console.error("[EditCommentModal] ❌ Failed to update comment:", err);
      // Don't close modal on error - let user see error and try again
    }
  };

  // Handle cancel button
  const handleCancel = () => {
    if (!loading) {
      // Reset form to original values
      if (comment) {
        setText(comment.text || "");
        setCategory(comment.category || "general");
        setIsTask(comment.task || false);
      }
      onClose();
    }
  };

  // Don't render if modal is closed
  if (!isOpen || !comment) return null;

  const validCategories: Comment["category"][] = [
    "general",
    "concept",
    "plan",
    "section",
    "material",
    "circulation",
    "structure",
  ];

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
              ✏️ Edit Comment
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Update your comment below
            </p>
          </div>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            aria-label="Close edit modal"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-200">
                ❌ {error}
              </p>
            </div>
          )}

          {/* Comment Text */}
          <div>
            <label
              htmlFor="edit-comment-text"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Comment Text *
            </label>
            <textarea
              ref={textareaRef}
              id="edit-comment-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your comment..."
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              rows={4}
              required
            />
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="edit-comment-category"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Category
            </label>
            <select
              id="edit-comment-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Comment["category"])}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {validCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Task Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="edit-comment-task"
              checked={isTask}
              onChange={(e) => setIsTask(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label
              htmlFor="edit-comment-task"
              className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
            >
              Mark as task
            </label>
          </div>

          {/* Original Comment Info (read-only) */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Author: {comment.author} • Created:{" "}
              {new Date(comment.timestamp).toLocaleString()}
            </p>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !text.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}





