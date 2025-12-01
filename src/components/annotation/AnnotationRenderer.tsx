/**
 * Annotation Renderer Component
 * 
 * Renders annotation shapes (rectangle, ellipse, arrow, text box, highlight).
 * Handles visual representation and interaction.
 * 
 * Features:
 * - Rectangle rendering
 * - Ellipse rendering
 * - Arrow rendering (with start/end points)
 * - Text box rendering
 * - Highlight rendering
 * 
 * Future: Enhanced rendering
 * - SVG optimization
 * - Layer management
 * - Export support
 */

"use client";

import React from "react";
import type { AnnotationShape } from "@/types/annotation";

interface AnnotationRendererProps {
  annotation: AnnotationShape;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onDoubleClick?: (id: string) => void;
}

export default function AnnotationRenderer({
  annotation,
  isSelected = false,
  onSelect,
  onDoubleClick,
}: AnnotationRendererProps): JSX.Element {
  /**
   * Render rectangle
   */
  const renderRectangle = () => (
    <rect
      x={annotation.x}
      y={annotation.y}
      width={annotation.width}
      height={annotation.height}
      fill={annotation.fill || "none"}
      stroke={annotation.color}
      strokeWidth={annotation.strokeWidth}
      opacity={annotation.opacity || 1}
      className={isSelected ? "cursor-pointer" : ""}
      style={{
        filter: isSelected ? "drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))" : undefined,
      }}
    />
  );

  /**
   * Render ellipse
   */
  const renderEllipse = () => {
    const centerX = annotation.x + annotation.width / 2;
    const centerY = annotation.y + annotation.height / 2;
    const radiusX = annotation.width / 2;
    const radiusY = annotation.height / 2;

    return (
      <ellipse
        cx={centerX}
        cy={centerY}
        rx={radiusX}
        ry={radiusY}
        fill={annotation.fill || "none"}
        stroke={annotation.color}
        strokeWidth={annotation.strokeWidth}
        opacity={annotation.opacity || 1}
        className={isSelected ? "cursor-pointer" : ""}
        style={{
          filter: isSelected ? "drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))" : undefined,
        }}
      />
    );
  };

  /**
   * Render arrow
   */
  const renderArrow = () => {
    const startX = annotation.x;
    const startY = annotation.y;
    const endX = annotation.endX ?? annotation.x + annotation.width;
    const endY = annotation.endY ?? annotation.y + annotation.height;

    // Calculate arrow head
    const angle = Math.atan2(endY - startY, endX - startX);
    const arrowLength = 10;
    const arrowWidth = 6;

    const arrowHeadX1 = endX - arrowLength * Math.cos(angle - Math.PI / 6);
    const arrowHeadY1 = endY - arrowLength * Math.sin(angle - Math.PI / 6);
    const arrowHeadX2 = endX - arrowLength * Math.cos(angle + Math.PI / 6);
    const arrowHeadY2 = endY - arrowLength * Math.sin(angle + Math.PI / 6);

    return (
      <g>
        {/* Arrow line */}
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke={annotation.color}
          strokeWidth={annotation.strokeWidth}
          opacity={annotation.opacity || 1}
          markerEnd="url(#arrowhead)"
        />
        {/* Arrow head */}
        <polygon
          points={`${endX},${endY} ${arrowHeadX1},${arrowHeadY1} ${arrowHeadX2},${arrowHeadY2}`}
          fill={annotation.color}
          opacity={annotation.opacity || 1}
        />
      </g>
    );
  };

  /**
   * Render text box
   */
  const renderTextBox = () => (
    <g>
      {/* Background rectangle */}
      <rect
        x={annotation.x}
        y={annotation.y}
        width={annotation.width}
        height={annotation.height}
        fill={annotation.fill || "#ffffff"}
        stroke={annotation.color}
        strokeWidth={annotation.strokeWidth}
        opacity={annotation.opacity || 1}
        className={isSelected ? "cursor-pointer" : ""}
        style={{
          filter: isSelected ? "drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))" : undefined,
        }}
      />
      {/* Text */}
      {annotation.text && (
        <text
          x={annotation.x + 5}
          y={annotation.y + (annotation.fontSize || 14) + 5}
          fill={annotation.color}
          fontSize={annotation.fontSize || 14}
          fontFamily={annotation.fontFamily || "Arial"}
          className="select-text"
        >
          {annotation.text}
        </text>
      )}
    </g>
  );

  /**
   * Render highlight
   */
  const renderHighlight = () => (
    <rect
      x={annotation.x}
      y={annotation.y}
      width={annotation.width}
      height={annotation.height}
      fill={annotation.color}
      opacity={annotation.opacity || 0.3}
      className={isSelected ? "cursor-pointer" : ""}
      style={{
        filter: isSelected ? "drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))" : undefined,
      }}
    />
  );

  const handleClick = () => {
    if (onSelect) {
      onSelect(annotation.id);
    }
  };

  const handleDoubleClick = () => {
    if (onDoubleClick) {
      onDoubleClick(annotation.id);
    }
  };

  return (
    <g
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={{ pointerEvents: "all" }}
    >
      {annotation.type === "rectangle" && renderRectangle()}
      {annotation.type === "ellipse" && renderEllipse()}
      {annotation.type === "arrow" && renderArrow()}
      {annotation.type === "textbox" && renderTextBox()}
      {annotation.type === "highlight" && renderHighlight()}
      
      {/* Selection indicator */}
      {isSelected && (
        <rect
          x={annotation.x - 2}
          y={annotation.y - 2}
          width={annotation.width + 4}
          height={annotation.height + 4}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="4 4"
          opacity={0.8}
        />
      )}
    </g>
  );
}











