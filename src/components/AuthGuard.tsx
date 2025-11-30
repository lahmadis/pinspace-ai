"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * AuthGuard Component
 * 
 * Client-side component to protect routes that require authentication.
 * Redirects to /auth if user is not authenticated.
 * 
 * Usage:
 *   <AuthGuard>
 *     <YourProtectedContent />
 *   </AuthGuard>
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [user, authLoading, router]);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render children (redirect will happen)
  if (!user) {
    return null;
  }

  // User is authenticated, render children
  return <>{children}</>;
}

