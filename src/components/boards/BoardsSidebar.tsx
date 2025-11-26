/**
 * Boards Sidebar Component
 * 
 * Displays list of boards with search, filtering, and board management.
 * Allows users to create, switch, and delete boards.
 * 
 * Features:
 * - Board list with thumbnails
 * - Search and filter
 * - Create new board
 * - Switch between boards
 * - Delete boards
 * 
 * Future: Enhanced board management
 * - Board templates
 * - Board folders/categories
 * - Board sharing
 * - Board analytics
 */

"use client";

import React, { useState, useMemo } from "react";
import { useBoards } from "@/contexts/BoardsContext";

export default function BoardsSidebar(): JSX.Element {
  const {
    boards,
    currentBoardId,
    createBoard,
    switchBoard,
    deleteBoard,
    searchBoards,
    filterBoards,
  } = useBoards();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [newBoardDescription, setNewBoardDescription] = useState("");

  // Get all unique tags
  // NOTE: Defensive programming - ensure boards and tags are always arrays
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    // Safely handle undefined/null boards or tags
    (boards ?? []).forEach(b => {
      // Ensure b.tags is always an array before forEach
      (b?.tags ?? []).forEach(tag => {
        if (tag) tags.add(tag);
      });
    });
    return Array.from(tags);
  }, [boards]);

  // Filter boards
  // NOTE: Defensive programming - ensure boards is always an array
  const filteredBoards = useMemo(() => {
    // Default to empty array if boards is undefined/null
    let result = boards ?? [];

    // Apply search
    if (searchQuery.trim() && searchBoards) {
      const searchResult = searchBoards(searchQuery);
      result = Array.isArray(searchResult) ? searchResult : result;
    }

    // Apply tag filter
    if (selectedTags.length > 0 && filterBoards) {
      const filterResult = filterBoards({ tags: selectedTags });
      result = Array.isArray(filterResult) ? filterResult : result;
    }

    return result;
  }, [boards, searchQuery, selectedTags, searchBoards, filterBoards]);

  /**
   * Handle create board
   */
  const handleCreateBoard = () => {
    if (!newBoardTitle.trim()) {
      alert("Please enter a board title");
      return;
    }

    createBoard(newBoardTitle, newBoardDescription || undefined);
    setNewBoardTitle("");
    setNewBoardDescription("");
    setShowCreateModal(false);
  };

  /**
   * Handle delete board
   */
  const handleDeleteBoard = (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this board? This action cannot be undone.")) {
      deleteBoard(boardId);
    }
  };

  /**
   * Toggle tag filter
   */
  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Boards
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            title="Create new board"
            aria-label="Create new board"
          >
            +
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search boards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
        />
      </div>

      {/* Tag Filters */}
      {allTags.length > 0 && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filter by Tags
          </h3>
          <div className="flex flex-wrap gap-1">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedTags.includes(tag)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Board List */}
      <div className="flex-1 overflow-y-auto">
        {!filteredBoards || filteredBoards.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            {searchQuery || selectedTags.length > 0
              ? "No boards found"
              : "No boards yet"}
          </div>
        ) : (
          <div className="p-2">
            {filteredBoards.map(board => {
              // Defensive check - ensure board exists and has required properties
              if (!board || !board.id) return null;
              
              // Ensure tags is always an array
              const boardTags = Array.isArray(board.tags) ? board.tags : [];
              
              return (
                <div
                  key={board.id}
                  onClick={() => switchBoard(board.id)}
                  className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                    currentBoardId === board.id
                      ? "bg-blue-100 dark:bg-blue-900 border-2 border-blue-500"
                      : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {board.title || "Untitled Board"}
                      </h3>
                      {board.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {board.description}
                        </p>
                      )}
                      {boardTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {boardTags.map(tag => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {board.updatedAt ? new Date(board.updatedAt).toLocaleDateString() : "Unknown date"}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteBoard(board.id, e)}
                      className="ml-2 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      title="Delete board"
                      aria-label="Delete board"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Board Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create New Board
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  placeholder="Enter board title"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newBoardDescription}
                  onChange={(e) => setNewBoardDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  placeholder="Enter board description (optional)"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewBoardTitle("");
                    setNewBoardDescription("");
                  }}
                  className="px-4 py-2 text-sm rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBoard}
                  className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

