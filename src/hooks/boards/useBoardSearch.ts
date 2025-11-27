import { useState, useEffect } from "react";

/**
 * useBoardSearch Hook
 * 
 * Manages search state with optional debouncing for performance.
 * Useful for filtering boards by search query.
 * 
 * @param debounceMs - Debounce delay in milliseconds (default: 300ms)
 * @returns Object with search value, setter, and debounced value
 * 
 * @example
 * ```tsx
 * const { search, setSearch, debouncedSearch } = useBoardSearch(300);
 * 
 * // Use debouncedSearch for actual filtering to avoid excessive re-renders
 * const filteredBoards = useBoardFilters(boards, {
 *   search: debouncedSearch,
 *   // ...
 * });
 * ```
 */
export function useBoardSearch(debounceMs: number = 300) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [search, debounceMs]);

  return {
    search,
    setSearch,
    debouncedSearch,
  };
}








