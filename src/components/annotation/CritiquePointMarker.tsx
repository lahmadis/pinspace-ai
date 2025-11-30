/**
 * Critique Point Marker Component
 * 
 * Displays numbered critique point markers on the board.
 * Shows status, priority, and allows interaction.
 * 
 * Features:
 * - Numbered markers
 * - Status indicators (open/resolved/addressed)
 * - Priority indicators
 * - Click to view details
 * - Link visualization
 * 
 * Future: Enhanced markers
 * - Custom icons
 * - Animation effects
 * - Category colors
 */

"use client";

import React from "react";
import type { CritiquePoint } from "@/types/annotation";

interface CritiquePointMarkerProps {
  point: CritiquePoint;
  isSelected?: boolean;
  onClick?: (id: string) => void;
  onDoubleClick?: (id: string) => void;
}

export default function CritiquePointMarker({
  point,
  isSelected = false,
  onClick,
  onDoubleClick,
}: CritiquePointMarkerProps): JSX.Element {
  const getStatusColor = () => {
    switch (point.status) {
      case "resolved":
        return "#10b981"; // Green
      case "addressed":
        return "#3b82f6"; // Blue
      default:
        return "#ef4444"; // Red
    }
  };

  const getPriorityColor = () => {
    switch (point.priority) {
      case "high":
        return "#ef4444"; // Red
      case "medium":
        return "#f59e0b"; // Orange
      default:
        return "#10b981"; // Green
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(point.id);
    }
  };

  const handleDoubleClick = () => {
    if (onDoubleClick) {
      onDoubleClick(point.id);
    }
  };

  return (
    <div
      className="absolute cursor-pointer"
      style={{
        left: `${point.x}px`,
        top: `${point.y}px`,
        transform: "translate(-50%, -50%)",
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      role="button"
      tabIndex={0}
      aria-label={`Critique point ${point.number}: ${point.title || point.description}. Status: ${point.status}. Priority: ${point.priority || "medium"}`}
      title={point.title || point.description}
    >
      {/* Marker circle */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg transition-all"
        style={{
          backgroundColor: getStatusColor(),
          border: isSelected ? "3px solid #3b82f6" : "2px solid white",
          transform: isSelected ? "scale(1.2)" : "scale(1)",
        }}
      >
        {point.number}
      </div>
      
      {/* Priority indicator */}
      {point.priority === "high" && (
        <div
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
          style={{ backgroundColor: getPriorityColor() }}
        />
      )}
      
      {/* Status indicator */}
      {point.status === "resolved" && (
        <div className="absolute -bottom-1 -right-1 text-green-500 text-xs">
          ✓
        </div>
      )}
    </div>
  );
}










