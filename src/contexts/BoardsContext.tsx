/**
 * Boards Context
 * 
 * Manages multiple boards, board switching, and board organization.
 * Each board has its own persistent state (elements, comments, pen strokes).
 * 
 * Features:
 * - Create, switch, and delete boards
 * - Board metadata (title, description, tags, author)
 * - Board sections/frames/layers
 * - Board search and filtering
 * 
 * Future: Backend integration
 * - Store boards in database
 * - User library and templates
 * - Board sharing and permissions
 * - Board analytics
 */

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

/**
 * Board section/frame for organizing content
 */
export interface BoardSection {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  locked: boolean;
  color?: string; // Optional color for visual distinction
}

/**
 * Board metadata
 */
export interface BoardMetadata {
  id: string;
  title: string;
  description?: string;
  author?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  thumbnail?: string; // Base64 or URL
  sections: BoardSection[];
  // Future: Add more metadata
  // templateId?: string;
  // parentBoardId?: string; // For nested boards
  // collaborators?: string[];
}

/**
 * Board state (separate from metadata)
 */
export interface BoardState {
  elements: any[]; // CanvasElement[]
  comments: Array<{ elementId: string; comments: string[] }>;
  penStrokes: any[]; // PenStroke[]
}

export interface BoardsContextType {
  boards: BoardMetadata[];
  currentBoardId: string | null;
  currentBoard: BoardMetadata | null;
  isLoading: boolean;
  createBoard: (title: string, description?: string, tags?: string[]) => string;
  switchBoard: (boardId: string) => void;
  deleteBoard: (boardId: string) => void;
  updateBoardMetadata: (boardId: string, updates: Partial<BoardMetadata>) => void;
  addSection: (boardId: string, section: Omit<BoardSection, "id">) => string;
  updateSection: (boardId: string, sectionId: string, updates: Partial<BoardSection>) => void;
  deleteSection: (boardId: string, sectionId: string) => void;
  searchBoards: (query: string) => BoardMetadata[];
  filterBoards: (filters: { tags?: string[]; author?: string; contentType?: string }) => BoardMetadata[];
}

const BoardsContext = createContext<BoardsContextType | undefined>(undefined);

/**
 * Generate unique board ID
 */
function generateBoardId(): string {
  if (typeof window === "undefined") return `board-ssr-0`;
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `board-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique section ID
 */
function generateSectionId(): string {
  if (typeof window === "undefined") return `section-ssr-0`;
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * BoardsProvider - Provides boards context to the app
 */
export function BoardsProvider({ children }: { children: React.ReactNode }) {
  const [boards, setBoards] = useState<BoardMetadata[]>([]);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load boards from localStorage on mount
   * Future: Load from backend API
   */
  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem("pinspace_boards");
      if (stored) {
        const parsed = JSON.parse(stored) as BoardMetadata[];
        setBoards(parsed);
        
        // Set current board to first board or last viewed
        const lastViewed = localStorage.getItem("pinspace_last_viewed_board");
        if (lastViewed && parsed.some(b => b.id === lastViewed)) {
          setCurrentBoardId(lastViewed);
        } else if (parsed.length > 0) {
          setCurrentBoardId(parsed[0].id);
        }
      } else {
        // Create default board
        const defaultBoard: BoardMetadata = {
          id: generateBoardId(),
          title: "My First Board",
          description: "Welcome to PinSpace!",
          tags: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          sections: [],
        };
        setBoards([defaultBoard]);
        setCurrentBoardId(defaultBoard.id);
        localStorage.setItem("pinspace_boards", JSON.stringify([defaultBoard]));
      }
    } catch (err) {
      console.error("Error loading boards:", err);
      // Create default board on error
      const defaultBoard: BoardMetadata = {
        id: generateBoardId(),
        title: "My First Board",
        description: "Welcome to PinSpace!",
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        sections: [],
      };
      setBoards([defaultBoard]);
      setCurrentBoardId(defaultBoard.id);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Save boards to localStorage
   * Future: Save to backend API
   */
  const saveBoards = useCallback((newBoards: BoardMetadata[]) => {
    if (typeof window === "undefined") return;
    
    try {
      localStorage.setItem("pinspace_boards", JSON.stringify(newBoards));
    } catch (err) {
      console.error("Error saving boards:", err);
    }
  }, []);

  /**
   * Create a new board
   */
  const createBoard = useCallback((
    title: string,
    description?: string,
    tags?: string[]
  ): string => {
    const newBoard: BoardMetadata = {
      id: generateBoardId(),
      title,
      description,
      tags: tags || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sections: [],
    };

    setBoards((prev) => {
      const updated = [...prev, newBoard];
      saveBoards(updated);
      return updated;
    });

    setCurrentBoardId(newBoard.id);
    if (typeof window !== "undefined") {
      localStorage.setItem("pinspace_last_viewed_board", newBoard.id);
    }

    return newBoard.id;
  }, [saveBoards]);

  /**
   * Switch to a different board
   */
  const switchBoard = useCallback((boardId: string) => {
    if (boards.some(b => b.id === boardId)) {
      setCurrentBoardId(boardId);
      if (typeof window !== "undefined") {
        localStorage.setItem("pinspace_last_viewed_board", boardId);
      }
    }
  }, [boards]);

  /**
   * Delete a board
   */
  const deleteBoard = useCallback((boardId: string) => {
    setBoards((prev) => {
      const updated = prev.filter(b => b.id !== boardId);
      saveBoards(updated);
      
      // Switch to another board if current was deleted
      if (currentBoardId === boardId) {
        if (updated.length > 0) {
          setCurrentBoardId(updated[0].id);
          if (typeof window !== "undefined") {
            localStorage.setItem("pinspace_last_viewed_board", updated[0].id);
          }
        } else {
          setCurrentBoardId(null);
        }
      }
      
      return updated;
    });

    // Clear board state from localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem(`pinspace_student_board_${boardId}`);
      localStorage.removeItem(`pinspace_board_activity_${boardId}`);
    }
  }, [currentBoardId, saveBoards]);

  /**
   * Update board metadata
   */
  const updateBoardMetadata = useCallback((
    boardId: string,
    updates: Partial<BoardMetadata>
  ) => {
    setBoards((prev) => {
      const updated = prev.map(b => 
        b.id === boardId 
          ? { ...b, ...updates, updatedAt: Date.now() }
          : b
      );
      saveBoards(updated);
      return updated;
    });
  }, [saveBoards]);

  /**
   * Add a section to a board
   */
  const addSection = useCallback((
    boardId: string,
    section: Omit<BoardSection, "id">
  ): string => {
    const sectionId = generateSectionId();
    const newSection: BoardSection = { ...section, id: sectionId };

    setBoards((prev) => {
      const updated = prev.map(b => 
        b.id === boardId
          ? { ...b, sections: [...b.sections, newSection], updatedAt: Date.now() }
          : b
      );
      saveBoards(updated);
      return updated;
    });

    return sectionId;
  }, [saveBoards]);

  /**
   * Update a section
   */
  const updateSection = useCallback((
    boardId: string,
    sectionId: string,
    updates: Partial<BoardSection>
  ) => {
    setBoards((prev) => {
      const updated = prev.map(b => 
        b.id === boardId
          ? {
              ...b,
              sections: b.sections.map(s =>
                s.id === sectionId ? { ...s, ...updates } : s
              ),
              updatedAt: Date.now(),
            }
          : b
      );
      saveBoards(updated);
      return updated;
    });
  }, [saveBoards]);

  /**
   * Delete a section
   */
  const deleteSection = useCallback((
    boardId: string,
    sectionId: string
  ) => {
    setBoards((prev) => {
      const updated = prev.map(b => 
        b.id === boardId
          ? {
              ...b,
              sections: b.sections.filter(s => s.id !== sectionId),
              updatedAt: Date.now(),
            }
          : b
      );
      saveBoards(updated);
      return updated;
    });
  }, [saveBoards]);

  /**
   * Search boards by query
   */
  const searchBoards = useCallback((query: string): BoardMetadata[] => {
    if (!query.trim()) return boards;

    const lowerQuery = query.toLowerCase();
    return boards.filter(b =>
      b.title.toLowerCase().includes(lowerQuery) ||
      b.description?.toLowerCase().includes(lowerQuery) ||
      b.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      b.author?.toLowerCase().includes(lowerQuery)
    );
  }, [boards]);

  /**
   * Filter boards by criteria
   */
  const filterBoards = useCallback((
    filters: { tags?: string[]; author?: string; contentType?: string }
  ): BoardMetadata[] => {
    return boards.filter(b => {
      if (filters.tags && filters.tags.length > 0) {
        if (!filters.tags.some(tag => b.tags.includes(tag))) {
          return false;
        }
      }
      if (filters.author && b.author !== filters.author) {
        return false;
      }
      // Future: Filter by content type (has images, has PDFs, etc.)
      return true;
    });
  }, [boards]);

  const currentBoard = boards.find(b => b.id === currentBoardId) || null;

  const value: BoardsContextType = {
    boards,
    currentBoardId,
    currentBoard,
    isLoading,
    createBoard,
    switchBoard,
    deleteBoard,
    updateBoardMetadata,
    addSection,
    updateSection,
    deleteSection,
    searchBoards,
    filterBoards,
  };

  return <BoardsContext.Provider value={value}>{children}</BoardsContext.Provider>;
}

/**
 * useBoards - Hook to access boards context
 */
export function useBoards() {
  const context = useContext(BoardsContext);
  if (context === undefined) {
    throw new Error("useBoards must be used within a BoardsProvider");
  }
  return context;
}








