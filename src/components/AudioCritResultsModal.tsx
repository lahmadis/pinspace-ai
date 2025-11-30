"use client";

import { useState } from "react";
import type { Comment } from "@/types";

interface AudioCritResults {
  transcript: string;
  analysis: {
    themes: {
      circulation?: string[];
      materials?: string[];
      structure?: string[];
      spatial?: string[];
      formal?: string[];
      site?: string[];
    };
    actionItems: string[];
    keywords: string[];
    summary: string;
  };
}

interface AudioCritResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: AudioCritResults | null;
  onSaveAsComments: (comments: Array<{ text: string; category: Comment["category"] }>) => void;
  boardId: string;
}

/**
 * AudioCritResultsModal Component
 * 
 * Displays transcribed audio and AI-analyzed feedback from architecture critique.
 * Allows user to review and save feedback as comments on the board.
 */
export default function AudioCritResultsModal({
  isOpen,
  onClose,
  results,
  onSaveAsComments,
  boardId,
}: AudioCritResultsModalProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  if (!results) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">No Results</h2>
          <p className="text-gray-600 mb-4">No analysis results available.</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const themeLabels: Record<string, string> = {
    circulation: "Circulation",
    materials: "Materials",
    structure: "Structure",
    spatial: "Spatial",
    formal: "Formal",
    site: "Site",
  };

  const themeCategories: Record<string, Comment["category"]> = {
    circulation: "circulation",
    materials: "material",
    structure: "structure",
    spatial: "general",
    formal: "general",
    site: "general",
  };

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleSaveSelected = async () => {
    if (selectedItems.size === 0) {
      alert("Please select at least one item to save as a comment.");
      return;
    }

    setSaving(true);

    try {
      const comments: Array<{ text: string; category: Comment["category"] }> = [];

      // Process themes
      Object.entries(results.analysis.themes).forEach(([themeKey, items]) => {
        items?.forEach((item, index) => {
          const itemId = `theme-${themeKey}-${index}`;
          if (selectedItems.has(itemId)) {
            comments.push({
              text: item,
              category: themeCategories[themeKey] || "general",
            });
          }
        });
      });

      // Process action items
      results.analysis.actionItems.forEach((item, index) => {
        const itemId = `action-${index}`;
        if (selectedItems.has(itemId)) {
          comments.push({
            text: item,
            category: "general",
          });
        }
      });

      await onSaveAsComments(comments);
      setSelectedItems(new Set());
      onClose();
    } catch (error) {
      console.error("Failed to save comments:", error);
      alert("Failed to save comments. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Critique Analysis</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Summary */}
          {results.analysis.summary && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Summary</h3>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-md">{results.analysis.summary}</p>
            </div>
          )}

          {/* Themes */}
          {Object.keys(results.analysis.themes).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Themes</h3>
              <div className="space-y-4">
                {Object.entries(results.analysis.themes).map(([themeKey, items]) => {
                  if (!items || items.length === 0) return null;
                  return (
                    <div key={themeKey} className="border border-gray-200 rounded-md p-4">
                      <h4 className="font-medium text-gray-900 mb-2">
                        {themeLabels[themeKey] || themeKey}
                      </h4>
                      <ul className="space-y-2">
                        {items.map((item, index) => {
                          const itemId = `theme-${themeKey}-${index}`;
                          return (
                            <li key={index} className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                id={itemId}
                                checked={selectedItems.has(itemId)}
                                onChange={() => toggleItem(itemId)}
                                className="mt-1"
                              />
                              <label htmlFor={itemId} className="text-sm text-gray-700 flex-1 cursor-pointer">
                                {item}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Items */}
          {results.analysis.actionItems.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Action Items</h3>
              <div className="border border-gray-200 rounded-md p-4">
                <ul className="space-y-2">
                  {results.analysis.actionItems.map((item, index) => {
                    const itemId = `action-${index}`;
                    return (
                      <li key={index} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          id={itemId}
                          checked={selectedItems.has(itemId)}
                          onChange={() => toggleItem(itemId)}
                          className="mt-1"
                        />
                        <label htmlFor={itemId} className="text-sm text-gray-700 flex-1 cursor-pointer">
                          {item}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}

          {/* Keywords */}
          {results.analysis.keywords.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {results.analysis.keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Full Transcript */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Full Transcript</h3>
            <div className="bg-gray-50 p-4 rounded-md max-h-48 overflow-y-auto">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{results.transcript}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {selectedItems.size > 0
              ? `${selectedItems.size} item${selectedItems.size > 1 ? "s" : ""} selected`
              : "Select items to save as comments"}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
            >
              Close
            </button>
            <button
              onClick={handleSaveSelected}
              disabled={selectedItems.size === 0 || saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : `Save ${selectedItems.size > 0 ? `${selectedItems.size} ` : ""}Comment${selectedItems.size !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

