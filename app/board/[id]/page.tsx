"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { use } from "react";
import SidebarNav from "@/components/SidebarNav";
import HeaderBar from "@/components/HeaderBar";
import BoardCanvas from "@/components/BoardCanvas";
import RightPanel from "@/components/RightPanel";
import AddCardModal from "@/components/AddCardModal";
import CritShareModal from "@/components/CritShareModal";
import { createHost, makeSessionId } from "@/lib/realtime";
import type { CritMessage } from "@/lib/realtime";
import type { Comment, Snapshot, Card, BoardSnapshot, TimelineSnapshot, Task, CanvasElement, CritSessionSummary } from "@/types";
import SnapshotsPanel from "@/components/SnapshotsPanel";
import CanvasToolbar, { type ToolType } from "@/components/CanvasToolbar";
import { useCanvasTools } from "@/hooks/useCanvasTools";
import {
  getCards,
  saveCards,
  updateBoardLastEdited,
  getSnapshots,
  saveSnapshots,
  getTasks,
  saveTasks,
  getCritSessionSummary,
  saveCritSessionSummary,
  getBoards,
  getElements,
  saveElements,
  getPenStrokes,
  savePenStrokes,
  type StoredPenStroke,
} from "@/lib/storage";
import type { PenStroke } from "@/hooks/usePenDrawing";
import { currentUser } from "@/lib/currentUser";
// UPDATED: Use Supabase-based hooks instead of localStorage-based functions
import { useComments, useCreateComment, useDeleteComment } from "@/hooks/comments";
import { usePDFUpload, PDFUploadProgress } from "@/components/pdf/PDFUploadHandler";
import { useCreateAttachment } from "@/hooks/attachments";
import dynamic from "next/dynamic";
import PDFPageNavigator from "@/components/pdf/PDFPageNavigator";

// Dynamically import PdfViewer with SSR disabled to prevent server-side rendering errors
// PDF rendering requires browser APIs (DOMMatrix, Canvas, etc.) that don't exist on the server
const PdfViewer = dynamic(() => import("@/components/PdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8 bg-gray-50 rounded border">
      <div className="text-center text-gray-500">
        <p className="text-sm">Loading PDF viewer...</p>
      </div>
    </div>
  ),
});

interface BoardPageProps {
  params: Promise<{ id: string }>;
}

// Inner component that uses the tool context
function BoardPageContent({ boardId }: { boardId: string }) {
  // UPDATED: Use Supabase-based comment hooks instead of localStorage
  // This automatically fetches comments from Supabase and polls for updates
  const { comments: commentsFromApi, loading: commentsLoading, error: commentsError, refetch: refetchComments } = useComments(boardId);
  
  // UPDATED: Use Supabase-based create and delete hooks with error handling
  const { createComment: createCommentApi, loading: creatingComment, error: createCommentError } = useCreateComment();
  const { deleteComment: deleteCommentApi, loading: deletingComment } = useDeleteComment();
  
  // NEW: Use attachment creation hook for file uploads
  const { createAttachment, loading: uploadingAttachment, error: attachmentUploadError } = useCreateAttachment();
  
  // Display create comment errors to user (hook-level errors)
  useEffect(() => {
    if (createCommentError) {
      console.error("[board] Comment creation error from hook:", createCommentError);
      // Error will also be displayed in handlePostComment's catch block
      // This is just for logging hook-level errors
    }
  }, [createCommentError]);
  
  // State - keep local state for optimistic updates, but sync with API
  const [comments, setComments] = useState<Comment[]>([]);
  
  // UPDATED: Sync local comments state with API data when it changes
  useEffect(() => {
    if (commentsFromApi.length >= 0) {
      setComments(commentsFromApi);
    }
  }, [commentsFromApi]);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [viewingSnapshotId, setViewingSnapshotId] = useState<string | null>(null);
  const [boardSnapshots, setBoardSnapshots] = useState<BoardSnapshot[]>([]);
  const [timelineSnapshots, setTimelineSnapshots] = useState<TimelineSnapshot[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cards, setCards] = useState<Card[]>([]); // Keep for backward compatibility with comments/snapshots
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => { selectedIdsRef.current = new Set(selectedIds); }, [selectedIds]);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  // Use unified tool state
  const { activeTool, setActiveTool } = useCanvasTools({
    initialTool: "select",
    onToolChange: (tool) => {
      // Tool changed - can add side effects here if needed
    },
  });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [snap, setSnap] = useState(true);
  const [loading, setLoading] = useState(true);
  // Pen tool state
  const [penColor, setPenColor] = useState("#000000");
  const [penWidth, setPenWidth] = useState(3);
  const [eraserSize, setEraserSize] = useState(20);
  const [penStrokes, setPenStrokes] = useState<PenStroke[]>([]);
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [pdfUploadProgress, setPdfUploadProgress] = useState<{ current: number; total: number; fileName?: string } | null>(null);
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null);
  const [pdfViewerFile, setPdfViewerFile] = useState<File | null>(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCritMode, setIsCritMode] = useState(false);
  const [isCritModalOpen, setIsCritModalOpen] = useState(false);
  const [isCritActive, setIsCritActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const hostRef = useRef<Awaited<ReturnType<typeof createHost>> | null>(null);
  const [boardTitle, setBoardTitle] = useState("Runway / Movement Study");
  const [timelineSnapshotRefresh, setTimelineSnapshotRefresh] = useState(0);

  // Get the snapshot being viewed
  const viewingSnapshot = viewingSnapshotId
    ? snapshots.find((s) => s.id === viewingSnapshotId) || null
    : null;

  // Determine if we're in preview mode
  const isPreviewMode = viewingSnapshot !== null;

  // Determine which comments/cards to display
  const displayedComments = viewingSnapshot
    ? viewingSnapshot.data.comments
    : comments;
  const displayedCards = viewingSnapshot
    ? viewingSnapshot.data.cards
    : cards;

  // Derive activeElementId from selectedIds for consistent filtering
  const activeElementId = selectedIds.length === 1 ? selectedIds[0] : null;

  // Normalize BoardComment[] -> Comment[]
  function normalizeBoardComments(bcs: any[]): Comment[] {
    return (bcs || []).map((bc) => ({
      id: bc.id,
      author: bc.createdBy ?? bc.authorName ?? "Guest",
      text: bc.text,
      timestamp: new Date(bc.createdAt).toISOString(),
      boardId: bc.boardId,
      category: (bc.category?.toLowerCase() as Comment["category"]) || "general",
      elementId: bc.elementId || null,
      targetElementId: bc.elementId || null,
      task: !!bc.isTask,
      source: bc.source ?? "liveCrit",
    }));
  }

  // Normalize comments (ensure elementId is set from targetElementId if missing)
  const normalizedComments = useMemo(() => {
    const list = displayedComments || [];
    return list.map(c => ({
      ...c,
      elementId: c.elementId ?? c.targetElementId ?? null,
      targetElementId: c.targetElementId ?? c.elementId ?? null,
    }));
  }, [displayedComments]);

  // Debug logging
  useEffect(() => {
    console.debug("[board] activeElementId", activeElementId);
    console.debug("[board] normalizedComments count", normalizedComments.length);
  }, [activeElementId, normalizedComments.length]);

  // Get the selected card object (for backward compatibility)
  const selectedCard = selectedCardId
    ? displayedCards.find((c) => c.id === selectedCardId) || null
    : null;

  // Get the selected element object (for comments)
  const activeId = (selectedElementId ?? selectedIds[0]) ?? null;
  const selectedElement = activeId ? (elements.find(e => e.id === activeId) ?? null) : null;

  // Helper to get element summary for display
  const getElementSummary = useCallback((elementId: string): string => {
    const element = elements.find((e) => e.id === elementId);
    if (!element) return "Unknown element";
    
    switch (element.type) {
      case "text":
        return "Text box";
      case "sticky":
        return "Sticky note";
      case "shape":
        if (element.shapeType) {
          const shapeNames: Record<string, string> = {
            rect: "Rectangle",
            circle: "Circle",
            triangle: "Triangle",
            diamond: "Diamond",
            arrow: "Arrow",
            bubble: "Bubble",
            star: "Star",
          };
          return `Shape: ${shapeNames[element.shapeType] || element.shapeType}`;
        }
        return "Shape";
      case "image":
        return "Image";
      case "card":
        return "Card";
      default:
        return "Element";
    }
  }, [elements]);

  // Helper to convert card to element
  const cardToElement = (card: Card, z: number = 0): CanvasElement => {
    return {
      id: card.id,
      type: card.imageUrl ? "image" : "card",
      x: card.x ?? 100,
      y: card.y ?? 100,
      width: 240,
      height: card.imageUrl ? 180 : 140,
      rotation: 0,
      z: z,
      locked: false,
      text: card.body || "",
      title: card.title || "",
      body: card.body || "",
      imageUrl: card.imageUrl || undefined,
    };
  };

  // Helper to convert element back to card (for backward compatibility)
  const elementToCard = (element: CanvasElement): Card => {
    return {
      id: element.id,
      title: element.title || element.text || "Untitled",
      body: element.body || element.text || "",
      x: element.x,
      y: element.y,
      imageUrl: element.imageUrl,
    };
  };

  // Handle element movement (only in live mode)
  const handleElementMove = (elementId: string, x: number, y: number) => {
    if (isPreviewMode) return; // Don't allow moving in preview mode

    // Update local state immediately for responsiveness
    const updatedElements = elements.map((el) =>
      el.id === elementId ? { ...el, x, y } : el
    );
    setElements(updatedElements);
    // Note: saving is handled by onSaveElements callback in BoardCanvas
  };

  // Handle element resize
  const handleElementResize = (elementId: string, width: number, height: number) => {
    if (isPreviewMode) return;

    const updatedElements = elements.map((el) =>
      el.id === elementId ? { ...el, width, height } : el
    );
    setElements(updatedElements);
    // Note: saving is handled by onSaveElements callback in BoardCanvas
  };

  // Handle card movement (backward compatibility - maps to elements)
  const handleCardMove = async (cardId: string, x: number, y: number) => {
    handleElementMove(cardId, x, y);
  };

  // Handle element selection
  const handleSelectElement = (elementId: string | null) => {
    setSelectedElementId(elementId);
    setSelectedIds(elementId ? [elementId] : []);
    // Also set selectedCardId for backward compatibility with comments
    setSelectedCardId(elementId);
  };

  // Handle card selection (backward compatibility)
  const handleSelectCard = (cardId: string | null) => {
    handleSelectElement(cardId);
  };

  // Handle adding a new card (converts to element)
  const handleAddCard = async (
    imageUrl: string | undefined,
    caption: string
  ) => {
    if (isPreviewMode) return; // Don't allow adding cards in preview mode

    // Create new element (from card data)
    const newElement: CanvasElement = cardToElement({
      id: `c${Date.now()}`,
      title: caption ? caption.substring(0, 50) : imageUrl ? "Image Reference" : "Untitled",
      body: caption || "",
      x: 100,
      y: 100,
      imageUrl: imageUrl,
    }, (() => {
      const maxZ = elements.length > 0 ? Math.max(...elements.map(e => e.z ?? 0)) : 0;
      return maxZ + 10;
    })());

    // Optimistically update local state
    const updatedElements = [...elements, newElement];
    setElements(updatedElements);

    // Save to localStorage
    saveElements(boardId, updatedElements);

    // Also create card for backward compatibility
    const newCard: Card = elementToCard(newElement);
    const updatedCards = [...cards, newCard];
    setCards(updatedCards);

    // Save cards for backward compatibility
    saveCards(
      boardId,
      updatedCards.map((card) => ({
        id: card.id,
        boardId,
        x: card.x || 100,
        y: card.y || 100,
        imageUrl: card.imageUrl,
        caption: card.body,
        title: card.title,
        body: card.body,
      }))
    );

    // Update lastEdited timestamp
    const now = new Date().toISOString();
    updateBoardLastEdited(boardId, now);
  };

  // Persist elements helper
  const persistElements = useCallback((updated: CanvasElement[]) => {
    setElements(updated);
    console.log(`[board] Saving elements with boardId:`, boardId, { elementCount: updated.length });
    saveElements(boardId, updated);
    updateBoardLastEdited(boardId, new Date().toISOString());
  }, [boardId]);

  // Persist pen strokes helper
  const persistPenStrokes = useCallback((strokes: PenStroke[]) => {
    setPenStrokes(strokes);
    const storedStrokes: StoredPenStroke[] = strokes.map((stroke) => ({
      ...stroke,
      boardId,
    }));
    savePenStrokes(boardId, storedStrokes);
    updateBoardLastEdited(boardId, new Date().toISOString());
  }, [boardId]);

  // Bulk delete handler
  const deleteSelected = useCallback(() => {
    const ids = selectedIdsRef.current;
    if (!ids || ids.size === 0) return;
    const next = elements.filter(el => !ids.has(el.id));
    persistElements(next);
    setSelectedIds([]); // clear selection after delete
  }, [elements, persistElements]);

  // Typing guard
  function isTypingInForm() {
    const el = document.activeElement as HTMLElement | null;
    const tag = (el?.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || el?.isContentEditable === true;
  }

  // Unified keyboard handler for both canvas and window listeners
  const handleKeyDown = useCallback((e: KeyboardEvent | React.KeyboardEvent) => {
    const key = (e as KeyboardEvent).key;
    const code = (e as KeyboardEvent).code;
    
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

    // Delete/Backspace: delete selected elements
    if (key === "Delete" || key === "Backspace" || code === "Delete" || code === "Backspace") {
      if (selectedIdsRef.current.size > 0) {
        e.preventDefault?.();
        deleteSelected();
        return;
      }
    }
  }, [deleteSelected, activeTool, setActiveTool]);

  // Focus canvas on mount and make it focusable
  useEffect(() => {
    canvasRef.current?.setAttribute("tabindex", "0");
    canvasRef.current?.focus();
  }, []);

  // Window fallback for keyboard events
  useEffect(() => {
    const wHandler = (e: KeyboardEvent) => handleKeyDown(e);
    window.addEventListener("keydown", wHandler);
    return () => window.removeEventListener("keydown", wHandler);
  }, [handleKeyDown]);

  // Handle inserting an image element
  // UPDATED: handleInsertImage now handles both data URLs (from paste/clipboard) and File objects
  // If a File is passed, it will be uploaded to Supabase Storage and create an attachment record
  const handleInsertImage = useCallback(async (dataUrlOrFile: string | File, width?: number, height?: number) => {
    const maxZ = elements.length > 0 ? Math.max(...elements.map((el) => el.z ?? 0)) : 0;
    
    // If it's a File object, upload it to Supabase Storage first
    if (dataUrlOrFile instanceof File) {
      console.log("[handleInsertImage] 📤 Uploading image file:", dataUrlOrFile.name);
      
      try {
        // ========================================================================
        // Upload file to Supabase Storage bucket "attachments" and create attachment record
        // ========================================================================
        // IMPORTANT: boardId is REQUIRED - it comes from the current board context (page params)
        // Every attachment must be linked to a board via board_id in the attachments table.
        // The boardId is passed from the board page context to ensure proper linkage.
        if (!boardId) {
          const errorMsg = 'Cannot upload attachment: board ID is missing from current board context';
          console.error('[handleInsertImage] ❌ Missing boardId:', errorMsg);
          alert(errorMsg);
          return;
        }

        const attachment = await createAttachment({
          file: dataUrlOrFile,
          boardId: boardId, // REQUIRED: Passed from current board context/state
          commentId: null, // Board-level attachment (not linked to a comment)
          uploadedBy: currentUser?.name || 'Anonymous',
          // NOTE: storageBucket is automatically set to "attachments" in the hook
        });

        if (!attachment) {
          console.error("[handleInsertImage] ❌ Failed to create attachment");
          alert(`Failed to upload image. ${attachmentUploadError || 'Please try again.'}`);
          return;
        }

        console.log("[handleInsertImage] ✅ Attachment created:", attachment.id);
        
        // Use the uploaded file URL for the canvas element
        const newImageElement: CanvasElement = {
          id: `e_${crypto.randomUUID?.() || Date.now()}`,
          type: "image",
          x: 200,
          y: 200,
          width: width || 240,
          height: height || 180,
          rotation: 0,
          z: maxZ + 10,
          locked: false,
          text: "",
          imageUrl: attachment.fileUrl, // Use Supabase Storage URL
        };

        const updatedElements = [...elements, newImageElement];
        persistElements(updatedElements);
        
        // Select the new image element
        setSelectedIds([newImageElement.id]);
        setSelectedElementId(newImageElement.id);
        setSelectedCardId(newImageElement.id);
        
        // Switch back to select tool
        setActiveTool("select");
      } catch (error) {
        console.error("[handleInsertImage] ❌ Error uploading image:", error);
        alert(`Error uploading image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      // Original behavior: data URL (from paste/clipboard)
      // Note: Data URLs from paste don't create attachment records (they're temporary)
      const newImageElement: CanvasElement = {
        id: `e_${crypto.randomUUID?.() || Date.now()}`,
        type: "image",
        x: 200,
        y: 200,
        width: width || 240,
        height: height || 180,
        rotation: 0,
        z: maxZ + 10,
        locked: false,
        text: "",
        imageUrl: dataUrlOrFile,
      };

      const updatedElements = [...elements, newImageElement];
      persistElements(updatedElements);
      
      // Select the new image element
      setSelectedIds([newImageElement.id]);
      setSelectedElementId(newImageElement.id);
      setSelectedCardId(newImageElement.id);
      
      // Switch back to select tool
      setActiveTool("select");
    }
  }, [elements, persistElements, boardId, createAttachment, attachmentUploadError, currentUser]);

  // PDF upload handler
  const { handlePDFUpload } = usePDFUpload({
    onPagesExtracted: (pdfElements) => {
      const maxZ = elements.length > 0 ? Math.max(...elements.map((el) => el.z ?? 0)) : 0;
      const updatedElements = [...elements, ...pdfElements];
      persistElements(updatedElements);
      
      // Auto-scroll to first PDF page after upload
      if (pdfElements.length > 0) {
        const firstPage = pdfElements[0];
        // Pan to show the first page (center it in view)
        // Canvas pan is applied as transform, so we need to calculate the offset
        const canvasContainer = document.querySelector('[class*="canvas"]') as HTMLElement;
        if (canvasContainer) {
          const containerRect = canvasContainer.getBoundingClientRect();
          const targetPanX = -(firstPage.x * zoom) + (containerRect.width / 2) - (firstPage.width * zoom / 2);
          const targetPanY = -(firstPage.y * zoom) + (containerRect.height / 2) - (firstPage.height * zoom / 2);
          setPan({ x: targetPanX, y: targetPanY });
        } else {
          // Fallback: simple pan to first page position
          setPan({ x: -firstPage.x * zoom + 200, y: -firstPage.y * zoom + 200 });
        }
        
        // Select the first page
        setSelectedIds([firstPage.id]);
        setSelectedElementId(firstPage.id);
        setSelectedCardId(firstPage.id);
      }
      
      setActiveTool("select");
      setPdfUploadProgress(null);
    },
    onProgress: (current, total) => {
      setPdfUploadProgress(prev => prev ? { ...prev, current, total } : { current, total, fileName: undefined });
    },
    onError: (error) => {
      setPdfUploadError(error.message);
      setPdfUploadProgress(null);
      setTimeout(() => setPdfUploadError(null), 5000);
    },
  });

  // Handle file drop (images and PDFs)
  const handleFileDrop = useCallback(async (files: FileList) => {
    if (isPreviewMode) return;

    const maxZ = elements.length > 0 ? Math.max(...elements.map((el) => el.z ?? 0)) : 0;
    let zOffset = 0;
    const newElements: CanvasElement[] = [];
    const pdfFiles: File[] = [];

    // ========================================================================
    // UPDATED: Separate images, PDFs, and other files, then upload each to Supabase
    // ========================================================================
    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/")) {
        // ========================================================================
        // IMAGE UPLOAD: Upload to Supabase Storage and create attachment record
        // ========================================================================
        console.log("[handleFileDrop] 📤 Uploading image file:", file.name);
        
        try {
          // ========================================================================
          // Upload file to Supabase Storage bucket "attachments" and create attachment record
          // The useCreateAttachment hook always uses the "attachments" bucket
          // ========================================================================
          // IMPORTANT: boardId is REQUIRED - it comes from the current board context (page params)
          // Every attachment must be linked to a board via board_id in the attachments table.
          if (!boardId) {
            const errorMsg = `Cannot upload ${file.name}: board ID is missing from current board context`;
            console.error('[handleFileDrop] ❌ Missing boardId:', errorMsg);
            alert(errorMsg);
            continue; // Skip this file and continue with others
          }

          const attachment = await createAttachment({
            file,
            boardId: boardId, // REQUIRED: Passed from current board context/state
            commentId: null, // Image uploads are board-level by default (not linked to a comment)
            uploadedBy: currentUser?.name || 'Anonymous',
            // NOTE: storageBucket is automatically set to "attachments" in the hook
          });

          if (!attachment) {
            // Error already logged and set in hook's error state
            console.error("[handleFileDrop] ❌ Failed to create attachment for:", file.name);
            alert(`Failed to upload ${file.name}. ${attachmentUploadError || 'Please try again.'}`);
            continue; // Skip this file and continue with others
          }

          console.log("[handleFileDrop] ✅ Attachment created:", attachment.id);

          // Read file as data URL for local display (for immediate preview and dimension calculation)
          const reader = new FileReader();
          await new Promise<void>((resolve, reject) => {
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string;
              if (dataUrl) {
                // Get image dimensions
                const img = new Image();
                img.onload = () => {
                  newElements.push({
                    id: `e_${crypto.randomUUID?.() || Date.now()}`,
                    type: "image",
                    x: 200 + (zOffset * 20),
                    y: 200 + (zOffset * 20),
                    width: Math.min(img.width, 800),
                    height: Math.min(img.height, 600),
                    rotation: 0,
                    z: maxZ + 10 + zOffset,
                    locked: false,
                    text: "",
                    imageUrl: attachment.fileUrl, // Use Supabase Storage URL instead of data URL
                  });
                  zOffset++;
                  resolve();
                };
                img.onerror = reject;
                img.src = dataUrl; // Use data URL for dimension calculation only
              } else {
                reject(new Error("Failed to read image"));
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        } catch (error) {
          console.error("[handleFileDrop] ❌ Error uploading image:", error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
          alert(`Error uploading ${file.name}: ${errorMessage}`);
          // Continue with next file
          continue;
        }
      } else if (file.type === "application/pdf") {
        // ========================================================================
        // PDF UPLOAD: Upload to Supabase Storage and create attachment record
        // ========================================================================
        console.log("[handleFileDrop] 📤 Uploading PDF file:", file.name);
        
        try {
          // ========================================================================
          // Upload PDF to Supabase Storage bucket "attachments" and create attachment record
          // ========================================================================
          // IMPORTANT: boardId is REQUIRED - it comes from the current board context (page params)
          // Every attachment must be linked to a board via board_id in the attachments table.
          if (!boardId) {
            const errorMsg = `Cannot upload ${file.name}: board ID is missing from current board context`;
            console.error('[handleFileDrop] ❌ Missing boardId:', errorMsg);
            alert(errorMsg);
            continue; // Skip this file and continue with others
          }

          const attachment = await createAttachment({
            file,
            boardId: boardId, // REQUIRED: Passed from current board context/state
            commentId: null, // PDF uploads are board-level by default (not linked to a comment)
            uploadedBy: currentUser?.name || 'Anonymous',
            // NOTE: storageBucket is automatically set to "attachments" in the hook
          });

          if (!attachment) {
            console.error("[handleFileDrop] ❌ Failed to create attachment for PDF:", file.name);
            alert(`Failed to upload ${file.name}. ${attachmentUploadError || 'Please try again.'}`);
            continue; // Skip this file
          }

          console.log("[handleFileDrop] ✅ PDF attachment created:", attachment.id);
          
          // Add to PDF files list for processing
          pdfFiles.push(file);
          // Open PDF viewer for the first PDF file
          if (pdfFiles.length === 1) {
            setPdfViewerFile(file);
            setIsPdfViewerOpen(true);
          }
        } catch (error) {
          console.error("[handleFileDrop] ❌ Error uploading PDF:", error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to upload PDF';
          alert(`Error uploading ${file.name}: ${errorMessage}`);
          // Continue with next file
          continue;
        }
      } else {
        // ========================================================================
        // OTHER FILES: Upload to Supabase Storage and create attachment record
        // ========================================================================
        console.log("[handleFileDrop] 📤 Uploading file:", file.name, file.type);
        
        try {
          // ========================================================================
          // Upload file to Supabase Storage bucket "attachments" and create attachment record
          // ========================================================================
          // IMPORTANT: boardId is REQUIRED - it comes from the current board context (page params)
          // Every attachment must be linked to a board via board_id in the attachments table.
          if (!boardId) {
            const errorMsg = `Cannot upload ${file.name}: board ID is missing from current board context`;
            console.error('[handleFileDrop] ❌ Missing boardId:', errorMsg);
            alert(errorMsg);
            continue; // Skip this file and continue with others
          }

          const attachment = await createAttachment({
            file,
            boardId: boardId, // REQUIRED: Passed from current board context/state
            commentId: null, // Board-level attachment (not linked to a comment)
            uploadedBy: currentUser?.name || 'Anonymous',
            // NOTE: storageBucket is automatically set to "attachments" in the hook
          });

          if (!attachment) {
            console.error("[handleFileDrop] ❌ Failed to create attachment for:", file.name);
            alert(`Failed to upload ${file.name}. ${attachmentUploadError || 'Please try again.'}`);
            continue;
          }

          console.log("[handleFileDrop] ✅ File attachment created:", attachment.id);
          // File is uploaded and attachment record created
          // User can view it in the attachments list in the sidebar
        } catch (error) {
          console.error("[handleFileDrop] ❌ Error uploading file:", error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
          alert(`Error uploading ${file.name}: ${errorMessage}`);
          continue;
        }
      }
    }

    // Add image elements first
    if (newElements.length > 0) {
      const updatedElements = [...elements, ...newElements];
      persistElements(updatedElements);
      
      // Select the last added element
      const lastElement = newElements[newElements.length - 1];
      setSelectedIds([lastElement.id]);
      setSelectedElementId(lastElement.id);
      setSelectedCardId(lastElement.id);
      
      setActiveTool("select");
    }

    // Process PDF files (extract pages to canvas)
    // Note: If user wants to view PDF instead, they can use the PDF viewer modal
    for (const pdfFile of pdfFiles) {
      try {
        setPdfUploadProgress({ current: 0, total: 0, fileName: pdfFile.name });
        const baseZ = maxZ + newElements.length * 10;
        await handlePDFUpload(pdfFile, baseZ);
      } catch (error) {
        console.error("[board] Failed to process PDF:", error);
        // Error is already handled by onError callback
      }
    }
  }, [elements, persistElements, isPreviewMode, handlePDFUpload]);

  // Handle jumping to an element from a comment
  const handleJumpToElement = useCallback((elementId: string) => {
    const element = elements.find((e) => e.id === elementId);
    if (!element) return;
    
    // Select the element
    setSelectedIds([elementId]);
    setSelectedElementId(elementId);
    
    // Optional: pan to center the element (basic implementation)
    // For now, just select it - pan/zoom can be enhanced later
  }, [elements]);

  // UPDATED: Comments are now persisted in Supabase via useCreateComment hook
  // All comment creation goes through Supabase API (never localStorage)

  // UPDATED: Comments are now loaded via useComments hook which fetches from Supabase API
  // The hook automatically polls for updates every 5 seconds for real-time sync
  // No need for localStorage listeners or manual polling here

  // Cleanup host peer on unmount
  useEffect(() => {
    return () => {
      if (hostRef.current) {
        hostRef.current.destroy();
        hostRef.current = null;
      }
    };
  }, []);

  // ========================================================================
  // Handle starting crit: create sessionId, start host peer, open modal
  // ========================================================================
  // This function:
  // 1. Creates a real-time session for live crit feedback
  // 2. Opens a modal with a shareable link for guest critics
  // 3. Handles incoming comments from guest critics
  // 4. Always provides visible feedback (modal or error message)
  // ========================================================================
  const handleStartCrit = useCallback(async () => {
    // Prevent multiple simultaneous starts
    if (starting) {
      console.log("[board] Start Live Crit already in progress, ignoring click");
      return;
    }

    // If already running, just re-show the modal using the same id
    if (hostRef.current?.id) {
      console.log("[board] Live Crit already active, reopening modal with session:", hostRef.current.id);
      setSessionId(hostRef.current.id);
      setIsCritActive(true);
      setIsCritModalOpen(true);
      return;
    }

    console.log("[board] 🚀 Starting Live Crit session...");
    setStarting(true);

    try {
      // Generate safe, short session ID once
      // ========================================================================
      // REFACTORED: Generate UUID session ID
      // ========================================================================
      // makeSessionId() now generates a UUID using crypto.randomUUID()
      // No longer takes boardId as parameter - UUIDs are globally unique
      // ========================================================================
      const sid = makeSessionId();
      console.log("[board] Generated session ID:", sid);

      // ========================================================================
      // Start Supabase Realtime host session
      // ========================================================================
      // This creates a real-time session using Supabase Realtime instead of PeerJS.
      // 
      // IMPORTANT: createHost will:
      // 1. Find or create a crit session row in Supabase's crit_sessions table
      // 2. Subscribe to real-time comment updates for the board
      // 3. Return a host object for managing the session
      // 
      // The host subscribes to comment changes on the board and receives updates
      // when guest critics create comments via the API.
      // 
      // With Supabase Realtime, comments are already created in the database by
      // guest critics. The Realtime subscription notifies us of new comments,
      // and we update the UI accordingly. The useComments hook will also pick up
      // these changes via polling, but Realtime provides instant updates.
      // ========================================================================
      const host = await createHost(sid, boardId, (msg: CritMessage) => {
        if (msg.type === "comment") {
          const incoming = msg.payload;
          const elementIdFromTarget =
            incoming.target?.type === "element" ? incoming.target.elementId ?? null : null;
          
          console.log("[board] 📨 Received live crit comment via Supabase Realtime:", {
            author: incoming.author,
            note: incoming.note?.substring(0, 50),
            elementId: elementIdFromTarget,
          });

          // ========================================================================
          // NOTE: With Supabase Realtime, comments are already in the database
          // ========================================================================
          // Guest critics create comments via the API, which triggers Realtime events.
          // The useComments hook will automatically pick up new comments via polling,
          // but we can also trigger a manual refetch for instant UI updates.
          // 
          // We don't need to create the comment here - it's already created by the guest.
          // We just need to ensure our local state is updated.
          // ========================================================================
          
          // Trigger a refetch to get the latest comments (including the new one)
          // The useComments hook will handle updating the comments state
          refetchComments().catch((err) => {
            console.error("[board] Failed to refetch comments after Realtime update:", err);
          });

          // Flash a notification (optional)
          console.log("[board] ✅ Live crit comment received from", incoming.author);
        }
      });

      // ========================================================================
      // ERROR HANDLING: If host creation fails, show fallback behavior
      // ========================================================================
      // If createHost returns null, it means:
      // 1. Failed to create/find session in Supabase, OR
      // 2. Failed to subscribe to Realtime channel
      // 
      // In this case, we still create a session ID for sharing, but real-time
      // updates won't work. The user can still share the link for manual feedback.
      // ========================================================================
      if (!host) {
        console.warn("[board] ⚠️ Live Crit Supabase Realtime connection unavailable - using local mode");
        // REFACTORED: makeSessionId() no longer takes boardId parameter
        const fallbackSessionId = makeSessionId();
        setSessionId(fallbackSessionId);
        setIsCritActive(true);
        setIsCritModalOpen(true);
        
        // Show user-friendly error message
        alert("Live Crit started in local mode. Supabase Realtime connection is unavailable, but you can still share the link for manual feedback.");
        setStarting(false);
        return;
      }

      // ========================================================================
      // Success: Store host reference and show modal
      // ========================================================================
      // The host object contains:
      // - id: Session ID for sharing
      // - channel: Supabase Realtime channel (for cleanup)
      // - broadcast: Function to broadcast messages (not needed for comments)
      // - destroy: Function to clean up subscriptions
      // ========================================================================
      hostRef.current = host;
      // REFACTORED: host.id is now a UUID (generated with crypto.randomUUID())
      // No sanitization needed - UUIDs are already safe and standardized
      setSessionId(host.id);
      setIsCritActive(true);
      setIsCritModalOpen(true);
      console.log("[board] ✅ Live Crit session started successfully with Supabase Realtime:", host.id);
    } catch (e) {
      // ========================================================================
      // ERROR HANDLING: Always provide user-visible feedback on error
      // ========================================================================
      const errorMessage = e instanceof Error ? e.message : "Unknown error occurred";
      console.error("[board] ❌ Failed to start live crit:", e);
      
      // Show user-friendly error message
      alert(`Failed to start Live Crit: ${errorMessage}\n\nPlease try again or check your network connection.`);
      
      // Even on error, provide fallback: create a session ID and show modal
      // This ensures the button always does something visible
      try {
        // REFACTORED: makeSessionId() no longer takes boardId parameter
        const fallbackSessionId = makeSessionId();
        setSessionId(fallbackSessionId);
        setIsCritActive(true);
        setIsCritModalOpen(true);
        console.log("[board] ⚠️ Using fallback session ID after error:", fallbackSessionId);
      } catch (fallbackError) {
        console.error("[board] ❌ Failed to create fallback session:", fallbackError);
      }
    } finally {
      setStarting(false);
    }
  }, [boardId, starting, comments, createCommentApi, refetchComments, createCommentError]);

  // Handle ending crit: destroy host peer, create tasks from live crit comments
  // ========================================================================
  // Handle ending crit: destroy Supabase Realtime session, create tasks
  // ========================================================================
  // This function:
  // 1. Unsubscribes from Supabase Realtime channel
  // 2. Marks the crit session as ended in the database (via host.destroy())
  // 3. Creates tasks from actionable live crit comments
  // 
  // IMPORTANT: The host.destroy() method will:
  // - Unsubscribe from the Realtime channel
  // - Update the session status to 'ended' in Supabase's crit_sessions table
  //   This prevents guests from joining inactive sessions.
  // ========================================================================
  const handleEndCrit = useCallback(() => {
    setIsCritActive(false);
    setSessionId(null);
    
    // ========================================================================
    // Clean up Supabase Realtime subscription and mark session as ended
    // ========================================================================
    // host.destroy() will:
    // 1. Unsubscribe from Realtime channel
    // 2. PATCH /api/crit-sessions/{id} to set status='ended' and endedAt timestamp
    // ========================================================================
    if (hostRef.current) {
      console.log("[board] 🛑 Ending Live Crit session, cleaning up Supabase Realtime subscription");
      hostRef.current.destroy();
      hostRef.current = null;
    }
    
    // 1. Get ALL liveCrit comments currently on this board (regardless of category)
    const allLiveCritComments = comments.filter((c) => c.source === "liveCrit");

    // 2. Collect ALL comment IDs for summary (including "general" category)
    const allLiveCritCommentIds: string[] = allLiveCritComments.map((c) => c.id);

    // 3. Define actionable categories (exclude "general")
    const ACTIONABLE_CATEGORIES = [
      "concept",
      "plan",
      "section",
      "circulation",
      "structure",
      "material",
    ];

    // 4. Build tasks from ONLY actionable comments that don't already have tasks
    const newlyCreatedTasks: Task[] = [];
    const updatedTasksArray = [...tasks];

    for (const comment of allLiveCritComments) {
      const categoryLower = (comment.category || "general").toLowerCase();
      const shouldMakeTask = ACTIONABLE_CATEGORIES.includes(categoryLower);

      if (shouldMakeTask) {
        // Don't double-create if there's already a task pointing at this comment
        const alreadyHasTask = updatedTasksArray.some(
          (t) => t.sourceCommentId === comment.id
        );

        if (!alreadyHasTask) {
          const now = Date.now();
          const newTask: Task = {
            id: `task_${now}_${Math.random().toString(36).slice(2, 7)}`,
            boardId,
            sourceCommentId: comment.id,
            text: comment.text,
            status: "open" as const,
            createdAt: new Date().toISOString(),
          };
          updatedTasksArray.push(newTask);
          newlyCreatedTasks.push(newTask);
        }
      }
    }

    // 5. Update tasks state
    setTasks(updatedTasksArray);

    // 6. Save tasks to localStorage
    saveTasks(
      boardId,
      updatedTasksArray.map((t) => ({
        id: t.id,
        boardId: t.boardId,
        text: t.text,
        sourceCommentId: t.sourceCommentId,
        status: t.status,
        createdAt: t.createdAt,
      }))
    );

    // 7. Build crit session summary with full comment and task data
    const critCommentsForSummary = allLiveCritComments.map((c) => ({
      id: c.id,
      author: c.author || "Guest",
      category: c.category || "general",
      text: c.text,
      createdAt: new Date(c.timestamp).getTime(), // Convert ISO string to timestamp
      targetElementId: c.targetElementId || null,
    }));

    const critTasksForSummary = newlyCreatedTasks.map((t) => ({
      id: t.id,
      text: t.text,
      done: t.status === "done",
    }));

    const summary: CritSessionSummary = {
      endedAt: Date.now(),
      boardId,
      comments: critCommentsForSummary,
      tasks: critTasksForSummary,
    };

    saveCritSessionSummary(boardId, summary);

    // 8. Update board last edited
    updateBoardLastEdited(boardId, new Date().toISOString());
  }, [comments, tasks, boardId]);

  // Load board data (elements, cards for backward compat, and comments)
  // UPDATED: Converted to arrow function to fix Next.js client component parsing errors
  const loadBoardData = async () => {
    try {
      // Load from localStorage first
      const storedElements = getElements(boardId);
      const storedCards = getCards(boardId);
      const storedPenStrokes = getPenStrokes(boardId);
      
      // Load pen strokes
      if (storedPenStrokes && storedPenStrokes.length > 0) {
        const penStrokesData: PenStroke[] = storedPenStrokes.map((stroke) => ({
          id: stroke.id,
          points: stroke.points,
          color: stroke.color,
          width: stroke.width,
          timestamp: stroke.timestamp,
        }));
        setPenStrokes(penStrokesData);
      } else {
        setPenStrokes([]);
      }
      
      // Normalize element IDs (one-time migration for legacy images)
      if (storedElements && storedElements.length > 0) {
        let needsUpdate = false;
        const normalized = storedElements.map((el) => {
          if (!el.id) {
            needsUpdate = true;
            // Try imageId first, then generate new
            return { ...el, id: (el as any).imageId || `e_${crypto.randomUUID()}` };
          }
          return el;
        });
        if (needsUpdate) {
          saveElements(boardId, normalized);
          setElements(normalized);
        } else {
          setElements(storedElements);
        }
      } else {
        setElements(storedElements || []);
      }

      // REFACTORED: Comments are loaded via useComments hook (Supabase API)
      // The useComments hook automatically fetches from Supabase and syncs to comments state
      // No need to load from localStorage - Supabase is the source of truth

      // Priority: Use elements if they exist
      if (storedElements && storedElements.length > 0) {
        setElements(storedElements);
        // Also convert to cards for backward compatibility
        const cardsFromElements = storedElements
          .filter((el) => el.type === "card" || el.type === "image")
          .map((el) => elementToCard(el));
        setCards(cardsFromElements);
      } else if (storedCards.length > 0) {
        // Migrate old cards to elements
        const cardsFromStorage: Card[] = storedCards.map((stored) => ({
          id: stored.id,
          title: stored.title || stored.caption || "Untitled",
          body: stored.caption || stored.body || "",
          x: stored.x,
          y: stored.y,
          imageUrl: stored.imageUrl,
        }));
        const maxZ = storedElements.length > 0 ? Math.max(...storedElements.map(e => e.z ?? 0)) : -10;
        const elementsFromCards = cardsFromStorage.map((card, index) => ({
          id: card.id,
          type: card.imageUrl ? ("image" as const) : ("sticky" as const),
          x: card.x ?? 100,
          y: card.y ?? 100,
          width: card.imageUrl ? 240 : 240,
          height: card.imageUrl ? 180 : 160,
          rotation: 0,
          z: maxZ + 10 + (index * 10),
          locked: false,
          text: card.body || card.title || "",
          title: card.title || "",
          imageUrl: card.imageUrl || undefined,
        }));
        setElements(elementsFromCards);
        persistElements(elementsFromCards);
        setCards(cardsFromStorage);
      }

      // Comments are loaded via the useEffect above using getComments from lib/comments

      // Also try to load from API as fallback/merge
      const cardsRes = await fetch(`/api/boards/${boardId}/cards`);
      if (cardsRes.ok) {
        const cardsData = await cardsRes.json();
        const apiCards = cardsData.cards || [];
        if (apiCards.length > 0 && storedElements.length === 0) {
          // Convert API cards to elements (only if we don't have elements yet)
          const elementsFromApiCards = apiCards.map((card: Card, index: number) =>
            cardToElement(card, index * 10)
          );
          setElements(elementsFromApiCards);
          // Save converted elements
          saveElements(boardId, elementsFromApiCards);
          
          // Also keep cards for backward compatibility
          setCards(apiCards);
          saveCards(
            boardId,
            apiCards.map((card: Card) => ({
              id: card.id,
              boardId,
              x: card.x || 100,
              y: card.y || 100,
              imageUrl: card.imageUrl,
              caption: card.body,
              title: card.title,
              body: card.body,
            }))
          );
        }
      }

      // REFACTORED: Removed getComments(boardId) call - comments are loaded via useComments hook
      // The useComments hook automatically fetches from Supabase API and updates commentsFromApi
      // The useEffect above syncs commentsFromApi to the local comments state
      // No need to manually fetch or merge - the hook handles everything
      const commentsRes = await fetch(`/api/comments?boardId=${boardId}`);
      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        const apiComments = commentsData.data || commentsData.comments || [];
        if (apiComments.length > 0) {
          // REFACTORED: Use current comments state instead of getComments(boardId)
          // Comments are already loaded via useComments hook and synced to comments state
          // Just merge API comments with current comments state (API takes precedence)
          const currentComments = comments; // Use existing comments state from useComments hook
          const mergedComments = [...currentComments];
          apiComments.forEach((apiComment: Comment) => {
            const existingIndex = mergedComments.findIndex((c) => c.id === apiComment.id);
            if (existingIndex >= 0) {
              mergedComments[existingIndex] = {
                ...apiComment,
                category: apiComment.category || "general",
              };
            } else {
              mergedComments.push({
                ...apiComment,
                category: apiComment.category || "general",
              });
            }
          });
          setComments(mergedComments);
          // UPDATED: Comments are now loaded from Supabase via useComments hook
          // No need to save merged comments - they're persisted in Supabase
        }
      }
    } catch (err) {
      console.error("Failed to load board data", err);
    }
  }

  // Fetch snapshots
  // UPDATED: Converted to arrow function to fix Next.js client component parsing errors
  const loadSnapshots = async () => {
    try {
      const res = await fetch("/api/snapshots");
      if (!res.ok) return;
      const data = await res.json();
      // Filter snapshots by boardId
      const boardSnapshots = (data.snapshots || []).filter(
        (s: Snapshot) => s.boardId === boardId
      );
      setSnapshots(boardSnapshots);
    } catch (err) {
      console.error("Failed to load snapshots", err);
    }
  }

  // Load board snapshots
  // UPDATED: Converted to arrow function to fix Next.js client component parsing errors
  const loadBoardSnapshots = async () => {
    try {
      const res = await fetch(`/api/boards/${boardId}/snapshots`);
      if (res.ok) {
        const data = await res.json();
        setBoardSnapshots(data.snapshots || []);
      }
    } catch (err) {
      console.error("Failed to load board snapshots", err);
    }
  }

  // Initial load
  useEffect(() => {
    // UPDATED: Converted to arrow function to fix Next.js client component parsing errors
    const load = async () => {
      setLoading(true);
      loadTimelineSnapshots(); // Load timeline snapshots from localStorage
      await Promise.all([loadBoardData(), loadSnapshots(), loadBoardSnapshots()]);
      setLoading(false);
    };
    load();
  }, [boardId]);

  // When switching snapshots, clear selection
  useEffect(() => {
    setSelectedCardId(null);
  }, [viewingSnapshotId]);

  // Handle deleting a comment
  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!boardId || deletingComment) return;
    
    const ok = confirm("Delete this comment? This cannot be undone.");
    if (!ok) return;

    try {
      // Optimistic UI update
      setComments(prev => prev.filter(c => c.id !== commentId));
      
      // UPDATED: Delete from Supabase via API instead of localStorage
      await deleteCommentApi(commentId);
      
      // Refresh comments from API to ensure sync
      await refetchComments();
      
      // Update lastEdited timestamp
      updateBoardLastEdited(boardId, new Date().toISOString());
    } catch (err) {
      console.error("Failed to delete comment:", err);
      // Revert optimistic update on error
      await refetchComments();
    }
  }, [boardId, deleteCommentApi, deletingComment, refetchComments]);

  // Handle posting a comment - UPDATED to ALWAYS store in Supabase via API (never localStorage)
  // UPDATED: Converted to arrow function to fix Next.js client component parsing errors
  // UPDATED: Added comprehensive validation and logging for missing fields
  const handlePostComment = async (note: string, opts?: { makeTask?: boolean; category?: string; elementId?: string | null; targetElementId?: string | null }) => {
    // ========================================================================
    // VALIDATION: Check required fields before creating comment
    // ========================================================================
    if (!boardId) {
      console.error("[handlePostComment] ❌ Missing required field: boardId");
      alert("Error: Board ID is missing. Cannot create comment.");
      return;
    }

    const textBody = note?.trim();
    if (!textBody) {
      console.error("[handlePostComment] ❌ Missing required field: text (note is empty)");
      alert("Error: Comment text cannot be empty.");
      return;
    }

    if (creatingComment) {
      console.warn("[handlePostComment] ⚠️ Comment creation already in progress, ignoring duplicate request");
      return;
    }

    const eid = (opts?.targetElementId ?? opts?.elementId ?? activeElementId) || null;
    
    // NOTE: elementId is optional - comments can be board-level (no elementId)
    // Only warn, don't block creation
    if (!eid) {
      console.warn("[handlePostComment] ⚠️ No elementId provided - creating board-level comment");
    }

    const authorName = currentUser?.name || 'Anonymous';
    if (!authorName || authorName.trim().length === 0) {
      console.warn("[handlePostComment] ⚠️ Author name is empty, using 'Anonymous'");
    }

    console.debug("[handlePostComment] 📝 Creating comment in Supabase", { 
      boardId: boardId.trim(), 
      elementId: eid, 
      text: textBody,
      authorName: authorName.trim(),
      category: opts?.category,
      makeTask: opts?.makeTask,
    });

    const cat = (opts?.category?.toLowerCase() || 'general') as Comment['category'];

    try {
      // ========================================================================
      // CREATE COMMENT: Always store in Supabase via API (never localStorage)
      // ========================================================================
      const newComment = await createCommentApi({
        boardId: boardId.trim(), // Ensure boardId is trimmed
        text: textBody,
        authorName: authorName.trim(), // Ensure author name is provided and trimmed
        author: authorName.trim(), // Backward compatibility
        targetElementId: eid, // Can be null for board-level comments
        elementId: eid, // Backward compatibility
        category: cat,
        task: !!opts?.makeTask,
        isTask: !!opts?.makeTask,
        source: "student",
      });

      if (newComment) {
        console.log("[handlePostComment] ✅ Comment created successfully in Supabase:", newComment.id);
        
        // Optimistic UI update - add to local state
        setComments(prev => [newComment, ...prev]);

        // if "Make this a task" was checked,
        // automatically create a Task from this comment text
        if (opts?.makeTask) {
          const newTask: Task = {
            id: `task_${Date.now()}`,
            boardId,
            text: textBody,
            sourceCommentId: newComment.id,
            status: "open",
            createdAt: new Date().toISOString(),
          };

          const updatedTasks = [newTask, ...tasks];
          setTasks(updatedTasks);

          saveTasks(
            boardId,
            updatedTasks.map((t) => ({
              id: t.id,
              boardId: t.boardId,
              text: t.text,
              sourceCommentId: t.sourceCommentId,
              status: t.status,
              createdAt: t.createdAt,
            }))
          );
        }
      } else {
        // createCommentApi returned null - check hook error state
        if (createCommentError) {
          console.error("[handlePostComment] ❌ Comment creation failed (hook error):", createCommentError);
          alert(`Error creating comment: ${createCommentError}`);
        } else {
          console.error("[handlePostComment] ❌ Comment creation returned null without error");
          alert("Error creating comment: Unknown error. Please try again.");
        }
      }
      
      // Update lastEdited timestamp
      updateBoardLastEdited(boardId, new Date().toISOString());
    } catch (err) {
      // ========================================================================
      // ERROR HANDLING: Log detailed error and show user feedback
      // ========================================================================
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to create comment. Please try again.';
      console.error("[handlePostComment] ❌ Failed to create comment:", err);
      console.error("[handlePostComment] ❌ Error details:", {
        message: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
        boardId,
        text: textBody?.substring(0, 50) + (textBody?.length > 50 ? '...' : ''),
        elementId: eid,
        authorName: authorName,
      });
      
      // Display error to user (you can replace this with a toast/notification system)
      alert(`Error creating comment: ${errorMessage}`);
      
      // Refresh comments from API to ensure sync
      await refetchComments();
    }
  };

  // Handle saving board snapshot (new system)
  // UPDATED: Converted to arrow function to fix Next.js client component parsing errors
  const handleSaveBoardSnapshot = async () => {
    try {
      // Create snapshot with deep copy of current cards
      const snapshotData = {
        snapshot: {
          id: `snap_${Date.now()}`,
          timestamp: Date.now(),
          cards: cards.map((card) => ({
            id: card.id,
            x: card.x || 100,
            y: card.y || 100,
            imageUrl: card.imageUrl,
            caption: card.body,
          })),
          note: "",
        },
      };

      const res = await fetch(`/api/boards/${boardId}/snapshots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(snapshotData),
      });

      if (!res.ok) {
        console.error("Failed to save board snapshot");
        return;
      }

      // Reload board snapshots
      await loadBoardSnapshots();
    } catch (err) {
      console.error("Error saving board snapshot", err);
    }
  }

  // Handle loading a timeline snapshot
  function handleLoadSnapshot(snapshot: TimelineSnapshot) {
    // Replace current cards with snapshot cards
    setCards(snapshot.cards);

    // Save to localStorage
    saveCards(
      boardId,
      snapshot.cards.map((card) => ({
        id: card.id,
        boardId,
        x: card.x || 100,
        y: card.y || 100,
        imageUrl: card.imageUrl,
        caption: card.body,
        title: card.title,
        body: card.body,
      }))
    );

    // Update lastEdited timestamp
    const now = new Date().toISOString();
    updateBoardLastEdited(boardId, now);
  }

  // Load timeline snapshots from storage
  function loadTimelineSnapshots() {
    const storedSnapshots = getSnapshots(boardId);
    const timelineSnaps: TimelineSnapshot[] = storedSnapshots.map((stored) => ({
      id: stored.id,
      boardId: stored.boardId,
      createdAt: stored.createdAt,
      note: stored.note,
      cards: stored.cards,
    }));
    setTimelineSnapshots(timelineSnaps);
  }

  // Handle making a task from a comment
  function handleMakeTask(comment: Comment) {
    const newTask: Task = {
      id: `task_${Date.now()}`,
      boardId,
      text: comment.text,
      sourceCommentId: comment.id,
      status: "open",
      createdAt: new Date().toISOString(),
    };

    const updatedTasks = [newTask, ...tasks];
    setTasks(updatedTasks);

    // Save to localStorage
    saveTasks(
      boardId,
      updatedTasks.map((task) => ({
        id: task.id,
        boardId: task.boardId,
        text: task.text,
        sourceCommentId: task.sourceCommentId,
        status: task.status,
        createdAt: task.createdAt,
      }))
    );

    // Update lastEdited timestamp
    const now = new Date().toISOString();
    updateBoardLastEdited(boardId, now);
  }

  // Handle toggling task status
  function handleToggleTask(taskId: string) {
    const updatedTasks: Task[] = tasks.map((task) =>
      task.id === taskId
        ? { ...task, status: (task.status === "open" ? "done" : "open") as "open" | "done" }
        : task
    );
    setTasks(updatedTasks);

    // Save to localStorage
    saveTasks(
      boardId,
      updatedTasks.map((task) => ({
        id: task.id,
        boardId: task.boardId,
        text: task.text,
        sourceCommentId: task.sourceCommentId,
        status: task.status as "open" | "done",
        createdAt: task.createdAt,
      }))
    );

    // Update lastEdited timestamp
    const now = new Date().toISOString();
    updateBoardLastEdited(boardId, now);
  }

  // Handle adding a new task manually
  function handleAddTask(text: string) {
    const newTask: Task = {
      id: `task_${Date.now()}`,
      boardId,
      text,
      status: "open",
      createdAt: new Date().toISOString(),
    };

    const updatedTasks = [newTask, ...tasks];
    setTasks(updatedTasks);

    // Save to localStorage
    saveTasks(
      boardId,
      updatedTasks.map((task) => ({
        id: task.id,
        boardId: task.boardId,
        text: task.text,
        sourceCommentId: task.sourceCommentId,
        status: task.status,
        createdAt: task.createdAt,
      }))
    );

    // Update lastEdited timestamp
    const now = new Date().toISOString();
    updateBoardLastEdited(boardId, now);
  }

  // Handle viewing a board snapshot
  const handleViewSnapshot = (snapshotId: string) => {
    console.log("Viewing snapshot", snapshotId);
  };

  // Load board title on mount
  useEffect(() => {
    const storedBoards = getBoards();
    const storedBoard = storedBoards.find((b) => b.id === boardId);
    if (storedBoard?.title) {
      setBoardTitle(storedBoard.title);
    }

    // Also try API - UPDATED: Use single board endpoint with error handling
    // UPDATED: Converted to arrow function to fix Next.js client component parsing errors
    const loadTitle = async () => {
      try {
        const res = await fetch(`/api/boards/${boardId}`);
        if (res.ok) {
          // UPDATED: Handle new standardized { data, error } format
          const responseData = await res.json();
          if (responseData.error) {
            console.error("API error loading board title:", responseData.error.message || responseData.error.details);
          } else if (responseData.data?.title) {
            setBoardTitle(responseData.data.title);
          }
        } else {
          // Handle HTTP errors
          try {
            const errorData = await res.json();
            console.error("Failed to load board title:", errorData.error?.message || errorData.error?.details);
          } catch {
            console.error(`Failed to load board title: ${res.status} ${res.statusText}`);
          }
        }
      } catch (err) {
        console.error("Network error loading board title", err);
      }
    };
    loadTitle();
  }, [boardId]);

  // Handle present mode
  const handleStartPresent = () => {
    setIsPresenting(true);
  };

  const handleEndPresent = () => {
    setIsPresenting(false);
  };

  // Handle share modal
  const handleShare = () => {
    setIsShareModalOpen(true);
  };


  const handleCopyShareLink = async () => {
    const shareUrl = `${window.location.origin}/share/${boardId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      // You could show a toast here if needed
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  // Present mode layout
  if (isPresenting) {
  return (
      <div className="min-h-screen bg-white flex flex-col">
        <HeaderBar
          boardId={boardId}
          snapshots={snapshots}
          viewingSnapshotId={viewingSnapshotId}
          onSnapshotChange={setViewingSnapshotId}
          onPresent={handleStartPresent}
          onShare={handleShare}
          onStartCrit={handleStartCrit}
          onEndCrit={handleEndCrit}
          isCritActive={isCritActive}
          isPresenting={isPresenting}
          onEndPresent={handleEndPresent}
          isStartingCrit={starting}
        />
        <div 
          ref={canvasRef}
          className="flex-1 overflow-hidden relative"
          tabIndex={0}
          onKeyDown={(e) => handleKeyDown(e)}
        >
          <BoardCanvas
            elements={elements}
            setElements={setElements}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            onSelectionChange={setSelectedIds}
            activeTool={activeTool}
            onSetActiveTool={setActiveTool}
            selectedElementId={selectedCardId || selectedElementId || null}
            onSelectElement={(id) => {
              setSelectedCardId(id);
              setSelectedElementId(id);
              if (id) {
                setSelectedIds([id]);
              } else {
                setSelectedIds([]);
              }
            }}
            zoom={zoom}
            setZoom={setZoom}
            pan={pan}
            setPan={setPan}
            snap={snap}
            onSaveElements={(updated) => {
              if (updated) {
                persistElements(updated);
              } else {
                persistElements(elements);
              }
            }}
            isReadOnly={false}
            pinnedComments={comments}
            onSelectComment={(id) => {
              setSelectedCommentId(id);
            }}
            onCreateComment={() => {}}
            boardId={boardId}
            currentUserName={currentUser.name}
            allowPinComments={false}
            showMinimalToolbar={true}
          />
          {/* Floating "Show Crit QR" button in present mode */}
          <button
            onClick={() => setIsCritModalOpen(true)}
            className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full shadow-lg hover:bg-blue-700 transition"
          >
            Show Crit QR
            </button>
{/* Crit Share Modal */}
          <CritShareModal
            isOpen={isCritModalOpen}
            onClose={() => setIsCritModalOpen(false)}
            boardId={boardId}
            boardTitle={boardTitle}
          />
          </div>
            </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
            </div>
    );
  }

  // Crit mode - fullscreen view
  if (isCritMode) {
    return (
      <div className="min-h-screen bg-white fixed inset-0 overflow-hidden">
        {/* Floating crit panel */}
        <div className="absolute top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-64 z-50">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Live Crit Mode
          </h3>
          <p className="text-xs text-gray-600 mb-4">
            Share this link so guest critics can leave feedback.
          </p>
          
          {/* Short link */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Share Link
            </label>
            <div className="text-xs font-mono bg-gray-100 border border-gray-300 rounded px-2 py-1 break-all">
              pin.space/crit/{boardId}
            </div>
</div>

            {/* QR placeholder */}
          <div className="mb-4 flex justify-center">
            <div className="w-28 h-28 bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-[10px] text-gray-500">
              QR
            </div>
          </div>
          
          {/* Exit button */}
            <button
              onClick={() => setIsCritMode(false)}
              className="w-full px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-900 transition"
            >
              Exit Crit Mode
            </button>
          </div>
            
        {/* Canvas - read-only, fullscreen */}
        <div className="absolute inset-0">
          <BoardCanvas
            elements={elements}
            setElements={setElements}
            selectedIds={[]}
            setSelectedIds={() => {}}
            activeTool="select"
            onSetActiveTool={() => {}}
            selectedElementId={null}
            onSelectElement={() => {}}
            zoom={zoom}
            setZoom={setZoom}
            pan={pan}
            setPan={setPan}
            snap={false}
            onSaveElements={() => {}}
            isReadOnly={true}
            pinnedComments={comments}
            onSelectComment={(id) => setSelectedCommentId(id)}
            onCreateComment={() => {}}
            boardId={boardId}
            currentUserName={currentUser.name}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {!isPresenting && <SidebarNav />}
      <div className="flex-1 flex flex-col">
        <HeaderBar
          boardId={boardId}
          snapshots={snapshots}
          viewingSnapshotId={viewingSnapshotId}
          onSnapshotChange={setViewingSnapshotId}
          onPresent={handleStartPresent}
          onShare={handleShare}
          onStartCrit={handleStartCrit}
          onEndCrit={handleEndCrit}
          isCritActive={isCritActive}
          isPresenting={isPresenting}
          onEndPresent={handleEndPresent}
          isStartingCrit={starting}
        />
        <div className="flex flex-1 overflow-hidden relative">
          {/* Dropzone for images and PDFs */}
          {!isPreviewMode && !isPresenting && (
            <div
              className="absolute inset-0 z-10 pointer-events-none"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                  handleFileDrop(files);
                }
              }}
            >
              <div
                className="absolute inset-0 border-2 border-dashed border-blue-400 bg-blue-50/50 opacity-0 transition-opacity pointer-events-none"
                style={{ display: "none" }}
                id="dropzone-overlay"
              />
            </div>
          )}

          {/* PDF Upload Progress */}
          {pdfUploadProgress && (
            <PDFUploadProgress
              current={pdfUploadProgress.current}
              total={pdfUploadProgress.total}
              fileName={pdfUploadProgress.fileName}
            />
          )}

          {/* Attachment Upload Error */}
          {attachmentUploadError && (
            <div className="fixed top-4 right-4 z-[10001] bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 max-w-md">
              <div className="flex items-start">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-800 mb-1">File Upload Error</h4>
                  <p className="text-sm text-red-600">{attachmentUploadError}</p>
                </div>
                <button
                  onClick={() => {}}
                  className="ml-4 text-red-400 hover:text-red-600"
                  aria-label="Close error"
                >
                  ×
                </button>
              </div>
            </div>
          )}
          
          {/* PDF Upload Error */}
          {pdfUploadError && (
            <div className="fixed top-4 right-4 z-[10001] bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 max-w-md">
              <div className="flex items-start">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-800 mb-1">PDF Upload Error</h4>
                  <p className="text-sm text-red-600">{pdfUploadError}</p>
                </div>
                <button
                  onClick={() => setPdfUploadError(null)}
                  className="ml-4 text-red-400 hover:text-red-600"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* PDF Viewer Modal */}
          {isPdfViewerOpen && pdfViewerFile && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10002] p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                  <h3 className="text-lg font-semibold text-gray-900">
                    PDF Viewer: {pdfViewerFile.name}
                  </h3>
                  <button
                    onClick={() => {
                      setIsPdfViewerOpen(false);
                      setPdfViewerFile(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>
                <div className="p-6">
                  <PdfViewer
                    file={pdfViewerFile}
                    maxWidth={800}
                    onLoadError={(error) => {
                      setPdfUploadError(error.message);
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Toolbar - hidden in present mode and when Live Crit modal is open */}
          {/* 
            Visibility Logic:
            - Hidden when in preview mode (!isPreviewMode)
            - Hidden when in present mode (!isPresenting)
            - Hidden when Live Crit modal is open (!isCritModalOpen)
            
            This ensures the toolbar doesn't interfere with the modal overlay,
            providing a clean, focused view when sharing the Live Crit session.
          */}
          {!isPreviewMode && !isPresenting && !isCritModalOpen && <CanvasToolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            zoom={zoom}
            onZoomIn={() => setZoom(Math.min(2, zoom * 1.1))}
            onZoomOut={() => setZoom(Math.max(0.5, zoom * 0.9))}
            onZoomReset={() => setZoom(1)}
            snap={snap}
            onSnapToggle={() => setSnap(prev => !prev)}
            onInsertImage={handleInsertImage}
            onFileUpload={(files) => {
              // Handle both images and PDFs from file picker
              handleFileDrop(files);
            }}
            penColor={penColor}
            setPenColor={setPenColor}
            penWidth={penWidth}
            setPenWidth={setPenWidth}
            eraserSize={eraserSize}
            setEraserSize={setEraserSize}
          />}
          
          {!isPreviewMode && !isPresenting && (
            <button
              onClick={() => setIsAddCardModalOpen(true)}
              className="absolute top-4 left-[120px] z-20 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition shadow-lg"
            >
              Add to board
            </button>
          )}

                  <BoardCanvas
            elements={elements}
            setElements={setElements}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            activeTool={activeTool}
            onSetActiveTool={setActiveTool}
            selectedElementId={selectedCardId || selectedElementId || null}
            onSelectElement={(id) => {
              setSelectedCardId(id);
              setSelectedElementId(id);
              if (id) {
                setSelectedIds([id]);
              } else {
                setSelectedIds([]);
              }
            }}
            zoom={zoom}
            setZoom={setZoom}
            pan={pan}
            setPan={setPan}
            snap={snap}
            onSaveElements={(updated) => {
              if (updated) {
                persistElements(updated);
} else {
                persistElements(elements);
              }
            }}
            isReadOnly={isPreviewMode}
            pinnedComments={comments}
            onSelectComment={(id) => {
              setSelectedCommentId(id);
            }}
            penColor={penColor}
            penWidth={penWidth}
            eraserSize={eraserSize}
            penStrokes={penStrokes}
            onPenStrokesChange={persistPenStrokes}
            onCreateComment={async (commentData) => {
              // ========================================================================
              // CREATE COMMENT: Always store in Supabase via API (never localStorage)
              // ========================================================================
              // Require elementId - use provided elementId, fallback to activeElementId
              const eid = commentData.elementId ?? activeElementId ?? null;
              
              // NOTE: elementId is optional - comments can be board-level (no elementId)
              // Only warn, don't block creation
              if (!eid) {
                console.warn("[onCreateComment] ⚠️ No elementId provided - creating board-level comment");
              }
              // UPDATED: Create comment in Supabase via API instead of localStorage
              // Validate required fields before creating
              if (!boardId) {
                console.error("[onCreateComment] ❌ Missing required field: boardId");
                alert("Error: Board ID is missing. Cannot create comment.");
                return;
              }

              const textBody = commentData.text?.trim();
              if (!textBody) {
                console.error("[onCreateComment] ❌ Missing required field: text");
                alert("Error: Comment text cannot be empty.");
                return;
              }

              const authorName = currentUser?.name || 'Anonymous';
              console.debug("[onCreateComment] 📝 Creating comment in Supabase", { 
                boardId, 
                elementId: eid, 
                text: textBody,
                authorName,
                category: commentData.category,
                task: commentData.task,
              });

              const cat = (commentData.category?.toLowerCase() || 'general') as Comment['category'];

              try {
                const newComment = await createCommentApi({
                  boardId: boardId.trim(),
                  text: textBody,
                  authorName: authorName.trim(),
                  author: authorName.trim(), // Backward compatibility
                  targetElementId: eid, // Can be null for board-level comments
                  elementId: eid, // Backward compatibility
                  category: cat,
                  task: !!commentData.task,
                  isTask: !!commentData.task,
                  x: commentData.x || null,
                  y: commentData.y || null,
                  source: "student",
                });

                if (newComment) {
                  console.log("[onCreateComment] ✅ Comment created successfully in Supabase:", newComment.id);
                  
                  // Optimistic UI update - add to local state
                  setComments(prev => [newComment, ...prev]);
                  setSelectedCommentId(newComment.id);

                  // REFACTORED: Moved task creation inside if (newComment) block
                  // Task should only be created if comment was successfully created
                  // If makeTask is true, also create a task
                  if (commentData.task) {
                    const newTask: Task = {
                      id: `task_${Date.now()}`,
                      boardId,
                      text: commentData.text,
                      sourceCommentId: newComment.id, // Now newComment is in scope
                      status: "open",
                      createdAt: new Date().toISOString(),
                    };
                    const updatedTasks = [newTask, ...tasks];
                    setTasks(updatedTasks);
                    saveTasks(
                      boardId,
                      updatedTasks.map((t) => ({
                        id: t.id,
                        boardId: t.boardId,
                        text: t.text,
                        sourceCommentId: t.sourceCommentId,
                        status: t.status,
                        createdAt: t.createdAt,
                      }))
                    );
                  }

                  // Update lastEdited timestamp
                  updateBoardLastEdited(boardId, new Date().toISOString());
                } else {
                  // createCommentApi returned null - check hook error state
                  if (createCommentError) {
                    console.error("[onCreateComment] ❌ Comment creation failed (hook error):", createCommentError);
                    alert(`Error creating comment: ${createCommentError}`);
                  } else {
                    console.error("[onCreateComment] ❌ Comment creation returned null without error");
                    alert("Error creating comment: Unknown error. Please try again.");
                  }
                }
              } catch (err) {
                // ERROR HANDLING: Log detailed error and show user feedback
                const errorMessage = err instanceof Error 
                  ? err.message 
                  : 'Failed to create comment. Please try again.';
                console.error("[onCreateComment] ❌ Failed to create comment:", err);
                console.error("[onCreateComment] ❌ Error details:", {
                  message: errorMessage,
                  stack: err instanceof Error ? err.stack : undefined,
                  boardId,
                  text: textBody?.substring(0, 50) + '...',
                  elementId: eid,
                });
                
                alert(`Error creating comment: ${errorMessage}`);
                
                // Refresh comments from API to ensure sync
                await refetchComments();
              }
            }}
            boardId={boardId}
            currentUserName={currentUser.name}
            allowPinComments={false}
            showMinimalToolbar={false}
      />
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
                  const element = elements.find(e => e.id === elementId);
                  if (element) {
                    // Select the page
                    setSelectedIds([elementId]);
                    setSelectedElementId(elementId);
                    setSelectedCardId(elementId);
                    
                    // Pan to center the page in view
                    const canvasContainer = document.querySelector('[class*="canvas"]') as HTMLElement;
                    if (canvasContainer) {
                      const containerRect = canvasContainer.getBoundingClientRect();
                      const targetPanX = -(element.x * zoom) + (containerRect.width / 2) - (element.width * zoom / 2);
                      const targetPanY = -(element.y * zoom) + (containerRect.height / 2) - (element.height * zoom / 2);
                      setPan({ x: targetPanX, y: targetPanY });
                    }
                  }
                }}
                showThumbnails={pdfPages.length > 5}
              />
            </div>
          );
        }
        return null;
      })()}

      {!isPresenting && <RightPanel
            comments={normalizedComments}
            viewingSnapshot={viewingSnapshot}
            selectedCard={selectedCard || (selectedElement ? elementToCard(selectedElement) : null)}
            author={currentUser.name}
            boardId={boardId}
            boardSnapshots={boardSnapshots}
            timelineSnapshots={timelineSnapshots}
            tasks={tasks}
            onPostComment={handlePostComment}
            onLoadSnapshot={handleLoadSnapshot}
            onToggleTask={handleToggleTask}
            onAddTask={handleAddTask}
            selectedCommentId={selectedCommentId}
            onSelectComment={setSelectedCommentId}
            isCritActive={isCritActive}
            activeElementId={activeElementId}
            selectedElementId={selectedIds.length === 1 ? selectedIds[0] : undefined}
            getElementSummary={getElementSummary}
            onJumpToElement={handleJumpToElement}
            getCritSessionSummary={getCritSessionSummary}
            deletableAuthorName={currentUser.name}
            onDeleteComment={handleDeleteComment}
            editableAuthorName={currentUser.name}
            onUpdateComment={async (updatedComment) => {
              // Update comment in local state immediately for optimistic UI
              setComments(prev => prev.map(c => 
                c.id === updatedComment.id ? updatedComment : c
              ));
              
              // Refresh comments from API to ensure sync with Supabase
              await refetchComments();
              
              console.log("[board] Comment updated successfully:", updatedComment.id);
            }}
            composerAtTop={true}
          />}
        </div>

        {/* Snapshots Panel - below the canvas and sidebar */}
        <div className="bg-white border-t border-gray-200 px-8 py-4">
            <SnapshotsPanel
            snapshots={boardSnapshots}
            onViewSnapshot={handleViewSnapshot}
          />
</div>
          </div>

          {/* Add Card Modal */}
      <AddCardModal
        isOpen={isAddCardModalOpen}
        onClose={() => setIsAddCardModalOpen(false)}
        onAddCard={handleAddCard}
      />

      {/* Crit Share Modal */}
      <CritShareModal
        isOpen={isCritModalOpen}
        onClose={() => {
          setIsCritModalOpen(false);
          // DO NOT set isCritActive = false here
          // Crit stays active until "End Crit" button is clicked
        }}
            boardId={boardId}
              boardTitle={boardTitle}
        sessionId={sessionId}
      />

      {/* Share Modal */}
      {isShareModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsShareModalOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Share Board</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Share URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/share/${boardId}`}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                />
                <button
                  onClick={handleCopyShareLink}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition"
                >
                  Copy link
                </button>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main component
export default function BoardPage({ params }: BoardPageProps) {
  const { id: boardId } = use(params);

  return <BoardPageContent boardId={boardId} />;
}
