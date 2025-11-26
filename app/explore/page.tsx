"use client";

import { useState, lazy, Suspense } from "react";
import SidebarNav from "@/components/SidebarNav";
import { BoardList } from "@/components/boards";
import { useBoards } from "@/hooks/useBoards";
import type { BoardCardData, BoardSortOption } from "@/types/boards";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n";

// Lazy load modal for better code splitting (only loads when needed)
// This reduces initial bundle size by ~10KB
const BoardDetailsModal = lazy(() =>
  import("@/components/boards/BoardDetailsModal").then((mod) => ({
    default: mod.default,
  }))
);

/**
 * Explore Page - Browse studio boards and filter by institution
 * 
 * This page demonstrates the use of modular board components:
 * - BoardList: Comprehensive list component with search, filters, and grid
 * - BoardDetailsModal: Modal for viewing board details
 * 
 * Features:
 * - Fetches boards from backend API (with mock fallback)
 * - Search, filter, and sort functionality
 * - Board details modal
 * - Favorite/bookmark boards
 * - Loading states and error handling
 * - Full dark mode support
 * 
 * @component
 */
export default function ExplorePage() {
  const t = useTranslation();

  // ============================================================================
  // DATA FETCHING - Handled by useBoards hook
  // ============================================================================
  const { boards, loading, error, usingFallback, retry } = useBoards();

  // ============================================================================
  // MODAL STATE - Board details modal
  // ============================================================================
  const [selectedBoard, setSelectedBoard] = useState<BoardCardData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ============================================================================
  // FILTER STATE - Local UI state for search, filters, and sorting
  // ============================================================================
  const [search, setSearch] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState("All");
  const [sortBy, setSortBy] = useState<BoardSortOption>("recent");

  // Fixed list of institutions for filtering
  // TODO: API Integration - Consider fetching this from backend
  // Note: Institution names are not translated as they are proper nouns
  // "All" is stored as "All" internally but displayed translated
  const institutions = [
    "All", // Internal value (not translated)
    "MIT",
    "Harvard",
    "Wentworth Institute of Technology",
    "RISD",
    "Yale",
    "Columbia",
  ];

  // ============================================================================
  // HANDLERS - Event handlers for board list interactions
  // ============================================================================
  const handleCardClick = (board: BoardCardData) => {
    setSelectedBoard(board);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Clear selected board after animation completes
    setTimeout(() => setSelectedBoard(null), 300);
  };

  const handleFavoriteToggle = (boardId: string, isFavorite: boolean) => {
    // Optional: Add analytics or additional logic here
    console.log(`Board ${boardId} ${isFavorite ? "added to" : "removed from"} favorites`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar Navigation */}
      <SidebarNav />

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8" role="main" aria-label={t("explore.title")}>
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <header className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t("explore.title")}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {t("explore.description")}
            </p>
            {/* Show fallback indicator if using mock data */}
            {usingFallback && (
              <div 
                className="mt-2 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-md text-xs text-yellow-800 dark:text-yellow-200"
                role="status"
                aria-live="polite"
                aria-label={t("explore.fallbackMessage")}
              >
                <span className="font-medium">{t("explore.fallbackNote")}</span> {t("explore.fallbackMessage")}
              </div>
            )}
          </header>

          {/* Error State - Enhanced with retry option */}
          {error && !loading && !usingFallback && (
            <div
              className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center mb-6"
              role="alert"
              aria-live="assertive"
            >
              <svg
                className="mx-auto h-12 w-12 text-red-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h2 className="text-lg font-medium text-red-900 dark:text-red-200 mb-2">
                {t("explore.errorTitle")}
              </h2>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4" role="alert">{error}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="danger" onClick={retry} aria-label={t("explore.errorRetry")}>
                  {t("explore.errorRetry")}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => window.location.reload()}
                  aria-label={t("explore.errorReload")}
                >
                  {t("explore.errorReload")}
                </Button>
              </div>
            </div>
          )}

          {/* Fallback Warning - Shows when using mock data */}
          {usingFallback && !loading && (
            <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start">
                <svg
                  className="h-5 w-5 text-yellow-400 dark:text-yellow-500 mt-0.5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    {t("explore.fallbackUsingSample")}
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    {error || t("explore.fallbackDescription")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Board List - Modular component with all features */}
          <BoardList
            boards={boards}
            loading={loading}
            config={{
              filters: {
                search,
                selectedInstitution,
              },
              sortBy,
              displayOptions: {
                showFavorite: true,
                showAuthor: true,
                showInstitution: true,
                showTimeAgo: true,
                showPreview: true,
                size: "md",
              },
              gridColumns: {
                sm: 1,
                md: 2,
                lg: 3,
                xl: 4,
              },
            }}
            handlers={{
              onCardClick: handleCardClick,
              onSearchChange: setSearch,
              onInstitutionFilterChange: setSelectedInstitution,
              onSortChange: setSortBy,
              onFavoriteToggle: handleFavoriteToggle,
            }}
            institutionOptions={institutions}
          />
        </div>
      </main>

      {/* Board Details Modal - Lazy loaded */}
      <Suspense
        fallback={
          <div className="sr-only" aria-live="polite">
            Loading board details...
          </div>
        }
      >
        <BoardDetailsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          board={selectedBoard}
        />
      </Suspense>

      {/* Custom animations */}
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
