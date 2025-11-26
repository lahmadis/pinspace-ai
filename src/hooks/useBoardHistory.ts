"use client";

import { useState, useCallback, useRef } from "react";
import type { CanvasElement } from "@/types";
import type { PenStroke } from "@/hooks/usePenDrawing";
import type { AnnotationShape } from "@/types/annotation";

/**
 * Board History State
 * 
 * Tracks complete board state for undo/redo functionality.
 * Includes elements, comments, pen strokes, and annotations to support full state restoration.
 * 
 * Future: LMS Integration
 * - Add critique points to history
 * - Add comment threads to history
 * - Track grade associations
 */
export interface BoardState {
  elements: (CanvasElement & { text?: string; color?: string })[];
  comments: Map<string, string[]>; // elementId -> comments array
  penStrokes: PenStroke[]; // All pen strokes drawn on the board
  annotations?: AnnotationShape[]; // Annotation shapes (rectangles, ellipses, arrows, text boxes, highlights)
}

/**
 * useBoardHistory Hook
 * 
 * Manages undo/redo history for board state changes.
 * 
 * Features:
 * - Tracks complete board state (elements + comments)
 * - Maintains separate past and future stacks
 * - Limits history to prevent memory issues (max 50 states)
 * - Provides undo/redo functions and availability checks
 * 
 * Future: Collaborative undo/redo
 * - Add user ID to each history entry
 * - Merge history from multiple users
 * - Sync history via WebSocket/Server-Sent Events
 * - Add conflict resolution for simultaneous edits
 * - Add remote undo/redo support
 */
export function useBoardHistory(initialState: BoardState) {
  // History stacks
  const [past, setPast] = useState<BoardState[]>([]);
  const [present, setPresent] = useState<BoardState>(initialState);
  const [future, setFuture] = useState<BoardState[]>([]);

  // Maximum history size to prevent memory issues
  const MAX_HISTORY_SIZE = 50;

  /**
   * Deep clone board state
   * 
   * Creates a complete copy of the board state including:
   * - Elements array (deep cloned)
   * - Comments Map (deep cloned)
   * - Pen strokes array (deep cloned)
   */
  const cloneState = useCallback((state: BoardState): BoardState => {
    return {
      elements: state.elements.map((el) => ({ ...el })),
      comments: new Map(
        Array.from(state.comments.entries()).map(([key, value]) => [
          key,
          [...value],
        ])
      ),
      penStrokes: state.penStrokes.map((stroke) => ({
        ...stroke,
        points: stroke.points.map((p) => ({ ...p })),
      })),
      annotations: state.annotations?.map((ann) => ({ ...ann })) || [],
    };
  }, []);

  /**
   * Record a new state in history
   * 
   * Called before making any state change to save the current state.
   * Pushes current state to past stack and clears future stack.
   * 
   * Usage:
   *   const currentState = recordHistory();
   *   // Make changes to state
   *   setElements(newElements);
   */
  const recordHistory = useCallback((): BoardState => {
    const currentState = cloneState(present);

    // Add current state to past (limit size)
    setPast((prevPast) => {
      const newPast = [...prevPast, currentState];
      if (newPast.length > MAX_HISTORY_SIZE) {
        return newPast.slice(-MAX_HISTORY_SIZE); // Keep only last 50
      }
      return newPast;
    });

    // Clear future (new action invalidates redo)
    setFuture([]);

    return currentState;
  }, [present, cloneState]);

  /**
   * Update present state
   * 
   * Updates the current board state. Should be called after recordHistory().
   */
  const updatePresent = useCallback((newState: BoardState) => {
    setPresent(cloneState(newState));
  }, [cloneState]);

  /**
   * Undo last action
   * 
   * Restores the previous state from history.
   * Moves current state to future stack for redo.
   * 
   * Note: State updates are asynchronous. The restored state will be available
   * in the `present` value after React re-renders.
   */
  const undo = useCallback((): void => {
    setPast((prevPast) => {
      if (prevPast.length === 0) {
        return prevPast; // No history to undo
      }

      // Move current state to future (for redo)
      const currentState = cloneState(present);
      
      // Pop previous state from past
      const newPast = [...prevPast];
      const previousState = newPast.pop()!;
      const restoredState = cloneState(previousState);
      
      setPresent(restoredState);
      setFuture((prevFuture) => [currentState, ...prevFuture]);
      
      return newPast;
    });
  }, [past, present, cloneState]);

  /**
   * Redo last undone action
   * 
   * Restores the next state from future stack.
   * Moves current state back to past stack.
   * 
   * Note: State updates are asynchronous. The restored state will be available
   * in the `present` value after React re-renders.
   */
  const redo = useCallback((): void => {
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) {
        return prevFuture; // No future to redo
      }

      // Move current state to past
      const currentState = cloneState(present);
      
      // Pop next state from future
      const newFuture = [...prevFuture];
      const nextState = newFuture.shift()!;
      const restoredState = cloneState(nextState);
      
      setPresent(restoredState);
      setPast((prevPast) => {
        const newPast = [...prevPast, currentState];
        if (newPast.length > MAX_HISTORY_SIZE) {
          return newPast.slice(-MAX_HISTORY_SIZE);
        }
        return newPast;
      });
      
      return newFuture;
    });
  }, [future, present, cloneState]);

  /**
   * Check if undo is available
   */
  const canUndo = past.length > 0;

  /**
   * Check if redo is available
   */
  const canRedo = future.length > 0;

  /**
   * Get current state
   */
  const getCurrentState = useCallback((): BoardState => {
    return cloneState(present);
  }, [present, cloneState]);

  /**
   * Reset history (useful for initialization or clearing)
   */
  const resetHistory = useCallback((newState: BoardState) => {
    setPast([]);
    setPresent(cloneState(newState));
    setFuture([]);
  }, [cloneState]);

  return {
    // State
    present,
    canUndo,
    canRedo,
    
    // Actions
    recordHistory,
    updatePresent,
    undo,
    redo,
    getCurrentState,
    resetHistory,
  };
}

