# Multi-Select Enhancement Summary

## Overview
Enhanced the select tool with efficient drag-to-select (marquee) functionality, visual feedback, group movement, and group deletion. Works on both student and live crit boards.

## Features Implemented

### 1. Drag-to-Select (Marquee Selection)
- **Location**: `src/components/BoardCanvas.tsx` and `src/components/CritViewerCanvas.tsx`
- **Behavior**: 
  - When select tool is active, drag from empty canvas area creates a selection rectangle
  - Visual rectangle shows during drag
  - Objects that intersect or are inside the marquee are highlighted in real-time
  - On mouse release, all highlighted objects become selected

### 2. Visual Feedback During Drag
- **Real-time Highlighting**: Objects are highlighted as the marquee passes over them
- **Visual Indicators**:
  - Blue border (2-3px solid #3b82f6)
  - Blue shadow/ring (rgba(59, 130, 246, 0.3))
  - Slight opacity change (0.8) for highlighted but not yet selected objects
  - Works for all element types: shapes, images, text, stickies

### 3. Group Movement
- **Already Implemented**: Group movement was already working
- **Behavior**:
  - When multiple objects are selected, dragging any selected object moves all selected objects together
  - Maintains relative positions between objects
  - Works with both Rnd drag (for editable mode) and custom drag (for select tool)

### 4. Group Deletion
- **Keyboard Shortcuts**: Delete or Backspace key
- **Behavior**:
  - Deletes all selected objects at once
  - Clears selection after deletion
  - Prevents deletion when typing in input/textarea fields
  - Works on both student and crit boards

## Code Changes

### BoardCanvas.tsx

#### 1. Enhanced Marquee Selection Logic (lines 1180-1199)
```typescript
if (isMarquee) {
  const cur = toCanvasPoint(ev.clientX, ev.clientY);
  setMarqueeStart(dragStartRef.current);
  setMarqueeEnd(cur);
  
  // Calculate marquee rectangle
  const R = normalizeRect(dragStartRef.current, cur);
  
  // Find all elements that intersect or are inside the marquee
  const hits = elementsRef.current
    .filter(el => {
      const E = getElementAABB(el);
      // Use intersection check (not just full containment)
      return rectsIntersect(R, E);
    })
    .map(el => el.id);
  
  // Update selection in real-time during drag (for visual feedback)
  currentApplySelection(hits);
}
```

#### 2. Visual Highlighting During Marquee (lines 1770-1775)
```typescript
// Check if element is highlighted during marquee drag
const isMarqueeHighlighted = isMarquee && marqueeStart && marqueeEnd && (() => {
  const R = normalizeRect(marqueeStart, marqueeEnd);
  const E = getElementAABB(el);
  return rectsIntersect(R, E);
})();
```

#### 3. Group Deletion Handler (lines 1266-1296)
```typescript
// Delete/Backspace key handler for group deletion
useEffect(() => {
  if (isReadOnly || activeTool !== "select") return;
  if (selectedIds.length === 0) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't delete if user is typing in an input/textarea
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
      return;
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      
      // Delete all selected elements
      const updated = elementsRef.current.filter(el => !selectedIds.includes(el.id));
      setElements(updated);
      onSaveElements?.(updated);
      
      // Clear selection after deletion
      applySelection([]);
      onSelectElement?.(null);
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}, [isReadOnly, activeTool, selectedIds, setElements, onSaveElements, applySelection, onSelectElement]);
```

### CritViewerCanvas.tsx

#### 1. Enhanced Marquee Selection (lines 999-1018)
- Same real-time selection update logic as BoardCanvas
- Uses `rectsIntersect` for better selection (not just full containment)

#### 2. Visual Highlighting (lines 1344-1349, 1506-1511)
- Added `isMarqueeHighlighted` calculation for all element types
- Applied to images, shapes, text, and stickies (both base and overlay)

#### 3. Group Deletion (lines 354-390)
```typescript
// Delete/Backspace key handler for group deletion
const handleDeleteKey = (e: KeyboardEvent) => {
  if (tool !== "select") return;
  if (selectedIdsRef.current.length === 0) return;
  
  // Don't delete if user is typing in an input/textarea
  const target = e.target as HTMLElement;
  if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
    return;
  }

  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    
    const idsToDelete = selectedIdsRef.current;
    
    // Delete overlay elements (crit stickies)
    const overlayIds = idsToDelete.filter(id => 
      overlayElementsRef.current.some(el => el.id === id)
    );
    if (overlayIds.length > 0 && setOverlayElements) {
      setOverlayElements(prev => prev.filter(el => !overlayIds.includes(el.id)));
    }
    
    // Delete base board elements via callback
    const baseIds = idsToDelete.filter(id => 
      elementsRef.current.some(el => el.id === id)
    );
    if (baseIds.length > 0 && onDeleteElements) {
      onDeleteElements(baseIds);
    }
    
    // Clear selection after deletion
    setSelectedIds([]);
    queueMicrotask(() => onSelectionChange?.(null));
  }
};
```

## Selection Logic Improvements

### Intersection vs. Containment
- **Before**: Required elements to be fully inside marquee
- **After**: Uses `rectsIntersect` - selects elements that intersect OR are inside the marquee
- **Benefit**: More intuitive selection behavior

### Real-time Updates
- **Before**: Selection only updated on mouse release
- **After**: Selection updates in real-time during drag
- **Benefit**: Visual feedback shows what will be selected

## Visual Styling

### Highlighted Elements
- **Border**: `2px solid #3b82f6` (blue)
- **Shadow/Ring**: `0 0 0 3px rgba(59, 130, 246, 0.3)`
- **Opacity**: `0.8` for highlighted but not yet selected
- **Shapes**: Enhanced stroke color in SVG rendering

### Marquee Rectangle
- **Class**: `MARQUEE_BOX_CLASS` (from `canvasStyles.ts`)
- **Style**: `border border-blue-500/70 bg-blue-500/10 rounded-sm`
- **Z-index**: `z-[1000]` (above elements, below UI)

## Compatibility

### Single-Object Selection
- ✅ Still works perfectly
- Click to select single object
- Shift+click to toggle selection
- No breaking changes

### Undo/Redo
- ✅ Works with group operations
- Group deletion is undoable
- Group movement is undoable
- No changes to undo/redo logic

### Other Canvas Features
- ✅ Panning (Space/right-click) still works
- ✅ Zoom still works
- ✅ Creation tools still work
- ✅ Pen/Eraser tools still work
- ✅ No conflicts with existing features

## Testing Checklist

- [x] Drag-to-select creates marquee rectangle
- [x] Objects highlight during drag
- [x] Multiple objects can be selected
- [x] Group movement works (drag one, all move)
- [x] Group deletion works (Delete/Backspace)
- [x] Single-object selection still works
- [x] Shift+click toggles selection
- [x] Works on student board
- [x] Works on live crit board
- [x] Undo/redo still works
- [x] No conflicts with other tools

## Usage

### Basic Multi-Select
1. Select the Select tool (V key)
2. Click and drag from empty canvas area
3. See objects highlight as marquee passes over them
4. Release mouse to select all highlighted objects

### Group Movement
1. Select multiple objects (via marquee or Shift+click)
2. Drag any selected object
3. All selected objects move together

### Group Deletion
1. Select multiple objects
2. Press Delete or Backspace
3. All selected objects are deleted

### Toggle Selection
1. Hold Shift while clicking objects
2. Or hold Shift while dragging marquee
3. Objects are added/removed from selection

## Technical Details

### Selection State
- Uses `selectedIds: string[]` array
- Managed via `applySelection()` helper
- Notifies parent via `onSelectionChange` callback

### Coordinate System
- All calculations in canvas coordinates (not screen coordinates)
- Uses `toCanvasPoint()` for conversion
- Uses `normalizeRect()` for marquee rectangle
- Uses `getElementAABB()` for element bounds
- Uses `rectsIntersect()` for collision detection

### Performance
- Real-time updates are efficient (only recalculates on mouse move)
- Uses refs to avoid unnecessary re-renders
- Throttled persistence during drag operations












