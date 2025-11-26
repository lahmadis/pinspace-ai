// src/lib/comments.ts
"use client";

export type BoardComment = {
  id: string;
  boardId: string;
  elementId: string;        // the selected element on the canvas
  category: string;         // "General", "Plan", etc.
  text: string;
  createdAt: number;
  createdBy: string;
  isTask?: boolean;
};

const keyFor = (boardId: string) => `pinspace_comments_${boardId}`;
const pingKeyFor = (boardId: string) => `pinspace_comments_ping_${boardId}`;

export function getComments(boardId: string): BoardComment[] {
  try {
    const raw = localStorage.getItem(keyFor(boardId));
    return raw ? (JSON.parse(raw) as BoardComment[]) : [];
  } catch {
    return [];
  }
}

export function addComment(c: BoardComment) {
  const key = keyFor(c.boardId);
  const list = getComments(c.boardId);
  
  // Check for duplicates before adding (same text, author, elementId, and within 5 seconds)
  const now = Date.now();
  const isDuplicate = list.some(existing => 
    existing.text === c.text &&
    existing.createdBy === c.createdBy &&
    existing.elementId === c.elementId &&
    Math.abs(existing.createdAt - c.createdAt) < 5000 // within 5 seconds
  );
  
  if (isDuplicate) {
    console.log("[comments] Duplicate comment detected, skipping:", c.text);
    return; // Skip adding duplicate
  }
  
  list.push(c);

  try {
    localStorage.setItem(key, JSON.stringify(list));
    // ping other tabs
    localStorage.setItem(pingKeyFor(c.boardId), String(Date.now()));
    // and notify THIS tab immediately
    window.dispatchEvent(
      new CustomEvent("pinspace-comments-changed", { detail: { boardId: c.boardId } })
    );
  } catch {
    /* ignore */
  }
}

export function removeComment(boardId: string, commentId: string) {
  try {
    const key = keyFor(boardId);
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    const next = (arr as any[]).filter(c => c.id !== commentId);
    localStorage.setItem(key, JSON.stringify(next));
    // notify other tabs
    try {
      localStorage.setItem(pingKeyFor(boardId), String(Date.now()));
      window.dispatchEvent(new CustomEvent("pinspace-comments-changed", { detail: { boardId } }));
    } catch {}
  } catch (e) {
    console.error("[comments] removeComment failed", e);
  }
}