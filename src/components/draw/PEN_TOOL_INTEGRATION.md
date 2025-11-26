# Pen Tool Integration Guide

This guide explains how to integrate the Pen and Eraser tools into your application.

## Overview

The Pen tool consists of:
- **`usePenDrawing` hook** (`src/hooks/usePenDrawing.ts`): Manages stroke state, drawing logic, erasing, and undo/redo history
- **`PenTool` component** (`src/components/draw/PenTool.tsx`): Renders the drawing overlay and handles pointer events

## Integration Steps

### 1. Add Pen Tool to Toolbar

Update your `CanvasToolbar` component to include pen/eraser buttons:

```tsx
import CanvasToolbar, { type ToolType } from "@/components/CanvasToolbar";

// Add pen tool state
const [penColor, setPenColor] = useState("#000000");
const [penWidth, setPenWidth] = useState(3);
const [eraserSize, setEraserSize] = useState(20);

// In your toolbar:
<CanvasToolbar
  activeTool={activeTool}
  onToolChange={setActiveTool}
  // ... other props
  penColor={penColor}
  setPenColor={setPenColor}
  penWidth={penWidth}
  setPenWidth={setPenWidth}
  eraserSize={eraserSize}
  setEraserSize={setEraserSize}
/>
```

### 2. Add Pen Tool State to Page Component

```tsx
import type { PenStroke } from "@/hooks/usePenDrawing";
import { getPenStrokes, savePenStrokes, type StoredPenStroke } from "@/lib/storage";

// Add pen tool state
const [penColor, setPenColor] = useState("#000000");
const [penWidth, setPenWidth] = useState(3);
const [eraserSize, setEraserSize] = useState(20);
const [penStrokes, setPenStrokes] = useState<PenStroke[]>([]);

// Load pen strokes on mount
useEffect(() => {
  if (boardId) {
    const storedStrokes = getPenStrokes(boardId);
    if (storedStrokes && storedStrokes.length > 0) {
      const penStrokesData: PenStroke[] = storedStrokes.map((stroke) => ({
        id: stroke.id,
        points: stroke.points,
        color: stroke.color,
        width: stroke.width,
        timestamp: stroke.timestamp,
      }));
      setPenStrokes(penStrokesData);
    }
  }
}, [boardId]);

// Persist pen strokes
const persistPenStrokes = useCallback((strokes: PenStroke[]) => {
  if (!boardId) return;
  setPenStrokes(strokes);
  const storedStrokes: StoredPenStroke[] = strokes.map((stroke) => ({
    ...stroke,
    boardId,
  }));
  savePenStrokes(boardId, storedStrokes);
}, [boardId]);
```

### 3. Integrate PenTool into Canvas Component

For `BoardCanvas`:

```tsx
import PenTool from "./draw/PenTool";

// In BoardCanvas component:
<div
  ref={canvasRef}
  style={{
    pointerEvents: (activeTool === "pen" || activeTool === "eraser") ? "none" : "auto"
  }}
>
  {/* Pen Tool Overlay */}
  {(activeTool === "pen" || activeTool === "eraser") && (
    <PenTool
      activeTool={activeTool === "pen" ? "pen" : activeTool === "eraser" ? "eraser" : null}
      penColor={penColor}
      penWidth={penWidth}
      eraserSize={eraserSize}
      pan={pan}
      zoom={zoom}
      initialStrokes={penStrokes}
      onStrokesChange={onPenStrokesChange}
      enabled={!isReadOnly}
      boardId={boardId}
    />
  )}
  {/* ... rest of canvas */}
</div>
```

For `CritViewerCanvas`:

```tsx
import PenTool from "./draw/PenTool";

// In CritViewerCanvas component:
<div
  ref={canvasRef}
  style={{
    pointerEvents: (tool === "pen" || tool === "eraser") ? "none" : "auto"
  }}
>
  {/* Pen Tool Overlay */}
  {(tool === "pen" || tool === "eraser") && (
    <PenTool
      activeTool={tool === "pen" ? "pen" : tool === "eraser" ? "eraser" : null}
      penColor={penColor}
      penWidth={penWidth}
      eraserSize={eraserSize}
      pan={pan}
      zoom={zoom}
      initialStrokes={penStrokes}
      onStrokesChange={onPenStrokesChange}
      enabled={true}
      boardId={boardId}
    />
  )}
  {/* ... rest of canvas */}
</div>
```

### 4. Add Keyboard Shortcuts

Add pen/eraser keyboard shortcuts to your keyboard handler:

```tsx
const handleKeyDown = useCallback((e: KeyboardEvent | React.KeyboardEvent) => {
  const key = (e as KeyboardEvent).key;
  
  if (isTypingInForm()) return;

  // Pen tool shortcuts
  if (key === "p" || key === "P") {
    e.preventDefault?.();
    setActiveTool(activeTool === "pen" ? "select" : "pen");
    return;
  }
  if (key === "e" || key === "E") {
    e.preventDefault?.();
    setActiveTool(activeTool === "eraser" ? "select" : "eraser");
    return;
  }
  
  // ... other shortcuts
}, [activeTool, setActiveTool]);
```

### 5. Update ToolType

Make sure `"pen"` and `"eraser"` are included in your `ToolType`:

```tsx
export type ToolType =
  | "select"
  | "hand"
  | "text"
  | "sticky"
  | "shape"
  | "rect"
  | "circle"
  | "triangle"
  | "diamond"
  | "arrow"
  | "bubble"
  | "star"
  | "image"
  | "pin"
  | "marquee"
  | "pen"
  | "eraser";
```

## Features

- **Smooth Drawing**: Real-time freehand drawing with pointer events
- **Eraser**: Erase strokes by collision detection
- **Undo/Redo**: Full undo/redo history (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z)
- **Persistence**: Strokes are saved to localStorage and persist across page reloads
- **Pan/Zoom Support**: Works correctly with canvas pan and zoom transforms
- **Tool Switching**: Seamless switching between tools with no event conflicts

## API Reference

### `usePenDrawing` Hook

```tsx
const {
  strokes,           // Array of completed strokes
  currentStroke,     // Currently drawing stroke (if any)
  isDrawing,         // Whether currently drawing
  isErasing,         // Whether currently erasing
  startDrawing,      // Start drawing/erasing
  continueDrawing,   // Continue drawing/erasing
  endDrawing,        // End drawing/erasing
  cancelDrawing,     // Cancel drawing/erasing
  undo,              // Undo last action
  redo,              // Redo last action
  clear,             // Clear all strokes
  canUndo,           // Whether undo is available
  canRedo,           // Whether redo is available
} = usePenDrawing({
  initialStrokes,    // Initial strokes array
  onStrokesChange,   // Callback when strokes change
  penColor,          // Pen color (hex string)
  penWidth,          // Pen width (pixels)
  eraserSize,        // Eraser size (pixels)
  enabled,           // Whether tool is enabled
});
```

### `PenTool` Component

```tsx
<PenTool
  activeTool={"pen" | "eraser" | null}  // Active tool
  penColor="#000000"                     // Pen color
  penWidth={3}                           // Pen width
  eraserSize={20}                        // Eraser size
  pan={{ x: 0, y: 0 }}                  // Canvas pan
  zoom={1}                               // Canvas zoom
  initialStrokes={[]}                    // Initial strokes
  onStrokesChange={(strokes) => {}}      // Callback when strokes change
  enabled={true}                         // Whether tool is enabled
  boardId="board-id"                     // Board ID for persistence
/>
```

## Storage

Pen strokes are stored in localStorage using the `pinspace_pen_strokes` key. Each stroke is stored with a `boardId` to associate it with a specific board.

## Examples

### Student Side (BoardCanvas)

See `src/app/board/[id]/page.tsx` for a complete example of integrating the Pen tool into the student board view.

### Live Crit Side (CritViewerCanvas)

See `src/app/live/[sessionId]/page.tsx` for a complete example of integrating the Pen tool into the live crit session view.











