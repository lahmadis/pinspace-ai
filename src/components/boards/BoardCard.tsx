"use client";

import React from "react";
import Card from "@/components/ui/Card";
import type { BoardCardData, BoardCardDisplayOptions } from "@/types/boards";
import { useFavorites } from "@/hooks/useFavorites";
import { useTranslation } from "@/lib/i18n";
import { generateBoardCardAriaLabel } from "@/lib/a11y";

/**
 * BoardCard component props
 * 
 * @interface BoardCardProps
 */
export interface BoardCardProps {
  /** Board data to display */
  board: BoardCardData;
  /** Display options for customizing card appearance */
  displayOptions?: BoardCardDisplayOptions;
  /** Callback when card is clicked */
  onCardClick?: (board: BoardCardData) => void;
  /** Callback when favorite is toggled */
  onFavoriteToggle?: (boardId: string, isFavorite: boolean) => void;
}

/**
 * BoardCard Component
 * 
 * A configurable, reusable board card component that displays board information
 * in a card format. Used in Explore, My Boards, Favorites, and other board listing views.
 * 
 * Features:
 * - Configurable display options (show/hide metadata, actions)
 * - Favorite/bookmark functionality
 * - Smooth animations and hover effects
 * - Full keyboard accessibility
 * - Dark mode support
 * - Responsive design
 * 
 * @component
 * @example
 * ```tsx
 * <BoardCard
 *   board={boardData}
 *   displayOptions={{
 *     showFavorite: true,
 *     showAuthor: true,
 *     showInstitution: true,
 *   }}
 *   onCardClick={(board) => openModal(board)}
 * />
 * ```
 */
export default function BoardCard({
  board,
  displayOptions = {},
  onCardClick,
  onFavoriteToggle,
}: BoardCardProps) {
  const {
    showFavorite = true,
    showAuthor = true,
    showInstitution = true,
    showTimeAgo = true,
    showPreview = true,
    size = "md",
    layout = "grid",
  } = displayOptions;

  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(board.id);
  const t = useTranslation();

  // Fallback pastel colors if no preview image
  const fallbackColors = [
    "#DBEAFE", // light blue
    "#FEF3C7", // light yellow
    "#FDE68A", // light amber
    "#E9D5FF", // light purple
    "#DCFCE7", // light green
  ];
  const coverColor =
    board.coverColor ||
    fallbackColors[(board.id.charCodeAt(0) || 0) % fallbackColors.length];

  // Size-based height classes for preview
  const previewHeightClasses = {
    sm: "h-32",
    md: "h-48",
    lg: "h-64",
  };

  // Generate comprehensive accessible label for screen readers using i18n
  const ariaLabel = generateBoardCardAriaLabel(
    board.title,
    showAuthor ? board.authorName : undefined,
    showInstitution ? board.institution : undefined,
    showTimeAgo ? board.timeAgo : undefined
  );

  // Handle card click
  const handleCardClick = () => {
    onCardClick?.(board);
  };

  // Handle favorite toggle
  const handleFavoriteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent card click
    const newFavoriteState = !favorited;
    toggleFavorite(board.id);
    onFavoriteToggle?.(board.id, newFavoriteState);
  };

  // Handle keyboard activation (Enter or Space)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCardClick();
    }
  };

  // Handle favorite button keyboard activation
  const handleFavoriteKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation(); // Prevent card click
      const newFavoriteState = !favorited;
      toggleFavorite(board.id);
      onFavoriteToggle?.(board.id, newFavoriteState);
    }
  };

  return (
    <Card
      clickable
      hoverable
      variant="outlined"
      padding="none"
      className="overflow-hidden transition-all duration-300 group hover:scale-[1.02] active:scale-[0.98]"
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={ariaLabel}
      aria-describedby={`board-${board.id}-description`}
      aria-labelledby={`board-${board.id}-title`}
    >
      {/* Preview Image/Thumbnail */}
      {showPreview && (
        <div
          className={`w-full ${previewHeightClasses[size]} bg-gray-100 dark:bg-gray-700 overflow-hidden relative`}
          style={{ backgroundColor: coverColor }}
          aria-hidden="true"
        >
          {board.previewImage ? (
            <img
              src={board.previewImage}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-110"
              role="presentation"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-xs text-gray-400 dark:text-gray-500" aria-label={t("boardCard.noPreview")}>
                {t("boardCard.noPreview")}
              </div>
            </div>
          )}

          {/* Favorite Button */}
          {showFavorite && (
            <button
              onClick={handleFavoriteClick}
              onKeyDown={handleFavoriteKeyDown}
              className={`absolute top-2 right-2 p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                favorited
                  ? "bg-yellow-400 dark:bg-yellow-500 text-yellow-900 dark:text-yellow-900 shadow-md"
                  : "bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-yellow-400 dark:hover:text-yellow-500"
              }`}
              aria-label={favorited ? t("boardCard.removeFavorite", { title: board.title }) : t("boardCard.addFavorite", { title: board.title })}
              aria-pressed={favorited}
              tabIndex={0}
              type="button"
            >
              <svg
                className="w-5 h-5"
                fill={favorited ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Card Content */}
      <div className="p-4">
        {/* Board Title */}
        <h3 id={`board-${board.id}-title`} className="text-base font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
          {board.title}
        </h3>

        {/* Author Name */}
        {showAuthor && (
          <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">
            <span className="font-medium" aria-label={t("boardCard.author", { author: board.authorName })}>
              {board.authorName}
            </span>
          </div>
        )}

        {/* Institution */}
        {showInstitution && (
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2" aria-label={t("boardCard.institution", { institution: board.institution })}>
            {board.institution}
          </div>
        )}

        {/* Time Ago */}
        {showTimeAgo && (
          <div
            className="text-xs text-gray-500 dark:text-gray-500"
            aria-label={t("boardCard.lastEdited", { time: board.timeAgo })}
          >
            <time dateTime={board.timeAgo} aria-label={t("boardCard.lastEdited", { time: board.timeAgo })}>
              {board.timeAgo}
            </time>
          </div>
        )}
      </div>

      {/* Hidden description for screen readers */}
      <div id={`board-${board.id}-description`} className="sr-only">
        {t("boardCard.description", {
          title: board.title,
          author: board.authorName,
          institution: board.institution,
          time: board.timeAgo,
        })}
      </div>
    </Card>
  );
}

