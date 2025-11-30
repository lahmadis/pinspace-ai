"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User, Session } from "@supabase/supabase-js";

/**
 * Auth Context and Hook
 * 
 * Provides authentication state and methods throughout the app.
 * 
 * Features:
 * - Current user (from Supabase session)
 * - Sign in with magic link (email-only)
 * - Sign out
 * - Automatic session refresh
 * - Loading state while checking session
 * 
 * Usage:
 *   const { user, signIn, signOut, loading } = useAuth();
 */

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authLoading: boolean; // Alias for loading for clarity
  signIn: (email: string) => Promise<{ error: Error | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider Component
 * 
 * Wraps the app to provide authentication context.
 * Automatically manages session state and listens for auth changes.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Initialize auth state and listen for changes
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(data.user ?? null);
      // Get session for backward compatibility
      const { data: sessionData } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(sessionData.session ?? null);
      setAuthLoading(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign in with magic link
   * 
   * Sends a magic link to the provided email address.
   * The user clicks the link in their email to complete sign in.
   * 
   * @param email - Email address to send magic link to
   * @returns Object with error if sign in failed
   */
  const signIn = useCallback(async (email: string): Promise<{ error: Error | null }> => {
    try {
      setAuthLoading(true);
      
      // Send magic link email
      // redirectTo is optional - defaults to current page
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Optional: specify redirect URL after clicking magic link
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("[AuthContext] Sign in error:", error);
        return { error };
      }

      // Success - magic link email sent
      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to sign in");
      console.error("[AuthContext] Unexpected sign in error:", err);
      return { error };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  /**
   * Sign in with email and password
   * 
   * @param email - Email address
   * @param password - Password
   * @returns Object with error if sign in failed
   */
  const signInWithPassword = useCallback(async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      setAuthLoading(true);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("[AuthContext] Sign in with password error:", error);
        return { error };
      }

      // Success - session will be updated by onAuthStateChange listener
      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to sign in");
      console.error("[AuthContext] Unexpected sign in with password error:", err);
      return { error };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  /**
   * Sign out current user
   */
  const signOut = useCallback(async (): Promise<void> => {
    try {
      setAuthLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[AuthContext] Sign out error:", error);
        throw error;
      }
      // Session and user will be cleared by onAuthStateChange listener
    } catch (err) {
      console.error("[AuthContext] Unexpected sign out error:", err);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const value: AuthContextType = {
    user,
    session,
    loading: authLoading, // Backward compatibility
    authLoading,
    signIn,
    signInWithPassword,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook
 * 
 * Hook to access authentication state and methods.
 * 
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}






