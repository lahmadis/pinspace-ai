/**
 * BoardCard Component Tests
 * 
 * Tests for the BoardCard component including:
 * - Rendering with different display options
 * - Favorite functionality
 * - Click handlers
 * - Keyboard accessibility
 * - Dark mode support
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BoardCard from "@/components/boards/BoardCard";
import { singleBoard, boardWithoutImage } from "@/__tests__/__mocks__/mockData";
import { useFavoritesMocks } from "@/__tests__/__mocks__/useFavorites";

// Mock the useFavorites hook
jest.mock("@/hooks/useFavorites", () => ({
  useFavorites: jest.fn(),
}));

// Mock i18n
jest.mock("@/lib/i18n", () => ({
  useTranslation: () => (key: string, params?: Record<string, string | number>) => {
    const translations: Record<string, string> = {
      "boardCard.noPreview": "No preview",
      "boardCard.addFavorite": `Add ${params?.title || ""} to favorites`,
      "boardCard.removeFavorite": `Remove ${params?.title || ""} from favorites`,
      "boardCard.author": `Author: ${params?.author || ""}`,
      "boardCard.institution": `Institution: ${params?.institution || ""}`,
      "boardCard.lastEdited": `Last edited ${params?.time || ""}`,
      "boardCard.description": `Board titled ${params?.title || ""} created by ${params?.author || ""} from ${params?.institution || ""}. Last edited ${params?.time || ""}. Press Enter or Space to view board details. Press Tab to access favorite button.`,
    };
    return translations[key] || key;
  },
  generateBoardCardAriaLabel: jest.fn((title, author, institution, timeAgo) => {
    return `${title}${author ? ` by ${author}` : ""}${institution ? ` from ${institution}` : ""}${timeAgo ? `, last edited ${timeAgo}` : ""}. Click to view board details.`;
  }),
}));

import { useFavorites } from "@/hooks/useFavorites";

describe("BoardCard", () => {
  const mockOnCardClick = jest.fn();
  const mockOnFavoriteToggle = jest.fn();
  const mockToggleFavorite = jest.fn();
  const mockIsFavorite = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFavorite.mockReturnValue(false);
    (useFavorites as jest.Mock).mockReturnValue({
      favorites: new Set(),
      isFavorite: mockIsFavorite,
      toggleFavorite: mockToggleFavorite,
    });
  });

  describe("Rendering", () => {
    it("renders board card with all information", () => {
      render(
        <BoardCard
          board={singleBoard}
          onCardClick={mockOnCardClick}
          onFavoriteToggle={mockOnFavoriteToggle}
        />
      );

      expect(screen.getByText(singleBoard.title)).toBeInTheDocument();
      expect(screen.getByText(singleBoard.authorName)).toBeInTheDocument();
      expect(screen.getByText(singleBoard.institution)).toBeInTheDocument();
      expect(screen.getByText(singleBoard.timeAgo)).toBeInTheDocument();
    });

    it("renders preview image when provided", () => {
      render(<BoardCard board={singleBoard} />);

      const image = screen.getByRole("img", { hidden: true });
      expect(image).toHaveAttribute("src", singleBoard.previewImage);
    });

    it("renders fallback when no preview image", () => {
      render(<BoardCard board={boardWithoutImage} />);

      expect(screen.getByText("No preview")).toBeInTheDocument();
    });

    it("uses coverColor as background when no image", () => {
      const { container } = render(<BoardCard board={boardWithoutImage} />);
      const previewDiv = container.querySelector('[style*="background-color"]');
      
      expect(previewDiv).toHaveStyle({
        backgroundColor: boardWithoutImage.coverColor,
      });
    });
  });

  describe("Display Options", () => {
    it("hides author when showAuthor is false", () => {
      render(
        <BoardCard
          board={singleBoard}
          displayOptions={{ showAuthor: false }}
        />
      );

      expect(screen.queryByText(singleBoard.authorName)).not.toBeInTheDocument();
    });

    it("hides institution when showInstitution is false", () => {
      render(
        <BoardCard
          board={singleBoard}
          displayOptions={{ showInstitution: false }}
        />
      );

      expect(screen.queryByText(singleBoard.institution)).not.toBeInTheDocument();
    });

    it("hides timeAgo when showTimeAgo is false", () => {
      render(
        <BoardCard
          board={singleBoard}
          displayOptions={{ showTimeAgo: false }}
        />
      );

      expect(screen.queryByText(singleBoard.timeAgo)).not.toBeInTheDocument();
    });

    it("hides favorite button when showFavorite is false", () => {
      render(
        <BoardCard
          board={singleBoard}
          displayOptions={{ showFavorite: false }}
        />
      );

      const favoriteButton = screen.queryByRole("button", {
        name: /favorite/i,
      });
      expect(favoriteButton).not.toBeInTheDocument();
    });

    it("hides preview when showPreview is false", () => {
      const { container } = render(
        <BoardCard
          board={singleBoard}
          displayOptions={{ showPreview: false }}
        />
      );

      const previewSection = container.querySelector('[aria-hidden="true"]');
      expect(previewSection).not.toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("calls onCardClick when card is clicked", () => {
      render(
        <BoardCard board={singleBoard} onCardClick={mockOnCardClick} />
      );

      const card = screen.getByRole("article");
      fireEvent.click(card);

      expect(mockOnCardClick).toHaveBeenCalledWith(singleBoard);
      expect(mockOnCardClick).toHaveBeenCalledTimes(1);
    });

    it("calls onCardClick when Enter key is pressed", () => {
      render(
        <BoardCard board={singleBoard} onCardClick={mockOnCardClick} />
      );

      const card = screen.getByRole("article");
      fireEvent.keyDown(card, { key: "Enter" });

      expect(mockOnCardClick).toHaveBeenCalledWith(singleBoard);
    });

    it("calls onCardClick when Space key is pressed", () => {
      render(
        <BoardCard board={singleBoard} onCardClick={mockOnCardClick} />
      );

      const card = screen.getByRole("article");
      fireEvent.keyDown(card, { key: " " });

      expect(mockOnCardClick).toHaveBeenCalledWith(singleBoard);
    });

    it("does not call onCardClick when favorite button is clicked", () => {
      render(
        <BoardCard
          board={singleBoard}
          onCardClick={mockOnCardClick}
          onFavoriteToggle={mockOnFavoriteToggle}
        />
      );

      const favoriteButton = screen.getByRole("button", {
        name: /add.*favorite/i,
      });
      fireEvent.click(favoriteButton);

      expect(mockOnCardClick).not.toHaveBeenCalled();
      expect(mockToggleFavorite).toHaveBeenCalledWith(singleBoard.id);
    });

    it("calls onFavoriteToggle when favorite is toggled", () => {
      render(
        <BoardCard
          board={singleBoard}
          onFavoriteToggle={mockOnFavoriteToggle}
        />
      );

      const favoriteButton = screen.getByRole("button", {
        name: /add.*favorite/i,
      });
      fireEvent.click(favoriteButton);

      expect(mockOnFavoriteToggle).toHaveBeenCalledWith(
        singleBoard.id,
        true
      );
    });
  });

  describe("Favorite State", () => {
    it("shows favorited state when board is favorited", () => {
      (useFavorites as jest.Mock).mockReturnValue({
        favorites: new Set([singleBoard.id]),
        isFavorite: jest.fn((id) => id === singleBoard.id),
        toggleFavorite: mockToggleFavorite,
      });

      render(<BoardCard board={singleBoard} />);

      const favoriteButton = screen.getByRole("button", {
        name: /remove.*favorite/i,
      });
      expect(favoriteButton).toBeInTheDocument();
      expect(favoriteButton).toHaveAttribute("aria-pressed", "true");
    });

    it("shows unfavorited state when board is not favorited", () => {
      (useFavorites as jest.Mock).mockReturnValue({
        favorites: new Set(),
        isFavorite: jest.fn(() => false),
        toggleFavorite: mockToggleFavorite,
      });

      render(<BoardCard board={singleBoard} />);

      const favoriteButton = screen.getByRole("button", {
        name: /add.*favorite/i,
      });
      expect(favoriteButton).toBeInTheDocument();
      expect(favoriteButton).toHaveAttribute("aria-pressed", "false");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA label", () => {
      render(<BoardCard board={singleBoard} />);

      const card = screen.getByRole("article");
      expect(card).toHaveAttribute("aria-label");
      expect(card.getAttribute("aria-label")).toContain(singleBoard.title);
    });

    it("has proper ARIA description", () => {
      render(<BoardCard board={singleBoard} />);

      const description = screen.getByText(
        new RegExp(`Board titled ${singleBoard.title}`, "i")
      );
      expect(description).toHaveClass("sr-only");
    });

    it("favorite button has proper ARIA label", () => {
      render(<BoardCard board={singleBoard} />);

      const favoriteButton = screen.getByRole("button", {
        name: /favorite/i,
      });
      expect(favoriteButton).toHaveAttribute("aria-label");
    });

    it("favorite button has aria-pressed attribute", () => {
      render(<BoardCard board={singleBoard} />);

      const favoriteButton = screen.getByRole("button", {
        name: /favorite/i,
      });
      expect(favoriteButton).toHaveAttribute("aria-pressed");
    });
  });
});

