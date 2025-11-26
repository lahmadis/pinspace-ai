/**
 * Board Collaboration Hook
 * 
 * Manages real-time collaboration for Student Board using WebSocket.
 * Syncs board state (elements, comments, pen strokes) across multiple users.
 * 
 * Features:
 * - Real-time state synchronization
 * - Presence indicators (cursors, selections)
 * - Offline fallback with local persistence
 * - Conflict resolution (last-write-wins for now)
 * 
 * Future: Enhanced collaboration
 * - User identity and authentication
 * - Permission roles (viewer, editor, admin)
 * - User avatars and names in presence
 * - Typing indicators
 * - Conflict resolution strategies (operational transforms, CRDTs)
 * - Message queuing for offline support
 * - Reconnection handling with state sync
 * - Rate limiting and throttling
 * 
 * Future: Alternative services
 * - Replace with Liveblocks SDK for production
 * - Replace with Ably for scalable real-time
 * - Replace with Yjs for CRDT-based collaboration
 * - Replace with Socket.io for more features
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { CanvasElement } from "@/types";
import type { PenStroke } from "@/hooks/usePenDrawing";

/**
 * Collaboration message types
 */
export type CollaborationMessage =
  | { type: "state_update"; payload: BoardStateUpdate }
  | { type: "presence_update"; payload: PresenceUpdate }
  | { type: "join"; payload: { userId: string; boardId: string } }
  | { type: "leave"; payload: { userId: string } }
  | { type: "ping"; payload: {} }
  | { type: "pong"; payload: {} };

export interface BoardStateUpdate {
  elements?: (CanvasElement & { text?: string; color?: string; src?: string })[];
  comments?: Array<{ elementId: string; comments: string[] }>;
  penStrokes?: PenStroke[];
  timestamp: number;
  userId: string;
}

export interface PresenceUpdate {
  userId: string;
  cursor?: { x: number; y: number };
  selectedElementIds?: string[];
  activeTool?: string;
  timestamp: number;
}

export interface RemoteUser {
  userId: string;
  cursor?: { x: number; y: number };
  selectedElementIds: string[];
  activeTool?: string;
  lastSeen: number;
  // Future: Add user identity
  name?: string;
  avatar?: string;
  role?: string; // User role (instructor, student, guest)
  color?: string; // Color for cursor/selection
}

export interface UseBoardCollaborationOptions {
  boardId: string;
  userId: string; // Temporary: In future, get from auth
  enabled?: boolean;
  onStateUpdate?: (update: BoardStateUpdate) => void;
  onPresenceUpdate?: (users: Map<string, RemoteUser>) => void;
}

/**
 * Generate a temporary user ID (for demo purposes)
 * Future: Get from authentication system
 */
function generateUserId(): string {
  if (typeof window === "undefined") return "user-ssr";
  const stored = localStorage.getItem("pinspace_user_id");
  if (stored) return stored;
  const newId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem("pinspace_user_id", newId);
  return newId;
}

/**
 * useBoardCollaboration Hook
 * 
 * Manages WebSocket connection and real-time collaboration state.
 * 
 * @param options Configuration options
 * @returns Collaboration state and functions
 */
export function useBoardCollaboration(options: UseBoardCollaborationOptions) {
  const { boardId, userId: providedUserId, enabled = true, onStateUpdate, onPresenceUpdate } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<Map<string, RemoteUser>>(new Map());
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const lastStateUpdateRef = useRef<number>(0);
  const userIdRef = useRef(providedUserId || generateUserId());
  
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 1000; // Start with 1 second

  /**
   * Get WebSocket URL
   * 
   * Future: Use environment variable for WebSocket server URL
   * - Production: wss://api.pinspace.ai/boards/{boardId}/ws
   * - Development: ws://localhost:3001/boards/{boardId}/ws
   * 
   * Note: Next.js API routes don't support WebSocket natively.
   * Options:
   * 1. Use a dedicated WebSocket server (ws library on Node.js)
   * 2. Use a service like Liveblocks, Ably, or Pusher
   * 3. Use Server-Sent Events (SSE) for one-way updates
   * 4. Use polling (current fallback)
   */
  const getWebSocketUrl = useCallback(() => {
    if (typeof window === "undefined") return null;
    
    // For Next.js, we'll use a relative path that proxies to WebSocket
    // In production, this would be a dedicated WebSocket server
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    
    // Future: Use dedicated WebSocket server
    // return `${protocol}//${host}/api/boards/${boardId}/ws`;
    
    // For now, return null to use polling fallback
    // In production, replace with actual WebSocket server URL
    return null; // Will use polling fallback
  }, [boardId]);

  /**
   * Send message to WebSocket
   */
  const sendMessage = useCallback((message: CollaborationMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  /**
   * Broadcast state update to other users
   */
  const broadcastStateUpdate = useCallback((
    elements?: (CanvasElement & { text?: string; color?: string; src?: string })[],
    comments?: Array<{ elementId: string; comments: string[] }>,
    penStrokes?: PenStroke[]
  ) => {
    const now = Date.now();
    // Throttle state updates to avoid excessive messages
    if (now - lastStateUpdateRef.current < 100) {
      return; // Skip if too frequent
    }
    lastStateUpdateRef.current = now;

    // If WebSocket is connected, use it
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      sendMessage({
        type: "state_update",
        payload: {
          elements,
          comments,
          penStrokes,
          timestamp: now,
          userId: userIdRef.current,
        },
      });
    } else {
      // Fallback to polling API
      fetch(`/api/boards/${boardId}/collaboration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elements,
          comments,
          penStrokes,
          userId: userIdRef.current,
        }),
      }).catch((err) => {
        console.error("[Collaboration] Failed to broadcast state:", err);
      });
    }
  }, [sendMessage, boardId]);

  /**
   * Broadcast presence update (cursor, selection, tool)
   */
  const broadcastPresence = useCallback((
    cursor?: { x: number; y: number },
    selectedElementIds?: string[],
    activeTool?: string
  ) => {
    // If WebSocket is connected, use it
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      sendMessage({
        type: "presence_update",
        payload: {
          userId: userIdRef.current,
          cursor,
          selectedElementIds,
          activeTool,
          timestamp: Date.now(),
        },
      });
    } else {
      // Fallback to polling API
      fetch(`/api/boards/${boardId}/collaboration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userIdRef.current,
          presence: {
            cursor,
            selectedElementIds,
            activeTool,
          },
        }),
      }).catch((err) => {
        console.error("[Collaboration] Failed to broadcast presence:", err);
      });
    }
  }, [sendMessage, boardId]);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (!enabled || typeof window === "undefined") return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = getWebSocketUrl();
    
    // For now, use polling fallback since we don't have a WebSocket server
    // Future: Replace with actual WebSocket connection
    if (!wsUrl) {
      // Polling fallback - fetch state from API every 2 seconds
      const pollForUpdates = async () => {
        try {
          const response = await fetch(`/api/boards/${boardId}/collaboration`);
          if (response.ok) {
            const data = await response.json();
            // Apply remote updates if they're newer
            if (data.lastUpdated && data.lastUpdated > lastStateUpdateRef.current) {
              onStateUpdate?.({
                elements: data.elements,
                comments: data.comments,
                penStrokes: data.penStrokes,
                timestamp: data.lastUpdated,
                userId: "", // Will be set by server
              });
            }
            // Update remote users from presence data
            if (data.users) {
              const usersMap = new Map<string, RemoteUser>();
              data.users.forEach((user: any) => {
                usersMap.set(user.userId, {
                  userId: user.userId,
                  cursor: user.presence?.cursor,
                  selectedElementIds: user.presence?.selectedElementIds || [],
                  activeTool: user.presence?.activeTool,
                  lastSeen: user.lastSeen || Date.now(),
                });
              });
              setRemoteUsers(usersMap);
              onPresenceUpdate?.(usersMap);
            }
          }
        } catch (err) {
          console.error("[Collaboration] Polling error:", err);
        }
      };

      // Initial poll
      pollForUpdates();
      
      // Poll every 2 seconds
      const pollInterval = setInterval(pollForUpdates, 2000);
      setIsConnected(true); // Consider polling as "connected"

      return () => clearInterval(pollInterval);
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[Collaboration] Connected to WebSocket");
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;

        // Send join message
        sendMessage({
          type: "join",
          payload: { userId: userIdRef.current, boardId },
        });
      };

      ws.onmessage = (event) => {
        try {
          const message: CollaborationMessage = JSON.parse(event.data);

          switch (message.type) {
            case "state_update":
              // Ignore our own updates
              if (message.payload.userId !== userIdRef.current) {
                onStateUpdate?.(message.payload);
              }
              break;

            case "presence_update":
              if (message.payload.userId !== userIdRef.current) {
                setRemoteUsers((prev) => {
                  const next = new Map(prev);
                  next.set(message.payload.userId, {
                    userId: message.payload.userId,
                    cursor: message.payload.cursor,
                    selectedElementIds: message.payload.selectedElementIds || [],
                    activeTool: message.payload.activeTool,
                    lastSeen: message.payload.timestamp,
                    // Future: Include user name, avatar, role from payload
                    // name: message.payload.name,
                    // avatar: message.payload.avatar,
                    // role: message.payload.role,
                  });
                  return next;
                });
                onPresenceUpdate?.(remoteUsers);
              }
              break;

            case "leave":
              setRemoteUsers((prev) => {
                const next = new Map(prev);
                next.delete(message.payload.userId);
                return next;
              });
              break;

            case "pong":
              // Heartbeat response
              break;
          }
        } catch (err) {
          console.error("[Collaboration] Error parsing message:", err);
        }
      };

      ws.onerror = (error) => {
        console.error("[Collaboration] WebSocket error:", error);
        setConnectionError("Connection error");
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log("[Collaboration] WebSocket closed");
        setIsConnected(false);
        wsRef.current = null;

        // Attempt reconnection
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          const delay = RECONNECT_DELAY * reconnectAttemptsRef.current;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setConnectionError("Failed to reconnect. Working offline.");
        }
      };
    } catch (err) {
      console.error("[Collaboration] Failed to connect:", err);
      setConnectionError("Failed to connect");
      setIsConnected(false);
    }
  }, [enabled, boardId, getWebSocketUrl, sendMessage, onStateUpdate, onPresenceUpdate, remoteUsers]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      sendMessage({ type: "leave", payload: { userId: userIdRef.current } });
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, [sendMessage]);

  /**
   * Clean up remote users that haven't sent presence updates
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRemoteUsers((prev) => {
        const next = new Map(prev);
        for (const [userId, user] of next.entries()) {
          // Remove users that haven't sent presence in 5 seconds
          if (now - user.lastSeen > 5000) {
            next.delete(userId);
          }
        }
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Connect on mount, disconnect on unmount
   */
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  /**
   * Send heartbeat to keep connection alive
   */
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      sendMessage({ type: "ping", payload: {} });
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, sendMessage]);

  return {
    isConnected,
    connectionError,
    remoteUsers,
    broadcastStateUpdate,
    broadcastPresence,
    userId: userIdRef.current,
  };
}

