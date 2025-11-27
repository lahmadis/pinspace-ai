# PDF Upload Integration Guide

## Overview
This document describes the PDF upload feature that allows users to upload PDF files to both student and live crit boards. All pages are automatically extracted and displayed as separate canvas elements.

## Architecture

### Core Components

1. **`src/lib/pdfUtils.ts`**
   - PDF extraction utilities using `pdfjs-dist`
   - `extractPDFPages()`: Extracts all pages from a PDF and converts them to images
   - `getPDFMetadata()`: Gets PDF metadata (page count) without rendering
   - Uses CDN worker for pdfjs-dist (no local worker files needed)

2. **`src/components/pdf/PDFPageRenderer.tsx`**
   - Renders a single PDF page as an image
   - Handles aspect ratio and max dimensions
   - Shows loading and error states

3. **`src/components/pdf/PDFViewer.tsx`**
   - Full PDF viewer with navigation
   - Shows thumbnails for PDFs with >5 pages
   - Page navigation controls

4. **`src/components/pdf/PDFUploadHandler.tsx`**
   - `usePDFUpload` hook: Manages PDF upload workflow
   - `PDFUploadProgress` component: Shows upload progress modal
   - Converts PDF pages to canvas elements

### Integration Points

#### Student Board (`src/app/board/[id]/page.tsx`)
- PDF upload handler integrated via `usePDFUpload` hook
- File drop handler updated to support PDFs
- Progress and error UI components added
- All PDF pages are automatically added to canvas

#### Live Crit Board (`src/components/CritViewerCanvas.tsx`)
- Uses same `BoardCanvas` component which supports PDF elements
- PDF upload works automatically (no additional changes needed)

#### Canvas Toolbar (`src/components/CanvasToolbar.tsx`)
- File input accepts PDFs: `accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,application/pdf"`
- File upload handler routes PDFs to `onFileUpload` callback

## Features

### ✅ Implemented Features

1. **Large PDF Support**
   - No artificial page limits
   - No file size limits in UI
   - Efficient streaming via pdfjs-dist

2. **Automatic Page Extraction**
   - All pages extracted and displayed
   - Each page becomes a separate canvas element
   - Pages arranged with spacing (20px offset)

3. **Quality Rendering**
   - Uses pdfjs-dist for reliable parsing
   - 2x scale factor for high-quality rendering
   - Preserves layout and quality

4. **Efficient Processing**
   - Lazy loading of pdfjs-dist library
   - Progress tracking during extraction
   - Pages rendered on-demand

5. **Thumbnail Navigation** (via PDFViewer component)
   - Automatically shown for PDFs with >5 pages
   - Click thumbnails to jump to pages
   - Previous/Next navigation

6. **Upload Methods**
   - Drag-and-drop support
   - File picker support
   - Both methods show progress

7. **Loading & Error States**
   - Progress modal with percentage
   - Error notifications
   - File name display during processing

## Usage

### For Users

1. **Upload via Drag & Drop**
   - Drag PDF file onto the canvas
   - Progress modal appears
   - All pages are extracted and added

2. **Upload via File Picker**
   - Click Image tool in toolbar
   - Select PDF file
   - Progress modal appears
   - All pages are extracted and added

### For Developers

#### Adding PDF Upload to a New Component

```tsx
import { usePDFUpload, PDFUploadProgress } from "@/components/pdf/PDFUploadHandler";

function MyComponent() {
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  const { handlePDFUpload } = usePDFUpload({
    onPagesExtracted: (elements) => {
      // Add elements to canvas
      addElementsToCanvas(elements);
      setProgress(null);
    },
    onProgress: (current, total) => {
      setProgress({ current, total });
    },
    onError: (error) => {
      setError(error.message);
      setProgress(null);
    },
  });

  const handleFile = async (file: File) => {
    if (file.type === "application/pdf") {
      setProgress({ current: 0, total: 0, fileName: file.name });
      await handlePDFUpload(file, baseZ);
    }
  };

  return (
    <>
      {/* Your UI */}
      {progress && (
        <PDFUploadProgress
          current={progress.current}
          total={progress.total}
          fileName={progress.fileName}
        />
      )}
    </>
  );
}
```

## Styling & Positioning

### Progress Modal
- Fixed position overlay (`z-[10000]`)
- Centered on screen
- Blue progress bar
- Shows file name and percentage

### Error Notification
- Fixed top-right (`z-[10001]`)
- Red background with border
- Auto-dismisses after 5 seconds
- Manual close button

### PDF Pages on Canvas
- Each page is an image element
- Positioned with 20px spacing offset
- Max dimensions: 800x600 (maintains aspect ratio)
- Z-index increments for layering

## Performance Considerations

1. **Lazy Loading**
   - pdfjs-dist loaded only when needed
   - Worker loaded from CDN (no local files)

2. **Memory Management**
   - Pages rendered as images (data URLs)
   - Canvas elements use lazy loading
   - No memory leaks from event listeners

3. **Large Files**
   - Progress tracking prevents UI freezing
   - Pages processed sequentially
   - No artificial limits

## Browser Compatibility

- Works in all modern browsers
- Requires Canvas API support
- Uses pdfjs-dist (widely supported)

## Dependencies

- `pdfjs-dist` (already in node_modules)
- No additional npm packages required

## Testing Checklist

- [ ] Upload PDF via drag & drop
- [ ] Upload PDF via file picker
- [ ] Verify all pages are extracted
- [ ] Check progress modal appears
- [ ] Verify error handling
- [ ] Test with large PDFs (100+ pages)
- [ ] Test on student board
- [ ] Test on live crit board
- [ ] Verify pages are selectable/movable
- [ ] Check thumbnail navigation (if >5 pages)

## Notes

- PDF pages are converted to images (PNG data URLs)
- Original PDF file is not stored
- Each page is a separate canvas element
- Pages maintain original aspect ratio
- No page or file size limits enforced












