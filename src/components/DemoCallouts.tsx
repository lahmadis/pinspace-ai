"use client";

import { useState } from "react";

interface CalloutProps {
  id: string;
  text: string;
  position: { top?: number | string; left?: number | string; right?: number | string; bottom?: number | string };
  onDismiss: (id: string) => void;
}

function Callout({ id, text, position, onDismiss }: CalloutProps) {
  return (
    <div
      className="absolute z-50 max-w-xs bg-white border border-gray-300 rounded-lg shadow-lg p-4"
      style={position}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
        <button
          onClick={() => onDismiss(id)}
          className="text-gray-400 hover:text-gray-600 transition flex-shrink-0 ml-2"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function DemoCallouts() {
  const [dismissedCallouts, setDismissedCallouts] = useState<Set<string>>(new Set());

  const handleDismiss = (id: string) => {
    setDismissedCallouts((prev) => new Set(prev).add(id));
  };

  const callouts = [
    {
      id: "canvas",
      text: "Drag around, zoom, and arrange your work here.",
      position: { top: "80px", left: "180px" },
    },
    {
      id: "toolbar",
      text: "Add stickies, shapes, images, or draw like a pin-up wall.",
      position: { top: "100px", left: "20px" },
    },
    {
      id: "liveCrit",
      text: "Start Live Crit to generate a QR code for in-room feedback.",
      position: { top: "80px", right: "360px" },
    },
    {
      id: "summary",
      text: "See what reviewers asked for + your task list.",
      position: { bottom: "80px", right: "360px" },
    },
  ];

  return (
    <>
      {callouts
        .filter((callout) => !dismissedCallouts.has(callout.id))
        .map((callout) => (
          <Callout
            key={callout.id}
            id={callout.id}
            text={callout.text}
            position={callout.position}
            onDismiss={handleDismiss}
          />
        ))}
    </>
  );
}

