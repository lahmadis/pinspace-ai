"use client";

import React from "react";
import type { ToolType } from "./CanvasToolbar";

interface ShapesPopoverProps {
  onSelectShape: (shape: ToolType) => void;
  onClose: () => void;
}

export default function ShapesPopover({ onSelectShape, onClose }: ShapesPopoverProps) {
  const itemsTop = [
    { shape: "rect", label: "□" },
    { shape: "circle", label: "○" },
    { shape: "triangle", label: "△" },
    { shape: "diamond", label: "◇" },
  ];

  const itemsBottom = [
    { shape: "star", label: "★" },
    { shape: "bubble", label: "💬" },
    { shape: "arrow", label: "→" },
  ];

  return (
    <div className="absolute z-50 bg-white border border-gray-300 rounded-md shadow-lg p-3 w-40">
      <div className="grid grid-cols-4 gap-2 mb-3">
        {itemsTop.map((item) => (
          <button
            key={item.shape}
            className="flex items-center justify-center h-8 w-8 border border-gray-300 rounded hover:border-blue-600 hover:text-blue-600 text-sm"
            onClick={() => {
              onSelectShape(item.shape as ToolType);
              onClose();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {itemsBottom.map((item) => (
          <button
            key={item.shape}
            className="flex items-center justify-center h-8 w-8 border border-gray-300 rounded hover:border-blue-600 hover:text-blue-600 text-xs"
            onClick={() => {
              onSelectShape(item.shape as ToolType);
              onClose();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <button
        className="w-full text-xs text-gray-600 bg-gray-100 rounded px-2 py-1 cursor-default"
        disabled
      >
        More shapes
      </button>
    </div>
  );
}

