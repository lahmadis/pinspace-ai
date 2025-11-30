import { useState, useEffect } from "react";
import type { CritSession } from "@/types/critSession";

export function useCritSessions(boardId: string) {
  const [sessions, setSessions] = useState<CritSession[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    if (!boardId) {
      setSessions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/boards/${boardId}/crit-sessions`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch sessions" }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch crit sessions");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [boardId]);

  const startSession = async (
    boardSnapshot: any,
    criticInfo?: { name?: string; email?: string },
    guestSessionId?: string
  ): Promise<CritSession> => {
    if (!boardId) {
      throw new Error("boardId is required");
    }

    setError(null);

    try {
      const response = await fetch(`/api/boards/${boardId}/crit-sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          board_snapshot: boardSnapshot,
          critic_name: criticInfo?.name || null,
          critic_email: criticInfo?.email || null,
          guest_session_id: guestSessionId || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to start session" }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const newSession = data.session;

      // Add new session to start of sessions array
      setSessions((prev) => [newSession, ...prev]);

      return newSession;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to start crit session";
      setError(errorMessage);
      throw err;
    }
  };

  const endSession = async (sessionId: string): Promise<CritSession> => {
    if (!boardId) {
      throw new Error("boardId is required");
    }

    setError(null);

    try {
      const response = await fetch(`/api/boards/${boardId}/crit-sessions/${sessionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to end session" }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const updatedSession = data.session;

      // Update the session in sessions array
      setSessions((prev) =>
        prev.map((session) => (session.id === sessionId ? updatedSession : session))
      );

      return updatedSession;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to end crit session";
      setError(errorMessage);
      throw err;
    }
  };

  return {
    sessions,
    loading,
    error,
    startSession,
    endSession,
    refreshSessions: fetchSessions,
  };
}

