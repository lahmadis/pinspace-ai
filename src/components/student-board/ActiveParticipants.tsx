/**
 * Active Participants Component
 * 
 * Displays list of active users on the board with their roles.
 * Shows user count and role distribution.
 * 
 * Future: Enhanced participant display
 * - User avatars
 * - User names from authentication
 * - Activity status (active, idle, away)
 * - Click to view user profile
 * - Mute/block user options (for moderators)
 */

"use client";

import React from "react";
import type { RemoteUser } from "@/hooks/useBoardCollaboration";
import { useUser } from "@/contexts/UserContext";

interface ActiveParticipantsProps {
  remoteUsers: Map<string, RemoteUser>;
  currentUserId: string;
}

export default function ActiveParticipants({
  remoteUsers,
  currentUserId,
}: ActiveParticipantsProps): JSX.Element {
  const { user: currentUser } = useUser();

  const allUsers = Array.from(remoteUsers.values());
  const totalUsers = allUsers.length + 1; // +1 for current user

  // Count users by role (if available)
  const roleCounts = {
    instructor: allUsers.filter((u) => u.role === "instructor").length + (currentUser?.role === "instructor" ? 1 : 0),
    student: allUsers.filter((u) => u.role === "student").length + (currentUser?.role === "student" ? 1 : 0),
    guest: allUsers.filter((u) => u.role === "guest").length + (currentUser?.role === "guest" ? 1 : 0),
  };

  if (totalUsers <= 1) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Just you
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="text-xs text-gray-600 dark:text-gray-400">
        {totalUsers} active
      </div>
      {roleCounts.instructor > 0 && (
        <div className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs">
          {roleCounts.instructor} instructor{roleCounts.instructor > 1 ? "s" : ""}
        </div>
      )}
      {roleCounts.student > 0 && (
        <div className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs">
          {roleCounts.student} student{roleCounts.student > 1 ? "s" : ""}
        </div>
      )}
      {roleCounts.guest > 0 && (
        <div className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs">
          {roleCounts.guest} guest{roleCounts.guest > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}






