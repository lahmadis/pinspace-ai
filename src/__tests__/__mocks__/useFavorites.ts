/**
 * Mock implementation of useFavorites hook for testing
 */

export interface UseFavoritesReturn {
  favorites: Set<string>;
  isFavorite: (boardId: string) => boolean;
  toggleFavorite: (boardId: string) => void;
}

/**
 * Default mock return values
 */
export const defaultUseFavoritesReturn: UseFavoritesReturn = {
  favorites: new Set<string>(),
  isFavorite: jest.fn((boardId: string) => false),
  toggleFavorite: jest.fn(),
};

/**
 * Mock implementations for different scenarios
 */
export const useFavoritesMocks = {
  // No favorites
  empty: (): UseFavoritesReturn => defaultUseFavoritesReturn,

  // With some favorites
  withFavorites: (favoriteIds: string[]): UseFavoritesReturn => ({
    favorites: new Set(favoriteIds),
    isFavorite: jest.fn((boardId: string) => favoriteIds.includes(boardId)),
    toggleFavorite: jest.fn(),
  }),

  // All boards favorited
  allFavorited: (boardIds: string[]): UseFavoritesReturn => ({
    favorites: new Set(boardIds),
    isFavorite: jest.fn(() => true),
    toggleFavorite: jest.fn(),
  }),
};










