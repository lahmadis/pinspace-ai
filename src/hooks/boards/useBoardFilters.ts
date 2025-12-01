import { useMemo } from "react";
import type { BoardCardData, BoardSortOption } from "@/types/boards";

/**
 * Board filter options
 * 
 * @interface BoardFilterOptions
 */
export interface BoardFilterOptions {
  /** Search query (searches title, author, institution) */
  search: string;
  /** Selected institution filter (or "All" for no filter) */
  selectedInstitution: string;
  /** Sort option */
  sortBy: BoardSortOption;
  /** Additional custom filters (for future extensibility) */
  customFilters?: Record<string, any>;
}

/**
 * useBoardFilters Hook
 * 
 * Handles filtering and sorting logic for boards.
 * This logic is independent of data source (works with mock or API data).
 * 
 * Features:
 * - Text search (board title, author, institution)
 * - Institution filter
 * - Multiple sort options (recent, popular, title, author, institution)
 * 
 * Performance:
 * - Uses useMemo to avoid unnecessary recalculations
 * - For large datasets (1000+ boards), consider moving filtering/sorting to backend API
 * 
 * TODO: API Integration
 * For better performance with large datasets:
 * 1. Move filtering/sorting to backend API
 * 2. Pass search, institution, and sortBy as query parameters
 * 3. Let backend handle filtering and return filtered results
 * 4. This hook would then just pass through the filtered results
 * 
 * Example backend filtering:
 * ```typescript
 * // In useBoards hook:
 * const response = await fetch(
 *   `/api/boards?public=true&search=${search}&institution=${institution}&sort=${sortBy}`
 * );
 * // Backend returns pre-filtered results
 * ```
 * 
 * @param boards - Array of boards to filter and sort
 * @param options - Filter and sort options
 * @returns Filtered and sorted array of boards
 * 
 * @example
 * ```tsx
 * const filteredBoards = useBoardFilters(boards, {
 *   search: "architecture",
 *   selectedInstitution: "MIT",
 *   sortBy: "recent",
 * });
 * ```
 */
export function useBoardFilters(
  boards: BoardCardData[],
  options: BoardFilterOptions
) {
  const { search, selectedInstitution, sortBy } = options;

  /**
   * Filtered and sorted boards
   * 
   * This memoized computation runs whenever:
   * - boards array changes (new data loaded)
   * - search text changes
   * - selectedInstitution changes
   * - sortBy changes
   */
  const filteredAndSortedBoards = useMemo(() => {
    let result = [...boards];

    // ========================================================================
    // TEXT SEARCH FILTER
    // ========================================================================
    // Searches across board title, author name, and institution
    // Case-insensitive partial matching
    if (search.trim()) {
      const query = search.toLowerCase().trim();
      result = result.filter((board) => {
        const searchableText = [
          board.title,
          board.authorName,
          board.institution,
        ]
          .filter(Boolean)
          .map((t) => t.toLowerCase())
          .join(" ");

        return searchableText.includes(query);
      });
    }

    // ========================================================================
    // INSTITUTION FILTER
    // ========================================================================
    // Filters boards by selected institution
    // "All" shows all boards regardless of institution
    if (selectedInstitution !== "All") {
      result = result.filter(
        (board) => board.institution === selectedInstitution
      );
    }

    // ========================================================================
    // SORTING
    // ========================================================================
    if (sortBy === "recent") {
      // Sort by most recent (newest first)
      // Parses timeAgo strings to comparable numeric values
      result.sort((a, b) => {
        const getTimeValue = (timeStr: string): number => {
          if (timeStr.includes("Just now") || timeStr.includes("just now"))
            return 0;
          if (timeStr.includes("m ago")) {
            const mins = parseInt(timeStr) || 0;
            return mins;
          }
          if (timeStr.includes("h ago")) {
            const hours = parseInt(timeStr) || 0;
            return hours * 60; // Convert to minutes
          }
          if (timeStr.includes("d ago")) {
            const days = parseInt(timeStr) || 0;
            return days * 24 * 60; // Convert to minutes
          }
          // For dates or other formats, put them at the end
          return Infinity;
        };

        return getTimeValue(a.timeAgo) - getTimeValue(b.timeAgo);
      });
    } else if (sortBy === "popular") {
      // Sort by most popular
      // TODO: When API provides view count or likes, use that for sorting
      // For now, maintains original order
      // Example with API data:
      // result.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    } else if (sortBy === "title") {
      // Sort alphabetically by title
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "author") {
      // Sort alphabetically by author name
      result.sort((a, b) => a.authorName.localeCompare(b.authorName));
    } else if (sortBy === "institution") {
      // Sort alphabetically by institution
      result.sort((a, b) => a.institution.localeCompare(b.institution));
    }

    return result;
  }, [boards, search, selectedInstitution, sortBy]);

  return filteredAndSortedBoards;
}











