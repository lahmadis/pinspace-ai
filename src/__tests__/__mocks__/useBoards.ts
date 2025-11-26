/**
 * Mock implementation of useBoards hook for testing
 * 
 * This allows us to test components that depend on useBoards without
 * making actual API calls. Use jest.mock() to replace the real hook.
 */

import type { BoardCardData } from "@/types/boards";
import { mockBoards } from "./mockData";

export interface UseBoardsReturn {
  boards: BoardCardData[];
  loading: boolean;
  error: string | null;
  usingFallback: boolean;
  retry: () => void;
}

/**
 * Default mock return values
 */
export const defaultUseBoardsReturn: UseBoardsReturn = {
  boards: mockBoards,
  loading: false,
  error: null,
  usingFallback: false,
  retry: jest.fn(),
};

/**
 * Mock implementations for different scenarios
 */
export const useBoardsMocks = {
  // Normal state with boards
  withBoards: (): UseBoardsReturn => ({
    ...defaultUseBoardsReturn,
  }),

  // Loading state
  loading: (): UseBoardsReturn => ({
    ...defaultUseBoardsReturn,
    boards: [],
    loading: true,
  }),

  // Error state
  withError: (errorMessage: string = "Failed to fetch boards"): UseBoardsReturn => ({
    ...defaultUseBoardsReturn,
    boards: [],
    loading: false,
    error: errorMessage,
    usingFallback: false,
  }),

  // Using fallback data
  withFallback: (): UseBoardsReturn => ({
    ...defaultUseBoardsReturn,
    usingFallback: true,
  }),

  // Empty state
  empty: (): UseBoardsReturn => ({
    ...defaultUseBoardsReturn,
    boards: [],
  }),

  // Custom boards
  withCustomBoards: (boards: BoardCardData[]): UseBoardsReturn => ({
    ...defaultUseBoardsReturn,
    boards,
  }),
};

