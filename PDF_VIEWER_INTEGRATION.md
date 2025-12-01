# PDF Viewer Integration Guide

## Overview
A reusable PDF viewer component has been added to the Next.js app using `react-pdf`. The viewer supports both file uploads and URLs, with multi-page navigation.

## Components Created

### 1. `src/components/PdfViewer.tsx`
- **Purpose**: Reusable PDF viewer component
- **Features**:
  - Supports file uploads (File object) and URLs
  - Multi-page navigation (Previous/Next buttons)
  - Page counter display
  - Loading and error states
  - Uses local worker file (`/pdf.worker.min.js`)
  - Client-side rendering only

### 2. Integration in `src/app/board/[id]/page.tsx`
- **PDF Viewer Modal**: Opens automatically when a PDF is uploaded
- **State Management**: 
  - `pdfViewerFile`: Stores the current PDF file
  - `isPdfViewerOpen`: Controls modal visibility
- **Auto-open**: When a PDF is dropped or selected, the viewer opens automatically

## Installation

The following package has been installed:
```bash
npm install react-pdf
```

## Worker Configuration

The PDF viewer uses the local worker file:
- **Location**: `/public/pdf.worker.min.js`
- **Configuration**: Set in `PdfViewer.tsx` at module load:
  ```typescript
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
  ```

## Usage

### Basic Usage

```tsx
import PdfViewer from "@/components/PdfViewer";

// With file upload
<PdfViewer file={pdfFile} maxWidth={800} />

// With URL
<PdfViewer url="https://example.com/document.pdf" maxWidth={800} />
```

### In Board Page

The PDF viewer is automatically integrated:
1. User clicks PDF button in toolbar OR drags PDF onto canvas
2. PDF viewer modal opens automatically
3. User can navigate pages using Previous/Next buttons
4. Close button (×) closes the modal

## Features

### ✅ Implemented Features

1. **File Upload Support**
   - Accepts File objects from file input
   - Works with drag-and-drop

2. **URL Support**
   - Can load PDFs from URLs
   - Useful for remote documents

3. **Multi-page Navigation**
   - Previous/Next buttons
   - Page counter (Page X of Y)
   - Disabled states at first/last page

4. **Loading States**
   - Document loading indicator
   - Page loading indicator
   - Smooth transitions

5. **Error Handling**
   - Error messages displayed
   - Graceful error recovery

6. **Local Worker**
   - Uses `/public/pdf.worker.min.js`
   - No CDN dependencies

7. **Client-side Only**
   - "use client" directive
   - No SSR issues

## Component Props

```typescript
interface PdfViewerProps {
  /** PDF file object (from file input) */
  file?: File | null;
  /** PDF URL (alternative to file) */
  url?: string | null;
  /** Maximum width for the viewer (default: 800) */
  maxWidth?: number;
  /** Callback when PDF is loaded */
  onLoadSuccess?: (numPages: number) => void;
  /** Callback when PDF fails to load */
  onLoadError?: (error: Error) => void;
  /** CSS class name */
  className?: string;
}
```

## Styling

The component uses Tailwind CSS classes:
- Modal overlay: `bg-black/50`
- Modal container: `bg-white rounded-lg shadow-xl`
- Navigation buttons: `bg-gray-100 hover:bg-gray-200`
- Responsive: `max-w-4xl w-full max-h-[90vh]`

## Integration Points

### Toolbar Button
- **Location**: `src/components/CanvasToolbar.tsx`
- **Button**: PDF button (📄 PDF)
- **Action**: Opens file picker, triggers viewer

### Board Page
- **Location**: `src/app/board/[id]/page.tsx`
- **Modal**: Fixed position overlay
- **Auto-open**: When PDF is uploaded

## File Structure

```
src/
  components/
    PdfViewer.tsx          # Main PDF viewer component
    CanvasToolbar.tsx      # Toolbar with PDF button
  app/
    board/
      [id]/
        page.tsx          # Board page with PDF viewer modal
  lib/
    pdfUtils.ts           # PDF utilities (separate from viewer)
public/
  pdf.worker.min.js       # PDF.js worker file
```

## Testing Checklist

- [ ] PDF button appears in toolbar
- [ ] Clicking PDF button opens file picker
- [ ] Selecting PDF opens viewer modal
- [ ] PDF loads and displays correctly
- [ ] Navigation buttons work (Previous/Next)
- [ ] Page counter shows correct numbers
- [ ] Close button closes modal
- [ ] Error handling works for invalid PDFs
- [ ] Drag-and-drop PDF opens viewer
- [ ] Multi-page PDFs navigate correctly
- [ ] Worker loads from local file (check Network tab)

## Notes

- The PDF viewer is separate from the PDF extraction feature (which converts PDFs to canvas elements)
- Both features can work together: extract pages to canvas AND view PDF in modal
- The viewer uses `react-pdf` which is a React wrapper around `pdfjs-dist`
- CSS imports are required for proper text and annotation rendering

## Troubleshooting

### PDF doesn't load
- Check that `/public/pdf.worker.min.js` exists
- Verify worker path in browser console
- Check Network tab for worker file requests

### Styling issues
- Ensure CSS imports are present in `PdfViewer.tsx`
- Check that Tailwind CSS is configured

### Modal doesn't open
- Verify `isPdfViewerOpen` state is set to `true`
- Check that `pdfViewerFile` is not null
- Verify file type is `application/pdf`















