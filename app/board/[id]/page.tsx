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
import { useComments, useCreateComment, useDeleteComment } from "@/hooks/comments";
import { usePDFUpload, PDFUploadProgress } from "@/components/pdf/PDFUploadHandler";
import { useCreateAttachment } from "@/hooks/attachments";
import dynamic from "next/dynamic";
import PDFPageNavigator from "@/components/pdf/PDFPageNavigator";
import AuthGuard from "@/components/AuthGuard";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import AudioCritResultsModal from "@/components/AudioCritResultsModal";

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

// Crit session type for dropdown
interface CritSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  board_snapshot: {
    elements: CanvasElement[];
    cards: Card[];
    tasks: Task[];
    title: string;
  } | null;
}

function BoardPageContent({ boardId }: { boardId: string }) {
  const { comments: commentsFromApi, loading: commentsLoading, error: commentsError, refetch: refetchComments } = useComments(boardId);
  const { createComment: createCommentApi, loading: creatingComment, error: createCommentError } = useCreateComment();
  const { deleteComment: deleteCommentApi, loading: deletingComment } = useDeleteComment();
  const { createAttachment, loading: uploadingAttachment, error: attachmentUploadError } = useCreateAttachment();
  
  useEffect(() => {
    if (createCommentError) {
      console.error("[board] Comment creation error from hook:", createCommentError);
    }
  }, [createCommentError]);
  
  // State
  const [comments, setComments] = useState<Comment[]>([]);
  
  useEffect(() => {
    if (commentsFromApi.length >= 0) {
      setComments(commentsFromApi);
    }
  }, [commentsFromApi]);
  
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [boardSnapshots, setBoardSnapshots] = useState<BoardSnapshot[]>([]);
  const [timelineSnapshots, setTimelineSnapshots] = useState<TimelineSnapshot[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => { selectedIdsRef.current = new Set(selectedIds); }, [selectedIds]);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { activeTool, setActiveTool } = useCanvasTools({
    initialTool: "select",
    onToolChange: (tool) => {},
  });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [snap, setSnap] = useState(true);
  const [loading, setLoading] = useState(true);
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
  const [currentCritSessionId, setCurrentCritSessionId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const hostRef = useRef<Awaited<ReturnType<typeof createHost>> | null>(null);
  const [boardTitle, setBoardTitle] = useState("Runway / Movement Study");
  const [timelineSnapshotRefresh, setTimelineSnapshotRefresh] = useState(0);
  
  // ⭐ NEW: Crit session management
  const [critSessions, setCritSessions] = useState<CritSession[]>([]);
  const [selectedCritSessionId, setSelectedCritSessionId] = useState<string | null>(null);
  
  // Audio recording state
  const {
    isRecording,
    duration,
    audioBlob,
    startRecording,
    stopRecording,
    error: recordingError,
  } = useAudioRecorder();
  
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>("");
  
  useEffect(() => {
    const loadAudioDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter(d => d.kind === 'audioinput');
        console.log("[Board] Available microphones:", mics);
        setAudioDevices(mics);
        if (mics.length > 0) {
          setSelectedMicId(mics[0].deviceId);
          console.log("[Board] Default microphone selected:", mics[0].label || mics[0].deviceId);
        }
      } catch (error) {
        console.error("[Board] Error loading audio devices:", error);
      }
    };
    loadAudioDevices();
    navigator.mediaDevices.addEventListener('devicechange', loadAudioDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadAudioDevices);
    };
  }, []);
  
  useEffect(() => {
    console.log("[Board] Audio recording state changed - isRecording:", isRecording, "duration:", duration);
  }, [isRecording, duration]);
  
  useEffect(() => {
    if (audioBlob) {
      console.log("[Board] Audio blob ready - size:", audioBlob.size, "bytes, type:", audioBlob.type);
    } else {
      console.log("[Board] Audio blob cleared");
    }
  }, [audioBlob]);
  
  useEffect(() => {
    if (recordingError) {
      console.error("[Board] Recording error:", recordingError);
    }
  }, [recordingError]);
  
  const [processingAudio, setProcessingAudio] = useState(false);
  const [audioResults, setAudioResults] = useState<{
    transcript: string;
    analysis: {
      themes: Record<string, string[]>;
      actionItems: string[];
      keywords: string[];
      summary: string;
    };
  } | null>(null);
  const [showAudioResults, setShowAudioResults] = useState(false);

  // ⭐ NEW: Determine if we're viewing a past crit session
  const isViewingPastCrit = selectedCritSessionId !== null;
  const selectedCritSession = critSessions.find(s => s.id === selectedCritSessionId);

  // ⭐ NEW: Determine if we're in preview mode (viewing past crit = read-only)
  const isPreviewMode = isViewingPastCrit;

  // ⭐ NEW: Filter comments by selected crit session
  const displayedComments = useMemo(() => {
    if (isViewingPastCrit && selectedCritSessionId) {
      // Show only comments from this crit session
      return comments.filter(c => c.critSessionId === selectedCritSessionId);
    }
    return comments;
  }, [comments, isViewingPastCrit, selectedCritSessionId]);

  const displayedCards = cards;

  const activeElementId = selectedIds.length === 1 ? selectedIds[0] : null;

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

  const normalizedComments = useMemo(() => {
    const list = displayedComments || [];
    return list.map(c => ({
      ...c,
      elementId: c.elementId ?? c.targetElementId ?? null,
      targetElementId: c.targetElementId ?? c.elementId ?? null,
    }));
  }, [displayedComments]);

  useEffect(() => {
    console.debug("[board] activeElementId", activeElementId);
    console.debug("[board] normalizedComments count", normalizedComments.length);
  }, [activeElementId, normalizedComments.length]);

  const selectedCard = selectedCardId
    ? displayedCards.find((c) => c.id === selectedCardId) || null
    : null;

  const activeId = (selectedElementId ?? selectedIds[0]) ?? null;
  const selectedElement = activeId ? (elements.find(e => e.id === activeId) ?? null) : null;

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

  const handleElementMove = (elementId: string, x: number, y: number) => {
    if (isPreviewMode) return;
    const updatedElements = elements.map((el) =>
      el.id === elementId ? { ...el, x, y } : el
    );
    setElements(updatedElements);
  };

  const handleElementResize = (elementId: string, width: number, height: number) => {
    if (isPreviewMode) return;
    const updatedElements = elements.map((el) =>
      el.id === elementId ? { ...el, width, height } : el
    );
    setElements(updatedElements);
  };

  const handleCardMove = async (cardId: string, x: number, y: number) => {
    handleElementMove(cardId, x, y);
  };

  const handleSelectElement = (elementId: string | null) => {
    setSelectedElementId(elementId);
    setSelectedIds(elementId ? [elementId] : []);
    setSelectedCardId(elementId);
  };

  const handleSelectCard = (cardId: string | null) => {
    handleSelectElement(cardId);
  };

  const handleAddCard = async (
    imageUrl: string | undefined,
    caption: string
  ) => {
    if (isPreviewMode) return;
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
    const updatedElements = [...elements, newElement];
    setElements(updatedElements);
    saveElements(boardId, updatedElements);
    const newCard: Card = elementToCard(newElement);
    const updatedCards = [...cards, newCard];
    setCards(updatedCards);
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
    const now = new Date().toISOString();
    updateBoardLastEdited(boardId, now);
  };

  const persistElements = useCallback((updated: CanvasElement[]) => {
    setElements(updated);
    console.log(`[board] Saving elements with boardId:`, boardId, { elementCount: updated.length });
    saveElements(boardId, updated);
    updateBoardLastEdited(boardId, new Date().toISOString());
  }, [boardId]);

  const persistPenStrokes = useCallback((strokes: PenStroke[]) => {
    setPenStrokes(strokes);
    const storedStrokes: StoredPenStroke[] = strokes.map((stroke) => ({
      ...stroke,
      boardId,
    }));
    savePenStrokes(boardId, storedStrokes);
    updateBoardLastEdited(boardId, new Date().toISOString());
  }, [boardId]);

  const deleteSelected = useCallback(() => {
    const ids = selectedIdsRef.current;
    if (!ids || ids.size === 0) return;
    const next = elements.filter(el => !ids.has(el.id));
    persistElements(next);
    setSelectedIds([]);
  }, [elements, persistElements]);

  function isTypingInForm() {
    const el = document.activeElement as HTMLElement | null;
    const tag = (el?.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || el?.isContentEditable === true;
  }

  const handleKeyDown = useCallback((e: KeyboardEvent | React.KeyboardEvent) => {
    const key = (e as KeyboardEvent).key;
    const code = (e as KeyboardEvent).code;
    
    if (isTypingInForm()) return;

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

    if (key === "Delete" || key === "Backspace" || code === "Delete" || code === "Backspace") {
      if (selectedIdsRef.current.size > 0) {
        e.preventDefault?.();
        deleteSelected();
        return;
      }
    }
  }, [deleteSelected, activeTool, setActiveTool]);

  useEffect(() => {
    canvasRef.current?.setAttribute("tabindex", "0");
    canvasRef.current?.focus();
  }, []);

  useEffect(() => {
    const wHandler = (e: KeyboardEvent) => handleKeyDown(e);
    window.addEventListener("keydown", wHandler);
    return () => window.removeEventListener("keydown", wHandler);
  }, [handleKeyDown]);

  const handleInsertImage = useCallback(async (dataUrlOrFile: string | File, width?: number, height?: number) => {
    const maxZ = elements.length > 0 ? Math.max(...elements.map((el) => el.z ?? 0)) : 0;
    
    if (dataUrlOrFile instanceof File) {
      console.log("[handleInsertImage] 📤 Uploading image file:", dataUrlOrFile.name);
      try {
        if (!boardId) {
          const errorMsg = 'Cannot upload attachment: board ID is missing from current board context';
          console.error('[handleInsertImage] ❌ Missing boardId:', errorMsg);
          alert(errorMsg);
          return;
        }
        const attachment = await createAttachment({
          file: dataUrlOrFile,
          boardId: boardId,
          commentId: null,
          uploadedBy: currentUser?.name || 'Anonymous',
        });
        if (!attachment) {
          console.error("[handleInsertImage] ❌ Failed to create attachment");
          alert(`Failed to upload image. ${attachmentUploadError || 'Please try again.'}`);
          return;
        }
        console.log("[handleInsertImage] ✅ Attachment created:", attachment.id);
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
          imageUrl: attachment.fileUrl,
        };
        const updatedElements = [...elements, newImageElement];
        persistElements(updatedElements);
        setSelectedIds([newImageElement.id]);
        setSelectedElementId(newImageElement.id);
        setSelectedCardId(newImageElement.id);
        setActiveTool("select");
      } catch (error) {
        console.error("[handleInsertImage] ❌ Error uploading image:", error);
        alert(`Error uploading image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
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
      setSelectedIds([newImageElement.id]);
      setSelectedElementId(newImageElement.id);
      setSelectedCardId(newImageElement.id);
      setActiveTool("select");
    }
  }, [elements, persistElements, boardId, createAttachment, attachmentUploadError, currentUser]);

  const { handlePDFUpload } = usePDFUpload({
    onPagesExtracted: (pdfElements) => {
      const maxZ = elements.length > 0 ? Math.max(...elements.map((el) => el.z ?? 0)) : 0;
      const updatedElements = [...elements, ...pdfElements];
      persistElements(updatedElements);
      if (pdfElements.length > 0) {
        const firstPage = pdfElements[0];
        const canvasContainer = document.querySelector('[class*="canvas"]') as HTMLElement;
        if (canvasContainer) {
          const containerRect = canvasContainer.getBoundingClientRect();
          const targetPanX = -(firstPage.x * zoom) + (containerRect.width / 2) - (firstPage.width * zoom / 2);
          const targetPanY = -(firstPage.y * zoom) + (containerRect.height / 2) - (firstPage.height * zoom / 2);
          setPan({ x: targetPanX, y: targetPanY });
        } else {
          setPan({ x: -firstPage.x * zoom + 200, y: -firstPage.y * zoom + 200 });
        }
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

  const handleFileDrop = useCallback(async (files: FileList) => {
    if (isPreviewMode) return;
    const maxZ = elements.length > 0 ? Math.max(...elements.map((el) => el.z ?? 0)) : 0;
    let zOffset = 0;
    const newElements: CanvasElement[] = [];
    const pdfFiles: File[] = [];
    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/")) {
        console.log("[handleFileDrop] 📤 Uploading image file:", file.name);
        try {
          if (!boardId) {
            const errorMsg = `Cannot upload ${file.name}: board ID is missing from current board context`;
            console.error('[handleFileDrop] ❌ Missing boardId:', errorMsg);
            alert(errorMsg);
            continue;
          }
          const attachment = await createAttachment({
            file,
            boardId: boardId,
            commentId: null,
            uploadedBy: currentUser?.name || 'Anonymous',
          });
          if (!attachment) {
            console.error("[handleFileDrop] ❌ Failed to create attachment for:", file.name);
            alert(`Failed to upload ${file.name}. ${attachmentUploadError || 'Please try again.'}`);
            continue;
          }
          console.log("[handleFileDrop] ✅ Attachment created:", attachment.id);
          const reader = new FileReader();
          await new Promise<void>((resolve, reject) => {
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string;
              if (dataUrl) {
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
                    imageUrl: attachment.fileUrl,
                  });
                  zOffset++;
                  resolve();
                };
                img.onerror = reject;
                img.src = dataUrl;
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
          continue;
        }
      } else if (file.type === "application/pdf") {
        console.log("[handleFileDrop] 📤 Uploading PDF file:", file.name);
        try {
          if (!boardId) {
            const errorMsg = `Cannot upload ${file.name}: board ID is missing from current board context`;
            console.error('[handleFileDrop] ❌ Missing boardId:', errorMsg);
            alert(errorMsg);
            continue;
          }
          const attachment = await createAttachment({
            file,
            boardId: boardId,
            commentId: null,
            uploadedBy: currentUser?.name || 'Anonymous',
          });
          if (!attachment) {
            console.error("[handleFileDrop] ❌ Failed to create attachment for PDF:", file.name);
            alert(`Failed to upload ${file.name}. ${attachmentUploadError || 'Please try again.'}`);
            continue;
          }
          console.log("[handleFileDrop] ✅ PDF attachment created:", attachment.id);
          pdfFiles.push(file);
          if (pdfFiles.length === 1) {
            setPdfViewerFile(file);
            setIsPdfViewerOpen(true);
          }
        } catch (error) {
          console.error("[handleFileDrop] ❌ Error uploading PDF:", error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to upload PDF';
          alert(`Error uploading ${file.name}: ${errorMessage}`);
          continue;
        }
      } else {
        console.log("[handleFileDrop] 📤 Uploading file:", file.name, file.type);
        try {
          if (!boardId) {
            const errorMsg = `Cannot upload ${file.name}: board ID is missing from current board context`;
            console.error('[handleFileDrop] ❌ Missing boardId:', errorMsg);
            alert(errorMsg);
            continue;
          }
          const attachment = await createAttachment({
            file,
            boardId: boardId,
            commentId: null,
            uploadedBy: currentUser?.name || 'Anonymous',
          });
          if (!attachment) {
            console.error("[handleFileDrop] ❌ Failed to create attachment for:", file.name);
            alert(`Failed to upload ${file.name}. ${attachmentUploadError || 'Please try again.'}`);
            continue;
          }
          console.log("[handleFileDrop] ✅ File attachment created:", attachment.id);
        } catch (error) {
          console.error("[handleFileDrop] ❌ Error uploading file:", error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
          alert(`Error uploading ${file.name}: ${errorMessage}`);
          continue;
        }
      }
    }
    if (newElements.length > 0) {
      const updatedElements = [...elements, ...newElements];
      persistElements(updatedElements);
      const lastElement = newElements[newElements.length - 1];
      setSelectedIds([lastElement.id]);
      setSelectedElementId(lastElement.id);
      setSelectedCardId(lastElement.id);
      setActiveTool("select");
    }
    for (const pdfFile of pdfFiles) {
      try {
        setPdfUploadProgress({ current: 0, total: 0, fileName: pdfFile.name });
        const baseZ = maxZ + newElements.length * 10;
        await handlePDFUpload(pdfFile, baseZ);
      } catch (error) {
        console.error("[board] Failed to process PDF:", error);
      }
    }
  }, [elements, persistElements, isPreviewMode, handlePDFUpload]);

  const handleJumpToElement = useCallback((elementId: string) => {
    const element = elements.find((e) => e.id === elementId);
    if (!element) return;
    setSelectedIds([elementId]);
    setSelectedElementId(elementId);
  }, [elements]);

  useEffect(() => {
    return () => {
      if (hostRef.current) {
        hostRef.current.destroy();
        hostRef.current = null;
      }
    };
  }, []);

  const handleStartCrit = useCallback(async () => {
    if (starting) {
      console.log("[board] Start Live Crit already in progress, ignoring click");
      return;
    }
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
      const sid = makeSessionId();
      console.log("[board] Generated session ID:", sid);
      let critSessionId: string | null = null;
      try {
        const board_snapshot = {
          elements,
          cards,
          tasks,
          title: boardTitle,
        };
        console.log("[board] 📸 Captured board snapshot:", {
          elementsCount: elements.length,
          cardsCount: cards.length,
          tasksCount: tasks.length,
          title: boardTitle,
        });
        const createSessionResponse = await fetch(`/api/boards/${boardId}/crit-sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            board_snapshot,
          }),
        });
        if (createSessionResponse.ok) {
          const createSessionData = await createSessionResponse.json();
          if (createSessionData.session?.id) {
            critSessionId = createSessionData.session.id;
            setCurrentCritSessionId(critSessionId);
            console.log("[board] ✅ Created crit session:", critSessionId);
          }
        } else {
          console.warn("[board] ⚠️ Failed to create crit session, continuing without session ID");
        }
      } catch (error) {
        console.error("[board] ❌ Error creating crit session:", error);
      }
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
          refetchComments().catch((err) => {
            console.error("[board] Failed to refetch comments after Realtime update:", err);
          });
          console.log("[board] ✅ Live crit comment received from", incoming.author);
        }
      });
      if (!host) {
        console.warn("[board] ⚠️ Live Crit Supabase Realtime connection unavailable - using local mode");
        const fallbackSessionId = makeSessionId();
        setSessionId(fallbackSessionId);
        setIsCritActive(true);
        setIsCritModalOpen(true);
        alert("Live Crit started in local mode. Supabase Realtime connection is unavailable, but you can still share the link for manual feedback.");
        setStarting(false);
        return;
      }
      hostRef.current = host;
      setSessionId(host.id);
      setIsCritActive(true);
      setIsCritModalOpen(true);
      console.log("[board] ✅ Live Crit session started successfully with Supabase Realtime:", host.id);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error occurred";
      console.error("[board] ❌ Failed to start live crit:", e);
      alert(`Failed to start Live Crit: ${errorMessage}\n\nPlease try again or check your network connection.`);
      try {
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

  const handleStartAudioRecording = useCallback(async () => {
    console.log("[Board] handleStartAudioRecording() called");
    console.log("[Board] Current isRecording state:", isRecording);
    console.log("[Board] Current audioBlob:", audioBlob ? `exists (${audioBlob.size} bytes)` : "null");
    console.log("[Board] Selected microphone ID:", selectedMicId);
    try {
      console.log("[Board] Calling startRecording() with deviceId:", selectedMicId || "default");
      await startRecording(selectedMicId || undefined);
      console.log("[Board] startRecording() completed successfully");
    } catch (error) {
      console.error("[Board] Failed to start recording:", error);
      console.error("[Board] Recording error state:", recordingError);
      alert(recordingError || "Failed to start recording. Please check microphone permissions.");
    }
  }, [startRecording, recordingError, isRecording, audioBlob, selectedMicId]);

  const handleStopAudioRecording = useCallback(() => {
    console.log("[Board] handleStopAudioRecording() called");
    console.log("[Board] Current isRecording state:", isRecording);
    console.log("[Board] Current audioBlob:", audioBlob ? `exists (${audioBlob.size} bytes)` : "null");
    stopRecording();
    console.log("[Board] stopRecording() called");
  }, [stopRecording, isRecording, audioBlob]);

  const handleProcessAudio = useCallback(async () => {
    if (!audioBlob) {
      alert("No audio recorded. Please record audio first.");
      return;
    }
    console.log("[handleProcessAudio] Uploading blob size:", audioBlob.size, "bytes");
    console.log("[handleProcessAudio] Blob type:", audioBlob.type);
    console.log("[handleProcessAudio] Blob is empty:", audioBlob.size === 0);
    if (audioBlob.size === 0) {
      alert("Error: Audio blob is empty. Please record audio again.");
      return;
    }
    setProcessingAudio(true);
    try {
      const formData = new FormData();
      let fileName = "recording.webm";
      let mimeType = "audio/webm";
      if (audioBlob.type.includes("mp4")) {
        fileName = "recording.mp4";
        mimeType = "audio/mp4";
      } else if (audioBlob.type.includes("ogg")) {
        fileName = "recording.ogg";
        mimeType = "audio/ogg";
      } else if (audioBlob.type) {
        mimeType = audioBlob.type;
      }
      const audioFile = new File([audioBlob], fileName, {
        type: mimeType,
      });
      console.log("[handleProcessAudio] Created File object:", {
        name: audioFile.name,
        type: audioFile.type,
        size: audioFile.size,
      });
      formData.append("audio", audioFile);
      console.log("[handleProcessAudio] FormData created");
      console.log("[handleProcessAudio] FormData audio entry:", formData.get("audio"));
      console.log("[handleProcessAudio] File name:", fileName);
      console.log("[handleProcessAudio] File type:", mimeType);
      console.log("[handleProcessAudio] Sending request to /api/process-crit-audio");
      const response = await fetch("/api/process-crit-audio", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process audio");
      }
      const results = await response.json();
      setAudioResults(results);
      setShowAudioResults(true);
    } catch (error) {
      console.error("Failed to process audio:", error);
      alert(error instanceof Error ? error.message : "Failed to process audio. Please try again.");
    } finally {
      setProcessingAudio(false);
    }
  }, [audioBlob]);

  const handleEndCrit = useCallback(async () => {
    setIsCritActive(false);
    setSessionId(null);
    if (hostRef.current) {
      console.log("[board] 🛑 Ending Live Crit session, cleaning up Supabase Realtime subscription");
      hostRef.current.destroy();
      hostRef.current = null;
    }
    if (currentCritSessionId && boardId) {
      try {
        await fetch(`/api/boards/${boardId}/crit-sessions/${currentCritSessionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        console.log("[board] ✅ Marked crit session as ended:", currentCritSessionId);
        // ⭐ NEW: Reload crit sessions after ending
        await loadCritSessions();
      } catch (error) {
        console.error("[board] ❌ Error ending crit session:", error);
      }
    }
    setCurrentCritSessionId(null);
    const allLiveCritComments = comments.filter((c) => c.source === "liveCrit");
    const allLiveCritCommentIds: string[] = allLiveCritComments.map((c) => c.id);
    const ACTIONABLE_CATEGORIES = [
      "concept",
      "plan",
      "section",
      "circulation",
      "structure",
      "material",
    ];
    const newlyCreatedTasks: Task[] = [];
    const updatedTasksArray = [...tasks];
    for (const comment of allLiveCritComments) {
      const categoryLower = (comment.category || "general").toLowerCase();
      const shouldMakeTask = ACTIONABLE_CATEGORIES.includes(categoryLower);
      if (shouldMakeTask) {
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
    setTasks(updatedTasksArray);
    saveTasks(
      boardId,
      updatedTasksArray.map((t) => ({
        id: t.id,
        boardId: t.boardId,
        text: t.text,
        sourceCommentId: t.sourceCommentId,
        status: (t.status === "done" ? "done" : "open") as "done" | "open",
        createdAt: String(t.createdAt),
      }))
    );
    const critCommentsForSummary = allLiveCritComments.map((c) => ({
      id: c.id,
      author: c.author || "Guest",
      category: c.category || "general",
      text: c.text,
      createdAt: new Date(c.timestamp).getTime(),
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
    updateBoardLastEdited(boardId, new Date().toISOString());
  }, [comments, tasks, boardId, currentCritSessionId]);

  // ⭐ NEW: Load crit sessions from API
  const loadCritSessions = async () => {
    try {
      const res = await fetch(`/api/boards/${boardId}/crit-sessions`);
      if (res.ok) {
        const data = await res.json();
        setCritSessions(data.sessions || []);
        console.log("[board] ✅ Loaded crit sessions:", data.sessions?.length || 0);
      }
    } catch (error) {
      console.error("[board] Failed to load crit sessions:", error);
    }
  };

  // ⭐ NEW: Handle selecting a crit session
  const handleSelectCritSession = useCallback(async (sessionId: string | null) => {
    if (sessionId === null) {
      // Return to current/live board
      setSelectedCritSessionId(null);
      // Reload current board data
      await loadBoardData();
      return;
    }
    
    // Load selected crit session
    const session = critSessions.find(s => s.id === sessionId);
    if (!session) return;
    
    setSelectedCritSessionId(sessionId);
    
    // Load board snapshot from session
    if (session.board_snapshot) {
      setElements(session.board_snapshot.elements || []);
      setCards(session.board_snapshot.cards || []);
      setTasks(session.board_snapshot.tasks || []);
      setBoardTitle(session.board_snapshot.title || boardTitle);
    }
    
    // Comments are already filtered by useMemo above
    console.log("[board] ✅ Loaded crit session:", sessionId);
  }, [critSessions, boardTitle]);

  const loadBoardData = async () => {
    try {
      const storedElements = getElements(boardId);
      const storedCards = getCards(boardId);
      const storedPenStrokes = getPenStrokes(boardId);
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
      if (storedElements && storedElements.length > 0) {
        let needsUpdate = false;
        const normalized = storedElements.map((el) => {
          if (!el.id) {
            needsUpdate = true;
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
      console.log('[board] ========================================');
      console.log('[board] 📊 MAIN BOARD PAGE DATA SUMMARY');
      console.log('[board] ========================================');
      console.log('[board] ✅ Loaded board id:', boardId);
      console.log('[board] ✅ Elements count:', storedElements?.length || 0);
      if (storedElements && storedElements.length > 0) {
        setElements(storedElements);
        const cardsFromElements = storedElements
          .filter((el) => el.type === "card" || el.type === "image")
          .map((el) => elementToCard(el));
        setCards(cardsFromElements);
      } else if (storedCards.length > 0) {
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
      const cardsRes = await fetch(`/api/boards/${boardId}/cards`);
      if (cardsRes.ok) {
        const cardsData = await cardsRes.json();
        const apiCards = cardsData.cards || [];
        if (apiCards.length > 0 && storedElements.length === 0) {
          const elementsFromApiCards = apiCards.map((card: Card, index: number) =>
            cardToElement(card, index * 10)
          );
          setElements(elementsFromApiCards);
          saveElements(boardId, elementsFromApiCards);
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
      const commentsRes = await fetch(`/api/comments?boardId=${boardId}`);
      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        const apiComments = commentsData.data || commentsData.comments || [];
        if (apiComments.length > 0) {
          const currentComments = comments;
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
        }
      }
    } catch (err) {
      console.error("Failed to load board data", err);
    }
  }

  const loadSnapshots = async () => {
    try {
      const res = await fetch("/api/snapshots");
      if (!res.ok) return;
      const data = await res.json();
      const boardSnapshots = (data.snapshots || []).filter(
        (s: Snapshot) => s.boardId === boardId
      );
      setSnapshots(boardSnapshots);
    } catch (err) {
      console.error("Failed to load snapshots", err);
    }
  }

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

  // ⭐ UPDATED: Load crit sessions on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      loadTimelineSnapshots();
      await Promise.all([
        loadBoardData(), 
        loadSnapshots(), 
        loadBoardSnapshots(),
        loadCritSessions() // ⭐ NEW: Load crit sessions
      ]);
      setLoading(false);
    };
    load();
  }, [boardId]);

  useEffect(() => {
    setSelectedCardId(null);
  }, [selectedCritSessionId]); // ⭐ UPDATED: Clear selection when switching sessions

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!boardId || deletingComment) return;
    const ok = confirm("Delete this comment? This cannot be undone.");
    if (!ok) return;
    try {
      setComments(prev => prev.filter(c => c.id !== commentId));
      await deleteCommentApi(commentId);
      await refetchComments();
      updateBoardLastEdited(boardId, new Date().toISOString());
    } catch (err) {
      console.error("Failed to delete comment:", err);
      await refetchComments();
    }
  }, [boardId, deleteCommentApi, deletingComment, refetchComments]);

  const handlePostComment = async (note: string, opts?: { makeTask?: boolean; category?: string; elementId?: string | null; targetElementId?: string | null }) => {
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
      const newComment = await createCommentApi({
        boardId: boardId.trim(),
        text: textBody,
        authorName: authorName.trim(),
        author: authorName.trim(),
        targetElementId: eid,
        elementId: eid,
        category: cat,
        task: !!opts?.makeTask,
        isTask: !!opts?.makeTask,
        source: isCritActive ? "liveCrit" : "student",
        critSessionId: isCritActive ? currentCritSessionId : null,
      });
      if (newComment) {
        console.log("[handlePostComment] ✅ Comment created successfully in Supabase:", newComment.id);
        setComments(prev => [newComment, ...prev]);
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
              status: (t.status === "done" || t.status === "open") ? t.status : "open",
              createdAt: String(t.createdAt),
            }))
          );
        }
      } else {
        if (createCommentError) {
          console.error("[handlePostComment] ❌ Comment creation failed (hook error):", createCommentError);
          alert(`Error creating comment: ${createCommentError}`);
        } else {
          console.error("[handlePostComment] ❌ Comment creation returned null without error");
          alert("Error creating comment: Unknown error. Please try again.");
        }
      }
      updateBoardLastEdited(boardId, new Date().toISOString());
    } catch (err) {
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
      alert(`Error creating comment: ${errorMessage}`);
      await refetchComments();
    }
  };

  const handleSaveAudioComments = useCallback(async (
    comments: Array<{ text: string; category: Comment["category"] }>
  ) => {
    try {
      for (const commentData of comments) {
        await handlePostComment(commentData.text, {
          category: commentData.category,
        });
      }
      alert(`Successfully saved ${comments.length} comment${comments.length > 1 ? "s" : ""} to the board.`);
    } catch (error) {
      console.error("Failed to save comments:", error);
      alert("Failed to save some comments. Please try again.");
    }
  }, []);

  const handleSaveBoardSnapshot = async () => {
    try {
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
      await loadBoardSnapshots();
    } catch (err) {
      console.error("Error saving board snapshot", err);
    }
  }

  function handleLoadSnapshot(snapshot: TimelineSnapshot) {
    setCards(snapshot.cards);
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
    const now = new Date().toISOString();
    updateBoardLastEdited(boardId, now);
  }

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
    saveTasks(
      boardId,
      updatedTasks.map((task) => ({
        id: task.id,
        boardId: task.boardId,
        text: task.text,
        sourceCommentId: task.sourceCommentId,
        status: (task.status === "done" || task.status === "open") ? task.status : "open",
        createdAt: String(task.createdAt),
      }))
    );
    const now = new Date().toISOString();
    updateBoardLastEdited(boardId, now);
  }

  function handleToggleTask(taskId: string) {
    const updatedTasks: Task[] = tasks.map((task) =>
      task.id === taskId
        ? { ...task, status: (task.status === "open" ? "done" : "open") as "open" | "done" }
        : task
    );
    setTasks(updatedTasks);
    saveTasks(
      boardId,
      updatedTasks.map((task) => ({
        id: task.id,
        boardId: task.boardId,
        text: task.text,
        sourceCommentId: task.sourceCommentId,
        status: task.status as "open" | "done",
        createdAt: String(task.createdAt),
      }))
    );
    const now = new Date().toISOString();
    updateBoardLastEdited(boardId, now);
  }

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
    saveTasks(
      boardId,
      updatedTasks.map((task) => ({
        id: task.id,
        boardId: task.boardId,
        text: task.text,
        sourceCommentId: task.sourceCommentId,
        status: (task.status === "done" || task.status === "open") ? task.status : "open",
        createdAt: String(task.createdAt),
      }))
    );
    const now = new Date().toISOString();
    updateBoardLastEdited(boardId, now);
  }

  const handleViewSnapshot = (snapshotId: string) => {
    console.log("Viewing snapshot", snapshotId);
  };

  useEffect(() => {
    const storedBoards = getBoards();
    const storedBoard = storedBoards.find((b) => b.id === boardId);
    if (storedBoard?.title) {
      setBoardTitle(storedBoard.title);
    }
    const loadTitle = async () => {
      try {
        const res = await fetch(`/api/boards/${boardId}`);
        if (res.ok) {
          const responseData = await res.json();
          if (responseData.error) {
            console.error("API error loading board title:", responseData.error.message || responseData.error.details);
          } else if (responseData.data?.title) {
            setBoardTitle(responseData.data.title);
          }
        } else {
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

  const handleStartPresent = () => {
    setIsPresenting(true);
  };

  const handleEndPresent = () => {
    setIsPresenting(false);
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const handleCopyShareLink = async () => {
    const shareUrl = `${window.location.origin}/share/${boardId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  if (isPresenting) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <HeaderBar
          boardId={boardId}
          critSessions={critSessions}
          selectedCritSessionId={selectedCritSessionId}
          onCritSessionChange={handleSelectCritSession}
          onPresent={handleStartPresent}
          onShare={handleShare}
          onStartCrit={handleStartCrit}
          onEndCrit={handleEndCrit}
          isCritActive={isCritActive}
          isPresenting={isPresenting}
          onEndPresent={handleEndPresent}
          isStartingCrit={starting}
          isRecording={isRecording}
          recordingDuration={duration}
          audioBlob={audioBlob}
          onStartRecording={handleStartAudioRecording}
          onStopRecording={handleStopAudioRecording}
          onProcessAudio={handleProcessAudio}
          processingAudio={processingAudio}
          audioDevices={audioDevices}
          selectedMicId={selectedMicId}
          onMicChange={setSelectedMicId}
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
          <button
            onClick={() => setIsCritModalOpen(true)}
            className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full shadow-lg hover:bg-blue-700 transition"
          >
            Show Crit QR
          </button>
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

  if (isCritMode) {
    return (
      <div className="min-h-screen bg-white fixed inset-0 overflow-hidden">
        <div className="absolute top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-64 z-50">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Live Crit Mode
          </h3>
          <p className="text-xs text-gray-600 mb-4">
            Share this link so guest critics can leave feedback.
          </p>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Share Link
            </label>
            <div className="text-xs font-mono bg-gray-100 border border-gray-300 rounded px-2 py-1 break-all">
              pin.space/crit/{boardId}
            </div>
          </div>
          <div className="mb-4 flex justify-center">
            <div className="w-28 h-28 bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-[10px] text-gray-500">
              QR
            </div>
          </div>
          <button
            onClick={() => setIsCritMode(false)}
            className="w-full px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-900 transition"
          >
            Exit Crit Mode
          </button>
        </div>
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
          critSessions={critSessions}
          selectedCritSessionId={selectedCritSessionId}
          onCritSessionChange={handleSelectCritSession}
          onPresent={handleStartPresent}
          onShare={handleShare}
          onStartCrit={handleStartCrit}
          onEndCrit={handleEndCrit}
          isCritActive={isCritActive}
          isPresenting={isPresenting}
          onEndPresent={handleEndPresent}
          isStartingCrit={starting}
          isRecording={isRecording}
          recordingDuration={duration}
          audioBlob={audioBlob}
          onStartRecording={handleStartAudioRecording}
          onStopRecording={handleStopAudioRecording}
          onProcessAudio={handleProcessAudio}
          processingAudio={processingAudio}
          audioDevices={audioDevices}
          selectedMicId={selectedMicId}
          onMicChange={setSelectedMicId}
        />
        
        {/* ⭐ NEW: Show read-only banner when viewing past crit */}
        {isViewingPastCrit && selectedCritSession && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Viewing Crit Session from {new Date(selectedCritSession.started_at).toLocaleString()}
                </p>
                <p className="text-xs text-blue-700">
                  This is a read-only snapshot. Comments shown are from this crit session only.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleSelectCritSession(null)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition"
            >
              Return to Current Board
            </button>
          </div>
        )}
        
        <div className="flex flex-1 overflow-hidden relative">
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

          {pdfUploadProgress && (
            <PDFUploadProgress
              current={pdfUploadProgress.current}
              total={pdfUploadProgress.total}
              fileName={pdfUploadProgress.fileName}
            />
          )}

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
              const eid = commentData.elementId ?? activeElementId ?? null;
              if (!eid) {
                console.warn("[onCreateComment] ⚠️ No elementId provided - creating board-level comment");
              }
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
                  author: authorName.trim(),
                  targetElementId: eid,
                  elementId: eid,
                  category: cat,
                  task: !!commentData.task,
                  isTask: !!commentData.task,
                  x: commentData.x || null,
                  y: commentData.y || null,
                  source: isCritActive ? "liveCrit" : "student",
                  critSessionId: isCritActive ? currentCritSessionId : null,
                });
                if (newComment) {
                  console.log("[onCreateComment] ✅ Comment created successfully in Supabase:", newComment.id);
                  setComments(prev => [newComment, ...prev]);
                  setSelectedCommentId(newComment.id);
                  if (commentData.task) {
                    const newTask: Task = {
                      id: `task_${Date.now()}`,
                      boardId,
                      text: commentData.text,
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
                        status: (t.status === "done" || t.status === "open") ? t.status : "open",
                        createdAt: String(t.createdAt),
                      }))
                    );
                  }
                  updateBoardLastEdited(boardId, new Date().toISOString());
                } else {
                  if (createCommentError) {
                    console.error("[onCreateComment] ❌ Comment creation failed (hook error):", createCommentError);
                    alert(`Error creating comment: ${createCommentError}`);
                  } else {
                    console.error("[onCreateComment] ❌ Comment creation returned null without error");
                    alert("Error creating comment: Unknown error. Please try again.");
                  }
                }
              } catch (err) {
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
                await refetchComments();
              }
            }}
            boardId={boardId}
            currentUserName={currentUser.name}
            allowPinComments={false}
            showMinimalToolbar={false}
          />
          
          {!isPresenting && (() => {
            const pdfPages = elements.filter(el => 
              el.type === "image" && el.text?.startsWith("PDF Page")
            );
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
                        setSelectedIds([elementId]);
                        setSelectedElementId(elementId);
                        setSelectedCardId(elementId);
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
            viewingSnapshot={null}
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
              setComments(prev => prev.map(c => 
                c.id === updatedComment.id ? updatedComment : c
              ));
              await refetchComments();
              console.log("[board] Comment updated successfully:", updatedComment.id);
            }}
            onLoadSession={async (session) => {
              console.log("[board] Loading crit session:", session.id);
            }}
            composerAtTop={true}
          />}
        </div>

        <div className="bg-white border-t border-gray-200 px-8 py-4">
          <SnapshotsPanel
            snapshots={boardSnapshots}
            onViewSnapshot={handleViewSnapshot}
          />
        </div>
      </div>

      <AddCardModal
        isOpen={isAddCardModalOpen}
        onClose={() => setIsAddCardModalOpen(false)}
        onAddCard={handleAddCard}
      />

      <CritShareModal
        isOpen={isCritModalOpen}
        onClose={() => {
          setIsCritModalOpen(false);
        }}
        boardId={boardId}
        boardTitle={boardTitle}
        sessionId={sessionId}
      />

      <AudioCritResultsModal
        isOpen={showAudioResults}
        onClose={() => {
          setShowAudioResults(false);
          setAudioResults(null);
        }}
        results={audioResults}
        onSaveAsComments={handleSaveAudioComments}
        boardId={boardId}
      />

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

export default function BoardPage({ params }: BoardPageProps) {
  const { id: boardId } = use(params);
  return (
    <AuthGuard>
      <BoardPageContent boardId={boardId} />
    </AuthGuard>
  );
}