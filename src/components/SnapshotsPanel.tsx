"use client";

import type { BoardSnapshot } from "@/types";

interface SnapshotsPanelProps {
  snapshots: BoardSnapshot[];
  onViewSnapshot: (snapshotId: string) => void;
}

// Format timestamp to relative time (e.g., "2 min ago")
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return `${seconds} sec ago`;
  } else if (minutes < 60) {
    return `${minutes} min ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }
}

export default function SnapshotsPanel({
  snapshots,
  onViewSnapshot,
}: SnapshotsPanelProps) {
  if (snapshots.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Iterations</h3>
        <p className="text-xs text-gray-500">No iterations yet.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Iterations</h3>
      <div className="space-y-2">
        {snapshots.map((snapshot) => (
          <div
            key={snapshot.id}
            className="bg-white border border-gray-200 rounded-md p-3 flex items-center justify-between"
          >
            <div className="flex-1">
              <div className="text-xs text-gray-600 mb-1">
                {formatRelativeTime(snapshot.timestamp)}
              </div>
              <div className="text-xs text-gray-500">
                {snapshot.cards.length} card{snapshot.cards.length !== 1 ? "s" : ""}
              </div>
            </div>
            <button
              onClick={() => onViewSnapshot(snapshot.id)}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              View
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

