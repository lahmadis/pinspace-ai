"use client";

import { useState, useEffect } from "react";
import type { CritSession } from "@/types/critSession";
import type { CanvasElement, Comment } from "@/types";
import BoardCanvas from "@/components/BoardCanvas";
import { formatDistanceToNow } from "date-fns";

interface CritSessionViewerProps {
  isOpen: boolean;
  onClose: () => void;
  session: CritSession | null;
  boardId: string;
}

interface SessionData {
  session: CritSession;
  comments: Comment[];
}

export default function CritSessionViewer({
  isOpen,
  onClose,
  session,
  boardId,
}: CritSessionViewerProps) {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Fetch session data when modal opens
  useEffect(() => {
    if (!isOpen || !session) {
      setSessionData(null);
      setError(null);
      return;
    }

    const fetchSessionData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/boards/${boardId}/crit-sessions/${session.id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch session: ${response.statusText}`);
        }
        const data = await response.json();
        setSessionData({
          session: data.session,
          comments: data.comments || [],
        });
      } catch (err) {
        console.error("[CritSessionViewer] Error fetching session:", err);
        setError(err instanceof Error ? err.message : "Failed to load session");
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [isOpen, session, boardId]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const boardSnapshot = sessionData?.session?.board_snapshot;
  // Handle board snapshot - it should have elements, cards, tasks, and title
  const elements: CanvasElement[] = (boardSnapshot?.elements || []) as CanvasElement[];
  const comments = sessionData?.comments || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">
              Crit Session
            </h2>
            {sessionData?.session && (
              <div className="text-sm text-gray-500 mt-1">
                {new Date(sessionData.session.started_at).toLocaleDateString()} at{" "}
                {new Date(sessionData.session.started_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {sessionData.session.ended_at && (
                  <>
                    {" "}
                    • Ended{" "}
                    {formatDistanceToNow(new Date(sessionData.session.ended_at), {
                      addSuffix: true,
                    })}
                  </>
                )}
                {!sessionData.session.ended_at && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    Live
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-sm text-gray-500">Loading session...</div>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-sm text-red-600 mb-2">Error: {error}</div>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Board Canvas */}
              <div className="flex-1 relative overflow-hidden bg-gray-50">
                <BoardCanvas
                  elements={elements}
                  setElements={() => {}} // Read-only, no updates
                  selectedIds={selectedElementId ? [selectedElementId] : []}
                  setSelectedIds={() => {}} // Read-only
                  activeTool="select"
                  zoom={zoom}
                  setZoom={setZoom}
                  pan={pan}
                  setPan={setPan}
                  isReadOnly={true}
                  boardId={boardId}
                  currentUserName="Viewer"
                  allowPinComments={false}
                  showMinimalToolbar={false}
                />
              </div>

              {/* Comments Panel */}
              <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Comments ({comments.length})
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  {comments.length === 0 ? (
                    <div className="text-xs text-gray-500 text-center py-8">
                      No comments in this session.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((comment) => {
                        // Handle both camelCase and snake_case field names
                        const commentText = comment.text || comment.content || "";
                        const commentAuthor =
                          comment.createdBy ||
                          comment.author ||
                          comment.author_name ||
                          "Anonymous";
                        const commentElementId =
                          comment.elementId ||
                          comment.element_id ||
                          comment.targetElementId ||
                          comment.target_element_id ||
                          null;
                        const commentCreatedAt =
                          comment.createdAt ||
                          comment.created_at ||
                          comment.timestamp;

                        return (
                          <div
                            key={comment.id}
                            className="rounded-lg border border-gray-200 px-3 py-2 hover:border-blue-300 transition cursor-pointer"
                            onClick={() => {
                              // Highlight the element this comment is attached to
                              if (commentElementId) {
                                setSelectedElementId(commentElementId);
                              }
                            }}
                          >
                            <div className="text-xs font-semibold text-zinc-700 flex items-center justify-between mb-1">
                              <span>{commentAuthor}</span>
                              {commentElementId && (
                                <span className="font-mono text-[10px] opacity-60">
                                  {commentElementId.slice(0, 6)}…
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-900 mt-1">
                              {commentText}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {commentCreatedAt
                                ? formatDistanceToNow(
                                    new Date(
                                      typeof commentCreatedAt === "number"
                                        ? commentCreatedAt
                                        : commentCreatedAt
                                    ),
                                    { addSuffix: true }
                                  )
                                : "Just now"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
