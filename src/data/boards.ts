// Shared in-memory board data store
// This file contains all boards with their cards, comments, and metadata
// REFACTORED: BoardData type is now exported from @/types for consistency

import type { BoardData } from "@/types";

// In-memory boards array - this is the single source of truth
export const boards: BoardData[] = [
  {
    id: "1",
    title: "Runway / Movement Study",
    owner: "@linna", // Keep for backward compatibility
    ownerId: "u1", // Linna's board
    visibility: "private",
    isPublic: false,
    collaborators: "3 collaborators",
    collaboratorIds: [], // Empty for now
    lastEdited: "2h ago",
    cards: [
      {
        id: "card-1",
        title: "Facade Reference",
        body: "Layered reflective skin / textile logic. Exploring how surface reads as motion.",
        x: 100,
        y: 100,
      },
      {
        id: "card-2",
        title: "Circulation Diagram",
        body: "Circulation spine cuts through studio mass and exposes work. Public spine / visibility.",
        x: 420,
        y: 100,
      },
      {
        id: "card-3",
        title: "Material Study",
        body: "Perforated metal veil / double skin for thermal buffer. Material gradient exploration.",
        x: 100,
        y: 300,
      },
    ],
    comments: [
      {
        id: "1",
        author: "Pasnik",
        text: "The reflective facade is interesting, but you still haven't explained how structure is actually holding it up.",
        timestamp: "2h ago",
        boardId: "1",
        category: "structure", // REFACTORED: Added missing category field
        pinId: null,
      },
      {
        id: "2",
        author: "Leila",
        text: "Circulation spine is strong. Don't lose that in plan.",
        timestamp: "5h ago",
        boardId: "1",
        category: "circulation", // REFACTORED: Added missing category field
        pinId: null,
      },
    ],
    snapshots: [],
  },
];

// Get a board by ID
export function getBoard(boardId: string): BoardData | null {
  return boards.find((b) => b.id === boardId) || null;
}

// Get all boards
export function getAllBoards(): BoardData[] {
  return boards;
}

// Get public boards
export function getPublicBoards(): BoardData[] {
  return boards.filter((b) => b.visibility === "public");
}

// Get boards by owner (by username - backward compatibility)
export function getBoardsByOwner(owner: string): BoardData[] {
  return boards.filter((b) => b.owner === owner);
}

// Get boards by owner ID
export function getBoardsByOwnerId(ownerId: string): BoardData[] {
  return boards.filter((b) => b.ownerId === ownerId);
}

// Get boards for a user (alias for getBoardsByOwnerId)
export function getBoardsForUser(userId: string): BoardData[] {
  return getBoardsByOwnerId(userId);
}

// Get public boards from other users (exclude current user)
export function getPublicBoardsFromOtherUsers(currentUserId: string): BoardData[] {
  return boards.filter(
    (b) => b.visibility === "public" && b.ownerId !== currentUserId
  );
}

// Get cards for a board
export function getCardsForBoard(boardId: string): Card[] {
  const board = boards.find((b) => b.id === boardId);
  return board ? board.cards : [];
}

// Get comments for a board
export function getCommentsForBoard(boardId: string): Comment[] {
  const board = boards.find((b) => b.id === boardId);
  return board ? board.comments : [];
}

// Update board cards
export function updateBoardCards(boardId: string, cards: Card[]): boolean {
  const board = boards.find((b) => b.id === boardId);
  if (board) {
    board.cards = cards;
    updateLastEdited(boardId);
    return true;
  }
  return false;
}

// Add a card to a board
export function addCardToBoard(boardId: string, card: Card): boolean {
  const board = boards.find((b) => b.id === boardId);
  if (board) {
    board.cards.push(card);
    updateLastEdited(boardId);
    return true;
  }
  return false;
}

// Add a comment to a board
export function addCommentToBoard(comment: Comment): boolean {
  const board = boards.find((b) => b.id === comment.boardId);
  if (board) {
    board.comments.unshift(comment);
    updateLastEdited(comment.boardId);
    return true;
  }
  return false;
}

// Add a snapshot to a board
export function addSnapshotToBoard(boardId: string, snapshot: import("@/types").BoardSnapshot): boolean {
  const board = boards.find((b) => b.id === boardId);
  if (board) {
    board.snapshots.push(snapshot);
    updateLastEdited(boardId);
    return true;
  }
  return false;
}

// Get snapshots for a board
export function getSnapshotsForBoard(boardId: string): import("@/types").BoardSnapshot[] {
  const board = boards.find((b) => b.id === boardId);
  return board ? board.snapshots : [];
}

// Update board visibility
export function updateBoardVisibility(
  boardId: string,
  visibility: "private" | "public"
): boolean {
  const board = boards.find((b) => b.id === boardId);
  if (board) {
    board.visibility = visibility;
    board.isPublic = visibility === "public";
    updateLastEdited(boardId);
    return true;
  }
  return false;
}

// Update last edited timestamp
function updateLastEdited(boardId: string) {
  const board = boards.find((b) => b.id === boardId);
  if (board) {
    board.lastEdited = "just now";
  }
}

// Create a new board
export function createBoard(title: string, owner: string, ownerId?: string): BoardData {
  const newBoard: BoardData = {
    id: `board-${Date.now()}`,
    title,
    owner,
    ownerId: ownerId || "u1", // Default to current user
    visibility: "private",
    isPublic: false,
    collaborators: "0 collaborators",
    collaboratorIds: [],
    lastEdited: "just now",
    cards: [],
    comments: [],
    snapshots: [],
  };
  boards.push(newBoard);
  return newBoard;
}

// Ensure a board exists (creates if missing)
export function ensureBoard(boardId: string, owner?: string, ownerId?: string): BoardData {
  let board = boards.find((b) => b.id === boardId);
  if (!board) {
    board = {
      id: boardId,
      title: "Untitled Board",
      owner: owner || "@linna",
      ownerId: ownerId || "u1",
      visibility: "private",
      isPublic: false,
      collaborators: "0 collaborators",
      collaboratorIds: [],
      lastEdited: "just now",
      cards: [],
      comments: [],
      snapshots: [],
    };
    boards.push(board);
  }
  return board;
}
