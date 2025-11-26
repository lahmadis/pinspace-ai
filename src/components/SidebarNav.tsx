"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * SidebarNav Component
 * 
 * UPDATED: Added login/logout functionality
 * - Shows "Login" link when not authenticated
 * - Shows user email and "Logout" button when authenticated
 */
export default function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, loading } = useAuth();
  
  const isBoardsActive = pathname === "/boards";
  const isExploreActive = pathname === "/explore";
  const isLoginActive = pathname === "/auth/login";

  // Handle logout
  async function handleLogout() {
    try {
      await signOut();
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  return (
    <aside className="w-64 bg-gray-100 h-screen flex flex-col p-6">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900">PinSpace</h1>
      </div>

      <nav className="flex-1 space-y-2">
        <Link
          href="/boards"
          className={`block px-3 py-2 rounded-md text-sm font-medium transition ${
            isBoardsActive
              ? "bg-gray-200 text-gray-900"
              : "text-gray-700 hover:bg-gray-200"
          }`}
        >
          Boards
        </Link>
        <Link
          href="/classroom"
          className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
        >
          Classroom
        </Link>
        <Link
          href="/explore"
          className={`block px-3 py-2 rounded-md text-sm font-medium transition ${
            isExploreActive
              ? "bg-gray-200 text-gray-900"
              : "text-gray-700 hover:bg-gray-200"
          }`}
        >
          Explore
        </Link>
        <Link
          href="/profile/me"
          className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
        >
          My Profile
        </Link>
      </nav>

      {/* NEW: Auth section at bottom */}
      <div className="mt-auto pt-4 border-t border-gray-300">
        {!loading && (
          <>
            {user ? (
              // Authenticated - show user email and logout button
              <div className="space-y-2">
                <div className="px-3 py-2 text-xs text-gray-600 truncate" title={user.email || undefined}>
                  {user.email || "User"}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 transition text-left"
                >
                  Logout
                </button>
              </div>
            ) : (
              // Not authenticated - show login link
              <Link
                href="/auth/login"
                className={`block px-3 py-2 rounded-md text-sm font-medium transition ${
                  isLoginActive
                    ? "bg-gray-200 text-gray-900"
                    : "text-gray-700 hover:bg-gray-200"
                }`}
              >
                Login
              </Link>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
