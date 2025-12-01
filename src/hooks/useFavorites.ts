"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * useFavorites Hook
 * 
 * Manages favorite/bookmarked boards using localStorage.
 * 
 * Features:
 * - Persists favorites across page reloads
 * - Provides toggle function for adding/removing favorites
 * - Returns current favorite state for any board ID
 * 
 * Storage:
 * - Uses localStorage key: "pinspace-favorites"
 * - Stores array of board IDs: ["board-1", "board-2", ...]
 * 
 * TODO: API Integration
 * When backend is ready, replace localStorage with API calls:
 * - GET /api/user/favorites - fetch user's favorites
 * - POST /api/user/favorites/:boardId - add favorite
 * - DELETE /api/user/favorites/:boardId - remove favorite
 */

const STORAGE_KEY = "pinspace-favorites";

/**
 * Get all favorite board IDs from localStorage
 */
function getFavoritesFromStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error reading favorites from localStorage:", error);
    return [];
  }
}

/**
 * Save favorite board IDs to localStorage
 */
function saveFavoritesToStorage(favorites: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error("Error saving favorites to localStorage:", error);
  }
}

/**
 * Custom hook for managing favorite boards
 * 
 * @returns Object with:
 * - favorites: Set of favorite board IDs
 * - isFavorite: Function to check if a board is favorited
 * - toggleFavorite: Function to add/remove a board from favorites
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Load favorites from localStorage on mount
  useEffect(() => {
    const stored = getFavoritesFromStorage();
    setFavorites(new Set(stored));
  }, []);

  /**
   * Check if a board is favorited
   */
  const isFavorite = useCallback(
    (boardId: string): boolean => {
      return favorites.has(boardId);
    },
    [favorites]
  );

  /**
   * Toggle favorite status for a board
   * Adds to favorites if not favorited, removes if already favorited
   */
  const toggleFavorite = useCallback(
    (boardId: string) => {
      setFavorites((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(boardId)) {
          newSet.delete(boardId);
        } else {
          newSet.add(boardId);
        }

        // Persist to localStorage
        saveFavoritesToStorage(Array.from(newSet));

        return newSet;
      });
    },
    []
  );

  return {
    favorites,
    isFavorite,
    toggleFavorite,
  };
}











