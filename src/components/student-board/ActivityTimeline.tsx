/**
 * Activity Timeline Component
 * 
 * Displays chronological list of board activities.
 * Allows users to view and navigate to past states (time travel).
 * 
 * Features:
 * - Chronological activity list
 * - Time travel navigation
 * - Visual indicators for current vs historical view
 * - Filter by activity type or user
 * 
 * Future: Enhanced timeline
 * - Activity search and filtering
 * - Activity replay/animation
 * - Activity export
 * - Activity analytics
 */

"use client";

import React, { useState, useMemo } from "react";
import type { ActivityEntry, ActivityType } from "@/hooks/useBoardActivity";

interface ActivityTimelineProps {
  activities: ActivityEntry[];
  isTimeTraveling: boolean;
  timeTravelTarget: number | null;
  currentTime: number;
  onTimeTravel: (timestamp: number) => void;
  onExitTimeTravel: () => void;
  onRevertToTime: (timestamp: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Format timestamp to readable time
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) {
    // Less than 1 minute ago
    return "Just now";
  } else if (diff < 3600000) {
    // Less than 1 hour ago
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  } else if (diff < 86400000) {
    // Less than 1 day ago
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else {
    // More than 1 day ago
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
}

/**
 * Get activity icon
 */
function getActivityIcon(type: ActivityType): string {
  switch (type) {
    case "element_create":
      return "➕";
    case "element_move":
      return "↔️";
    case "element_edit":
      return "✏️";
    case "element_delete":
      return "🗑️";
    case "comment_add":
      return "💬";
    case "pen_stroke":
      return "✏️";
    case "pen_erase":
      return "🧹";
    case "file_upload":
      return "📤";
    case "board_lock":
      return "🔒";
    case "board_unlock":
      return "🔓";
    case "board_reset":
      return "🔄";
    default:
      return "•";
  }
}

/**
 * ActivityTimeline - Component for displaying board activity history
 */
export default function ActivityTimeline({
  activities,
  isTimeTraveling,
  timeTravelTarget,
  currentTime,
  onTimeTravel,
  onExitTimeTravel,
  onRevertToTime,
  isOpen,
  onClose,
}: ActivityTimelineProps): JSX.Element | null {
  const [filterType, setFilterType] = useState<ActivityType | "all">("all");
  const [filterUserId, setFilterUserId] = useState<string | "all">("all");

  // Filter activities
  const filteredActivities = useMemo(() => {
    let filtered = [...activities].reverse(); // Most recent first

    if (filterType !== "all") {
      filtered = filtered.filter((a) => a.type === filterType);
    }

    if (filterUserId !== "all") {
      filtered = filtered.filter((a) => a.userId === filterUserId);
    }

    return filtered;
  }, [activities, filterType, filterUserId]);

  // Get unique activity types and users for filters
  const activityTypes = useMemo(() => {
    const types = new Set<ActivityType>();
    activities.forEach((a) => types.add(a.type));
    return Array.from(types);
  }, [activities]);

  const users = useMemo(() => {
    const userMap = new Map<string, { name?: string; role?: string }>();
    activities.forEach((a) => {
      if (!userMap.has(a.userId)) {
        userMap.set(a.userId, { name: a.userName, role: a.userRole });
      }
    });
    return Array.from(userMap.entries());
  }, [activities]);

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Activity Timeline
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {activities.length} total activities
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          aria-label="Close timeline"
        >
          ✕
        </button>
      </div>

      {/* Time Travel Mode Indicator */}
      {isTimeTraveling && (
        <div className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900 border-b border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">⏰</span>
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Time Travel Mode
              </span>
            </div>
            <button
              onClick={onExitTimeTravel}
              className="px-2 py-1 text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded hover:bg-yellow-300 dark:hover:bg-yellow-700"
            >
              Return to Live
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 space-y-2">
        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
            Filter by Type
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ActivityType | "all")}
            className="w-full text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <option value="all">All Types</option>
            {activityTypes.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
            Filter by User
          </label>
          <select
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            className="w-full text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <option value="all">All Users</option>
            {users.map(([userId, info]) => (
              <option key={userId} value={userId}>
                {info.name || `User ${userId.slice(-4)}`} {info.role && `(${info.role})`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto">
        {filteredActivities.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
            No activities found
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredActivities.map((activity) => {
              const isAtThisTime = timeTravelTarget === activity.timestamp;
              const isBeforeCurrent = activity.timestamp <= currentTime;

              return (
                <div
                  key={activity.id}
                  className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    isAtThisTime ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-xl flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {activity.description}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {formatTime(activity.timestamp)}
                        </span>
                      </div>
                      {activity.userName && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {activity.userName} {activity.userRole && `(${activity.userRole})`}
                        </p>
                      )}
                      {activity.elementType && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Type: {activity.elementType}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Time Travel Actions */}
                  {activity.stateSnapshot && (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => onTimeTravel(activity.timestamp)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          isAtThisTime
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                        }`}
                        title="View board at this time"
                      >
                        {isAtThisTime ? "⏰ Viewing" : "⏰ View"}
                      </button>
                      {isBeforeCurrent && (
                        <button
                          onClick={() => onRevertToTime(activity.timestamp)}
                          className="px-2 py-1 text-xs rounded bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-200 hover:bg-orange-300 dark:hover:bg-orange-800"
                          title="Revert board to this state"
                        >
                          🔄 Revert
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        {isTimeTraveling ? (
          <div className="flex items-center gap-2">
            <span>⏰ Viewing historical state</span>
            <button
              onClick={onExitTimeTravel}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Return to live
            </button>
          </div>
        ) : (
          <span>Viewing live board state</span>
        )}
      </div>
    </div>
  );
}






