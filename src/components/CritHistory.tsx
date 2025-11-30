"use client";

import { useState, useEffect, useRef } from "react";
import type { CritSession } from "@/types/critSession";
import { formatDistanceToNow } from "date-fns";

interface CritHistoryProps {
  sessions: CritSession[];
  loading: boolean;
  onLoadSession: (session: CritSession) => void;
}

export default function CritHistory({
  sessions,
  loading,
  onLoadSession,
}: CritHistoryProps) {
  // Track comment counts for sessions that don't have comment_count
  const [sessionCommentCounts, setSessionCommentCounts] = useState<Record<string, number>>({});
  const [loadingCommentCounts, setLoadingCommentCounts] = useState<Set<string>>(new Set());
  const fetchedCountsRef = useRef<Set<string>>(new Set()); // Track which sessions we've already fetched
  const loadingCountsRef = useRef<Set<string>>(new Set()); // Track which sessions are currently loading

  // Fetch comment count for sessions that don't have comment_count
  useEffect(() => {
    if (loading || sessions.length === 0) return;

    const fetchCommentCounts = async () => {
      const sessionsToFetch = sessions.filter(session => {
        // Only fetch if comment_count doesn't exist and we haven't fetched it yet
        return (session.comment_count === undefined || session.comment_count === null) &&
               !fetchedCountsRef.current.has(session.id) &&
               !loadingCountsRef.current.has(session.id);
      });

      for (const session of sessionsToFetch) {
        // Mark as loading and fetched
        fetchedCountsRef.current.add(session.id);
        loadingCountsRef.current.add(session.id);
        setLoadingCommentCounts(prev => new Set(prev).add(session.id));

        // Fetch comment count from GET-one route
        try {
          const response = await fetch(`/api/boards/${session.board_id}/crit-sessions/${session.id}`);
          if (response.ok) {
            const data = await response.json();
            const commentCount = data.comments?.length || 0;
            setSessionCommentCounts(prev => ({ ...prev, [session.id]: commentCount }));
          }
        } catch (error) {
          console.error(`[CritHistory] Error fetching comment count for session ${session.id}:`, error);
        } finally {
          loadingCountsRef.current.delete(session.id);
          setLoadingCommentCounts(prev => {
            const next = new Set(prev);
            next.delete(session.id);
            return next;
          });
        }
      }
    };

    fetchCommentCounts();
  }, [sessions, loading]);

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Crit History</h3>
        <p className="text-sm text-gray-500">Loading crit history...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Crit History</h3>
        <p className="text-sm text-gray-500 text-center py-4">
          No crit sessions yet. Start live crit mode to create your first session!
        </p>
      </div>
    );
  }

  const calculateDuration = (startedAt: string, endedAt: string | null): string | null => {
    if (!endedAt) return null;
    const start = new Date(startedAt).getTime();
    const end = new Date(endedAt).getTime();
    const minutes = Math.floor((end - start) / (1000 * 60));
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  };

  const getCommentCount = (session: CritSession): number => {
    // Use comment_count if it exists
    if (session.comment_count !== undefined && session.comment_count !== null) {
      return session.comment_count;
    }
    // Otherwise use cached count from GET-one route
    return sessionCommentCounts[session.id] ?? 0;
  };

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Crit History</h3>
      <div className="space-y-2">
        {sessions.map((session) => {
          const duration = calculateDuration(session.started_at, session.ended_at);
          
          return (
            <div
              key={session.id}
              onClick={() => onLoadSession(session)}
              className="bg-white border border-gray-200 rounded-md p-3 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-900">
                      {new Date(session.started_at).toLocaleDateString()} {new Date(session.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {!session.ended_at && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Live
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mb-1">
                    {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
                  </div>
                  {session.critic_name && (
                    <div className="text-xs text-gray-600 mb-1">
                      Critic: {session.critic_name}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    {loadingCommentCounts.has(session.id) ? (
                      "Loading..."
                    ) : (
                      <>
                        {getCommentCount(session)} comment{getCommentCount(session) !== 1 ? "s" : ""}
                      </>
                    )}
                  </div>
                  {duration && (
                    <div className="text-xs text-gray-500 mt-1">
                      Duration: {duration}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


