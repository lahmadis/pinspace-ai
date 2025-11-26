/**
 * useBoardFilters Hook Tests
 * 
 * Tests for the useBoardFilters hook including:
 * - Text search filtering
 * - Institution filtering
 * - Sorting by different criteria
 * - Combined filters
 */

import { renderHook } from "@testing-library/react";
import { useBoardFilters } from "@/hooks/boards/useBoardFilters";
import { mockBoards } from "@/__tests__/__mocks__/mockData";
import type { BoardSortOption } from "@/types/boards";

describe("useBoardFilters", () => {
  describe("Text Search", () => {
    it("filters boards by title", () => {
      const { result } = renderHook(() =>
        useBoardFilters(mockBoards, {
          search: "Urban",
          selectedInstitution: "All",
          sortBy: "recent",
        })
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].title).toBe("Urban Housing Complex");
    });

    it("filters boards by author name", () => {
      const { result } = renderHook(() =>
        useBoardFilters(mockBoards, {
          search: "Leila",
          selectedInstitution: "All",
          sortBy: "recent",
        })
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].authorName).toBe("Leila Anderson");
    });

    it("filters boards by institution", () => {
      const { result } = renderHook(() =>
        useBoardFilters(mockBoards, {
          search: "MIT",
          selectedInstitution: "All",
          sortBy: "recent",
        })
      );

      expect(result.current.length).toBeGreaterThan(0);
      expect(result.current.every((board) => 
        board.institution.includes("MIT") || 
        board.authorName.includes("MIT") ||
        board.title.includes("MIT")
      )).toBe(true);
    });

    it("is case-insensitive", () => {
      const { result } = renderHook(() =>
        useBoardFilters(mockBoards, {
          search: "urban",
          selectedInstitution: "All",
          sortBy: "recent",
        })
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].title).toBe("Urban Housing Complex");
    });

    it("returns all boards when search is empty", () => {
      const { result } = renderHook(() =>
        useBoardFilters(mockBoards, {
          search: "",
          selectedInstitution: "All",
          sortBy: "recent",
        })
      );

      expect(result.current).toHaveLength(mockBoards.length);
    });

    it("returns empty array when no matches", () => {
      const { result } = renderHook(() =>
        useBoardFilters(mockBoards, {
          search: "NonExistentBoard",
          selectedInstitution: "All",
          sortBy: "recent",
        })
      );

      expect(result.current).toHaveLength(0);
    });
  });

  describe("Institution Filter", () => {
    it("filters boards by selected institution", () => {
      const { result } = renderHook(() =>
        useBoardFilters(mockBoards, {
          search: "",
          selectedInstitution: "MIT",
          sortBy: "recent",
        })
      );

      expect(result.current.length).toBeGreaterThan(0);
      expect(result.current.every((board) => board.institution === "MIT")).toBe(
        true
      );
    });

    it("returns all boards when 'All' is selected", () => {
      const { result } = renderHook(() =>
        useBoardFilters(mockBoards, {
          search: "",
          selectedInstitution: "All",
          sortBy: "recent",
        })
      );

      expect(result.current).toHaveLength(mockBoards.length);
    });

    it("returns empty array when institution has no boards", () => {
      const { result } = renderHook(() =>
        useBoardFilters(mockBoards, {
          search: "",
          selectedInstitution: "NonExistent Institution",
          sortBy: "recent",
        })
      );

      expect(result.current).toHaveLength(0);
    });
  });

  describe("Sorting", () => {
    it("sorts by most recent (timeAgo)", () => {
      const { result } = renderHook(() =>
        useBoardFilters(mockBoards, {
          search: "",
          selectedInstitution: "All",
          sortBy: "recent",
        })
      );

      // Most recent should be first (smallest time value)
      const times = result.current.map((board) => {
        if (board.timeAgo.includes("Just now")) return 0;
        if (board.timeAgo.includes("m ago")) {
          return parseInt(board.timeAgo) || 0;
        }
        if (board.timeAgo.includes("h ago")) {
          return (parseInt(board.timeAgo) || 0) * 60;
        }
        if (board.timeAgo.includes("d ago")) {
          return (parseInt(board.timeAgo) || 0) * 24 * 60;
        }
        return Infinity;
      });

      for (let i = 1; i < times.length; i++) {
        expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
      }
    });

    it("sorts by title alphabetically", () => {
      const { result } = renderHook(() =>
        useBoardFilters(mockBoards, {
          search: "",
          selectedInstitution: "All",
          sortBy: "title",
        })
      );

      const titles = result.current.map((board) => board.title);
      const sortedTitles = [...titles].sort();

      expect(titles).toEqual(sortedTitles);
    });

    it("sorts by author name alphabetically", () => {
      const { result } = renderHook(() =>
        useBoardFilters(mockBoards, {
          search: "",
          selectedInstitution: "All",
          sortBy: "author",
        })
      );

      const authors = result.current.map((board) => board.authorName);
      const sortedAuthors = [...authors].sort();

      expect(authors).toEqual(sortedAuthors);
    });

    it("sorts by institution alphabetically", () => {
      const { result } = renderHook(() =>
        useBoardFilters(mockBoards, {
          search: "",
          selectedInstitution: "All",
          sortBy: "institution",
        })
      );

      const institutions = result.current.map((board) => board.institution);
      const sortedInstitutions = [...institutions].sort();

      expect(institutions).toEqual(sortedInstitutions);
    });
  });

  describe("Combined Filters", () => {
    it("applies both search and institution filter", () => {
      const { result } = renderHook(() =>
        useBoardFilters(mockBoards, {
          search: "Urban",
          selectedInstitution: "MIT",
          sortBy: "recent",
        })
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].title).toBe("Urban Housing Complex");
      expect(result.current[0].institution).toBe("MIT");
    });

    it("applies search, institution filter, and sorting", () => {
      const { result } = renderHook(() =>
        useBoardFilters(mockBoards, {
          search: "",
          selectedInstitution: "MIT",
          sortBy: "title",
        })
      );

      const titles = result.current.map((board) => board.title);
      const sortedTitles = [...titles].sort();

      expect(titles).toEqual(sortedTitles);
      expect(result.current.every((board) => board.institution === "MIT")).toBe(
        true
      );
    });
  });

  describe("Edge Cases", () => {
    it("handles empty boards array", () => {
      const { result } = renderHook(() =>
        useBoardFilters([], {
          search: "",
          selectedInstitution: "All",
          sortBy: "recent",
        })
      );

      expect(result.current).toHaveLength(0);
    });

    it("handles boards with missing fields", () => {
      const boardsWithMissingFields = [
        {
          id: "board-1",
          title: "Test Board",
          authorName: "Test Author",
          institution: "Test Institution",
          timeAgo: "1h ago",
        },
      ];

      const { result } = renderHook(() =>
        useBoardFilters(boardsWithMissingFields, {
          search: "Test",
          selectedInstitution: "All",
          sortBy: "recent",
        })
      );

      expect(result.current).toHaveLength(1);
    });
  });
});






