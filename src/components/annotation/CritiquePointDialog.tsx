/**
 * Critique Point Dialog Component
 * 
 * Modal dialog for viewing and editing critique points.
 * Shows details, comments, and allows status updates.
 * 
 * Features:
 * - View point details
 * - Edit description
 * - View comment threads
 * - Add comments
 * - Update status
 * - Link to elements
 * 
 * Future: Enhanced dialog
 * - Rich text editing
 * - File attachments
 * - Mention users
 * - Email notifications
 */

"use client";

import React, { useState } from "react";
import type { CritiquePoint, CommentThread } from "@/types/annotation";
import { useUser } from "@/contexts/UserContext";

interface CritiquePointDialogProps {
  point: CritiquePoint;
  threads: CommentThread[];
  onUpdate: (id: string, updates: Partial<CritiquePoint>) => void;
  onResolve: (id: string) => void;
  onAddComment: (threadId: string, content: string) => void;
  onClose: () => void;
}

export default function CritiquePointDialog({
  point,
  threads,
  onUpdate,
  onResolve,
  onAddComment,
  onClose,
}: CritiquePointDialogProps): JSX.Element {
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(point.description);
  const [newComment, setNewComment] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    threads.length > 0 ? threads[0].id : null
  );

  const handleSave = () => {
    onUpdate(point.id, { description: editedDescription });
    setIsEditing(false);
  };

  const handleResolve = () => {
    onResolve(point.id);
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedThreadId) return;
    onAddComment(selectedThreadId, newComment);
    setNewComment("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="critique-dialog-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 id="critique-dialog-title" className="text-2xl font-bold text-gray-900 dark:text-white">
            Critique Point #{point.number}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Status and Priority */}
        <div className="flex items-center gap-4 mb-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            point.status === "resolved"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : point.status === "addressed"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          }`}>
            {point.status}
          </span>
          {point.priority && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              point.priority === "high"
                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                : point.priority === "medium"
                  ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                  : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            }`}>
              {point.priority} priority
            </span>
          )}
          {point.category && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
              {point.category}
            </span>
          )}
        </div>

        {/* Title */}
        {point.title && (
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {point.title}
          </h3>
        )}

        {/* Description */}
        <div className="mb-4">
          {isEditing ? (
            <div>
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={4}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedDescription(point.description);
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {point.description}
              </p>
              <button
                onClick={() => setIsEditing(true)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Comment Threads */}
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Comments ({threads.length})
          </h4>
          {threads.map(thread => (
            <div key={thread.id} className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
              {thread.title && (
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                  {thread.title}
                </h5>
              )}
              <div className="space-y-2">
                {thread.comments.map(comment => (
                  <div key={comment.id} className="text-sm text-gray-700 dark:text-gray-300">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{comment.createdBy}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Add Comment */}
        <div className="mb-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows={3}
          />
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Comment
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {point.status !== "resolved" && (
            <button
              onClick={handleResolve}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Mark as Resolved
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}








