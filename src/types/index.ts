// Card represents one board card/pin of content
export type Card = {
  id: string;
  title: string;
  body: string;
  x?: number; // X position on canvas (optional for backward compatibility)
  y?: number; // Y position on canvas (optional for backward compatibility)
  imageUrl?: string; // Optional image URL
};

// REFACTORED: Comment type updated to include ALL properties used across the codebase
// This unified type supports both app usage and database schema fields
export type Comment = {
  id: string;
  author: string;
  text: string;
  // REFACTORED: timestamp can be number (Date.now()) or string (ISO timestamp) for flexibility
  timestamp: number | string;
  boardId: string;
  category: "concept" | "plan" | "section" | "material" | "circulation" | "structure" | "general"; // Category for grouping
  
  // REFACTORED: Added createdAt field (if different from timestamp)
  createdAt?: number; // Timestamp in milliseconds (Date.now())
  
  // Pin location - one of these 2 ways to anchor:
  elementId?: string | null;  // if pinned to a card/shape/etc (deprecated, use targetElementId)
  x?: number | null;         // if it's a free pin on the canvas (for positioned comments)
  y?: number | null;         // if it's a free pin on the canvas (for positioned comments)
  
  // Element targeting - which canvas element this comment is attached to
  targetElementId?: string | null; // if attached to a specific canvas element
  
  task?: boolean;          // "Make this a task"
  source?: string;         // "liveCrit" or undefined for regular comments
  
  // Legacy fields (for backward compatibility)
  pinId?: string | null; // Optional pin/card ID for per-card comments (deprecated, use elementId)
  type?: "comment" | "crit"; // Type of comment (deprecated)
  
  // REFACTORED: Added database schema fields (snake_case from Supabase)
  board_id?: string;      // Database field name (snake_case)
  author_name?: string;    // Database field name (snake_case)
  is_task?: boolean;      // Database field name (snake_case)
  target_element_id?: string; // Database field name (snake_case)
};

// Alias for clarity
export type PinnedComment = Comment;

// Pin type for PresentModeView
export type Pin = {
  id: string;
  group: string;
  header: string;
  body: string;
};

// Snapshot
export type Snapshot = {
  id: string;
  label: string; // human readable timestamp like "11/1/2025 5:24 AM"
  boardId: string;
  data: {
    comments: Comment[];
    cards: Card[];
  };
  createdAt: string; // ISO timestamp
};

// Board Snapshot
export type BoardSnapshot = {
  id: string;
  timestamp: number;
  cards: Array<{
    id: string;
    x: number;
    y: number;
    imageUrl?: string;
    caption?: string;
  }>;
  note?: string;
};

// Timeline Snapshot (for board version history)
export type TimelineSnapshot = {
  id: string;
  boardId: string;
  createdAt: string; // ISO timestamp
  note: string; // short description the user writes like "pre-midreview layout"
  cards: Card[]; // deep copy of the current cards on the board at that moment
};

// Board Timeline Snapshot (simpler snapshot for timeline tab)
export type BoardTimelineSnapshot = {
  id: string;
  boardId: string;
  timestamp: number; // Date.now()
  note: string;
};

// REFACTORED: Task type updated to include all required properties
export type Task = {
  id: string;
  boardId: string;
  text: string; // the thing to fix
  sourceCommentId?: string; // optional, the comment it came from
  // REFACTORED: status can be "done" | "pending" | string for flexibility
  status: "done" | "pending" | string;
  // REFACTORED: Added done field (boolean alias for status === "done")
  done?: boolean; // true if status === "done"
  // REFACTORED: createdAt can be number (Date.now()) or string (ISO timestamp)
  createdAt: number | string; // Timestamp (number) or ISO timestamp (string)
  // REFACTORED: Added category field for task categorization
  category?: string; // Category for grouping tasks (e.g., "concept", "plan", etc.)
};

// Crit Session Summary
export interface CritSessionSummary {
  endedAt: number; // timestamp (Date.now())
  boardId: string;
  comments: {
    id: string;
    author: string;
    category: string;
    text: string;
    createdAt: number; // timestamp (Date.now() or new Date(iso).getTime())
    targetElementId?: string | null;
  }[];
  tasks: {
    id: string;
    text: string;
    done: boolean; // true if status === "done"
  }[];
  // Legacy fields for backward compatibility (deprecated)
  commentIdsIncluded?: string[];
  taskIdsCreated?: string[];
}

// User
export type User = {
  id: string;
  name: string;
  username: string; // Handle like "@linna"
  avatarUrl: string;
  bio?: string;
  isPrivate: boolean; // true = private account, false = public
};

// Profile (for social features)
export type Profile = {
  username: string; // unique, like "leila.a"
  displayName: string; // like "Leila A."
  school: string; // like "Wentworth Institute of Technology"
  bio: string; // short string
  avatarUrl: string; // can be placeholder
  boards: string[]; // array of boardIds that belong to this user
  isPrivate: boolean; // if true, we'll say "This account is private" on their profile
  role?: "student" | "professor"; // user role from Supabase profiles table
};

// Public Board Preview (for explore page)
export type PublicBoardPreview = {
  boardId: string;
  title: string;
  coverImage: string; // first card's image or placeholder
  authorUsername: string;
  school: string;
  lastEdited: string;
};

// Board
export type Board = {
  id: string;
  title: string;
  owner: string; // Username/owner identifier (keep for backward compatibility)
  ownerId: string; // User ID of the owner
  visibility: "private" | "public"; // Board visibility
  isPublic?: boolean; // Alias for visibility === "public"
  collaborators?: string; // Collaborator count or list (string for display)
  collaboratorIds?: string[]; // Array of user IDs
  lastEdited?: string; // Last edited timestamp
};

// REFACTORED: Added StoredBoard type for localStorage persistence
// This type matches the structure used in src/lib/storage.ts
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

// REFACTORED: Added BoardData type export - extended board type that includes cards and comments
// This type is used for board analysis and data operations
export type BoardData = Board & {
  cards: Card[];
  comments: Comment[];
  snapshots: BoardSnapshot[];
};

// Canvas Element Types
export type ElementType = "card" | "text" | "sticky" | "shape" | "image";

// Shape Types (only used when ElementType === "shape")
export type ShapeType = "rect" | "circle" | "triangle" | "diamond" | "arrow" | "bubble" | "star";

export interface CanvasElement {
  id: string;
  type: ElementType;
  
  // Only used if type === "shape"
  shapeType?: ShapeType;
  
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  z: number; // z-index for layering
  locked?: boolean;
  
  // Style payloads
  text?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  fill?: string;
  fillColor?: string; // For shapes
  stroke?: string;
  strokeColor?: string; // For shapes
  strokeWidth?: number;
  opacity?: number;
  imageUrl?: string; // Legacy
  src?: string; // For image elements (data URL or URL)
  
  // For arrows (legacy)
  fromId?: string;
  toId?: string;
  curved?: boolean;
  
  // Legacy card bridge
  title?: string;
  body?: string;
  
  // REFACTORED: Added ownerId field for tracking element ownership and permissions
  // Used for permission checking (canEdit, canDelete) in collaborative boards
  ownerId?: string; // User ID of the element creator/owner
  
  // REFACTORED: Added missing properties for shape rendering and element identification
  borderRadius?: number; // Border radius for rounded shapes
  elementId?: string; // Alias for id (for compatibility)
}
