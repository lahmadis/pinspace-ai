/**
 * User Role Selector Component
 * 
 * Allows users to switch roles for demo purposes.
 * In production, roles would be assigned by administrators or backend.
 * 
 * Future: Real Authentication
 * - Remove role selector (roles come from backend)
 * - Show user profile instead
 * - Add logout functionality
 * - Add user settings/preferences
 */

"use client";

import React from "react";
import { useUser, type UserRole } from "@/contexts/UserContext";

export default function UserRoleSelector(): JSX.Element {
  const { user, updateUserRole } = useUser();

  if (!user) return <></>;

  const roleColors: Record<UserRole, string> = {
    instructor: "bg-purple-600",
    student: "bg-blue-600",
    guest: "bg-gray-600",
  };

  const roleLabels: Record<UserRole, string> = {
    instructor: "Instructor",
    student: "Student",
    guest: "Guest",
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`px-3 py-1.5 rounded-full text-xs font-medium text-white ${roleColors[user.role]}`}>
        {roleLabels[user.role]}
      </div>
      <div className="text-sm text-gray-700 dark:text-gray-300">
        {user.name}
      </div>
      {/* Demo role switcher - Remove in production */}
      <select
        value={user.role}
        onChange={(e) => updateUserRole(e.target.value as UserRole)}
        className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        title="Switch role (demo only)"
      >
        <option value="instructor">Instructor</option>
        <option value="student">Student</option>
        <option value="guest">Guest</option>
      </select>
    </div>
  );
}










