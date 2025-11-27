/**
 * Board Navigator Component
 * 
 * Provides navigation controls for large canvases:
 * - Minimap for overview and quick navigation
 * - Pan controls (arrow keys, buttons)
 * - Zoom controls
 * - Section/frame navigation
 * 
 * Features:
 * - Visual minimap showing board overview
 * - Click minimap to jump to location
 * - Arrow key navigation
 * - Zoom in/out/reset
 * - Section/frame list and navigation
 * 
 * Future: Enhanced navigation
 * - Touch gestures for mobile
 * - Keyboard shortcuts
 * - Custom viewport presets
 * - Navigation history
 */

"use client";

import React, { useState, useRef, useEffect } from "react";
import { useBoards } from "@/contexts/BoardsContext";
import type { BoardSection } from "@/contexts/BoardsContext";

interface BoardNavigatorProps {
  canvasRef: React.RefObject<HTMLElement>;
  onPanChange?: (pan: { x: number; y: number }) => void;
  onZoomChange?: (zoom: number) => void;
  sections?: BoardSection[];
  onSectionFocus?: (sectionId: string) => void;
}

export default function BoardNavigator({
  canvasRef,
  onPanChange,
  onZoomChange,
  sections = [],
  onSectionFocus,
}: BoardNavigatorProps): JSX.Element {
  const { currentBoard } = useBoards();
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showMinimap, setShowMinimap] = useState(true);
  const minimapRef = useRef<HTMLDivElement>(null);

  // Update pan/zoom when props change
  useEffect(() => {
    if (onPanChange) {
      onPanChange(pan);
    }
  }, [pan, onPanChange]);

  useEffect(() => {
    if (onZoomChange) {
      onZoomChange(zoom);
    }
  }, [zoom, onZoomChange]);

  /**
   * Handle pan
   */
  const handlePan = (direction: "up" | "down" | "left" | "right") => {
    const step = 100;
    setPan(prev => {
      switch (direction) {
        case "up":
          return { ...prev, y: prev.y + step };
        case "down":
          return { ...prev, y: prev.y - step };
        case "left":
          return { ...prev, x: prev.x + step };
        case "right":
          return { ...prev, x: prev.x - step };
        default:
          return prev;
      }
    });
  };

  /**
   * Handle zoom
   */
  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(0.25, Math.min(3, prev + delta)));
  };

  /**
   * Reset view
   */
  const handleReset = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  /**
   * Handle minimap click
   */
  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!minimapRef.current || !canvasRef.current) return;

    const rect = minimapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1200 - 600; // Assuming board width 1200
    const y = ((e.clientY - rect.top) / rect.height) * 800 - 400; // Assuming board height 800

    setPan({ x: -x, y: -y });
  };

  /**
   * Focus on section
   */
  const handleFocusSection = (section: BoardSection) => {
    if (!section.visible) return;

    // Center view on section
    const centerX = section.x + section.width / 2;
    const centerY = section.y + section.height / 2;
    setPan({ x: -centerX + 600, y: -centerY + 400 }); // Center in viewport

    if (onSectionFocus) {
      onSectionFocus(section.id);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in input
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          handlePan("up");
          break;
        case "ArrowDown":
          e.preventDefault();
          handlePan("down");
          break;
        case "ArrowLeft":
          e.preventDefault();
          handlePan("left");
          break;
        case "ArrowRight":
          e.preventDefault();
          handlePan("right");
          break;
        case "+":
        case "=":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleZoom(0.1);
          }
          break;
        case "-":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleZoom(-0.1);
          }
          break;
        case "0":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleReset();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const boardSections = currentBoard?.sections || sections;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2">
      {/* Minimap */}
      {showMinimap && (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Minimap
            </span>
            <button
              onClick={() => setShowMinimap(false)}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>
          <div
            ref={minimapRef}
            onClick={handleMinimapClick}
            className="w-48 h-32 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 cursor-crosshair relative overflow-hidden"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 11px), repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 11px)",
            }}
          >
            {/* Viewport indicator */}
            <div
              className="absolute border-2 border-blue-500 bg-blue-500/20"
              style={{
                left: `${((pan.x + 600) / 1200) * 100}%`,
                top: `${((pan.y + 400) / 800) * 100}%`,
                width: `${(600 / 1200) * 100}%`,
                height: `${(400 / 800) * 100}%`,
                transform: `scale(${1 / zoom})`,
              }}
            />
            {/* Sections */}
            {boardSections.map(section => (
              <div
                key={section.id}
                className={`absolute border ${
                  section.visible
                    ? section.locked
                      ? "border-yellow-500 bg-yellow-500/20"
                      : "border-green-500 bg-green-500/20"
                    : "border-gray-400 bg-gray-400/10"
                }`}
                style={{
                  left: `${(section.x / 1200) * 100}%`,
                  top: `${(section.y / 800) * 100}%`,
                  width: `${(section.width / 1200) * 100}%`,
                  height: `${(section.height / 800) * 100}%`,
                }}
                title={section.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2">
        {/* Pan Controls */}
        <div className="grid grid-cols-3 gap-1 mb-2">
          <div></div>
          <button
            onClick={() => handlePan("up")}
            className="p-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
            title="Pan Up (↑)"
            aria-label="Pan up"
          >
            ↑
          </button>
          <div></div>
          <button
            onClick={() => handlePan("left")}
            className="p-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
            title="Pan Left (←)"
            aria-label="Pan left"
          >
            ←
          </button>
          <button
            onClick={handleReset}
            className="p-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300 text-xs"
            title="Reset View (Ctrl+0)"
            aria-label="Reset view"
          >
            ⌂
          </button>
          <button
            onClick={() => handlePan("right")}
            className="p-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
            title="Pan Right (→)"
            aria-label="Pan right"
          >
            →
          </button>
          <div></div>
          <button
            onClick={() => handlePan("down")}
            className="p-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
            title="Pan Down (↓)"
            aria-label="Pan down"
          >
            ↓
          </button>
          <div></div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 mb-2">
          <button
            onClick={() => handleZoom(-0.1)}
            className="flex-1 px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
            title="Zoom Out (Ctrl+-)"
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => handleZoom(0.1)}
            className="flex-1 px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
            title="Zoom In (Ctrl++)"
            aria-label="Zoom in"
          >
            +
          </button>
        </div>

        {/* Minimap Toggle */}
        {!showMinimap && (
          <button
            onClick={() => setShowMinimap(true)}
            className="w-full px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
          >
            Show Minimap
          </button>
        )}
      </div>

      {/* Sections List */}
      {boardSections.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 max-h-48 overflow-y-auto">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sections
          </div>
          <div className="space-y-1">
            {boardSections.map(section => (
              <button
                key={section.id}
                onClick={() => handleFocusSection(section)}
                disabled={!section.visible}
                className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                  section.visible
                    ? "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                }`}
                title={section.locked ? "Locked" : section.visible ? "Click to focus" : "Hidden"}
              >
                <div className="flex items-center gap-1">
                  {section.locked && <span>🔒</span>}
                  {!section.visible && <span>👁️</span>}
                  <span className="truncate">{section.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}








