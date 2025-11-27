"use client";

import { useState } from "react";
import type { Comment, Task, CritSessionSummary } from "@/types";
import { timeAgo } from "@/lib/time";

interface SummaryPanelProps {
  comments: Comment[];
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  boardId?: string;
  getCritSessionSummary?: (boardId: string) => CritSessionSummary | null;
  onJumpToElement?: (elementId: string) => void;
}

interface FeedbackItem {
  id: string;
  text: string;
  author: string;
  // REFACTORED: timestamp can be string | number to match Comment and Task types
  timestamp: string | number;
  category: string;
  isTask: boolean;
  taskId?: string;
  taskStatus?: "open" | "done";
}

export default function SummaryPanel({
  comments,
  tasks,
  onToggleTask,
  boardId,
  getCritSessionSummary,
  onJumpToElement,
}: SummaryPanelProps) {
  const categoriesInOrder = [
    "Concept",
    "Plan",
    "Section",
    "Circulation",
    "Structure",
    "Material",
    "General",
  ];

  // Create a map of comments by ID for lookup
  const commentsById = new Map<string, Comment>();
  comments.forEach((c) => {
    commentsById.set(c.id, c);
  });

  // Normalize tasks: add category from source comment if available
  const normalizedTasks: FeedbackItem[] = tasks.map((task) => {
    let category = "General";
    
    // If task has sourceCommentId, look up the original comment's category
    if (task.sourceCommentId) {
      const sourceComment = commentsById.get(task.sourceCommentId);
      if (sourceComment && sourceComment.category) {
        // Capitalize first letter to match category display
        category = sourceComment.category.charAt(0).toUpperCase() + sourceComment.category.slice(1);
      }
    } else if (task.category) {
      category = task.category.charAt(0).toUpperCase() + task.category.slice(1);
    }
    
    // Find author from source comment if available
    let author = "Unknown";
    if (task.sourceCommentId) {
      const sourceComment = commentsById.get(task.sourceCommentId);
      if (sourceComment) {
        author = sourceComment.author;
      }
    }

    return {
      id: task.id,
      text: task.text,
      author,
      // REFACTORED: Convert timestamp to string for FeedbackItem type
      // Task.createdAt can be string | number, but FeedbackItem.timestamp accepts both
      timestamp: String(task.createdAt),
      // REFACTORED: Default category to "general" if not provided
      category: task.category || "general",
      isTask: true,
      taskId: task.id,
      taskStatus: (task.status === "done" || task.status === "open") ? task.status : undefined,
    };
  });

  // Normalize actionable comments: include comments that are actionable but not yet converted to tasks
  const normalizedComments: FeedbackItem[] = comments
    .filter((comment) => {
      // Exclude comments that have been converted to tasks (we'll show the task version instead)
      const hasTask = tasks.some((t) => t.sourceCommentId === comment.id);
      if (hasTask) return false;

      // Include if it's actionable:
      // 1. Has task flag (isTask === true)
      // 2. Has a category other than general (actionable feedback)
      return comment.task === true || (comment.category && comment.category !== "general");
    })
    .map((comment) => {
      const category = comment.category
        ? comment.category.charAt(0).toUpperCase() + comment.category.slice(1)
        : "General";

      // If comment has task flag, treat it as an actionable item (but not a task with checkbox)
      return {
        id: comment.id,
        text: comment.text,
        author: comment.author,
        timestamp: comment.timestamp,
        category,
        isTask: false, // Comments are not tasks, even if they have task flag (tasks are separate entities)
        taskStatus: undefined,
      };
    });

  // Combine tasks and comments, then group by category
  const allItems = [...normalizedTasks, ...normalizedComments];

  // Group by category
  const groupedByCategory = new Map<string, FeedbackItem[]>();
  categoriesInOrder.forEach((cat) => {
    groupedByCategory.set(cat, []);
  });

  allItems.forEach((item) => {
    const category = item.category || "General";
    if (!groupedByCategory.has(category)) {
      groupedByCategory.set(category, []);
    }
    groupedByCategory.get(category)!.push(item);
  });

  // Count unresolved items per category
  const getUnresolvedCount = (items: FeedbackItem[]) => {
    return items.filter((item) => !item.taskStatus || item.taskStatus === "open").length;
  };

  // Sort items within each category (newest first)
  const sortItems = (items: FeedbackItem[]) => {
    return items.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });
  };

  // Get crit session summary if available
  const critSession = boardId && getCritSessionSummary
    ? getCritSessionSummary(boardId)
    : null;

  // State for copy feedback
  const [copied, setCopied] = useState(false);

  // Function to copy summary to clipboard
  const handleCopySummary = async () => {
    if (!critSession) return;

    const endedDate = new Date(critSession.endedAt);
    const relativeTime = timeAgo(endedDate.toISOString());

    // Use comments and tasks from summary (or fallback to IDs lookup for backward compatibility)
    const includedComments = critSession.comments || (critSession.commentIdsIncluded
      ? critSession.commentIdsIncluded
          .map((id) => comments.find((c) => c.id === id))
          .filter((c): c is Comment => c !== undefined)
      : []);

    const includedTasks = critSession.tasks || (critSession.taskIdsCreated
      ? critSession.taskIdsCreated
          .map((id) => tasks.find((t) => t.id === id))
          .filter((t): t is Task => t !== undefined)
      : []);

    // Build plain text string
    let text = `Crit ended: ${relativeTime}\n\n`;

    // What reviewers asked for
    text += "What reviewers asked for:\n";
    if (includedComments.length === 0) {
      text += "(No comments)\n";
    } else {
      includedComments.forEach((comment) => {
        // Use new format if available (summary.comments), otherwise old format (Comment objects)
        const isNewFormat = critSession.comments !== undefined;
        
        const commentCategory = isNewFormat && "category" in comment
          ? (comment as { category: string }).category
          : (comment as Comment).category || "general";
        const category = commentCategory
          ? commentCategory.charAt(0).toUpperCase() + commentCategory.slice(1)
          : "General";
        const commentAuthor = isNewFormat && "author" in comment
          ? (comment as { author: string }).author
          : (comment as Comment).author;
        const commentText = isNewFormat && "text" in comment
          ? (comment as { text: string }).text
          : (comment as Comment).text;
        const reviewerName = commentAuthor ? ` ${commentAuthor}` : "";
        text += `- [${category}]${reviewerName}: ${commentText}\n`;
      });
    }

    // Tasks created from this crit
    text += "\nTasks created from this crit:\n";
    if (includedTasks.length === 0) {
      text += "(No tasks)\n";
    } else {
      includedTasks.forEach((task) => {
        // Use new format if available (summary.tasks), otherwise old format (Task objects)
        const isNewFormat = critSession.tasks !== undefined;
        
        const taskDone = isNewFormat && "done" in task
          ? (task as { done: boolean }).done
          : (task as Task).status === "done";
        const taskText = isNewFormat && "text" in task
          ? (task as { text: string }).text
          : (task as Task).text;
        const status = taskDone ? " (checked)" : " (unchecked)";
        text += `- ${taskText}${status}\n`;
      });
    }

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy summary", err);
    }
  };

  // If we have a crit session, show that instead of the grouped view
  if (critSession) {
    // Use comments and tasks from summary directly (new format)
    // Fallback to ID lookup for backward compatibility with old summaries
    const includedComments = critSession.comments || (critSession.commentIdsIncluded
      ? critSession.commentIdsIncluded
          .map((id) => comments.find((c) => c.id === id))
          .filter((c): c is Comment => c !== undefined)
      : []);

    const includedTasks = critSession.tasks || (critSession.taskIdsCreated
      ? critSession.taskIdsCreated
          .map((id) => tasks.find((t) => t.id === id))
          .filter((t): t is Task => t !== undefined)
      : []);

    const endedDate = new Date(critSession.endedAt);

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Last Crit Summary</h3>
            <p className="text-xs text-gray-500 mt-1">
              Ended {timeAgo(endedDate.toISOString())}
            </p>
          </div>
          <button
            onClick={handleCopySummary}
            className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md border border-gray-300 transition flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <span>Copied</span>
                <span>✓</span>
              </>
            ) : (
              "Copy Summary"
            )}
          </button>
        </div>

        {/* What reviewers asked for */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-900">What reviewers asked for:</h4>
          {includedComments.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-500 text-center">
              No comments in this crit session.
            </div>
          ) : (
            <div className="space-y-2">
              {includedComments.map((comment) => {
                // Use new format if available (summary.comments), otherwise old format (Comment objects)
                const isNewFormat = critSession.comments !== undefined;
                
                const commentId = isNewFormat && "id" in comment ? comment.id : (comment as Comment).id;
                const commentCategory = isNewFormat && "category" in comment
                  ? (comment as { category: string }).category
                  : (comment as Comment).category || "general";
                const category = commentCategory
                  ? commentCategory.charAt(0).toUpperCase() + commentCategory.slice(1)
                  : "General";
                const commentText = isNewFormat && "text" in comment
                  ? (comment as { text: string }).text
                  : (comment as Comment).text;
                const commentAuthor = isNewFormat && "author" in comment
                  ? (comment as { author: string }).author
                  : (comment as Comment).author;
                const commentCreatedAt = isNewFormat && "createdAt" in comment
                  ? (typeof (comment as { createdAt: number }).createdAt === "number"
                      ? new Date((comment as { createdAt: number }).createdAt).toISOString()
                      : String((comment as { createdAt: number }).createdAt))
                  : (comment as Comment).timestamp;
                const commentTargetElementId = isNewFormat && "targetElementId" in comment
                  ? (comment as { targetElementId?: string | null }).targetElementId
                  : (comment as Comment).targetElementId;

                return (
                  <div
                    key={commentId}
                    className="border border-gray-200 rounded mb-2 p-2 text-sm bg-white"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                        {category}
                      </span>
                      {commentCreatedAt && (
                        <span className="text-[11px] text-gray-500">
                          {timeAgo(commentCreatedAt)}
                        </span>
                      )}
                    </div>
                    <div className="text-gray-800 whitespace-pre-line mb-1">
                      {commentText}
                    </div>
                    {commentAuthor && (
                      <div className="text-[11px] text-gray-500 mt-1">
                        — {commentAuthor}
                      </div>
                    )}
                    {commentTargetElementId && onJumpToElement && (
                      <button
                        onClick={() => onJumpToElement(commentTargetElementId)}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-2"
                      >
                        <span>↩</span>
                        <span>View on board</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tasks created from this crit */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-900">Tasks created from this crit:</h4>
          {includedTasks.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-500 text-center">
              No tasks were created from this crit session.
            </div>
          ) : (
            <div className="space-y-2">
              {includedTasks.map((task) => {
                // Use new format if available (summary.tasks), otherwise old format (Task objects)
                const isNewFormat = critSession.tasks !== undefined;
                
                const taskId = isNewFormat && "id" in task
                  ? (task as { id: string }).id
                  : (task as Task).id;
                const taskDone = isNewFormat && "done" in task
                  ? (task as { done: boolean }).done
                  : (task as Task).status === "done";
                const taskText = isNewFormat && "text" in task
                  ? (task as { text: string }).text
                  : (task as Task).text;

                return (
                  <div
                    key={taskId}
                    className="flex items-start gap-2 mb-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={taskDone}
                      onChange={() => onToggleTask && taskId && onToggleTask(taskId)}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
                      readOnly={!onToggleTask || !taskId}
                    />
                    <div className={`flex-1 ${
                      taskDone ? "line-through text-gray-400" : "text-gray-800"
                    }`}>
                      {taskText}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default view: no crit session yet
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-gray-900">Summary</h3>

      {categoriesInOrder.map((category) => {
        const items = groupedByCategory.get(category) || [];
        const sortedItems = sortItems(items);
        const unresolvedCount = getUnresolvedCount(sortedItems);

        // Hide category if there are no items
        if (sortedItems.length === 0) {
          return null;
        }

        return (
          <div key={category} className="space-y-2">
            {/* Category header */}
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-gray-900">{category}</h4>
              <span className="text-xs text-gray-500">
                {unresolvedCount === 0 ? "All resolved" : `${unresolvedCount} unresolved item${unresolvedCount === 1 ? "" : "s"}`}
              </span>
            </div>

            {/* Items in this category */}
            <div className="border border-gray-200 rounded-lg bg-white divide-y divide-gray-100">
              {sortedItems.length === 0 ? (
                <div className="p-3 text-xs text-gray-500 text-center">
                  No notes for {category} yet.
                </div>
              ) : (
                sortedItems.map((item) => {
                  const isDone = item.taskStatus === "done";
                  const isTask = item.taskId !== undefined; // Task has a taskId

                  return (
                    <div
                      key={item.id}
                      className={`p-3 flex items-start gap-2 ${
                        isDone ? "opacity-60 bg-gray-50" : ""
                      }`}
                    >
                      {/* Checkbox for tasks */}
                      {isTask && (
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => {
                            if (item.taskId) {
                              onToggleTask(item.taskId);
                            }
                          }}
                          className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
                        />
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1 flex-wrap">
                          <p
                            className={`text-sm break-words ${
                              isDone
                                ? "text-gray-500 line-through"
                                : "text-gray-900"
                            }`}
                          >
                            {item.text}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs text-gray-500">
                            by {item.author} • {timeAgo(item.timestamp)}
                          </p>
                          {/* Check if original comment has liveCrit source */}
                          {(() => {
                            const originalComment = comments.find((c) => c.id === item.id);
                            return originalComment?.source === "liveCrit" ? (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-700 rounded uppercase tracking-wide">
                                LIVE CRIT
                              </span>
                            ) : null;
                          })()}
                          {isDone && <span className="text-xs text-gray-500">(resolved)</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}

      {/* No crit session message */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-sm text-gray-700 font-medium mb-1">No crit summary yet.</p>
        <p className="text-xs text-gray-500">
          Start a Live Crit, collect comments, then End Crit.
          <br />
          We'll generate a summary you can present.
        </p>
      </div>
    </div>
  );
}

