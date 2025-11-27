"use client";

import React, { useState, useEffect } from "react";
import BoardGrid from "./BoardGrid";
import BoardSearchBar from "./BoardSearchBar";
import BoardSortSelect from "./BoardSortSelect";
import BoardFilterButtons from "./BoardFilterButtons";
import Button from "@/components/ui/Button";
import type {
  BoardCardData,
  BoardListConfig,
  BoardListHandlers,
  BoardSortOption,
} from "@/types/boards";
import { useBoardFilters } from "@/hooks/boards/useBoardFilters";
import { useTranslation } from "@/lib/i18n";

/**
 * BoardList component props
 * 
 * @interface BoardListProps
 */
export interface BoardListProps {
  /** Boards to display */
  boards: BoardCardData[];
  /** Whether data is loading */
  loading?: boolean;
  /** Configuration for the list */
  config: BoardListConfig;
  /** Event handlers */
  handlers: BoardListHandlers;
  /** Available institution filter options */
  institutionOptions?: string[];
  /** Custom empty state component */
  emptyState?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Default empty state component
 */
function DefaultEmptyState({
  message,
  onClearFilters,
  hasFilters,
}: {
  message?: string;
  onClearFilters?: () => void;
  hasFilters?: boolean;
}) {
  const t = useTranslation();
  const emptyTitle = t("explore.emptyTitle");
  const emptyMessage = message || t("explore.emptyMessage");
  const clearFiltersLabel = t("explore.emptyClearFilters");

  return (
    <section
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 sm:p-12 text-center animate-fadeIn"
      role="status"
      aria-live="polite"
      aria-labelledby="empty-state-title"
      aria-describedby="empty-state-description"
    >
      <div className="max-w-md mx-auto">
        <svg
          className="mx-auto h-16 w-16 sm:h-20 sm:w-20 text-gray-400 dark:text-gray-500 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h2 id="empty-state-title" className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          {emptyTitle}
        </h2>
        <p id="empty-state-description" className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">
          {emptyMessage}
        </p>

        {hasFilters && onClearFilters && (
          <Button variant="primary" onClick={onClearFilters} aria-label={clearFiltersLabel}>
            {clearFiltersLabel}
          </Button>
        )}
      </div>
    </section>
  );
}

/**
 * BoardList Component
 * 
 * A comprehensive, reusable board list component that combines search, filtering,
 * sorting, and grid display. Can be used in Explore, My Boards, Favorites, and
 * other board listing views.
 * 
 * Features:
 * - Search bar with loading indicator
 * - Sort dropdown
 * - Filter buttons (e.g., institution filters)
 * - Responsive grid layout
 * - Loading skeletons
 * - Empty state handling
 * - Configurable display options
 * 
 * @component
 * @example
 * ```tsx
 * <BoardList
 *   boards={boards}
 *   loading={isLoading}
 *   config={{
 *     filters: { search: "", selectedInstitution: "All" },
 *     sortBy: "recent",
 *     displayOptions: { showFavorite: true },
 *     gridColumns: { sm: 1, md: 2, lg: 3, xl: 4 },
 *   }}
 *   handlers={{
 *     onCardClick: (board) => openModal(board),
 *     onSearchChange: setSearch,
 *     onInstitutionFilterChange: setInstitution,
 *     onSortChange: setSortBy,
 *   }}
 *   institutionOptions={["All", "MIT", "Harvard"]}
 * />
 * ```
 */
export default function BoardList({
  boards,
  loading = false,
  config,
  handlers,
  institutionOptions = [],
  emptyState,
  className = "",
}: BoardListProps) {
  const { filters, sortBy, displayOptions, gridColumns } = config;
  const {
    onCardClick,
    onSearchChange,
    onInstitutionFilterChange,
    onSortChange,
    onFavoriteToggle,
  } = handlers;

  // Filtering loading state (for smooth UX)
  const [isFiltering, setIsFiltering] = useState(false);

  // Debounce filtering indicator
  useEffect(() => {
    setIsFiltering(true);
    const timer = setTimeout(() => {
      setIsFiltering(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.search, filters.selectedInstitution, sortBy]);

  // Apply filters and sorting
  const filteredAndSortedBoards = useBoardFilters(boards, {
    search: filters.search || "",
    selectedInstitution: filters.selectedInstitution || "All",
    sortBy,
  });

  const t = useTranslation();

  // Determine if filters are active
  const hasActiveFilters =
    (filters.search && filters.search.trim() !== "") ||
    (filters.selectedInstitution && filters.selectedInstitution !== "All");

  // Handle clear filters
  const handleClearFilters = () => {
    onSearchChange?.("");
    onInstitutionFilterChange?.("All");
  };

  // Format results count with pluralization
  const formatResultsCount = (count: number): string => {
    return t("explore.resultsCount", { count });
  };

  return (
    <section className={`space-y-6 ${className}`} aria-label={t("explore.title")}>
      {/* Search and Sort Controls */}
      <div role="search" aria-label={t("explore.searchLabel")}>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          {/* Search Bar */}
          <div className="flex-1">
            <BoardSearchBar
              value={filters.search || ""}
              onChange={(value) => onSearchChange?.(value)}
              loading={isFiltering}
            />
          </div>

          {/* Sort Select */}
          <BoardSortSelect
            value={sortBy}
            onChange={(value) => onSortChange?.(value)}
            loading={isFiltering}
          />
        </div>

        {/* Filter Buttons */}
        {institutionOptions.length > 0 && (
          <BoardFilterButtons
            options={institutionOptions}
            selectedValue={filters.selectedInstitution || t("explore.filterAll")}
            onChange={(value) => onInstitutionFilterChange?.(value)}
            label={t("explore.filterLabel")}
          />
        )}
      </div>

      {/* Results Count */}
      {!loading && (
        <div>
          <p
            className="text-sm text-gray-500 dark:text-gray-400"
            aria-live="polite"
            aria-atomic="true"
            role="status"
            id="results-count"
          >
            {isFiltering ? (
              <span className="inline-flex items-center gap-2" aria-label={t("explore.resultsFiltering")}>
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t("explore.resultsFiltering")}
              </span>
            ) : (
              formatResultsCount(filteredAndSortedBoards.length)
            )}
          </p>
        </div>
      )}

      {/* Board Grid */}
      {!loading && filteredAndSortedBoards.length > 0 && (
        <BoardGrid
          boards={filteredAndSortedBoards}
          displayOptions={displayOptions}
          onCardClick={onCardClick}
          onFavoriteToggle={onFavoriteToggle}
          gridColumns={gridColumns}
        />
      )}

      {/* Empty State */}
      {!loading && filteredAndSortedBoards.length === 0 && (
        <>
          {emptyState || (
            <DefaultEmptyState
              message={
                hasActiveFilters
                  ? t("explore.emptyFilteredMessage")
                  : config.emptyStateMessage || t("explore.emptyMessage")
              }
              onClearFilters={handleClearFilters}
              // REFACTORED: Convert to boolean to ensure type compatibility
              hasFilters={!!hasActiveFilters}
            />
          )}
        </>
      )}

      {/* Loading State */}
      {loading && (
        <div aria-live="polite" aria-label={t("explore.loading")}>
          <BoardGrid
            boards={[]}
            loading={true}
            skeletonCount={8}
            displayOptions={displayOptions}
            gridColumns={gridColumns}
          />
        </div>
      )}
    </section>
  );
}

