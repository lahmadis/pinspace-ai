"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { getBoardComments, saveBoardComments, getTasks, saveTasks } from "@/lib/storage";
import type { Comment, Task } from "@/types";
import type { CommentTarget } from "@/lib/storage";
import CritViewerCanvas from "@/components/CritViewerCanvas";

interface CritPageProps {
  params: Promise<{ boardId: string }>;
}

export default function CritPage({ params }: CritPageProps) {
  const { boardId } = use(params);
  const router = useRouter();
  
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"concept" | "plan" | "section" | "material" | "circulation" | "structure" | "general">("general");
  const [note, setNote] = useState("");
  const [isTask, setIsTask] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [target, setTarget] = useState<CommentTarget | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Preserve name across sessions if you already do; else leave blank
    // Could load from localStorage if needed
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) return;
    
    setError("");

    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    if (!note.trim()) {
      setError("Please enter a note");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Load existing comments
      const existingComments = getBoardComments(boardId);
      
      // Check for duplicates before creating (same text, author, elementId, within 5 seconds)
      const now = Date.now();
      const isDuplicate = existingComments.some(c => {
        const commentTime = new Date(c.createdAt).getTime();
        return c.text === note.trim() &&
               c.authorName === name.trim() &&
               c.targetElementId === (target?.type === "element" ? target.elementId || null : null) &&
               Math.abs(commentTime - now) < 5000; // within 5 seconds
      });
      
      if (isDuplicate) {
        console.log("[crit] Duplicate comment detected, skipping");
        setError("This comment was already submitted.");
        setIsSubmitting(false);
        return;
      }
      
      // Create new comment with target
      const newComment: Comment = {
        id: `comment_${Date.now()}`,
        author: name.trim(),
        text: note.trim(),
        timestamp: new Date().toISOString(),
        boardId,
        pinId: null,
        category,
        task: isTask,
        source: "liveCrit",
        targetElementId: target?.type === "element" ? target.elementId || null : null,
        x: target?.type === "point" ? target.point?.x : undefined,
        y: target?.type === "point" ? target.point?.y : undefined,
      };

      // Save comment (including target)
      const updatedComments = [...existingComments, {
        id: newComment.id,
        boardId: newComment.boardId,
        authorName: newComment.author,
        text: newComment.text,
        type: "comment" as const,
        createdAt: newComment.timestamp,
        pinId: newComment.pinId || null,
        category: newComment.category,
        targetElementId: newComment.targetElementId || null,
        x: newComment.x,
        y: newComment.y,
        task: newComment.task || false,
        source: newComment.source,
        target: target, // NEW: include target
      }];

      saveBoardComments(boardId, updatedComments);

      // If marked as task, also create a Task entry
      if (isTask) {
        const existingTasks = getTasks(boardId);
        const newTask: Task = {
          id: `task_${Date.now()}`,
          boardId,
          text: note.trim(),
          sourceCommentId: newComment.id,
          status: "open",
          createdAt: new Date().toISOString(),
        };

        const updatedTasks = [...existingTasks, {
          id: newTask.id,
          boardId: newTask.boardId,
          text: newTask.text,
          sourceCommentId: newTask.sourceCommentId,
          status: newTask.status,
          createdAt: newTask.createdAt,
        }];

        saveTasks(boardId, updatedTasks);
      }

      // Clear form and show success (keep name and target)
      setNote("");
      setIsTask(false);
      setCategory("general");
      setTarget(undefined);
      setSubmitted(true);

      // Reset success message after 3 seconds
      setTimeout(() => {
        setSubmitted(false);
      }, 3000);
    } catch (err) {
      console.error("Error submitting note", err);
      setError("Failed to submit note. Please try again.");
    } finally {
      // Reset submitting state after a delay to prevent rapid submissions
      setTimeout(() => setIsSubmitting(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="h-full w-full grid grid-cols-12 gap-6">
        {/* Left: Canvas viewer */}
        <div className="col-span-8 min-h-[70vh] rounded-xl border bg-white overflow-hidden">
          <CritViewerCanvas
            boardId={boardId}
            onSelectTarget={(t, view) => setTarget({ ...t, viewport: view })}
          />
        </div>

        {/* Right: Feedback form */}
        <div className="col-span-4">
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold mb-6">Leave Feedback</h2>

            {submitted ? (
              <div className="text-center py-8">
                <p className="text-lg text-gray-900 mb-2">Note added 👍</p>
                <p className="text-sm text-gray-500">
                  Thank you for your feedback!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {/* Name input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Enter your name"
                  />
                </div>

                {/* Category select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as typeof category)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    <option value="concept">Concept</option>
                    <option value="plan">Plan</option>
                    <option value="section">Section</option>
                    <option value="circulation">Circulation</option>
                    <option value="structure">Structure</option>
                    <option value="material">Material</option>
                    <option value="general">General</option>
                  </select>
                </div>

                {/* Note textarea */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your note
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                    placeholder="Enter your feedback..."
                  />
                </div>

                {/* Attachment preview */}
                <div className="text-xs text-zinc-600">
                  {target ? (
                    target.type === "element" ? (
                      <>
                        Attached to: <span className="font-medium">Element {target.elementId?.slice(0, 6)}…</span>
                      </>
                    ) : (
                      <>
                        Attached to point: <span className="font-medium">({Math.round(target.point!.x)}, {Math.round(target.point!.y)})</span>
                      </>
                    )
                  ) : (
                    <span>No attachment — click the board to attach.</span>
                  )}
                </div>

                {/* Make task checkbox */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isTask}
                    onChange={(e) => setIsTask(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="text-sm text-gray-700">
                    Mark this as a task
                  </label>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isSubmitting ? "Submitting..." : "Submit Note"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

