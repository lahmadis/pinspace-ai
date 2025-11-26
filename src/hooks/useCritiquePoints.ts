/**
 * Critique Points Hook
 * 
 * Manages critique points with threading, status, and linking.
 * Integrates with board state, undo/redo, and collaboration.
 * 
 * Features:
 * - Create numbered critique points
 * - Thread replies
 * - Status management (open/resolved/addressed)
 * - Priority and category
 * - Link to elements and annotations
 * 
 * Future: LMS Integration
 * - Grade associations
 * - Rubric connections
 * - Peer review assignments
 * - Automated feedback
 */

import { useState, useCallback, useRef } from "react";
import type { CritiquePoint, CommentThread } from "@/types/annotation";

export interface UseCritiquePointsOptions {
  boardId: string;
  enabled?: boolean;
  onPointCreate?: (point: CritiquePoint) => void;
  onPointUpdate?: (id: string, updates: Partial<CritiquePoint>) => void;
  onPointDelete?: (id: string) => void;
}

/**
 * useCritiquePoints Hook
 * 
 * Handles critique point creation, management, and threading.
 */
export function useCritiquePoints(options: UseCritiquePointsOptions) {
  const {
    boardId,
    enabled = true,
    onPointCreate,
    onPointUpdate,
    onPointDelete,
  } = options;

  const [critiquePoints, setCritiquePoints] = useState<CritiquePoint[]>([]);
  const [commentThreads, setCommentThreads] = useState<CommentThread[]>([]);
  const pointNumberCounter = useRef(0);

  /**
   * Generate unique critique point ID
   */
  const generatePointId = useCallback(() => {
    return `critique-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Get next point number for board
   */
  const getNextPointNumber = useCallback(() => {
    const maxNumber = critiquePoints.reduce((max, point) =>
      point.number > max ? point.number : max, 0
    );
    return maxNumber + 1;
  }, [critiquePoints]);

  /**
   * Create critique point
   */
  const createPoint = useCallback((
    x: number,
    y: number,
    description: string,
    userId: string = "anonymous",
    options: {
      title?: string;
      priority?: "low" | "medium" | "high";
      category?: string;
      linkedElementIds?: string[];
      linkedAnnotationIds?: string[];
    } = {}
  ) => {
    if (!enabled) return null;

    const point: CritiquePoint = {
      id: generatePointId(),
      boardId,
      x,
      y,
      number: getNextPointNumber(),
      title: options.title,
      description,
      status: "open",
      priority: options.priority || "medium",
      category: options.category,
      linkedElementIds: options.linkedElementIds || [],
      linkedAnnotationIds: options.linkedAnnotationIds || [],
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setCritiquePoints(prev => [...prev, point]);
    onPointCreate?.(point);

    return point;
  }, [boardId, enabled, generatePointId, getNextPointNumber, onPointCreate]);

  /**
   * Update critique point
   */
  const updatePoint = useCallback((
    id: string,
    updates: Partial<CritiquePoint>
  ) => {
    setCritiquePoints(prev => prev.map(point =>
      point.id === id
        ? { ...point, ...updates, updatedAt: Date.now() }
        : point
    ));
    onPointUpdate?.(id, updates);
  }, [onPointUpdate]);

  /**
   * Delete critique point
   */
  const deletePoint = useCallback((id: string) => {
    setCritiquePoints(prev => prev.filter(point => point.id !== id));
    // Also delete associated comment threads
    setCommentThreads(prev => prev.filter(thread => thread.critiquePointId !== id));
    onPointDelete?.(id);
  }, [onPointDelete]);

  /**
   * Resolve critique point
   */
  const resolvePoint = useCallback((
    id: string,
    userId: string = "anonymous"
  ) => {
    updatePoint(id, {
      status: "resolved",
      resolvedBy: userId,
      resolvedAt: Date.now(),
    });
  }, [updatePoint]);

  /**
   * Create comment thread
   */
  const createThread = useCallback((
    critiquePointId: string,
    content: string,
    userId: string = "anonymous",
    options: {
      elementId?: string;
      annotationId?: string;
      title?: string;
    } = {}
  ) => {
    const threadId = `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const commentId = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const thread: CommentThread = {
      id: threadId,
      critiquePointId,
      elementId: options.elementId,
      annotationId: options.annotationId,
      title: options.title,
      comments: [{
        id: commentId,
        threadId,
        content,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }],
      status: "active",
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setCommentThreads(prev => [...prev, thread]);
    return thread;
  }, []);

  /**
   * Add comment to thread
   */
  const addCommentToThread = useCallback((
    threadId: string,
    content: string,
    userId: string = "anonymous",
    parentId?: string
  ) => {
    const commentId = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    setCommentThreads(prev => prev.map(thread =>
      thread.id === threadId
        ? {
            ...thread,
            comments: [...thread.comments, {
              id: commentId,
              threadId,
              parentId,
              content,
              createdBy: userId,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }],
            updatedAt: Date.now(),
          }
        : thread
    ));
  }, []);

  /**
   * Resolve comment thread
   */
  const resolveThread = useCallback((threadId: string) => {
    setCommentThreads(prev => prev.map(thread =>
      thread.id === threadId
        ? { ...thread, status: "resolved", updatedAt: Date.now() }
        : thread
    ));
  }, []);

  /**
   * Get threads for critique point
   */
  const getThreadsForPoint = useCallback((critiquePointId: string) => {
    return commentThreads.filter(thread => thread.critiquePointId === critiquePointId);
  }, [commentThreads]);

  /**
   * Get points by status
   */
  const getPointsByStatus = useCallback((status: CritiquePoint["status"]) => {
    return critiquePoints.filter(point => point.status === status);
  }, [critiquePoints]);

  return {
    critiquePoints,
    commentThreads,
    createPoint,
    updatePoint,
    deletePoint,
    resolvePoint,
    createThread,
    addCommentToThread,
    resolveThread,
    getThreadsForPoint,
    getPointsByStatus,
    setCritiquePoints, // For external state sync
    setCommentThreads, // For external state sync
  };
}






