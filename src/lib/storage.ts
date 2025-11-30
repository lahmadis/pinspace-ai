// localStorage helpers for persistence
// This provides client-side storage for boards, cards, and comments

import type { CanvasElement, CritSessionSummary } from "@/types";

// Storage types
export type StoredBoard = {
  id: string;
  title: string;
  lastEdited: string; // ISO timestamp
  visibility: "Public" | "Private";
  ownerUsername: string;
  school?: string;
  coverImage?: string;
  coverColor?: string; // Pastel color for board cover
  collaborators?: string[];
};

export type StoredCard = {
  id: string;
  boardId: string;
  x: number;
  y: number;
  imageUrl?: string;
  caption?: string;
  title?: string; // Added for compatibility
  body?: string; // Added for compatibility
};

export type CommentTarget = {
  type: "element" | "point";
  elementId?: string;               // when type === "element"
  elementKey?: string;              // NEW: robust fallback that survives id drift
  point?: { x: number; y: number }; // canvas coords, when type === "point"
  viewport?: { pan: { x: number; y: number }; zoom: number }; // optional: sender's view
};

export type StoredComment = {
  id: string;
  boardId: string;
  authorName: string;
  text: string;
  type: "comment" | "crit";
  createdAt: string;
  pinId?: string | null; // Added for compatibility (deprecated, use elementId)
  category?: "concept" | "plan" | "section" | "material" | "circulation" | "structure" | "general"; // Category for grouping
  
  // Pin location - one of these 2 ways to anchor:
  elementId?: string | null;  // if pinned to a card/shape/etc (deprecated, use targetElementId)
  x?: number;                 // if it's a free pin on the canvas
  y?: number;
  
  // Element targeting - which canvas element this comment is attached to
  targetElementId?: string | null; // if attached to a specific canvas element
  
  task?: boolean;          // "Make this a task"
  source?: string;         // "liveCrit" or undefined for regular comments
  
  // NEW: unified target for element or point attachment (preferred over legacy fields)
  target?: CommentTarget;
};

export type StoredSnapshot = {
  id: string;
  boardId: string;
  createdAt: string; // ISO timestamp
  note: string; // short description
  cards: Array<{
    id: string;
    title: string;
    body: string;
    x?: number;
    y?: number;
    imageUrl?: string;
  }>;
};

// Storage keys
const STORAGE_KEY_BOARDS = "pinspace_boards";
const BOARDS_KEY = STORAGE_KEY_BOARDS;
const STORAGE_KEY_CARDS = "pinspace_cards";
const STORAGE_KEY_COMMENTS = "pinspace_comments";
const STORAGE_KEY_SNAPSHOTS = "pinspace_snapshots";
const STORAGE_KEY_TASKS = "pinspace_tasks";
const STORAGE_KEY_PROFILES = "pinspace_profiles";
const STORAGE_KEY_PUBLIC_BOARDS = "pinspace_public_boards";

// Boards
export function getBoards(): StoredBoard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BOARDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

// Get a single board by ID
// REFACTORED: Added missing getBoardById function that was being imported but didn't exist
export function getBoardById(boardId: string): StoredBoard | null {
  if (typeof window === "undefined") return null;
  try {
    const boards = getBoards();
    return boards.find((board) => board.id === boardId) || null;
  } catch {
    return null;
  }
}

// Get all boards (alias for getBoards, matching the requested interface)
export function getAllBoards(): StoredBoard[] {
  return getBoards();
}

// Returns boards owned by this user
export function getBoardsForUser(username: string): StoredBoard[] {
  const boards = getAllBoards();
  return boards.filter((board) => board.ownerUsername === username);
}

// Returns boards shared with this user (where they are a collaborator but not owner)
export function getBoardsSharedWithUser(username: string): StoredBoard[] {
  const boards = getAllBoards();
  return boards.filter(
    (board) =>
      board.ownerUsername !== username &&
      (board.collaborators || []).includes(username)
  );
}

export function saveBoards(boards: StoredBoard[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BOARDS_KEY, JSON.stringify(boards));
}

export function deleteBoard(boardId: string): void {
  if (typeof window === "undefined") return;

  try {
    // 1) Remove from boards list
    const raw = window.localStorage.getItem(BOARDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredBoard[];
      const next = parsed.filter((b) => b.id !== boardId);
      window.localStorage.setItem(BOARDS_KEY, JSON.stringify(next));
    }

    // 2) Remove board-scoped data from shared keys
    // Cards
    try {
      const cardsData = window.localStorage.getItem(STORAGE_KEY_CARDS);
      if (cardsData) {
        const allCards = JSON.parse(cardsData) as StoredCard[];
        const filteredCards = allCards.filter((card) => card.boardId !== boardId);
        window.localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(filteredCards));
      }
    } catch (err) {
      console.error("[deleteBoard] failed to delete cards", err);
    }

    // Comments
    try {
      const commentsData = window.localStorage.getItem(STORAGE_KEY_COMMENTS);
      if (commentsData) {
        const allComments = JSON.parse(commentsData) as StoredComment[];
        const filteredComments = allComments.filter((comment) => comment.boardId !== boardId);
        window.localStorage.setItem(STORAGE_KEY_COMMENTS, JSON.stringify(filteredComments));
      }
    } catch (err) {
      console.error("[deleteBoard] failed to delete comments", err);
    }

    // Snapshots
    try {
      const snapshotsData = window.localStorage.getItem(STORAGE_KEY_SNAPSHOTS);
      if (snapshotsData) {
        const allSnapshots = JSON.parse(snapshotsData) as StoredSnapshot[];
        const filteredSnapshots = allSnapshots.filter((snapshot) => snapshot.boardId !== boardId);
        window.localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(filteredSnapshots));
      }
    } catch (err) {
      console.error("[deleteBoard] failed to delete snapshots", err);
    }

    // Tasks
    try {
      const tasksData = window.localStorage.getItem(STORAGE_KEY_TASKS);
      if (tasksData) {
        const allTasks = JSON.parse(tasksData) as StoredTask[];
        const filteredTasks = allTasks.filter((task) => task.boardId !== boardId);
        window.localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(filteredTasks));
      }
    } catch (err) {
      console.error("[deleteBoard] failed to delete tasks", err);
    }

    // Elements
    try {
      const elementsData = window.localStorage.getItem(STORAGE_KEY_ELEMENTS);
      if (elementsData) {
        const allElements = JSON.parse(elementsData) as StoredElement[];
        const filteredElements = allElements.filter((el) => el.boardId !== boardId);
        window.localStorage.setItem(STORAGE_KEY_ELEMENTS, JSON.stringify(filteredElements));
      }
    } catch (err) {
      console.error("[deleteBoard] failed to delete elements", err);
    }

    // Pen strokes
    try {
      const strokesData = window.localStorage.getItem(STORAGE_KEY_PEN_STROKES);
      if (strokesData) {
        const allStrokes = JSON.parse(strokesData) as any[];
        const filteredStrokes = allStrokes.filter((stroke: any) => stroke.boardId !== boardId);
        window.localStorage.setItem(STORAGE_KEY_PEN_STROKES, JSON.stringify(filteredStrokes));
      }
    } catch (err) {
      console.error("[deleteBoard] failed to delete pen strokes", err);
    }

    // 3) Remove board-scoped keys (crit session uses pattern: critSession_${boardId})
    const perBoardKeys = [
      `critSession_${boardId}`,
      // Add any other board-scoped keys you use:
      // `present_${boardId}`,
    ];

    perBoardKeys.forEach((k) => {
      try {
        window.localStorage.removeItem(k);
      } catch (err) {
        console.error(`[deleteBoard] failed to remove key ${k}`, err);
      }
    });
  } catch (err) {
    console.error("[deleteBoard] failed to delete board", boardId, err);
  }
}

// Helper to add a single board
export function createBoard(board: StoredBoard): void {
  const boards = getBoards();
  boards.push(board);
  saveBoards(boards);
}

// Cards
export function getCards(boardId: string): StoredCard[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY_CARDS);
    const allCards = data ? JSON.parse(data) : [];
    return allCards.filter((card: StoredCard) => card.boardId === boardId);
  } catch (err) {
    console.error("Error reading cards from localStorage", err);
    return [];
  }
}

export function saveCards(boardId: string, cards: StoredCard[]): void {
  if (typeof window === "undefined") return;
  try {
    const data = localStorage.getItem(STORAGE_KEY_CARDS);
    const allCards = data ? JSON.parse(data) : [];
    
    // Remove existing cards for this board
    const filteredCards = allCards.filter((card: StoredCard) => card.boardId !== boardId);
    
    // Add new cards with boardId
    const cardsWithBoardId = cards.map((card) => ({
      ...card,
      boardId,
    }));
    
    // Save updated cards
    localStorage.setItem(
      STORAGE_KEY_CARDS,
      JSON.stringify([...filteredCards, ...cardsWithBoardId])
    );
  } catch (err) {
    console.error("Error saving cards to localStorage", err);
  }
}

// Comments
export function getComments(boardId: string): StoredComment[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY_COMMENTS);
    const allComments = data ? JSON.parse(data) : [];
    return allComments.filter((comment: StoredComment) => comment.boardId === boardId);
  } catch (err) {
    console.error("Error reading comments from localStorage", err);
    return [];
  }
}

export function saveComments(boardId: string, comments: StoredComment[]): void {
  if (typeof window === "undefined") return;
  try {
    const data = localStorage.getItem(STORAGE_KEY_COMMENTS);
    const allComments = data ? JSON.parse(data) : [];
    
    // Remove existing comments for this board
    const filteredComments = allComments.filter(
      (comment: StoredComment) => comment.boardId !== boardId
    );
    
    // Add new comments with boardId
    const commentsWithBoardId = comments.map((comment) => ({
      ...comment,
      boardId,
    }));
    
    // Save updated comments
    localStorage.setItem(
      STORAGE_KEY_COMMENTS,
      JSON.stringify([...filteredComments, ...commentsWithBoardId])
    );
  } catch (err) {
    console.error("Error saving comments to localStorage", err);
  }
}

// Board Comments (alias for pinned comments, using same storage)
export function getBoardComments(boardId: string): StoredComment[] {
  return getComments(boardId);
}

export function saveBoardComments(boardId: string, comments: StoredComment[]): void {
  saveComments(boardId, comments);
}

// Update board lastEdited
export function updateBoardLastEdited(boardId: string, lastEdited: string): void {
  if (typeof window === "undefined") return;
  try {
    const boards = getBoards();
    const boardIndex = boards.findIndex((b) => b.id === boardId);
    
    if (boardIndex >= 0) {
      boards[boardIndex].lastEdited = lastEdited;
    } else {
      // REFACTORED: Create board entry with all required StoredBoard fields
      // StoredBoard requires: id, title, lastEdited, visibility, ownerUsername
      boards.push({ 
        id: boardId, 
        title: "Untitled Board", 
        lastEdited,
        visibility: "Private", // Default to private
        ownerUsername: "unknown" // Default owner
      });
    }
    
    saveBoards(boards);
  } catch (err) {
    console.error("Error updating board lastEdited", err);
  }
}

// Snapshots
export function getSnapshots(boardId: string): StoredSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY_SNAPSHOTS);
    const allSnapshots = data ? JSON.parse(data) : [];
    return allSnapshots
      .filter((snapshot: StoredSnapshot) => snapshot.boardId === boardId)
      .sort((a: StoredSnapshot, b: StoredSnapshot) => {
        // Sort newest first
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  } catch (err) {
    console.error("Error reading snapshots from localStorage", err);
    return [];
  }
}

export function saveSnapshots(boardId: string, snapshots: StoredSnapshot[]): void {
  if (typeof window === "undefined") return;
  try {
    const data = localStorage.getItem(STORAGE_KEY_SNAPSHOTS);
    const allSnapshots = data ? JSON.parse(data) : [];
    
    // Remove existing snapshots for this board
    const filteredSnapshots = allSnapshots.filter(
      (snapshot: StoredSnapshot) => snapshot.boardId !== boardId
    );
    
    // Add new snapshots with boardId
    const snapshotsWithBoardId = snapshots.map((snapshot) => ({
      ...snapshot,
      boardId,
    }));
    
    // Save updated snapshots
    localStorage.setItem(
      STORAGE_KEY_SNAPSHOTS,
      JSON.stringify([...filteredSnapshots, ...snapshotsWithBoardId])
    );
  } catch (err) {
    console.error("Error saving snapshots to localStorage", err);
  }
}

// Tasks
export type StoredTask = {
  id: string;
  boardId: string;
  text: string;
  sourceCommentId?: string;
  status: "open" | "done";
  createdAt: string;
};

export function getTasks(boardId: string): StoredTask[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY_TASKS);
    const allTasks = data ? JSON.parse(data) : [];
    return allTasks.filter((task: StoredTask) => task.boardId === boardId);
  } catch (err) {
    console.error("Error reading tasks from localStorage", err);
    return [];
  }
}

export function saveTasks(boardId: string, tasks: StoredTask[]): void {
  if (typeof window === "undefined") return;
  try {
    const data = localStorage.getItem(STORAGE_KEY_TASKS);
    const allTasks = data ? JSON.parse(data) : [];
    
    // Remove existing tasks for this board
    const filteredTasks = allTasks.filter(
      (task: StoredTask) => task.boardId !== boardId
    );
    
    // Add new tasks with boardId
    const tasksWithBoardId = tasks.map((task) => ({
      ...task,
      boardId,
    }));
    
    // Save updated tasks
    localStorage.setItem(
      STORAGE_KEY_TASKS,
      JSON.stringify([...filteredTasks, ...tasksWithBoardId])
    );
  } catch (err) {
    console.error("Error saving tasks to localStorage", err);
  }
}

// Profiles
export type StoredProfile = {
  username: string;
  displayName: string;
  school: string;
  bio: string;
  avatarUrl: string;
  boards: string[];
  isPrivate: boolean;
  role?: "student" | "professor"; // user role from Supabase profiles table
};

export function getProfiles(): StoredProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY_PROFILES);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("Error reading profiles from localStorage", err);
    return [];
  }
}

export function getProfile(username: string): StoredProfile | null {
  const profiles = getProfiles();
  return profiles.find((p) => p.username === username) || null;
}

export function saveProfiles(profiles: StoredProfile[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  } catch (err) {
    console.error("Error saving profiles to localStorage", err);
  }
}

// Initialize default profiles if none exist
export function ensureDefaultProfiles(): void {
  if (typeof window === "undefined") return;
  try {
    const existing = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (existing) return; // Already initialized

    const defaultProfiles: StoredProfile[] = [
      {
        username: "me",
        displayName: "Me",
        school: "Wentworth Institute of Technology",
        bio: "Architecture student working on circulation-as-runway studio",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=me",
        boards: ["1"],
        isPrivate: false,
      },
      {
        username: "linna",
        displayName: "Linna",
        school: "Wentworth Institute of Technology",
        bio: "Architecture / systems / material logics",
        avatarUrl: "",
        boards: ["1"],
        isPrivate: false,
      },
      {
        username: "leila.a",
        displayName: "Leila A.",
        school: "Wentworth Institute of Technology",
        bio: "Working on circulation-as-runway studio project",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=leila",
        boards: ["1", "2"],
        isPrivate: false,
      },
      {
        username: "alex.chen",
        displayName: "Alex Chen",
        school: "MIT",
        bio: "Exploring urban fabric integration",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
        boards: ["2"],
        isPrivate: false,
      },
    ];
    saveProfiles(defaultProfiles);
  } catch (err) {
    console.error("Error initializing default profiles", err);
  }
}

// Public Board Previews
export type StoredPublicBoardPreview = {
  boardId: string;
  title: string;
  coverImage: string;
  authorUsername: string;
  school: string;
  lastEdited: string;
};

export function getPublicBoardPreviews(): StoredPublicBoardPreview[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY_PUBLIC_BOARDS);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("Error reading public board previews from localStorage", err);
    return [];
  }
}

export function savePublicBoardPreviews(previews: StoredPublicBoardPreview[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_PUBLIC_BOARDS, JSON.stringify(previews));
  } catch (err) {
    console.error("Error saving public board previews to localStorage", err);
  }
}

// Initialize default public board previews if none exist
export function ensureDefaultPublicBoardPreviews(): void {
  if (typeof window === "undefined") return;
  try {
    const existing = localStorage.getItem(STORAGE_KEY_PUBLIC_BOARDS);
    if (existing) return; // Already initialized

    const defaultPreviews: StoredPublicBoardPreview[] = [
      {
        boardId: "1",
        title: "Runway / Movement Study",
        coverImage: "https://api.dicebear.com/7.x/shapes/svg?seed=board1",
        authorUsername: "leila.a",
        school: "Wentworth Institute of Technology",
        lastEdited: "2h ago",
      },
      {
        boardId: "2",
        title: "Urban Fabric Integration",
        coverImage: "https://api.dicebear.com/7.x/shapes/svg?seed=board2",
        authorUsername: "alex.chen",
        school: "MIT",
        lastEdited: "1 day ago",
      },
    ];
    savePublicBoardPreviews(defaultPreviews);
  } catch (err) {
    console.error("Error initializing default public board previews", err);
  }
}

// Canvas Elements
const STORAGE_KEY_ELEMENTS = "pinspace_elements";

export type StoredElement = CanvasElement & {
  boardId: string;
};

export function getElements(boardId: string): CanvasElement[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY_ELEMENTS);
    const allElements = data ? JSON.parse(data) : [];
    return allElements
      .filter((el: StoredElement) => el.boardId === boardId)
      .map((el: StoredElement) => {
        // Remove boardId from the element before returning
        const { boardId: _, ...element } = el;
        return element as CanvasElement;
      });
  } catch (err) {
    console.error("Error reading elements from localStorage", err);
    return [];
  }
}

export function saveElements(boardId: string, elements: CanvasElement[]): void {
  if (typeof window === "undefined") return;
  try {
    const data = localStorage.getItem(STORAGE_KEY_ELEMENTS);
    const allElements = data ? JSON.parse(data) : [];
    
    // Remove existing elements for this board
    const filteredElements = allElements.filter(
      (el: StoredElement) => el.boardId !== boardId
    );
    
    // Add new elements with boardId
    const elementsWithBoardId = elements.map((el) => ({
      ...el,
      boardId,
    }));
    
    // Save updated elements
    localStorage.setItem(
      STORAGE_KEY_ELEMENTS,
      JSON.stringify([...filteredElements, ...elementsWithBoardId])
    );

    // Dispatch custom event for same-tab updates (storage events only fire across tabs)
    try {
      window.dispatchEvent(
        new CustomEvent("pinspace-elements-changed", {
          detail: { boardId },
        })
      );
    } catch (e) {
      // Ignore errors in event dispatch
    }
  } catch (err) {
    console.error("Error saving elements to localStorage", err);
  }
}

// --- View state (pan/zoom) ---
const STORAGE_KEY_VIEW = "pinspace_view";

export type ViewState = {
  pan: { x: number; y: number };
  zoom: number;
};

export function getViewState(boardId: string): ViewState | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY_VIEW);
    if (!data) return null;
    const allViews = JSON.parse(data) as Record<string, ViewState>;
    return allViews[boardId] || null;
  } catch (err) {
    console.error("Error reading view state from localStorage", err);
    return null;
  }
}

export function saveViewState(boardId: string, viewState: ViewState): void {
  if (typeof window === "undefined") return;
  try {
    const data = localStorage.getItem(STORAGE_KEY_VIEW);
    const allViews = data ? JSON.parse(data) : {};
    allViews[boardId] = viewState;
    localStorage.setItem(STORAGE_KEY_VIEW, JSON.stringify(allViews));

    // Dispatch custom event for same-tab updates (storage events only fire across tabs)
    try {
      window.dispatchEvent(
        new CustomEvent("pinspace-view-changed", {
          detail: { boardId, viewState },
        })
      );
    } catch (e) {
      // Ignore errors in event dispatch
    }
  } catch (err) {
    console.error("Error saving view state to localStorage", err);
  }
}

// --- per-session crit stickies ---
const critSessKey = (boardId: string, sessionId: string) =>
  `critSessionElements_${boardId}_${sessionId}`;

export function getCritSessionElements(boardId: string, sessionId: string) {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(critSessKey(boardId, sessionId));
    return raw ? (JSON.parse(raw) as any[]) : [];
  } catch {
    return [];
  }
}

export function saveCritSessionElements(boardId: string, sessionId: string, els: any[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(critSessKey(boardId, sessionId), JSON.stringify(els));
  } catch (err) {
    console.error("[saveCritSessionElements] failed to save", boardId, sessionId, err);
  }
}

// --- frozen "crit notes" version (optional, used when you End Crit) ---
const critNotesKey = (boardId: string) => `critNotesElements_${boardId}`;

export function getCritNotesElements(boardId: string) {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(critNotesKey(boardId));
    return raw ? (JSON.parse(raw) as any[]) : [];
  } catch {
    return [];
  }
}

export function saveCritNotesElements(boardId: string, els: any[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(critNotesKey(boardId), JSON.stringify(els));
  } catch (err) {
    console.error("[saveCritNotesElements] failed to save", boardId, err);
  }
}

export function finalizeCritNotes(boardId: string, sessionId: string) {
  if (typeof window === "undefined") return;
  const base = getElements(boardId) ?? [];
  const sess = getCritSessionElements(boardId, sessionId) ?? [];
  saveCritNotesElements(boardId, [...base, ...sess]);
}

const STORAGE_KEY_CRIT_SESSION_PREFIX = "critSession_";

// Crit Session Summary helpers
export function getCritSessionSummary(boardId: string): CritSessionSummary | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`critSession_${boardId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // basic shape guard
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.endedAt === "number"
    ) {
      return parsed as CritSessionSummary;
    }
    return null;
  } catch (err) {
    console.error("Failed to load crit session summary", err);
    return null;
  }
}

export function saveCritSessionSummary(boardId: string, summary: CritSessionSummary): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `critSession_${boardId}`,
      JSON.stringify(summary)
    );
  } catch (err) {
    console.error("Failed to save crit session summary", err);
  }
}

// Pen Strokes
const STORAGE_KEY_PEN_STROKES = "pinspace_pen_strokes";

export interface StoredPenStroke {
  id: string;
  boardId: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  timestamp: number;
}

export function getPenStrokes(boardId: string): StoredPenStroke[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY_PEN_STROKES);
    const allStrokes = data ? JSON.parse(data) : [];
    return allStrokes.filter((stroke: StoredPenStroke) => stroke.boardId === boardId);
  } catch (err) {
    console.error("Error reading pen strokes from localStorage", err);
    return [];
  }
}

export function savePenStrokes(boardId: string, strokes: StoredPenStroke[]): void {
  if (typeof window === "undefined") return;
  try {
    const data = localStorage.getItem(STORAGE_KEY_PEN_STROKES);
    const allStrokes = data ? JSON.parse(data) : [];
    
    // Remove existing strokes for this board
    const filteredStrokes = allStrokes.filter(
      (stroke: StoredPenStroke) => stroke.boardId !== boardId
    );
    
    // Add new strokes with boardId
    const strokesWithBoardId = strokes.map((stroke) => ({
      ...stroke,
      boardId,
    }));
    
    // Save updated strokes
    localStorage.setItem(
      STORAGE_KEY_PEN_STROKES,
      JSON.stringify([...filteredStrokes, ...strokesWithBoardId])
    );
  } catch (err) {
    console.error("Error saving pen strokes to localStorage", err);
  }
}

