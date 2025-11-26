/**
 * Presence Indicators Component
 * 
 * Displays visual indicators for remote users on the board:
 * - Cursor positions
 * - Selected elements (highlighted borders)
 * - User labels/avatars (future)
 * 
 * Future: Enhanced presence
 * - User avatars with names
 * - Color-coded cursors per user
 * - Selection highlights with user colors
 * - User tool indicators
 * - Typing indicators
 * - User activity status (active, idle, away)
 */

"use client";

import React from "react";
import type { RemoteUser } from "@/hooks/useBoardCollaboration";

interface PresenceIndicatorsProps {
  remoteUsers: Map<string, RemoteUser>;
  currentUserId: string;
}

/**
 * PresenceIndicators - Component for displaying remote user presence
 * 
 * Shows cursors and selections for other users on the board.
 */
export default function PresenceIndicators({
  remoteUsers,
  currentUserId,
}: PresenceIndicatorsProps): JSX.Element {
  // Generate a color for each user based on their ID
  const getUserColor = (userId: string): string => {
    // Simple hash function to generate consistent color
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 50%)`;
  };

  return (
    <>
      {Array.from(remoteUsers.values()).map((user) => {
        if (user.userId === currentUserId) return null;

        const userColor = getUserColor(user.userId);

        return (
          <React.Fragment key={user.userId}>
            {/* Cursor indicator */}
            {user.cursor && (
              <div
                className="absolute pointer-events-none z-[10000]"
                style={{
                  left: `${user.cursor.x}px`,
                  top: `${user.cursor.y}px`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div
                  className="w-3 h-3 rounded-full border-2 border-white shadow-lg"
                  style={{ backgroundColor: userColor }}
                />
                <div
                  className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap flex items-center gap-1"
                  style={{ borderColor: userColor }}
                >
                  {/* Show user name and role if available */}
                  {user.name || `User ${user.userId.slice(-4)}`}
                  {user.role && (
                    <span className="text-[10px] opacity-75">
                      ({user.role})
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Selection indicators */}
            {user.selectedElementIds && user.selectedElementIds.length > 0 && (
              <div className="absolute inset-0 pointer-events-none z-[9999]">
                {user.selectedElementIds.map((elementId) => (
                  <div
                    key={`${user.userId}-${elementId}`}
                    className="absolute border-2 border-dashed shadow-lg"
                    style={{
                      borderColor: userColor,
                      boxShadow: `0 0 0 2px ${userColor}40`,
                    }}
                    // Position and size would be calculated based on element position
                    // For now, this is a placeholder - would need element refs
                  />
                ))}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}

