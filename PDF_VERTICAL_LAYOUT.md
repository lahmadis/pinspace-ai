# PDF Vertical Layout Enhancement

## Overview
Updated PDF multi-page placement to arrange pages vertically from top to bottom with equal spacing, like a slide deck or PowerPoint presentation. Added optional page navigation for easy jumping between pages.

## Features Implemented

### 1. Vertical Layout with Equal Spacing
- **Location**: `src/components/pdf/PDFUploadHandler.tsx`
- **Layout**:
  - Pages are placed from top to bottom
  - Left-aligned at X = 100px
  - Starting Y = 100px for first page
  - Fixed vertical spacing = 60px between pages
  - No overlap between pages
  - Maximum page width = 800px (maintains aspect ratio)

### 2. Auto-Scroll to First Page
- **Location**: `src/app/board/[id]/page.tsx`
- **Behavior**: After PDF upload, automatically pans and centers the first page in view
- **Implementation**: Calculates pan offset to center first page accounting for zoom level

### 3. PDF Page Navigator
- **Location**: `src/components/pdf/PDFPageNavigator.tsx`
- **Features**:
  - Shows when PDF pages are selected
  - Displays page thumbnails for PDFs with >5 pages
  - Simple list view for PDFs with ≤5 pages
  - Previous/Next navigation buttons
  - Current page indicator (e.g., "3 / 10")
  - Click any page to jump to it
  - Auto-pans to center selected page

## Code Changes

### PDFUploadHandler.tsx

#### Vertical Layout Logic (lines 53-95)
```typescript
// Convert pages to canvas elements with vertical layout (like a slide deck)
const VERTICAL_SPACING = 60; // Fixed spacing between pages (in canvas pixels)
const LEFT_ALIGN_X = 100; // Left alignment position
const START_Y = 100; // Starting Y position for first page
const MAX_PAGE_WIDTH = 800; // Maximum width for pages (maintains aspect ratio)

let currentY = START_Y; // Track cumulative Y position

const elements: CanvasElement[] = pages.map((page, index) => {
  // Calculate display dimensions maintaining aspect ratio
  let displayWidth = page.width;
  let displayHeight = page.height;
  const aspectRatio = page.width / page.height;

  // Scale down if exceeds max width, maintaining aspect ratio
  if (displayWidth > MAX_PAGE_WIDTH) {
    displayWidth = MAX_PAGE_WIDTH;
    displayHeight = displayWidth / aspectRatio;
  }

  // Calculate position: left-aligned, vertically stacked
  const x = LEFT_ALIGN_X;
  const y = currentY;
  
  // Update currentY for next page (current page height + spacing)
  currentY += displayHeight + VERTICAL_SPACING;

  return {
    id,
    type: "image",
    x,
    y,
    width: displayWidth,
    height: displayHeight,
    // ... other properties
  };
});
```

**Key Changes from Previous Implementation:**
- **Before**: Pages placed diagonally with `x: 200 + (index * 20)`, `y: 200 + (index * 20)`
- **After**: Pages placed vertically with `x: 100` (fixed), `y: cumulative` (each page below previous)

### Board Page Integration

#### Auto-Scroll (lines 423-443)
```typescript
// Auto-scroll to first PDF page after upload
if (pdfElements.length > 0) {
  const firstPage = pdfElements[0];
  // Pan to show the first page (center it in view)
  const canvasContainer = document.querySelector('[class*="canvas"]') as HTMLElement;
  if (canvasContainer) {
    const containerRect = canvasContainer.getBoundingClientRect();
    const targetPanX = -(firstPage.x * zoom) + (containerRect.width / 2) - (firstPage.width * zoom / 2);
    const targetPanY = -(firstPage.y * zoom) + (containerRect.height / 2) - (firstPage.height * zoom / 2);
    setPan({ x: targetPanX, y: targetPanY });
  }
  
  // Select the first page
  setSelectedIds([firstPage.id]);
  setSelectedElementId(firstPage.id);
  setSelectedCardId(firstPage.id);
}
```

#### PDF Navigator Integration (lines 1705-1747)
```typescript
{/* PDF Page Navigator - shows when PDF pages are selected */}
{!isPresenting && (() => {
  // Find all PDF page elements (identified by text starting with "PDF Page")
  const pdfPages = elements.filter(el => 
    el.type === "image" && el.text?.startsWith("PDF Page")
  );
  
  // Show navigator if we have PDF pages and at least one is selected
  const hasSelectedPdfPage = selectedIds.some(id => 
    pdfPages.some(page => page.id === id)
  );
  
  if (pdfPages.length > 0 && hasSelectedPdfPage) {
    return (
      <div className="fixed bottom-4 right-4 z-[10003] w-64">
        <PDFPageNavigator
          pdfPages={pdfPages}
          selectedIds={selectedIds}
          onJumpToPage={(elementId) => {
            // Select and pan to page
            // ...
          }}
          showThumbnails={pdfPages.length > 5}
        />
      </div>
    );
  }
  return null;
})()}
```

## Layout Specifications

### Spacing Constants
- **VERTICAL_SPACING**: 60px (fixed spacing between pages)
- **LEFT_ALIGN_X**: 100px (left alignment position)
- **START_Y**: 100px (starting Y position for first page)
- **MAX_PAGE_WIDTH**: 800px (maximum width, maintains aspect ratio)

### Page Positioning
- **X Position**: Fixed at 100px (left-aligned)
- **Y Position**: Cumulative
  - Page 1: Y = 100px
  - Page 2: Y = 100px + (Page 1 height) + 60px
  - Page 3: Y = Page 2 Y + (Page 2 height) + 60px
  - And so on...

### Aspect Ratio Preservation
- Pages maintain their original aspect ratio
- If page width > 800px, it's scaled down proportionally
- Height is calculated automatically to maintain aspect ratio

## Navigation Features

### PDF Page Navigator Component

#### Thumbnail View (>5 pages)
- Shows small thumbnails (10% scale) of each page
- Click thumbnail to jump to page
- Active page highlighted with blue border
- Shows page number and dimensions

#### List View (≤5 pages)
- Simple text list of page numbers
- Click to jump to page
- Active page highlighted

#### Navigation Controls
- **Previous/Next buttons**: Navigate between pages
- **Page counter**: Shows "current / total" (e.g., "3 / 10")
- **Auto-pan**: Automatically centers selected page in view

## User Experience

### Upload Flow
1. User uploads PDF via toolbar button or drag-and-drop
2. Progress indicator shows extraction progress
3. All pages are extracted and placed vertically
4. View automatically scrolls to first page
5. First page is selected

### Navigation Flow
1. User selects any PDF page
2. PDF Navigator appears in bottom-right corner
3. User can:
   - Click any page thumbnail/list item to jump
   - Use Previous/Next buttons
   - See current page indicator
4. View automatically pans to center selected page

### Scrolling
- Canvas supports natural scrolling (pan/zoom)
- For many pages, user can scroll down to see all pages
- Navigator helps jump to specific pages quickly

## Visual Design

### Layout
- Clean vertical stack
- Consistent spacing
- Left-aligned for easy reading
- No overlap between pages

### Navigator
- Fixed position: bottom-right corner
- Width: 256px (w-64)
- Max height: 400px (scrollable for many pages)
- White background with border and shadow
- Responsive to selection state

## Compatibility

### Both Boards
- ✅ Works on student board
- ✅ Works on live crit board
- ✅ Same layout logic for both

### Existing Features
- ✅ No breaking changes to existing PDF features
- ✅ PDF viewer modal still works
- ✅ Drag-and-drop still works
- ✅ File picker still works

## Testing Checklist

- [x] Pages placed vertically with equal spacing
- [x] Pages left-aligned
- [x] No overlap between pages
- [x] Auto-scroll to first page works
- [x] Navigator appears when PDF page selected
- [x] Thumbnails show for >5 pages
- [x] List view shows for ≤5 pages
- [x] Jump to page works
- [x] Previous/Next navigation works
- [x] Page counter shows correctly
- [x] Works on student board
- [x] Works on crit board
- [x] Scrolling works smoothly for many pages

## Usage

### Upload PDF
1. Click PDF button (📄 PDF) in toolbar
2. Select PDF file
3. Wait for extraction (progress shown)
4. Pages appear vertically stacked
5. View auto-scrolls to first page

### Navigate Pages
1. Select any PDF page
2. Navigator appears in bottom-right
3. Click page thumbnail/list item to jump
4. Or use Previous/Next buttons
5. View auto-pans to selected page

### Scroll Through Pages
- Use mouse wheel or trackpad to scroll down
- Use pan tool (hand) to navigate
- Use zoom to see more/less pages at once
- Navigator helps jump to specific pages

## Technical Details

### Page Identification
- PDF pages are identified by `text` property starting with "PDF Page"
- Format: `"PDF Page {pageNumber}"`
- Type: `"image"`
- Contains `imageUrl` with base64 data URL

### Sorting
- Pages sorted by Y position (top to bottom)
- Ensures correct page order in navigator

### Performance
- Thumbnails use lazy loading
- Navigator only renders when PDF pages are selected
- Efficient filtering and sorting using `useMemo`










