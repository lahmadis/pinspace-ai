"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// Minimal shape used by the panel
export type BoardComment = {
  id: string;
  boardId: string;
  elementId?: string; // Raw UUID (e_ prefix stripped)
  category: string;
  text: string;
  createdAt: number;
  createdBy: string;
  isTask?: boolean;
  source?: string; // e.g., "liveCrit" for crit session comments
};

/**
 * Hook options for filtering comments
 */
export interface UseCommentsOptions {
  /** Board ID (required) - filters comments by board */
  boardId: string;
  /** Element ID (optional) - filters comments by specific element */
  elementId?: string | null;
  /** Source (optional) - filters comments by source (e.g., "liveCrit" for crit session comments) */
  source?: string | null;
}

/**
 * REFACTORED: Unified hook to fetch comments from Supabase with filtering support
 * 
 * This hook:
 * - Fetches comments from the shared Supabase comments table
 * - Supports filtering by board, element, and crit session (source)
 * - Provides real-time updates via Supabase subscriptions
 * - Works across all contexts: student page, live crit page, board page, etc.
 * 
 * @param options - Filtering options: { boardId, elementId?, source? }
 * @returns Array of comments matching the filters
 * 
 * @example
 * // All comments for a board
 * const [comments] = useComments({ boardId: "board-123" });
 * 
 * @example
 * // Comments for a specific element
 * const [comments] = useComments({ boardId: "board-123", elementId: "element-uuid" });
 * 
 * @example
 * // Live crit session comments
 * const [comments] = useComments({ boardId: "board-123", source: "liveCrit" });
 * 
 * @example
 * // Live crit comments for a specific element
 * const [comments] = useComments({ 
 *   boardId: "board-123", 
 *   elementId: "element-uuid",
 *   source: "liveCrit" 
 * });
 */
export function useComments(options: UseCommentsOptions): [BoardComment[]] {
  const { boardId, elementId, source } = options;
  const [comments, setComments] = useState<BoardComment[]>([]);

  useEffect(() => {
    if (!boardId) return;

    // REFACTORED: Use the centralized Supabase client from supabaseClient.ts
    // This ensures consistent configuration and uses environment variables correctly
    // The supabase client is already initialized with NEXT_PUBLIC_SUPABASE_URL
    // and NEXT_PUBLIC_SUPABASE_ANON_KEY from .env.local

    /**
     * Fetch comments from Supabase API with filtering
     * 
     * Builds query parameters based on provided filters:
     * - boardId (required): Filter by board
     * - elementId (optional): Filter by element
     * - source (optional): Filter by source (e.g., "liveCrit")
     */
    const fetchComments = async () => {
      try {
        // Build query parameters
        const params = new URLSearchParams({ boardId });
        if (elementId) {
          params.append('elementId', elementId);
        }
        if (source) {
          params.append('source', source);
        }

        const response = await fetch(`/api/comments?${params.toString()}`);
        if (!response.ok) {
          console.error("[useComments] Failed to fetch comments:", response.statusText);
          return;
        }

        const result = await response.json();
        // Handle both { data: [...] } and direct array responses
        const commentsData = result.data || result.comments || result || [];
        
        // Transform to BoardComment format
        const transformed: BoardComment[] = commentsData.map((c: any) => {
          // Convert timestamp to number (milliseconds)
          let createdAt = Date.now();
          if (c.createdAt) {
            createdAt = typeof c.createdAt === 'string' 
              ? new Date(c.createdAt).getTime() 
              : c.createdAt;
          } else if (c.timestamp) {
            createdAt = typeof c.timestamp === 'string'
              ? new Date(c.timestamp).getTime()
              : c.timestamp;
          }

          return {
            id: c.id,
            boardId: c.boardId || c.board_id,
            elementId: c.elementId || c.targetElementId || c.target_element_id || c.element_id || undefined,
            category: c.category || "general",
            text: c.text,
            createdAt,
            createdBy: c.author || c.authorName || c.author_name || "Anonymous",
            isTask: c.task || c.is_task || false,
            source: c.source || undefined, // Include source for filtering
          };
        });

        setComments(transformed);
      } catch (error) {
        console.error("[useComments] Error fetching comments:", error);
      }
    };

    // Initial fetch
    fetchComments();

    // Set up real-time subscription for new comments
    // Filter subscription by board_id (required) and optionally by source
    const channelName = `comments:${boardId}${elementId ? `:${elementId}` : ''}${source ? `:${source}` : ''}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to INSERT, UPDATE, DELETE
          schema: "public",
          table: "comments",
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          console.log("[useComments] Real-time update:", payload.eventType, payload);
          
          // Refetch comments when changes occur (filtering happens on server)
          fetchComments();
        }
      )
      .subscribe((status) => {
        console.log("[useComments] Subscription status:", status);
      });

    // Cleanup: unsubscribe on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, elementId, source]); // Re-fetch when filters change

  return [comments];
}
