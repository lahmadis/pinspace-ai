"use client";

import SidebarNavWrapper from "@/components/SidebarNavWrapper";
import BoardsPageClient from "./BoardsPageClient";

/**
 * Boards Page (Client Component)
 * 
 * Unprotected route - no authentication required.
 * Renders boards page unconditionally.
 */
export default function BoardsPage() {
  // Render boards page unconditionally with no auth checks
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left sidebar - no profile for now */}
      <SidebarNavWrapper currentProfile={null} />

      {/* Main content - client component */}
      <BoardsPageClient />
    </div>
  );
}
