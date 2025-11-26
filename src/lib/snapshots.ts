// Snapshot helpers for board timeline
// Stores simple snapshots: { id, boardId, timestamp, note }

const STORAGE_KEY_TIMELINE_SNAPSHOTS = "pinspace_timeline_snapshots";

export type TimelineSnapshot = {
  id: string;
  boardId: string;
  timestamp: number;
  note: string;
};

export function getSnapshotsForBoard(boardId: string): TimelineSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY_TIMELINE_SNAPSHOTS);
    const allSnapshots = data ? JSON.parse(data) : [];
    return allSnapshots
      .filter((snapshot: TimelineSnapshot) => snapshot.boardId === boardId)
      .sort((a: TimelineSnapshot, b: TimelineSnapshot) => {
        // Sort newest first
        return b.timestamp - a.timestamp;
      });
  } catch (err) {
    console.error("Error reading timeline snapshots from localStorage", err);
    return [];
  }
}

export function addSnapshotForBoard(boardId: string, note?: string): void {
  if (typeof window === "undefined") return;
  try {
    const data = localStorage.getItem(STORAGE_KEY_TIMELINE_SNAPSHOTS);
    const allSnapshots = data ? JSON.parse(data) : [];
    
    const newSnapshot: TimelineSnapshot = {
      id: `timeline_snap_${Date.now()}`,
      boardId,
      timestamp: Date.now(),
      note: note || "Saved snapshot of board",
    };
    
    allSnapshots.push(newSnapshot);
    localStorage.setItem(STORAGE_KEY_TIMELINE_SNAPSHOTS, JSON.stringify(allSnapshots));
  } catch (err) {
    console.error("Error saving timeline snapshot to localStorage", err);
  }
}

