/**
 * User Context
 * 
 * Manages current user session, role, and authentication state.
 * 
 * Current Implementation: Mock user system
 * - Stores user in localStorage
 * - Supports role switching for demo purposes
 * - No real authentication
 * 
 * Future: Real Authentication Integration
 * - Replace with NextAuth.js, Auth0, or custom auth
 * - Get user from JWT token or session cookie
 * - Fetch role from backend API
 * - Handle token refresh and expiration
 * - Add login/logout flows
 */

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

/**
 * User roles and their permissions
 */
export type UserRole = "instructor" | "student" | "guest";

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  avatar?: string;
  // Future: Add more user properties
  // organization?: string;
  // permissions?: string[];
}

export interface UserContextType {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  updateUserRole: (role: UserRole) => void;
  hasPermission: (permission: string) => boolean;
  canEdit: (elementOwnerId?: string) => boolean;
  canDelete: (elementOwnerId?: string) => boolean;
  canModerate: () => boolean;
  canLockBoard: () => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

/**
 * Permission definitions per role
 */
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  instructor: [
    "create",
    "edit",
    "delete",
    "delete_others",
    "moderate",
    "lock_board",
    "view",
    "comment",
    "annotate",
  ],
  student: [
    "create",
    "edit_own",
    "delete_own",
    "view",
    "comment",
    "annotate",
  ],
  guest: [
    "view",
    "comment",
  ],
};

/**
 * UserProvider - Provides user context to the app
 */
export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load user from localStorage on mount
   * Future: Load from auth token/session
   */
  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem("pinspace_current_user");
      if (stored) {
        const parsedUser = JSON.parse(stored) as User;
        setUserState(parsedUser);
      } else {
        // Create default demo user (student role)
        const defaultUser: User = {
          id: `user-${Date.now()}`,
          name: "Demo Student",
          role: "student",
        };
        setUserState(defaultUser);
        localStorage.setItem("pinspace_current_user", JSON.stringify(defaultUser));
      }
    } catch (err) {
      console.error("Error loading user:", err);
      // Create default user on error
      const defaultUser: User = {
        id: `user-${Date.now()}`,
        name: "Demo Student",
        role: "student",
      };
      setUserState(defaultUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Set user and persist to localStorage
   * Future: Update auth token/session
   */
  const setUser = useCallback((newUser: User | null) => {
    setUserState(newUser);
    if (typeof window !== "undefined") {
      if (newUser) {
        localStorage.setItem("pinspace_current_user", JSON.stringify(newUser));
      } else {
        localStorage.removeItem("pinspace_current_user");
      }
    }
  }, []);

  /**
   * Update user role (for demo purposes)
   * Future: Role changes would require admin permission or backend API
   */
  const updateUserRole = useCallback((role: UserRole) => {
    if (user) {
      const updatedUser = { ...user, role };
      setUser(updatedUser);
    }
  }, [user, setUser]);

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    const permissions = ROLE_PERMISSIONS[user.role] || [];
    return permissions.includes(permission);
  }, [user]);

  /**
   * Check if user can edit an element
   * - Instructors: Can edit any element
   * - Students: Can edit their own elements
   * - Guests: Cannot edit
   */
  const canEdit = useCallback((elementOwnerId?: string): boolean => {
    if (!user) return false;
    if (user.role === "instructor") return true;
    if (user.role === "student") {
      // Students can edit their own elements
      return !elementOwnerId || elementOwnerId === user.id;
    }
    return false;
  }, [user]);

  /**
   * Check if user can delete an element
   * - Instructors: Can delete any element
   * - Students: Can delete their own elements
   * - Guests: Cannot delete
   */
  const canDelete = useCallback((elementOwnerId?: string): boolean => {
    if (!user) return false;
    if (user.role === "instructor") return true;
    if (user.role === "student") {
      // Students can delete their own elements
      return !elementOwnerId || elementOwnerId === user.id;
    }
    return false;
  }, [user]);

  /**
   * Check if user can moderate (instructors only)
   */
  const canModerate = useCallback((): boolean => {
    return user?.role === "instructor";
  }, [user]);

  /**
   * Check if user can lock/unlock board (instructors only)
   */
  const canLockBoard = useCallback((): boolean => {
    return user?.role === "instructor";
  }, [user]);

  const value: UserContextType = {
    user,
    isLoading,
    setUser,
    updateUserRole,
    hasPermission,
    canEdit,
    canDelete,
    canModerate,
    canLockBoard,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

/**
 * useUser - Hook to access user context
 */
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}







