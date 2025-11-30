"use client";

import { useState, useEffect } from "react";
import { useCritSessions } from "@/hooks/useCritSessions";

interface LiveCritControlsProps {
  boardId: string;
  currentBoardSnapshot: any;
  isLiveCritMode: boolean;
  guestSessionId?: string | null; // Guest session ID from createHost
  // Add other props as needed
}

export default function LiveCritControls({
  boardId,
  currentBoardSnapshot,
  isLiveCritMode,
  guestSessionId,
}: LiveCritControlsProps) {
  const { startSession, endSession } = useCritSessions(boardId);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Create crit session after guest session is created
  useEffect(() => {
    if (guestSessionId && !currentSessionId) {
      // Guest session was just created - now create crit session and link them
      startSession(
        currentBoardSnapshot,
        undefined, // criticInfo (can be added later if needed)
        guestSessionId // link to guest session
      )
        .then((critSession) => {
          setCurrentSessionId(critSession.id);
          console.log("Started crit session:", critSession.id, "linked to guest session:", guestSessionId);
        })
        .catch((err) => console.error("Failed to start crit session:", err));
    }
  }, [guestSessionId, currentSessionId, startSession, currentBoardSnapshot]);

  // End crit session when live crit mode is turned off
  useEffect(() => {
    if (!isLiveCritMode && currentSessionId) {
      // Crit just ended - close session
      endSession(currentSessionId)
        .then(() => {
          console.log("Ended crit session:", currentSessionId);
          setCurrentSessionId(null);
        })
        .catch((err) => console.error("Failed to end session:", err));
    }
  }, [isLiveCritMode, currentSessionId, endSession]);

  // Add your component JSX here
  return null; // Placeholder - add your UI here
}

