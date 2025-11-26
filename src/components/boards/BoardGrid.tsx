"use client";

import React from "react";
import BoardCard from "./BoardCard";
import BoardCardSkeleton from "./BoardCardSkeleton";
import type { BoardCardData, BoardCardDisplayOptions } from "@/types/boards";
import { useTranslation } from "@/lib/i18n";

/**
 * BoardGrid component props
 * 
 * @interface BoardGridProps
 */
export interface BoardGridProps {
  /** Boards to display */
  boards: BoardCardData[];
  /** Whether to show loading skeletons */
  loading?: boolean;
  /** Number of skeleton cards to show while loading */
  skeletonCount?: number;
  /** Display options for board cards */
  displayOptions?: BoardCardDisplayOptions;
  /** Callback when a card is clicked */
  onCardClick?: (board: BoardCardData) => void;
  /** Callback when favorite is toggled */
  onFavoriteToggle?: (boardId: string, isFavorite: boolean) => void;
  /** Grid columns configuration (responsive) */
  gridColumns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  /** Additional CSS classes */
  className?: string;
}

/**
 * BoardGrid Component
 * 
 * A reusable grid layout component for displaying board cards.
 * Handles loading states, responsive grid columns, and animations.
 * 
 * @component
 * @example
 * ```tsx
 * <BoardGrid
 *   boards={filteredBoards}
 *   loading={isLoading}
 *   displayOptions={{ showFavorite: true }}
 *   onCardClick={(board) => openModal(board)}
 *   gridColumns={{ sm: 1, md: 2, lg: 3, xl: 4 }}
 * />
 * ```
 */
export default function BoardGrid({
  boards,
  loading = false,
  skeletonCount = 8,
  displayOptions,
  onCardClick,
  onFavoriteToggle,
  gridColumns = { sm: 1, md: 2, lg: 3, xl: 4 },
  className = "",
}: BoardGridProps) {
  // Generate grid column classes (using explicit Tailwind classes)
  const smCols = gridColumns.sm || 1;
  const mdCols = gridColumns.md || gridColumns.sm || 2;
  const lgCols = gridColumns.lg || gridColumns.md || 3;
  const xlCols = gridColumns.xl || gridColumns.lg || 4;
  
  // Map column counts to Tailwind classes
  const colClasses: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  };
  
  const t = useTranslation();
  
  const gridClasses = `
    grid gap-4 sm:gap-6
    ${colClasses[smCols] || "grid-cols-1"}
    sm:${colClasses[mdCols] || "grid-cols-2"}
    lg:${colClasses[lgCols] || "grid-cols-3"}
    xl:${colClasses[xlCols] || "grid-cols-4"}
    ${className}
  `.trim().replace(/\s+/g, " ");

  if (loading) {
    return (
      <ul
        className={gridClasses}
        role="list"
        aria-label={t("explore.loading")}
        aria-live="polite"
      >
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <li key={`skeleton-${i}`} role="listitem">
            <BoardCardSkeleton size={displayOptions?.size || "md"} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul
      className={gridClasses}
      role="list"
      aria-label={t("explore.resultsCount", { count: boards.length })}
    >
      {boards.map((board, index) => (
        <li
          key={board.id}
          role="listitem"
          className="animate-fadeIn"
          style={{
            animationDelay: `${index * 0.05}s`,
          }}
        >
          <BoardCard
            board={board}
            displayOptions={displayOptions}
            onCardClick={onCardClick}
            onFavoriteToggle={onFavoriteToggle}
          />
        </li>
      ))}
    </ul>
  );
}

