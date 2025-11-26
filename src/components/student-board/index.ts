/**
 * Student Board Components
 * 
 * Modular components for the Student Board workspace.
 * 
 * NOTE: This index file uses named re-exports for convenience.
 * Components can be imported directly from their files (recommended)
 * or via named imports from this index:
 * 
 * Direct import (recommended):
 *   import StudentBoardToolbar from "@/components/student-board/StudentBoardToolbar";
 * 
 * Named import from index:
 *   import { StudentBoardToolbar } from "@/components/student-board";
 * 
 * Components:
 * - StudentBoardToolbar: Tool selection toolbar
 * - StudentBoardCanvas: Main canvas area
 * - Element components: StickyNote, ImageElement, PDFThumbnail
 */

// Named re-exports (for convenience, but direct imports are preferred)
export { default as StudentBoardToolbar } from "./StudentBoardToolbar";
export { default as StudentBoardCanvas } from "./StudentBoardCanvas";
export { default as StickyNote } from "./elements/StickyNote";
export { default as ImageElement } from "./elements/ImageElement";
export { default as PDFThumbnail } from "./elements/PDFThumbnail";

