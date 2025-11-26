/**
 * Student Board Storage Utility
 * 
 * Handles local persistence of student board state using localStorage.
 * Stores board elements, comments, and pen strokes for each board ID.
 * 
 * Future: Backend/Cloud Sync
 * - Replace localStorage calls with API calls to backend
 * - Add authentication headers to API requests
 * - Handle sync conflicts (last-write-wins or merge strategies)
 * - Add real-time sync via WebSocket/Server-Sent Events
 * - Add offline queue for changes when network is unavailable
 * - Migrate to IndexedDB for larger storage capacity
 * - Add compression for large board states
 */

import type { CanvasElement } from "@/types";
import type { PenStroke } from "@/hooks/usePenDrawing";

/**
 * Complete board state for persistence
 */
export interface SavedBoardState {
  elements: (CanvasElement & { text?: string; color?: string; src?: string })[];
  comments: Array<{ elementId: string; comments: string[] }>; // Converted from Map for JSON serialization
  penStrokes: PenStroke[];
  lastSaved: string; // ISO timestamp
  version: number; // For future migration support
}

// Storage key prefix
const STORAGE_KEY_PREFIX = "pinspace_student_board_";

/**
 * Get storage key for a specific board ID
 */
function getStorageKey(boardId: string): string {
  return `${STORAGE_KEY_PREFIX}${boardId}`;
}

/**
 * Convert comments Map to array for JSON serialization
 */
function mapToArray(comments: Map<string, string[]>): Array<{ elementId: string; comments: string[] }> {
  return Array.from(comments.entries()).map(([elementId, comments]) => ({
    elementId,
    comments,
  }));
}

/**
 * Convert comments array back to Map
 */
function arrayToMap(commentsArray: Array<{ elementId: string; comments: string[] }>): Map<string, string[]> {
  const map = new Map<string, string[]>();
  commentsArray.forEach(({ elementId, comments }) => {
    map.set(elementId, comments);
  });
  return map;
}

/**
 * Save board state to localStorage
 * 
 * Stores complete board state including:
 * - Elements (stickies, images, PDFs, etc.)
 * - Comments (element annotations)
 * - Pen strokes (drawings)
 * - Metadata (last saved timestamp, version)
 * 
 * Future: Backend sync
 * - POST /api/boards/:boardId/state
 * - Include user authentication
 * - Handle save conflicts
 * - Add optimistic updates with rollback on failure
 */
export function saveBoardState(
  boardId: string,
  elements: (CanvasElement & { text?: string; color?: string; src?: string })[],
  comments: Map<string, string[]>,
  penStrokes: PenStroke[]
): void {
  if (typeof window === "undefined") {
    // SSR: Don't access localStorage on server
    return;
  }

  try {
    const state: SavedBoardState = {
      elements,
      comments: mapToArray(comments),
      penStrokes,
      lastSaved: new Date().toISOString(),
      version: 1, // Increment for future migrations
    };

    const storageKey = getStorageKey(boardId);
    localStorage.setItem(storageKey, JSON.stringify(state));

    // Future: Backend sync
    // await fetch(`/api/boards/${boardId}/state`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    //   body: JSON.stringify(state)
    // });
  } catch (err) {
    console.error("Error saving board state to localStorage", err);
    // Future: Show user-friendly error message
    // toast.error("Failed to save board. Please try again.");
  }
}

/**
 * Load board state from localStorage
 * 
 * Retrieves saved board state if it exists.
 * Returns null if no saved state is found.
 * 
 * Future: Backend sync
 * - GET /api/boards/:boardId/state
 * - Include user authentication
 * - Handle network errors gracefully
 * - Add loading states
 */
export function loadBoardState(boardId: string): SavedBoardState | null {
  if (typeof window === "undefined") {
    // SSR: Return null on server
    return null;
  }

  try {
    const storageKey = getStorageKey(boardId);
    const data = localStorage.getItem(storageKey);
    
    if (!data) {
      return null;
    }

    const state = JSON.parse(data) as SavedBoardState;
    
    // Future: Handle version migrations
    // if (state.version < CURRENT_VERSION) {
    //   state = migrateState(state);
    // }

    return state;
  } catch (err) {
    console.error("Error loading board state from localStorage", err);
    return null;
  }

  // Future: Backend sync
  // try {
  //   const response = await fetch(`/api/boards/${boardId}/state`, {
  //     headers: { 'Authorization': `Bearer ${token}` }
  //   });
  //   if (response.ok) {
  //     const state = await response.json();
  //     return state;
  //   }
  // } catch (err) {
  //   console.error("Error loading board state from backend", err);
  //   // Fallback to localStorage if backend fails
  // }
}

/**
 * Clear saved board state from localStorage
 * 
 * Removes the saved state for a specific board ID.
 * 
 * Future: Backend sync
 * - DELETE /api/boards/:boardId/state
 * - Include user authentication
 * - Handle deletion errors
 */
export function clearBoardState(boardId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const storageKey = getStorageKey(boardId);
    localStorage.removeItem(storageKey);

    // Future: Backend sync
    // await fetch(`/api/boards/${boardId}/state`, {
    //   method: 'DELETE',
    //   headers: { 'Authorization': `Bearer ${token}` }
    // });
  } catch (err) {
    console.error("Error clearing board state from localStorage", err);
  }
}

/**
 * Check if a saved board state exists
 */
export function hasSavedBoardState(boardId: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const storageKey = getStorageKey(boardId);
    return localStorage.getItem(storageKey) !== null;
  } catch (err) {
    return false;
  }
}

/**
 * Get last saved timestamp for a board
 */
export function getLastSavedTime(boardId: string): string | null {
  const state = loadBoardState(boardId);
  return state?.lastSaved || null;
}







