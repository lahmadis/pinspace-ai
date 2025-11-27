# Student Board Undo/Redo System

## Overview

The Student Board page now includes a comprehensive undo/redo system that tracks all board state changes and allows users to revert or reapply actions.

## Features

### ✅ Implemented

- **Full State Tracking**: All board actions are tracked:
  - Element creation (stickies, images, PDFs, text)
  - Element deletion
  - Element movement (drag and drop)
  - Text editing (inline editing of stickies and text elements)
  - Comment addition/editing (for images and PDFs)

- **Keyboard Shortcuts**:
  - `Ctrl+Z` (or `Cmd+Z` on Mac): Undo last action
  - `Ctrl+Y` (or `Cmd+Shift+Z` on Mac): Redo last undone action

- **Toolbar Buttons**:
  - Undo button (↶) - disabled when nothing to undo
  - Redo button (↷) - disabled when nothing to redo
  - Tooltips explain why buttons are disabled

- **Smart State Management**:
  - History limited to 50 states (configurable)
  - Only records state when actual changes occur
  - Prevents recording during undo/redo operations
  - Clears "future" history when new action is taken after undo

## Architecture

### History Hook (`useBoardHistory`)

The `useBoardHistory` hook manages the undo/redo stack:

```typescript
type BoardStateSnapshot = {
  elements: ExtendedCanvasElement[];
  elementComments: Map<string, string>;
  timestamp: number;
};
```

**Key Features**:
- Maintains a stack of board state snapshots
- Tracks current position in history
- Prevents infinite loops by not recording during undo/redo
- Limits history size to prevent memory issues

### State Recording

State is recorded after these actions complete:
1. **Element Creation**: After new element is added to board
2. **Element Deletion**: After elements are removed
3. **Element Movement**: After drag operation completes (only if position changed)
4. **Text Editing**: After text edit is saved
5. **Comment Editing**: After comment is saved

### Undo/Redo Flow

1. User performs an action (create, move, edit, delete)
2. Action handler records new state snapshot
3. User presses `Ctrl+Z` or clicks Undo button
4. System restores previous state from history
5. User can press `Ctrl+Y` or click Redo to reapply the undone action

## Usage

### Keyboard Shortcuts

- **Undo**: `Ctrl+Z` (Windows/Linux) or `Cmd+Z` (Mac)
- **Redo**: `Ctrl+Y` (Windows/Linux) or `Cmd+Shift+Z` (Mac)

### Toolbar Buttons

- Click the **Undo** button (↶) to undo the last action
- Click the **Redo** button (↷) to redo the last undone action
- Buttons are automatically disabled when undo/redo is not available
- Hover over disabled buttons to see tooltip explaining why

## Future Enhancements

### Real-Time Collaboration

When implementing real-time collaboration, the undo/redo system can be extended:

1. **Operation-Based Undo**:
   - Instead of full state snapshots, track individual operations
   - Each operation tagged with user ID and operation ID
   - Undo specific operations rather than full state

2. **Broadcast Undo/Redo**:
   - When user undoes/redoes, broadcast operation to other users
   - Other clients apply the undo/redo operation
   - Maintain operation history across all clients

3. **Conflict Resolution**:
   - Handle conflicts when multiple users undo/redo simultaneously
   - Use operational transform or CRDT systems
   - Ensure consistent state across all clients

4. **Selective Undo**:
   - Allow users to undo specific operations (not just last one)
   - Show history timeline with operation details
   - Undo operations from any point in history

### Integration Points

The code includes comments marking where to add:

- **Backend Sync**: Save/load history from server
- **Real-Time Broadcast**: Send undo/redo operations to other users
- **Operation Metadata**: Track user, timestamp, operation type
- **History Persistence**: Save history to localStorage or database
- **Collaborative Systems**: Integrate with CRDTs or operational transform

## Code Structure

### Key Files

- `src/app/student-board/[id]/page.tsx`: Main component with undo/redo logic
  - `useBoardHistory`: Custom hook for history management
  - `handleUndo`/`handleRedo`: Undo/redo handlers
  - State recording in all action handlers

### State Recording Locations

1. **Element Creation** (`handleCanvasClick`):
   ```typescript
   recordState({
     elements: updated,
     elementComments: new Map(elementComments),
     timestamp: Date.now(),
   });
   ```

2. **Element Deletion** (`handleDeleteElements`):
   ```typescript
   recordState({
     elements: updated,
     elementComments: new Map(elementComments),
     timestamp: Date.now(),
   });
   ```

3. **Element Movement** (`handleElementDragStart` → `handleMouseUp`):
   ```typescript
   recordState({
     elements: [...prev],
     elementComments: new Map(elementComments),
     timestamp: Date.now(),
   });
   ```

4. **Text Editing** (`handleTextEditSave`):
   ```typescript
   recordState({
     elements: updated,
     elementComments: new Map(elementComments),
     timestamp: Date.now(),
   });
   ```

5. **Comment Editing** (`handleCommentSave`):
   ```typescript
   recordState({
     elements: [...elements],
     elementComments: new Map(newMap),
     timestamp: Date.now(),
   });
   ```

## Testing

To test undo/redo:

1. Create a sticky note → Press `Ctrl+Z` → Should disappear
2. Press `Ctrl+Y` → Should reappear
3. Move an element → Press `Ctrl+Z` → Should return to original position
4. Edit text → Press `Ctrl+Z` → Should revert to original text
5. Add comment → Press `Ctrl+Z` → Comment should be removed
6. Perform multiple actions → Press `Ctrl+Z` multiple times → Should undo in reverse order

## Performance Considerations

- History is limited to 50 states (configurable via `maxHistorySize`)
- State snapshots are deep copies to prevent mutation issues
- History is cleared when it exceeds the limit (oldest states removed first)
- Undo/redo operations are synchronous and fast (no async operations)

## Limitations

- History is stored in memory (not persisted to localStorage or backend)
- History is lost on page refresh
- Maximum history size is 50 states (configurable)
- Full state snapshots (not operation-based) - can be memory intensive for large boards

## Future Improvements

1. **Persistent History**: Save history to localStorage or backend
2. **Operation-Based**: Track operations instead of full states
3. **Selective Undo**: Undo specific operations from history
4. **History Timeline**: Visual timeline of operations
5. **Collaborative Undo**: Share undo/redo across users in real-time








