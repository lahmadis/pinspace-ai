/**
 * Annotation Tools Hook
 * 
 * Manages shape drawing tools (rectangle, ellipse, arrow, text box, highlight).
 * Integrates with board state, undo/redo, and collaboration.
 * 
 * Features:
 * - Rectangle drawing
 * - Ellipse drawing
 * - Arrow drawing (with start/end points)
 * - Text box creation
 * - Highlight regions
 * - Link annotations to elements
 * 
 * Future: Enhanced annotation
 * - Freeform shapes
 * - Image annotations
 * - Measurement tools
 * - Layer management
 */

import { useState, useCallback, useRef } from "react";
import type { AnnotationShape, AnnotationType } from "@/types/annotation";

export interface UseAnnotationToolsOptions {
  enabled?: boolean;
  defaultColor?: string;
  defaultStrokeWidth?: number;
  onAnnotationCreate?: (annotation: AnnotationShape) => void;
  onAnnotationUpdate?: (id: string, updates: Partial<AnnotationShape>) => void;
  onAnnotationDelete?: (id: string) => void;
}

export interface DrawingState {
  isDrawing: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  annotationType: AnnotationType | null;
}

/**
 * useAnnotationTools Hook
 * 
 * Handles annotation tool interactions (drawing shapes, arrows, text boxes).
 */
export function useAnnotationTools(options: UseAnnotationToolsOptions = {}) {
  const {
    enabled = true,
    defaultColor = "#3b82f6",
    defaultStrokeWidth = 2,
    onAnnotationCreate,
    onAnnotationUpdate,
    onAnnotationDelete,
  } = options;

  const [drawingState, setDrawingState] = useState<DrawingState | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationShape[]>([]);
  const annotationIdCounter = useRef(0);

  /**
   * Generate unique annotation ID
   */
  const generateAnnotationId = useCallback(() => {
    return `annotation-${Date.now()}-${++annotationIdCounter.current}`;
  }, []);

  /**
   * Start drawing annotation
   */
  const startDrawing = useCallback((
    type: AnnotationType,
    x: number,
    y: number
  ) => {
    if (!enabled) return;

    setDrawingState({
      isDrawing: true,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      annotationType: type,
    });
  }, [enabled]);

  /**
   * Update drawing (while dragging)
   */
  const updateDrawing = useCallback((x: number, y: number) => {
    if (!drawingState?.isDrawing) return;

    setDrawingState(prev => prev ? {
      ...prev,
      currentX: x,
      currentY: y,
    } : null);
  }, [drawingState]);

  /**
   * Finish drawing and create annotation
   */
  const finishDrawing = useCallback((
    userId: string = "anonymous"
  ) => {
    if (!drawingState?.isDrawing || !drawingState.annotationType) return null;

    const { startX, startY, currentX, currentY, annotationType } = drawingState;

    // Calculate dimensions
    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    // Skip if too small
    if (width < 5 && height < 5) {
      setDrawingState(null);
      return null;
    }

    const annotation: AnnotationShape = {
      id: generateAnnotationId(),
      type: annotationType,
      x,
      y,
      width,
      height,
      color: defaultColor,
      strokeWidth: defaultStrokeWidth,
      fill: annotationType === "highlight" ? defaultColor : undefined,
      opacity: annotationType === "highlight" ? 0.3 : 1,
      // For arrows
      endX: annotationType === "arrow" ? currentX : undefined,
      endY: annotationType === "arrow" ? currentY : undefined,
      // For text boxes
      text: annotationType === "textbox" ? "" : undefined,
      fontSize: annotationType === "textbox" ? 14 : undefined,
      fontFamily: annotationType === "textbox" ? "Arial" : undefined,
      // Metadata
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setAnnotations(prev => [...prev, annotation]);
    onAnnotationCreate?.(annotation);
    setDrawingState(null);

    return annotation;
  }, [drawingState, defaultColor, defaultStrokeWidth, generateAnnotationId, onAnnotationCreate]);

  /**
   * Cancel drawing
   */
  const cancelDrawing = useCallback(() => {
    setDrawingState(null);
  }, []);

  /**
   * Update annotation
   */
  const updateAnnotation = useCallback((
    id: string,
    updates: Partial<AnnotationShape>
  ) => {
    setAnnotations(prev => prev.map(ann =>
      ann.id === id
        ? { ...ann, ...updates, updatedAt: Date.now() }
        : ann
    ));
    onAnnotationUpdate?.(id, updates);
  }, [onAnnotationUpdate]);

  /**
   * Delete annotation
   */
  const deleteAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
    onAnnotationDelete?.(id);
  }, [onAnnotationUpdate]);

  /**
   * Link annotation to element
   */
  const linkAnnotationToElement = useCallback((
    annotationId: string,
    elementId: string
  ) => {
    updateAnnotation(annotationId, { targetElementId: elementId });
  }, [updateAnnotation]);

  return {
    annotations,
    drawingState,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing,
    updateAnnotation,
    deleteAnnotation,
    linkAnnotationToElement,
    setAnnotations, // For external state sync
  };
}







