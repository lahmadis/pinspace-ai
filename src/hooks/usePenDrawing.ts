import { useState, useCallback, useRef, useEffect } from "react";

// Stroke data structure
export interface PenStroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  timestamp: number;
}

// Hook configuration
export interface UsePenDrawingOptions {
  initialStrokes?: PenStroke[];
  onStrokesChange?: (strokes: PenStroke[]) => void;
  penColor?: string;
  penWidth?: number;
  eraserSize?: number;
  enabled?: boolean; // If false, tool is disabled
}

// Generate unique ID
function generateStrokeId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${performance.now()}`;
}

// Calculate distance from point to line segment
function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  
  if (lengthSq === 0) {
    // Segment is a point
    const ddx = px - x1;
    const ddy = py - y1;
    return Math.sqrt(ddx * ddx + ddy * ddy);
  }
  
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const ddx = px - projX;
  const ddy = py - projY;
  return Math.sqrt(ddx * ddx + ddy * ddy);
}

// Check if a point is within eraser radius of any stroke segment
function hitTestStroke(
  point: { x: number; y: number },
  stroke: PenStroke,
  eraserSize: number
): boolean {
  if (stroke.points.length < 2) {
    // Single point stroke
    const p = stroke.points[0];
    const dx = point.x - p.x;
    const dy = point.y - p.y;
    return Math.sqrt(dx * dx + dy * dy) <= eraserSize;
  }
  
  // Check each segment
  for (let i = 0; i < stroke.points.length - 1; i++) {
    const p1 = stroke.points[i];
    const p2 = stroke.points[i + 1];
    const distance = distanceToSegment(point.x, point.y, p1.x, p1.y, p2.x, p2.y);
    if (distance <= eraserSize) {
      return true;
    }
  }
  
  return false;
}

export function usePenDrawing(options: UsePenDrawingOptions = {}) {
  const {
    initialStrokes = [],
    onStrokesChange,
    penColor = "#000000",
    penWidth = 3,
    eraserSize = 20,
    enabled = true,
  } = options;

  // Stroke state
  const [strokes, setStrokes] = useState<PenStroke[]>(initialStrokes);
  const [currentStroke, setCurrentStroke] = useState<PenStroke | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);

  // Undo/redo history
  const [history, setHistory] = useState<PenStroke[][]>([initialStrokes]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Refs for stable access in callbacks
  const strokesRef = useRef(strokes);
  const currentToolRef = useRef<"pen" | "eraser" | null>(null);
  const enabledRef = useRef(enabled);

  // Keep refs in sync
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Update strokes when initialStrokes change (from external source)
  useEffect(() => {
    if (initialStrokes.length !== strokes.length || !isDrawing) {
      setStrokes(initialStrokes);
      setHistory([initialStrokes]);
      setHistoryIndex(0);
    }
  }, [initialStrokes.length]); // Only react to length changes when not drawing

  // Notify parent of stroke changes
  useEffect(() => {
    if (onStrokesChange && !isDrawing) {
      onStrokesChange(strokes);
    }
  }, [strokes, onStrokesChange, isDrawing]);

  // Save state to history
  const saveToHistory = useCallback((newStrokes: PenStroke[]) => {
    setHistory((prev) => {
      // Remove any future history if we're not at the end
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, newStrokes];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // Start drawing
  const startDrawing = useCallback(
    (point: { x: number; y: number }, tool: "pen" | "eraser") => {
      if (!enabledRef.current) return;

      currentToolRef.current = tool;

      if (tool === "pen") {
        const newStroke: PenStroke = {
          id: generateStrokeId(),
          points: [point],
          color: penColor,
          width: penWidth,
          timestamp: Date.now(),
        };
        setCurrentStroke(newStroke);
        setIsDrawing(true);
      } else if (tool === "eraser") {
        setIsErasing(true);
        // For eraser, erase immediately on click and track the last erased point
        const currentStrokes = strokesRef.current;
        const erasedStrokes = currentStrokes.filter(
          (stroke) => !hitTestStroke(point, stroke, eraserSize)
        );
        
        if (erasedStrokes.length !== currentStrokes.length) {
          setStrokes(erasedStrokes);
          strokesRef.current = erasedStrokes; // Update ref immediately
        }
      }
    },
    [penColor, penWidth, eraserSize]
  );

  // Continue drawing
  const continueDrawing = useCallback(
    (point: { x: number; y: number }) => {
      if (!enabledRef.current) return;

      const tool = currentToolRef.current;
      if (!tool) return;

      if (tool === "pen" && currentStroke) {
        setCurrentStroke((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            points: [...prev.points, point],
          };
        });
      } else if (tool === "eraser") {
        // Continuously erase strokes that collide with the eraser cursor
        // This allows dragging to erase multiple strokes
        const currentStrokes = strokesRef.current;
        const erasedStrokes = currentStrokes.filter(
          (stroke) => !hitTestStroke(point, stroke, eraserSize)
        );
        
        // Update if any strokes were erased
        if (erasedStrokes.length !== currentStrokes.length) {
          setStrokes(erasedStrokes);
          strokesRef.current = erasedStrokes; // Update ref immediately for next check
        }
      }
    },
    [currentStroke, eraserSize]
  );

  // End drawing
  const endDrawing = useCallback(() => {
    if (!enabledRef.current) return;

    const tool = currentToolRef.current;
    if (!tool) return;

    if (tool === "pen" && currentStroke) {
      // Only save if stroke has at least 2 points (or 1 point if that's intentional)
      if (currentStroke.points.length > 0) {
        const newStrokes = [...strokesRef.current, currentStroke];
        setStrokes(newStrokes);
        saveToHistory(newStrokes);
      }
      setCurrentStroke(null);
      setIsDrawing(false);
    } else if (tool === "eraser") {
      // Finalize erasure - save to history when done erasing
      const currentStrokes = strokesRef.current;
      setStrokes(currentStrokes);
      saveToHistory(currentStrokes);
      setIsErasing(false);
    }

    currentToolRef.current = null;
  }, [currentStroke, saveToHistory]);

  // Cancel drawing (e.g., pointer cancel)
  const cancelDrawing = useCallback(() => {
    setCurrentStroke(null);
    setIsDrawing(false);
    setIsErasing(false);
    currentToolRef.current = null;
  }, []);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousStrokes = history[newIndex];
      setStrokes(previousStrokes);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextStrokes = history[newIndex];
      setStrokes(nextStrokes);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  // Clear all strokes
  const clear = useCallback(() => {
    setStrokes([]);
    saveToHistory([]);
  }, [saveToHistory]);

  // Check if undo is available
  const canUndo = historyIndex > 0;

  // Check if redo is available
  const canRedo = historyIndex < history.length - 1;

  return {
    strokes,
    currentStroke,
    isDrawing,
    isErasing,
    startDrawing,
    continueDrawing,
    endDrawing,
    cancelDrawing,
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
    setStrokes, // Allow external control if needed
  };
}


