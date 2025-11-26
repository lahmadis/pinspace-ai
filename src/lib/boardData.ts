// Shared board data access
// This module provides server-side access to board data stores

import { headers } from "next/headers";
import type { Comment, Snapshot, Card } from "@/types";

// Initial cards for boards (this matches what's in the client)
export const INITIAL_CARDS: Card[] = [
  {
    id: "card-1",
    title: "Facade Reference",
    body: "Layered reflective skin / textile logic. Exploring how surface reads as motion.",
    x: 100,
    y: 100,
  },
  {
    id: "card-2",
    title: "Circulation Diagram",
    body: "Circulation spine cuts through studio mass and exposes work. Public spine / visibility.",
    x: 420,
    y: 100,
  },
  {
    id: "card-3",
    title: "Material Study",
    body: "Perforated metal veil / double skin for thermal buffer. Material gradient exploration.",
    x: 100,
    y: 300,
  },
];

// REFACTORED: Added await before headers() call - in Next.js 15+, headers() returns Promise<ReadonlyHeaders>
// Get base URL for server-side fetch
async function getBaseUrl(): Promise<string> {
  try {
    const headersList = await headers();
    const host = headersList.get("host");
    const protocol = headersList.get("x-forwarded-proto") || "http";
    if (host) {
      return `${protocol}://${host}`;
    }
  } catch (err) {
    // Fallback if headers not available
  }
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
}

// Get comments for a board (server-side fetch from API)
// 
// REFACTORED: Uses unified Supabase comments table with boardId filtering
// 
// This function fetches comments from the shared Supabase comments table,
// filtered by boardId. Optional filters for elementId and source can be added.
export async function getCommentsForBoard(
  boardId: string,
  options?: { elementId?: string; source?: string }
): Promise<Comment[]> {
  try {
    const baseUrl = await getBaseUrl();
    
    // Build query parameters
    const params = new URLSearchParams({ boardId });
    if (options?.elementId) {
      params.append('elementId', options.elementId);
    }
    if (options?.source) {
      params.append('source', options.source);
    }
    
    // Fetch comments from API with filtering
    const res = await fetch(`${baseUrl}/api/comments?${params.toString()}`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return [];
    
    const data = await res.json();
    // API returns { data: Comment[] } format
    return data.data || data.comments || [];
  } catch (err) {
    console.error("Failed to load comments", err);
    return [];
  }
}

// Get snapshots for a board (server-side fetch from API)
export async function getSnapshotsForBoard(
  boardId: string
): Promise<Snapshot[]> {
  try {
    const baseUrl = await getBaseUrl();
    const res = await fetch(`${baseUrl}/api/snapshots`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.snapshots || []).filter((s: Snapshot) => s.boardId === boardId);
  } catch (err) {
    console.error("Failed to load snapshots", err);
    return [];
  }
}

// Get board data (cards, comments, snapshots)
export async function getBoardData(
  boardId: string,
  snapshotId?: string | null
): Promise<{
  cards: Card[];
  comments: Comment[];
  versionLabel: string;
  boardTitle: string;
  collaborators: string;
}> {
  const [comments, snapshots] = await Promise.all([
    getCommentsForBoard(boardId),
    getSnapshotsForBoard(boardId),
  ]);

  const snapshot = snapshotId
    ? snapshots.find((s) => s.id === snapshotId)
    : null;

  const cards = snapshot ? snapshot.data.cards : INITIAL_CARDS;
  const displayComments = snapshot ? snapshot.data.comments : comments;

  return {
    cards,
    comments: displayComments,
    versionLabel: snapshot ? snapshot.label : "Live board",
    boardTitle: "Runway / Movement Study", // Hardcoded for now
    collaborators: "3 collaborators", // Hardcoded for now
  };
}
