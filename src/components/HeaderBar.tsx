"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBoards } from "@/lib/storage";
import { timeAgo } from "@/lib/time";

interface CritSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  board_snapshot: any;
  comment_count?: number;
}

interface HeaderBarProps {
  boardId: string;
  critSessions: CritSession[];
  selectedCritSessionId: string | null;
  onCritSessionChange: (sessionId: string | null) => void;
  onSaveSnapshot?: () => void;
  onPresent?: () => void;
  onShare?: () => void;
  onSaveTimelineSnapshot?: () => void;
  onStartCrit?: () => void;
  onEndCrit?: () => void;
  isCritActive?: boolean;
  isPresenting?: boolean;
  onEndPresent?: () => void;
  isStartingCrit?: boolean;
  isRecording?: boolean;
  recordingDuration?: string;
  audioBlob?: Blob | null;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onProcessAudio?: () => void;
  processingAudio?: boolean;
}

export default function HeaderBar({
  boardId,
  critSessions,
  selectedCritSessionId,
  onCritSessionChange,
  onSaveSnapshot,
  onPresent,
  onShare,
  onSaveTimelineSnapshot,
  onStartCrit,
  onEndCrit,
  isCritActive = false,
  isPresenting = false,
  onEndPresent,
  isStartingCrit = false,
  isRecording = false,
  recordingDuration = "00:00",
  audioBlob = null,
  onStartRecording,
  onStopRecording,
  onProcessAudio,
  processingAudio = false,
}: HeaderBarProps) {
  const router = useRouter();
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [boardTitle, setBoardTitle] = useState("Runway / Movement Study");
  const [lastEdited, setLastEdited] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBoard() {
      try {
        const storedBoards = getBoards();
        const storedBoard = storedBoards.find((b) => b.id === boardId);
        if (storedBoard) {
          setBoardTitle(storedBoard.title);
          setLastEdited(storedBoard.lastEdited);
        }

        try {
          const res = await fetch(`/api/boards/${boardId}`);
          if (res.ok) {
            const responseData = await res.json();
            if (responseData.error) {
              console.error("API error loading board:", responseData.error);
            } else if (responseData.data) {
              const board = responseData.data;
              if (board.visibility) {
                setVisibility(board.visibility);
              }
              if (board.title) {
                setBoardTitle(board.title);
              }
              if (board.updated_at) {
                setLastEdited(new Date(board.updated_at).toISOString());
              } else if (board.created_at) {
                setLastEdited(new Date(board.created_at).toISOString());
              }
            }
          } else {
            try {
              const errorData = await res.json();
              if (errorData.error) {
                console.error("Failed to load board:", errorData.error.message || errorData.error.details);
              }
            } catch {
              console.error(`Failed to load board: ${res.status} ${res.statusText}`);
            }
          }
        } catch (apiErr) {
          console.error("Network error loading board:", apiErr);
        }
      } catch (err) {
        console.error("Failed to load board data", err);
      } finally {
        setLoading(false);
      }
    }
    loadBoard();

    const interval = setInterval(() => {
      const storedBoards = getBoards();
      const storedBoard = storedBoards.find((b) => b.id === boardId);
      if (storedBoard?.lastEdited) {
        setLastEdited(storedBoard.lastEdited);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [boardId]);

  const handlePresentMode = () => {
    router.push(`/board/${boardId}/present`);
  };


  const handleVisibilityChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newVisibility = e.target.value as "private" | "public";
    setVisibility(newVisibility);

    try {
      const res = await fetch(`/api/boards/${boardId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visibility: newVisibility,
        }),
      });

      if (!res.ok) {
        const responseData = await res.json();
        const errorMessage = responseData.error?.message || responseData.error || "Failed to update board visibility";
        console.error("Failed to update board visibility:", errorMessage);
        setVisibility(visibility);
      } else {
        const responseData = await res.json();
        if (responseData.error) {
          console.error("API error updating board:", responseData.error);
          setVisibility(visibility);
        }
      }
    } catch (err) {
      console.error("Error updating board visibility", err);
      setVisibility(visibility);
    }
  };

  const formatCritSessionLabel = (session: CritSession) => {
    const date = new Date(session.started_at);
    const dateStr = date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    });
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    const commentCount = session.comment_count || 0;
    const commentLabel = commentCount === 1 ? 'comment' : 'comments';
    
    if (session.status === 'active') {
      return `${dateStr} ${timeStr} - Live (${commentCount} ${commentLabel})`;
    }
    
    return `${dateStr} ${timeStr} (${commentCount} ${commentLabel})`;
  };

  if (isPresenting) {
    return (
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {boardTitle}
          </h2>
          <div className="flex items-center gap-3">
            {onEndPresent && (
              <button
                onClick={onEndPresent}
                className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-900 transition"
              >
                Exit Present
              </button>
            )}
            {onStartCrit && !isCritActive && (
              <button
                onClick={onStartCrit}
                disabled={isStartingCrit}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title={isStartingCrit ? "Starting Live Crit session..." : "Start a Live Crit session for guest feedback"}
              >
                {isStartingCrit ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Starting...</span>
                  </>
                ) : (
                  "Start Live Crit"
                )}
              </button>
            )}
            {onEndCrit && isCritActive && (
              <button
                onClick={onEndCrit}
                className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition"
              >
                End Crit
              </button>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">
            {boardTitle}
          </h2>
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${
              visibility === "public"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {visibility === "public" ? "Public" : "Private"}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handlePresentMode}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition"
          >
            Present to Class
          </button>
          {onStartCrit && !isCritActive && (
            <button
              onClick={onStartCrit}
              disabled={isStartingCrit}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title={isStartingCrit ? "Starting Live Crit session..." : "Start a Live Crit session for guest feedback"}
            >
              {isStartingCrit ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Starting...</span>
                </>
              ) : (
                "Start Live Crit"
              )}
            </button>
          )}
          {onEndCrit && isCritActive && (
            <button
              onClick={onEndCrit}
              className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition"
            >
              End Crit
            </button>
          )}
          {onStartRecording && !isRecording && !audioBlob && (
            <button
              onClick={onStartRecording}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition flex items-center gap-2"
              title="Record architecture critique audio"
            >
              <span>🎤</span>
              Record Crit
            </button>
          )}
          {isRecording && (
            <div className="flex items-center gap-3 px-4 py-2 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full bg-red-600 ${isRecording ? "animate-pulse" : ""}`}></span>
                <span className="text-sm font-medium text-red-700">Recording</span>
                <span className="text-sm text-red-600 font-mono">{recordingDuration}</span>
              </div>
              {onStopRecording && (
                <button
                  onClick={onStopRecording}
                  className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition"
                >
                  Stop
                </button>
              )}
            </div>
          )}
          {audioBlob && !isRecording && (
            <div className="flex items-center gap-2">
              {processingAudio ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-blue-700">Transcribing and analyzing...</span>
                </div>
              ) : (
                <>
                  <span className="text-sm text-gray-600">Audio ready</span>
                  {audioBlob && (
                    <button
                      onClick={() => {
                        const url = URL.createObjectURL(audioBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'test-recording.webm';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition"
                      title="Download recorded audio to test locally"
                    >
                      Download Test Audio
                    </button>
                  )}
                  {onProcessAudio && (
                    <button
                      onClick={onProcessAudio}
                      className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition"
                    >
                      Process Audio
                    </button>
                  )}
                </>
              )}
            </div>
          )}
          {onShare && (
            <button
              onClick={onShare}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition"
            >
              Share
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-200">
        {lastEdited && (
          <div className="text-xs text-gray-500">
            Last edited {timeAgo(lastEdited)}
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-gray-700 mb-2 block">
            Visibility:
          </label>
          <select
            value={visibility}
            onChange={handleVisibilityChange}
            disabled={loading}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </div>

        <div className="flex-1">
          <label className="text-xs font-medium text-gray-700 mb-2 block">
            Crit Session
          </label>
          <select
            value={selectedCritSessionId || ""}
            onChange={(e) => {
              if (e.target.value === "") {
                onCritSessionChange(null);
              } else {
                onCritSessionChange(e.target.value);
              }
            }}
            className="w-full max-w-xs px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Current (Live Board)</option>
            {critSessions
              .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
              .map((session) => (
                <option key={session.id} value={session.id}>
                  {formatCritSessionLabel(session)}
                </option>
              ))}
          </select>
        </div>
      </div>
    </header>
  );
}