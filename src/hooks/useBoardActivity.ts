/**
 * Board Activity Tracking Hook
 * 
 * Tracks all board actions for activity history and time travel.
 * Records who did what, when, and what changed.
 * 
 * Features:
 * - Tracks all major board actions (create, move, edit, delete, comments, pen strokes)
 * - Stores activity with timestamps and user info
 * - Supports time travel to any past state
 * - Integrates with undo/redo history
 * 
 * Future: Backend persistence
 * - Store activity in database (PostgreSQL, MongoDB)
 * - Add activity API endpoints
 * - Support activity search and filtering
 * - Add activity export/analytics
 * - Add activity replay/animation
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { CanvasElement } from "@/types";
import type { PenStroke } from "@/hooks/usePenDrawing";

/**
 * Activity types
 */
export type ActivityType =
  | "element_create"
  | "element_move"
  | "element_edit"
  | "element_delete"
  | "comment_add"
  | "pen_stroke"
  | "pen_erase"
  | "file_upload"
  | "board_lock"
  | "board_unlock"
  | "board_reset";

/**
 * Activity entry
 */
export interface ActivityEntry {
  id: string;
  type: ActivityType;
  timestamp: number;
  userId: string;
  userName?: string;
  userRole?: string;
  description: string;
  // Action-specific data
  elementId?: string;
  elementType?: string;
  elementCount?: number; // For batch operations
  commentText?: string;
  strokeCount?: number;
  // Snapshot of board state at this point (for time travel)
  stateSnapshot?: {
    elements: (CanvasElement & { text?: string; color?: string; src?: string; ownerId?: string })[];
    comments: Array<{ elementId: string; comments: string[] }>;
    penStrokes: PenStroke[];
  };
}

/**
 * Generate unique activity ID
 */
function generateActivityId(): string {
  if (typeof window === "undefined") return `activity-ssr-0`;
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format activity description
 */
function formatActivityDescription(
  type: ActivityType,
  userId: string,
  userName?: string,
  metadata?: {
    elementType?: string;
    elementCount?: number;
    commentText?: string;
    strokeCount?: number;
  }
): string {
  const user = userName || `User ${userId.slice(-4)}`;
  
  switch (type) {
    case "element_create":
      return `${user} created ${metadata?.elementType || "element"}`;
    case "element_move":
      return `${user} moved ${metadata?.elementCount || 1} element${(metadata?.elementCount || 1) > 1 ? "s" : ""}`;
    case "element_edit":
      return `${user} edited ${metadata?.elementType || "element"}`;
    case "element_delete":
      return `${user} deleted ${metadata?.elementCount || 1} element${(metadata?.elementCount || 1) > 1 ? "s" : ""}`;
    case "comment_add":
      return `${user} added a comment`;
    case "pen_stroke":
      return `${user} drew ${metadata?.strokeCount || 1} stroke${(metadata?.strokeCount || 1) > 1 ? "s" : ""}`;
    case "pen_erase":
      return `${user} erased strokes`;
    case "file_upload":
      return `${user} uploaded ${metadata?.elementType || "file"}`;
    case "board_lock":
      return `${user} locked the board`;
    case "board_unlock":
      return `${user} unlocked the board`;
    case "board_reset":
      return `${user} reset the board`;
    default:
      return `${user} performed an action`;
  }
}

export interface UseBoardActivityOptions {
  boardId: string;
  userId: string;
  userName?: string;
  userRole?: string;
  maxActivities?: number; // Limit history size
  onActivityRecorded?: (activity: ActivityEntry) => void;
}

/**
 * useBoardActivity Hook
 * 
 * Tracks all board actions and maintains activity history.
 */
export function useBoardActivity(options: UseBoardActivityOptions) {
  const {
    boardId,
    userId,
    userName,
    userRole,
    maxActivities = 1000,
    onActivityRecorded,
  } = options;

  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [isTimeTraveling, setIsTimeTraveling] = useState(false);
  const [timeTravelTarget, setTimeTravelTarget] = useState<number | null>(null);
  
  const activitiesRef = useRef<ActivityEntry[]>([]);

  // Keep ref in sync
  useEffect(() => {
    activitiesRef.current = activities;
  }, [activities]);

  /**
   * Load activities from localStorage on mount
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(`pinspace_board_activity_${boardId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as ActivityEntry[];
        setActivities(parsed);
        activitiesRef.current = parsed;
      }
    } catch (err) {
      console.error("Error loading activity history:", err);
    }
  }, [boardId]);

  /**
   * Save activities to localStorage
   */
  const saveActivities = useCallback((newActivities: ActivityEntry[]) => {
    if (typeof window === "undefined") return;
    
    try {
      // Limit history size
      const limited = newActivities.slice(-maxActivities);
      localStorage.setItem(
        `pinspace_board_activity_${boardId}`,
        JSON.stringify(limited)
      );
    } catch (err) {
      console.error("Error saving activity history:", err);
    }
  }, [boardId, maxActivities]);

  /**
   * Record an activity
   */
  const recordActivity = useCallback((
    type: ActivityType,
    stateSnapshot?: {
      elements: (CanvasElement & { text?: string; color?: string; src?: string; ownerId?: string })[];
      comments: Array<{ elementId: string; comments: string[] }>;
      penStrokes: PenStroke[];
    },
    metadata?: {
      elementId?: string;
      elementType?: string;
      elementCount?: number;
      commentText?: string;
      strokeCount?: number;
    }
  ) => {
    const activity: ActivityEntry = {
      id: generateActivityId(),
      type,
      timestamp: Date.now(),
      userId,
      userName,
      userRole,
      description: formatActivityDescription(type, userId, userName, metadata),
      elementId: metadata?.elementId,
      elementType: metadata?.elementType,
      elementCount: metadata?.elementCount,
      commentText: metadata?.commentText,
      strokeCount: metadata?.strokeCount,
      stateSnapshot,
    };

    setActivities((prev) => {
      const updated = [...prev, activity];
      saveActivities(updated);
      return updated;
    });

    activitiesRef.current = [...activitiesRef.current, activity];
    onActivityRecorded?.(activity);
  }, [userId, userName, userRole, saveActivities, onActivityRecorded]);

  /**
   * Get activity at a specific timestamp (for time travel)
   */
  const getActivityAtTime = useCallback((timestamp: number): ActivityEntry | null => {
    // Find the most recent activity before or at the timestamp
    const activity = activities
      .filter((a) => a.timestamp <= timestamp)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    
    return activity || null;
  }, [activities]);

  /**
   * Get state snapshot at a specific time
   */
  const getStateAtTime = useCallback((timestamp: number): {
    elements: (CanvasElement & { text?: string; color?: string; src?: string; ownerId?: string })[];
    comments: Array<{ elementId: string; comments: string[] }>;
    penStrokes: PenStroke[];
  } | null => {
    const activity = getActivityAtTime(timestamp);
    return activity?.stateSnapshot || null;
  }, [getActivityAtTime]);

  /**
   * Enter time travel mode
   */
  const enterTimeTravel = useCallback((targetTimestamp: number) => {
    setIsTimeTraveling(true);
    setTimeTravelTarget(targetTimestamp);
  }, []);

  /**
   * Exit time travel mode
   */
  const exitTimeTravel = useCallback(() => {
    setIsTimeTraveling(false);
    setTimeTravelTarget(null);
  }, []);

  /**
   * Revert board to a specific time
   */
  const revertToTime = useCallback((timestamp: number) => {
    const state = getStateAtTime(timestamp);
    if (state) {
      // Record revert as activity
      recordActivity("board_reset", state, {
        elementCount: state.elements.length,
      });
      return state;
    }
    return null;
  }, [getStateAtTime, recordActivity]);

  /**
   * Clear activity history
   */
  const clearHistory = useCallback(() => {
    setActivities([]);
    activitiesRef.current = [];
    if (typeof window !== "undefined") {
      localStorage.removeItem(`pinspace_board_activity_${boardId}`);
    }
  }, [boardId]);

  return {
    activities,
    isTimeTraveling,
    timeTravelTarget,
    recordActivity,
    getActivityAtTime,
    getStateAtTime,
    enterTimeTravel,
    exitTimeTravel,
    revertToTime,
    clearHistory,
  };
}






