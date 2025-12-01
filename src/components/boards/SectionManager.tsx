/**
 * Section Manager Component
 * 
 * Allows users to create, edit, and manage board sections/frames.
 * Sections help organize content within a board.
 * 
 * Features:
 * - Create new sections
 * - Edit section properties (name, position, size)
 * - Toggle section visibility
 * - Lock/unlock sections
 * - Delete sections
 * - Navigate to sections
 * 
 * Future: Enhanced section management
 * - Section templates
 * - Section nesting
 * - Section permissions
 * - Section analytics
 */

"use client";

import React, { useState } from "react";
import { useBoards } from "@/contexts/BoardsContext";
import type { BoardSection } from "@/contexts/BoardsContext";

interface SectionManagerProps {
  boardId: string;
  onSectionFocus?: (sectionId: string) => void;
}

export default function SectionManager({
  boardId,
  onSectionFocus,
}: SectionManagerProps): JSX.Element {
  const { currentBoard, addSection, updateSection, deleteSection } = useBoards();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [newSection, setNewSection] = useState({
    name: "",
    x: 100,
    y: 100,
    width: 400,
    height: 300,
    color: "#3b82f6",
  });

  const sections = currentBoard?.sections || [];

  /**
   * Handle create section
   */
  const handleCreateSection = () => {
    if (!newSection.name.trim()) {
      alert("Please enter a section name");
      return;
    }

    addSection(boardId, {
      name: newSection.name,
      x: newSection.x,
      y: newSection.y,
      width: newSection.width,
      height: newSection.height,
      visible: true,
      locked: false,
      color: newSection.color,
    });

    setNewSection({
      name: "",
      x: 100,
      y: 100,
      width: 400,
      height: 300,
      color: "#3b82f6",
    });
    setShowCreateModal(false);
  };

  /**
   * Handle toggle visibility
   */
  const handleToggleVisibility = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      updateSection(boardId, sectionId, { visible: !section.visible });
    }
  };

  /**
   * Handle toggle lock
   */
  const handleToggleLock = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      updateSection(boardId, sectionId, { locked: !section.locked });
    }
  };

  /**
   * Handle delete section
   */
  const handleDeleteSection = (sectionId: string) => {
    if (confirm("Are you sure you want to delete this section?")) {
      deleteSection(boardId, sectionId);
    }
  };

  /**
   * Handle focus section
   */
  const handleFocusSection = (sectionId: string) => {
    if (onSectionFocus) {
      onSectionFocus(sectionId);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 min-w-[300px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Sections
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          title="Create new section"
          aria-label="Create new section"
        >
          +
        </button>
      </div>

      {/* Sections List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sections.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No sections yet. Create one to organize your board.
          </p>
        ) : (
          sections.map(section => (
            <div
              key={section.id}
              className={`p-3 rounded border ${
                section.visible
                  ? section.locked
                    ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                    : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                  : "border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: section.color || "#3b82f6" }}
                    />
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {section.name}
                    </h4>
                    {section.locked && <span title="Locked">🔒</span>}
                    {!section.visible && <span title="Hidden">👁️</span>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {section.width} × {section.height} at ({section.x}, {section.y})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <button
                  onClick={() => handleFocusSection(section.id)}
                  disabled={!section.visible}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Focus on section"
                >
                  Focus
                </button>
                <button
                  onClick={() => handleToggleVisibility(section.id)}
                  className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                  title={section.visible ? "Hide section" : "Show section"}
                >
                  {section.visible ? "👁️" : "👁️‍🗨️"}
                </button>
                <button
                  onClick={() => handleToggleLock(section.id)}
                  className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                  title={section.locked ? "Unlock section" : "Lock section"}
                >
                  {section.locked ? "🔓" : "🔒"}
                </button>
                <button
                  onClick={() => handleDeleteSection(section.id)}
                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                  title="Delete section"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Section Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create New Section
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={newSection.name}
                  onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  placeholder="Enter section name"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    X
                  </label>
                  <input
                    type="number"
                    value={newSection.x}
                    onChange={(e) => setNewSection({ ...newSection, x: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Y
                  </label>
                  <input
                    type="number"
                    value={newSection.y}
                    onChange={(e) => setNewSection({ ...newSection, y: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Width
                  </label>
                  <input
                    type="number"
                    value={newSection.width}
                    onChange={(e) => setNewSection({ ...newSection, width: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Height
                  </label>
                  <input
                    type="number"
                    value={newSection.height}
                    onChange={(e) => setNewSection({ ...newSection, height: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={newSection.color}
                  onChange={(e) => setNewSection({ ...newSection, color: e.target.value })}
                  className="w-full h-10 rounded border border-gray-300 dark:border-gray-600"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewSection({
                      name: "",
                      x: 100,
                      y: 100,
                      width: 400,
                      height: 300,
                      color: "#3b82f6",
                    });
                  }}
                  className="px-4 py-2 text-sm rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSection}
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











