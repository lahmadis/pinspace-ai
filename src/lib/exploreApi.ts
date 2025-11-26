/**
 * Explore Page API Helpers
 * 
 * NOTE: This file is currently not used - we're using mock data instead.
 * Uncomment and use these helpers when you're ready to integrate with a backend API.
 * 
 * See src/app/explore/page.tsx for instructions on API integration.
 */

// ============================================================================
// COMMENTED OUT - Using mock data instead
// Uncomment when ready to integrate with backend API
// ============================================================================

/*
import type { Board } from "@/types";
import type { BoardCardData } from "@/types/boards";
import { timeAgo } from "@/lib/time";

export async function fetchPublicBoards(): Promise<Board[]> {
  try {
    const response = await fetch("/api/boards?public=true");
    if (!response.ok) {
      throw new Error(`Failed to fetch boards: ${response.statusText}`);
    }
    const data = await response.json();
    return data.boards || [];
  } catch (error) {
    console.error("Error fetching public boards:", error);
    throw error;
  }
}

export async function fetchProfile(username: string): Promise<{
  displayName?: string;
  school?: string;
  avatarUrl?: string;
} | null> {
  try {
    const response = await fetch(`/api/profiles/${username}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.profile || null;
  } catch (error) {
    console.error(`Error fetching profile for ${username}:`, error);
    return null;
  }
}

export function transformBoardsToCardData(
  apiBoards: Board[],
  profiles?: Map<string, { displayName?: string; school?: string }>
): BoardCardData[] {
  return apiBoards
    .filter((board) => board.isPublic)
    .map((board) => {
      const profile = profiles?.get(board.owner || "");
      const institution =
        profile?.school ||
        (board as any).school ||
        "Unknown Institution";
      const authorName = profile?.displayName || board.owner || "Unknown Author";
      const previewImage = (board as any).coverImage || undefined;
      const coverColor = (board as any).coverColor || undefined;
      const timeAgoStr = board.lastEdited
        ? timeAgo(board.lastEdited)
        : "Recently";

      return {
        id: board.id,
        title: board.title || "Untitled Board",
        authorName,
        institution,
        timeAgo: timeAgoStr,
        previewImage,
        coverColor,
      };
    });
}

export async function fetchBoardsWithProfiles(): Promise<BoardCardData[]> {
  try {
    const [boardsResponse, profilesResponse] = await Promise.all([
      fetch("/api/boards?public=true"),
      fetch("/api/profiles"),
    ]);

    if (!boardsResponse.ok) {
      throw new Error(`Failed to fetch boards: ${boardsResponse.statusText}`);
    }

    const boardsData = await boardsResponse.json();
    const boards: Board[] = boardsData.boards || [];

    let profilesMap: Map<string, { displayName?: string; school?: string }> | undefined;
    if (profilesResponse.ok) {
      const profilesData = await profilesResponse.json();
      const profiles = profilesData.profiles || [];
      profilesMap = new Map(
        profiles.map((p: any) => [
          p.username,
          { displayName: p.displayName, school: p.school },
        ])
      );
    }

    return transformBoardsToCardData(boards, profilesMap);
  } catch (error) {
    console.error("Error fetching boards with profiles:", error);
    throw error;
  }
}
*/
