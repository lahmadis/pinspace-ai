/**
 * Board-related TypeScript types and interfaces
 * 
 * This file contains all type definitions for board cards, board lists,
 * filtering, sorting, and related functionality used across the PinSpace app.
 * 
 * @module types/boards
 */

/**
 * Board card data structure
 * 
 * Represents the data needed to display a board in a card format.
 * Used in Explore, My Boards, Favorites, and other board listing views.
 * 
 * @interface BoardCardData
 */
export interface BoardCardData {
  /** Unique identifier for the board */
  id: string;
  /** Board/project title */
  title: string;
  /** Name of the board creator/author */
  authorName: string;
  /** School or institution name */
  institution: string;
  /** Relative time string (e.g., "2h ago", "3d ago", "Just now") */
  timeAgo: string;
  /** Optional preview image URL for the board thumbnail */
  previewImage?: string;
  /** Optional fallback color if no preview image (hex color code) */
  coverColor?: string;
  /** Optional board description (for future API integration) */
  description?: string;
  /** Optional author contact information (for future API integration) */
  authorContact?: string;
}

/**
 * Board card display options
 * 
 * Controls what metadata and actions are shown on board cards.
 * Allows different views (Explore, My Boards, Favorites) to customize card appearance.
 * 
 * @interface BoardCardDisplayOptions
 */
export interface BoardCardDisplayOptions {
  /** Show favorite button on card */
  showFavorite?: boolean;
  /** Show author name */
  showAuthor?: boolean;
  /** Show institution */
  showInstitution?: boolean;
  /** Show time ago */
  showTimeAgo?: boolean;
  /** Show preview image */
  showPreview?: boolean;
  /** Custom action buttons to display (e.g., "Edit", "Delete", "Share") */
  customActions?: BoardCardAction[];
  /** Card size variant */
  size?: "sm" | "md" | "lg";
  /** Card layout variant */
  layout?: "grid" | "list";
}

/**
 * Custom action button for board cards
 * 
 * @interface BoardCardAction
 */
export interface BoardCardAction {
  /** Action label/text */
  label: string;
  /** Action icon (optional) */
  icon?: React.ReactNode;
  /** Click handler */
  onClick: (boardId: string) => void;
  /** Button variant/style */
  variant?: "primary" | "secondary" | "danger";
  /** ARIA label for accessibility */
  ariaLabel?: string;
}

/**
 * Board filter criteria
 * 
 * Used for filtering boards by search term, institution, and other criteria.
 * 
 * @interface BoardFilterCriteria
 */
export interface BoardFilterCriteria {
  /** Search query (searches title, author, institution) */
  search?: string;
  /** Selected institution filter (or "All" for no filter) */
  selectedInstitution?: string;
  /** Additional custom filters (for future extensibility) */
  customFilters?: Record<string, any>;
}

/**
 * Board sort option
 * 
 * @type BoardSortOption
 */
export type BoardSortOption = "recent" | "popular" | "title" | "author" | "institution";

/**
 * Board list configuration
 * 
 * Configuration object for board list components.
 * Allows different pages (Explore, My Boards, etc.) to customize behavior.
 * 
 * @interface BoardListConfig
 */
export interface BoardListConfig {
  /** Filter criteria */
  filters: BoardFilterCriteria;
  /** Sort option */
  sortBy: BoardSortOption;
  /** Display options for cards */
  displayOptions: BoardCardDisplayOptions;
  /** Whether to show loading state */
  showLoading?: boolean;
  /** Whether to show empty state */
  showEmptyState?: boolean;
  /** Custom empty state message */
  emptyStateMessage?: string;
  /** Grid columns configuration (responsive) */
  gridColumns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

/**
 * Board list event handlers
 * 
 * Callback functions for board list interactions.
 * 
 * @interface BoardListHandlers
 */
export interface BoardListHandlers {
  /** Called when a board card is clicked */
  onCardClick?: (board: BoardCardData) => void;
  /** Called when search query changes */
  onSearchChange?: (search: string) => void;
  /** Called when institution filter changes */
  onInstitutionFilterChange?: (institution: string) => void;
  /** Called when sort option changes */
  onSortChange?: (sortBy: BoardSortOption) => void;
  /** Called when favorite is toggled */
  onFavoriteToggle?: (boardId: string, isFavorite: boolean) => void;
}








