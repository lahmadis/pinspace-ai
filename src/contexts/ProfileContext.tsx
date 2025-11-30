"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

/**
 * Profile Context
 * 
 * Provides the current user's profile (including role) throughout the app.
 * Fetches profile from /api/user/profile endpoint.
 */

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

/**
 * ProfileProvider Component
 * 
 * Wraps the app to provide profile context.
 * Automatically fetches profile when user is authenticated.
 */
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile({
          id: data.id || "",
          email: data.email || "",
          full_name: data.full_name || "",
          role: data.role || "student",
        });
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error("[ProfileProvider] Error fetching profile:", error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  return (
    <ProfileContext.Provider value={{ profile, loading, refetch: fetchProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

/**
 * useProfile Hook
 * 
 * Hook to access profile context.
 * 
 * @throws Error if used outside ProfileProvider
 */
export function useProfile(): ProfileContextType {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}


