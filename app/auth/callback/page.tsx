"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/**
 * Auth Callback Page
 * 
 * Handles the callback from Supabase magic link authentication.
 * 
 * Flow:
 * 1. User clicks magic link in email
 * 2. Supabase redirects to this page with tokens in URL
 * 3. We exchange tokens for session
 * 4. Redirect to boards page
 * 
 * This page is called automatically after user clicks magic link.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Handle auth callback
    async function handleCallback() {
      try {
        // Get the hash from URL (Supabase puts tokens here)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const error = hashParams.get("error");
        const errorDescription = hashParams.get("error_description");

        if (error) {
          setError(errorDescription || error || "Authentication failed");
          setTimeout(() => router.push("/auth/login"), 3000);
          return;
        }

        // Exchange code for session
        // Supabase automatically handles this, but we need to trigger it
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("[AuthCallback] Session error:", sessionError);
          setError("Failed to establish session. Please try again.");
          setTimeout(() => router.push("/auth/login"), 3000);
          return;
        }

        if (data.session) {
          // Success - redirect to boards
          router.push("/boards");
        } else {
          // No session - redirect to login
          setError("No session found. Please try logging in again.");
          setTimeout(() => router.push("/auth/login"), 3000);
        }
      } catch (err) {
        console.error("[AuthCallback] Unexpected error:", err);
        setError("An unexpected error occurred. Redirecting to login...");
        setTimeout(() => router.push("/auth/login"), 3000);
      }
    }

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 border border-red-200 text-center">
          <div className="text-red-600 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <p className="text-xs text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show loading state while processing callback
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 border border-gray-200 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Signing you in...</h2>
        <p className="text-sm text-gray-600">Please wait while we complete your sign in.</p>
      </div>
    </div>
  );
}



