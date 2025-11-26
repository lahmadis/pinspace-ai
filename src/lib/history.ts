// Undo/Redo history management for canvas elements
// Maintains a stack of element snapshots per board

import type { CanvasElement } from "@/types";

interface HistoryState {
  past: CanvasElement[][];
  present: CanvasElement[];
  future: CanvasElement[];
}

const historyStates: Record<string, HistoryState> = {};

export function pushSnapshot(boardId: string, elements: CanvasElement[]): void {
  if (!historyStates[boardId]) {
    historyStates[boardId] = {
      past: [],
      present: [],
      future: [],
    };
  }

  const state = historyStates[boardId];
  
  // Deep clone the elements array
  const cloned = elements.map((el) => ({ ...el }));
  
  // Add current state to past (limit to 50 states)
  if (state.present.length > 0) {
    state.past.push(state.present);
    if (state.past.length > 50) {
      state.past.shift();
    }
  }
  
  // Clear future (new action)
  state.future = [];
  
  // Set new present
  state.present = cloned;
}

export function undo(boardId: string): CanvasElement[] | null {
  const state = historyStates[boardId];
  if (!state || state.past.length === 0) {
    return null;
  }

  // Move current to future
  if (state.present.length > 0) {
    state.future.unshift(state.present);
  }

  // Pop from past to present
  const previous = state.past.pop()!;
  state.present = previous;

  // Return deep clone
  return previous.map((el) => ({ ...el }));
}

export function redo(boardId: string): CanvasElement[] | null {
  const state = historyStates[boardId];
  if (!state || state.future.length === 0) {
    return null;
  }

  // Move current to past
  if (state.present.length > 0) {
    state.past.push(state.present);
    if (state.past.length > 50) {
      state.past.shift();
    }
  }

  // Pop from future to present
  const next = state.future.shift()!;
  state.present = next;

  // Return deep clone
  return next.map((el) => ({ ...el }));
}

export function canUndo(boardId: string): boolean {
  const state = historyStates[boardId];
  return state ? state.past.length > 0 : false;
}

export function canRedo(boardId: string): boolean {
  const state = historyStates[boardId];
  return state ? state.future.length > 0 : false;
}

export function initializeHistory(boardId: string, initialElements: CanvasElement[]): void {
  historyStates[boardId] = {
    past: [],
    present: initialElements.map((el) => ({ ...el })),
    future: [],
  };
}

