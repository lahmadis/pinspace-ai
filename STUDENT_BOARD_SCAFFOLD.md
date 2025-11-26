# Student Board Page - Scaffold Documentation

## Overview

A new Student Board page has been created at `src/app/student-board/[id]/page.tsx`. This is a scaffolded layout with mock elements, ready for future interactivity features.

## File Structure

```
src/app/student-board/[id]/
  └── page.tsx          # Main Student Board page component
```

## Components Created

### 1. `StudentBoardPage` (Main Component)
- **Location**: `src/app/student-board/[id]/page.tsx`
- **Purpose**: Main page component that orchestrates the board layout
- **Features**:
  - Integrates SidebarNav
  - Manages tool state (currently just UI state)
  - Renders toolbar and canvas
  - Contains mock element data

### 2. `StudentBoardToolbar`
- **Purpose**: Toolbar with tool selection buttons
- **Tools Available**:
  - Select (↖)
  - Sticky (📝)
  - Text (T)
  - Image (🖼️)
  - PDF (📄)
  - Pen (✏️)
  - Eraser (🧹)
  - Shape (⬜)
- **Current State**: UI only - tool selection updates state but doesn't affect behavior yet

### 3. `StudentBoardCanvas`
- **Purpose**: Main canvas area where elements are displayed
- **Features**:
  - Renders all mock elements
  - Handles different element types (sticky, image, text, PDF)
  - Positioned absolutely based on element coordinates

### 4. Element Components

#### `MockStickyNote`
- Displays sticky note elements
- Supports different colors (yellow, pink, blue, green)
- Shows text content

#### `MockImageElement`
- Displays image elements
- Shows placeholder if no image source
- Supports external image URLs

#### `MockPDFThumbnail`
- Displays PDF page thumbnails
- Shows PDF document header
- Placeholder for page content

#### `MockTextElement`
- Displays text elements
- Supports font size and weight
- Customizable text color

## Mock Data

The page includes example elements positioned on the canvas:

- **3 Sticky Notes**: Different colors, positioned across the top
- **2 Image Elements**: Reference images with sample URLs
- **2 PDF Thumbnails**: Document placeholders
- **2 Text Elements**: Title and description text

All elements have:
- Unique IDs
- X, Y coordinates
- Width and height
- Z-index for layering

## Current Features

✅ **Layout**
- Sidebar navigation
- Top toolbar with tool buttons
- Canvas area filling main view
- Mock elements positioned on canvas

✅ **Visual Elements**
- Sticky notes with colors
- Image placeholders
- PDF thumbnails
- Text elements

✅ **Tool Selection**
- Tool buttons in toolbar
- Active tool highlighting
- Tool state management

✅ **Interactivity** (NEW)
- Click to select elements (single selection)
- Visual highlight with blue border when selected
- Drag and move selected elements
- Position updates in React state
- Click canvas background to deselect

## Future Features (TODOs)

### Interactivity
- [x] Drag and drop elements ✅
- [x] Select elements (click) ✅
- [x] Move elements ✅
- [ ] Multi-select (Shift+Click, marquee selection)
- [ ] Resize elements
- [ ] Delete elements (Delete key)
- [ ] Edit element content (double-click)
- [ ] Nudge with arrow keys

### Tools
- [ ] Select tool - Click to select, drag to move
- [ ] Sticky tool - Click to create new sticky note
- [ ] Text tool - Click to create text element
- [ ] Image tool - Upload and place images
- [ ] PDF tool - Upload and display PDF pages
- [ ] Pen tool - Draw freehand strokes
- [ ] Eraser tool - Erase pen strokes
- [ ] Shape tool - Draw shapes (rect, circle, etc.)

### Canvas Features
- [ ] Pan (drag canvas background)
- [ ] Zoom (mouse wheel, pinch)
- [ ] Grid overlay
- [ ] Snap to grid
- [ ] Rulers
- [ ] Minimap

### Data Management
- [ ] Load board data from API
- [ ] Save board state
- [ ] Auto-save
- [ ] Undo/redo
- [ ] Export as image
- [ ] Export as PDF

### Collaboration
- [ ] Real-time sync
- [ ] Multi-user cursors
- [ ] Presence indicators
- [ ] Comments/annotations

## Code Comments

The code includes extensive comments marking:
- **Current State**: What works now
- **Future Features**: What needs to be implemented
- **TODOs**: Specific tasks to complete
- **Integration Points**: Where to connect real data/APIs

## Usage

### Access the Page

Navigate to: `/student-board/[any-id]`

Example:
- `/student-board/123`
- `/student-board/my-project`

### Development

```bash
# Start dev server
npm run dev

# Navigate to student board
http://localhost:3000/student-board/test
```

## Integration Points

### 1. Data Fetching
**Location**: `StudentBoardPage` component
**Current**: Mock data array
**Future**: 
```typescript
// Replace mockElements with:
const { data: boardData } = useSWR(`/api/boards/${boardId}`, fetcher);
const elements = boardData?.elements || [];
```

### 2. State Management
**Location**: Component state
**Current**: `useState` for tool selection
**Future**: Consider Zustand, Redux, or React Context for:
- Elements array
- Selection state
- Zoom/pan state
- Undo/redo stack

### 3. Element Interaction
**Location**: Element components
**Current**: Static display
**Future**: Add event handlers:
```typescript
// Add to MockStickyNote, etc.
onClick={() => handleElementClick(element.id)}
onDragStart={() => handleDragStart(element.id)}
onDragEnd={(x, y) => handleDragEnd(element.id, x, y)}
```

### 4. Tool Actions
**Location**: `StudentBoardToolbar`
**Current**: Updates `activeTool` state
**Future**: Add tool-specific behaviors:
```typescript
// When tool changes:
useEffect(() => {
  if (activeTool === "sticky") {
    // Enable sticky creation mode
  } else if (activeTool === "select") {
    // Enable selection mode
  }
}, [activeTool]);
```

## Styling

- Uses Tailwind CSS
- Dark mode support (dark: classes)
- Responsive design ready
- Accessible (ARIA labels on buttons)

## Next Steps

1. **Add Interactivity**
   - Implement drag and drop (react-dnd or react-rnd)
   - Add click handlers for selection
   - Add double-click for editing

2. **Connect to Data**
   - Create API endpoint for board data
   - Add data fetching hook
   - Implement save functionality

3. **Add Tools**
   - Implement each tool's behavior
   - Add tool-specific UI (color picker, size slider, etc.)
   - Handle tool state transitions

4. **Enhance Canvas**
   - Add pan/zoom functionality
   - Implement grid
   - Add selection marquee

5. **Testing**
   - Add unit tests for components
   - Add integration tests for interactions
   - Test with real data

## Notes

- The page uses Next.js 16 async params pattern (`use()` hook)
- All components are client-side (`"use client"`)
- Mock elements use the existing `CanvasElement` type
- PDF type will need to be added to `ElementType` union in `src/types/index.ts`
- SidebarNav is reused from existing components
- Layout is responsive and works with existing app structure

