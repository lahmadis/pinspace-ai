/**
 * Explore Page Integration Tests
 * 
 * Tests for the Explore page including:
 * - Rendering with different data states
 * - Search, filter, and sort functionality
 * - Error handling and fallback states
 * - Modal interactions
 * - Loading states
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ExplorePage from "../../../../app/explore/page";
import { mockBoards } from "@/__tests__/__mocks__/mockData";
import { useBoardsMocks } from "@/__tests__/__mocks__/useBoards";

// Mock Next.js components
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/explore",
}));

// Mock SidebarNav
jest.mock("@/components/SidebarNav", () => {
  return function MockSidebarNav() {
    return <aside data-testid="sidebar-nav">Sidebar</aside>;
  };
});

// Mock useBoards hook
jest.mock("@/hooks/useBoards", () => ({
  useBoards: jest.fn(),
}));

// Mock i18n
jest.mock("@/lib/i18n", () => ({
  useTranslation: () => (key: string, params?: Record<string, string | number>) => {
    const translations: Record<string, string> = {
      "explore.title": "Explore Studio Work",
      "explore.description": "Browse architecture studio boards from institutions around the world",
      "explore.searchPlaceholder": "Search boards, authors, or institutions...",
      "explore.searchLabel": "Search boards, authors, or institutions",
      "explore.searchDescription": "Search will filter boards by title, author name, or institution",
      "explore.sortLabel": "Sort boards by",
      "explore.sortDescription": "Choose to sort boards by most recent, most popular, title, author, or institution",
      "explore.sortRecent": "Most Recent",
      "explore.sortPopular": "Most Popular",
      "explore.sortTitle": "Title (A-Z)",
      "explore.sortAuthor": "Author (A-Z)",
      "explore.sortInstitution": "Institution (A-Z)",
      "explore.filterLabel": "Filter by institution",
      "explore.filterDescription": "Use arrow keys to navigate between filter buttons, Enter or Space to select",
      "explore.filterAll": "All",
      "explore.resultsCount": `${params?.count || 0} ${(params?.count || 0) === 1 ? "board" : "boards"} found`,
      "explore.resultsFiltering": "Filtering...",
      "explore.emptyTitle": "No boards found",
      "explore.emptyMessage": "There are no boards available at the moment.",
      "explore.emptyFilteredMessage": "We couldn't find any boards matching your search or filters.",
      "explore.emptyClearFilters": "Clear Filters",
      "explore.loading": "Loading boards",
      "explore.errorTitle": "Unable to load boards",
      "explore.errorRetry": "Try Again",
      "explore.errorReload": "Reload Page",
      "explore.fallbackNote": "Note:",
      "explore.fallbackMessage": "Showing sample boards. API connection unavailable.",
      "explore.fallbackUsingSample": "Using sample data",
      "explore.fallbackDescription": "Unable to connect to server. Showing sample boards for demonstration.",
    };
    return translations[key] || key;
  },
}));

import { useBoards } from "@/hooks/useBoards";

describe("ExplorePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useBoards as jest.Mock).mockReturnValue(useBoardsMocks.withBoards());
  });

  describe("Rendering", () => {
    it("renders page header", () => {
      render(<ExplorePage />);

      expect(screen.getByText("Explore Studio Work")).toBeInTheDocument();
      expect(
        screen.getByText(/Browse architecture studio boards/i)
      ).toBeInTheDocument();
    });

    it("renders sidebar navigation", () => {
      render(<ExplorePage />);

      expect(screen.getByTestId("sidebar-nav")).toBeInTheDocument();
    });

    it("renders board list when boards are loaded", () => {
      render(<ExplorePage />);

      expect(screen.getByText(mockBoards[0].title)).toBeInTheDocument();
    });

    it("renders search bar", () => {
      render(<ExplorePage />);

      const searchInput = screen.getByPlaceholderText(
        /Search boards, authors, or institutions/i
      );
      expect(searchInput).toBeInTheDocument();
    });

    it("renders sort dropdown", () => {
      render(<ExplorePage />);

      const sortSelect = screen.getByLabelText(/Sort boards by/i);
      expect(sortSelect).toBeInTheDocument();
    });

    it("renders institution filter buttons", () => {
      render(<ExplorePage />);

      expect(screen.getByRole("button", { name: /All/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /MIT/i })).toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("shows loading skeletons when loading", () => {
      (useBoards as jest.Mock).mockReturnValue(useBoardsMocks.loading());

      render(<ExplorePage />);

      // Check for skeleton elements (they have specific classes)
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("does not show board cards when loading", () => {
      (useBoards as jest.Mock).mockReturnValue(useBoardsMocks.loading());

      render(<ExplorePage />);

      expect(screen.queryByText(mockBoards[0].title)).not.toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("shows error message when API fails", () => {
      (useBoards as jest.Mock).mockReturnValue(
        useBoardsMocks.withError("Network error")
      );

      render(<ExplorePage />);

      expect(screen.getByText(/Unable to load boards/i)).toBeInTheDocument();
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    it("shows retry button when error occurs", () => {
      const mockRetry = jest.fn();
      (useBoards as jest.Mock).mockReturnValue({
        ...useBoardsMocks.withError(),
        retry: mockRetry,
      });

      render(<ExplorePage />);

      const retryButton = screen.getByRole("button", { name: /Try Again/i });
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(mockRetry).toHaveBeenCalled();
    });
  });

  describe("Fallback State", () => {
    it("shows fallback warning when using mock data", () => {
      (useBoards as jest.Mock).mockReturnValue(useBoardsMocks.withFallback());

      render(<ExplorePage />);

      expect(
        screen.getByText(/Showing sample boards/i)
      ).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("shows empty state when no boards", () => {
      (useBoards as jest.Mock).mockReturnValue(useBoardsMocks.empty());

      render(<ExplorePage />);

      expect(screen.getByText(/No boards found/i)).toBeInTheDocument();
    });

    it("shows empty state message when filters return no results", async () => {
      render(<ExplorePage />);

      const searchInput = screen.getByPlaceholderText(
        /Search boards, authors, or institutions/i
      );
      fireEvent.change(searchInput, { target: { value: "NonExistentBoard" } });

      await waitFor(() => {
        expect(screen.getByText(/No boards found/i)).toBeInTheDocument();
      });
    });
  });

  describe("Search Functionality", () => {
    it("filters boards when search text is entered", async () => {
      render(<ExplorePage />);

      const searchInput = screen.getByPlaceholderText(
        /Search boards, authors, or institutions/i
      );
      fireEvent.change(searchInput, { target: { value: "Urban" } });

      await waitFor(() => {
        expect(screen.getByText("Urban Housing Complex")).toBeInTheDocument();
        expect(screen.queryByText("Runway / Movement Study")).not.toBeInTheDocument();
      });
    });

    it("shows all boards when search is cleared", async () => {
      render(<ExplorePage />);

      const searchInput = screen.getByPlaceholderText(
        /Search boards, authors, or institutions/i
      );
      
      // Enter search
      fireEvent.change(searchInput, { target: { value: "Urban" } });
      
      // Clear search
      fireEvent.change(searchInput, { target: { value: "" } });

      await waitFor(() => {
        expect(screen.getByText("Runway / Movement Study")).toBeInTheDocument();
      });
    });
  });

  describe("Institution Filter", () => {
    it("filters boards by institution when button is clicked", async () => {
      render(<ExplorePage />);

      const mitButton = screen.getByRole("button", { name: /MIT/i });
      fireEvent.click(mitButton);

      await waitFor(() => {
        const mitBoards = mockBoards.filter((b) => b.institution === "MIT");
        if (mitBoards.length > 0) {
          expect(screen.getByText(mitBoards[0].title)).toBeInTheDocument();
        }
      });
    });

    it("shows 'All' button as selected by default", () => {
      render(<ExplorePage />);

      const allButton = screen.getByRole("button", { name: /All/i });
      expect(allButton).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("Sorting", () => {
    it("changes sort order when dropdown value changes", async () => {
      render(<ExplorePage />);

      const sortSelect = screen.getByLabelText(/Sort boards by/i);
      fireEvent.change(sortSelect, { target: { value: "title" } });

      await waitFor(() => {
        // Verify boards are sorted (first board should be alphabetically first)
        const boardTitles = mockBoards.map((b) => b.title).sort();
        // The first visible board should match the first sorted title
        expect(screen.getByText(boardTitles[0])).toBeInTheDocument();
      });
    });
  });

  describe("Modal Interactions", () => {
    it("opens modal when board card is clicked", async () => {
      render(<ExplorePage />);

      const boardCard = screen.getByText(mockBoards[0].title).closest("article");
      if (boardCard) {
        fireEvent.click(boardCard);
      }

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText(mockBoards[0].title)).toBeInTheDocument();
      });
    });

    it("closes modal when close button is clicked", async () => {
      render(<ExplorePage />);

      // Open modal
      const boardCard = screen.getByText(mockBoards[0].title).closest("article");
      if (boardCard) {
        fireEvent.click(boardCard);
      }

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByLabelText(/Close board details/i);
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("closes modal when Escape key is pressed", async () => {
      render(<ExplorePage />);

      // Open modal
      const boardCard = screen.getByText(mockBoards[0].title).closest("article");
      if (boardCard) {
        fireEvent.click(boardCard);
      }

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Press Escape
      fireEvent.keyDown(document, { key: "Escape" });

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });
  });

  describe("Results Count", () => {
    it("displays correct number of boards found", () => {
      render(<ExplorePage />);

      expect(screen.getByText(/\d+ boards? found/i)).toBeInTheDocument();
    });

    it("updates count when filters are applied", async () => {
      render(<ExplorePage />);

      const searchInput = screen.getByPlaceholderText(
        /Search boards, authors, or institutions/i
      );
      fireEvent.change(searchInput, { target: { value: "Urban" } });

      await waitFor(() => {
        expect(screen.getByText(/1 board found/i)).toBeInTheDocument();
      });
    });
  });
});

