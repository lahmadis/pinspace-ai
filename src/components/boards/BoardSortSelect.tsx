"use client";

import React from "react";
import type { BoardSortOption } from "@/types/boards";
import { useTranslation } from "@/lib/i18n";

/**
 * BoardSortSelect component props
 * 
 * @interface BoardSortSelectProps
 */
export interface BoardSortSelectProps {
  /** Current sort option */
  value: BoardSortOption;
  /** Callback when sort option changes */
  onChange: (value: BoardSortOption) => void;
  /** Available sort options */
  options?: Array<{ value: BoardSortOption; label: string }>;
  /** Whether to show loading indicator */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get default sort options (will be translated in component)
 */
function getDefaultSortOptions(t: (key: string) => string): Array<{ value: BoardSortOption; label: string }> {
  return [
    { value: "recent", label: t("explore.sortRecent") },
    { value: "popular", label: t("explore.sortPopular") },
    { value: "title", label: t("explore.sortTitle") },
    { value: "author", label: t("explore.sortAuthor") },
    { value: "institution", label: t("explore.sortInstitution") },
  ];
}

/**
 * BoardSortSelect Component
 * 
 * A reusable dropdown component for sorting boards by various criteria.
 * Includes loading indicator and proper accessibility attributes.
 * 
 * @component
 * @example
 * ```tsx
 * <BoardSortSelect
 *   value={sortBy}
 *   onChange={setSortBy}
 *   loading={isFiltering}
 * />
 * ```
 */
export default function BoardSortSelect({
  value,
  onChange,
  options,
  loading = false,
  className = "",
}: BoardSortSelectProps) {
  const t = useTranslation();
  const sortOptions = options || getDefaultSortOptions(t);
  const sortLabel = t("explore.sortLabel");
  const sortDescription = t("explore.sortDescription");

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor="sort-select" className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
        {sortLabel}:
      </label>
      <div className="relative">
        <select
          id="sort-select"
          value={value}
          onChange={(e) => onChange(e.target.value as BoardSortOption)}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition appearance-none pr-8"
          aria-label={sortLabel}
          aria-describedby="sort-description"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {/* Loading spinner indicator */}
        {loading && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" aria-hidden="true">
            <svg
              className="animate-spin h-4 w-4 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-label={t("common.loading")}
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
          </div>
        )}
      </div>
      <p id="sort-description" className="sr-only">
        {sortDescription}
      </p>
    </div>
  );
}

