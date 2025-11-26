import { useEffect, useRef, useState } from "react";
import { onSelection } from "@/lib/eventBus";

/** Tracks the currently selected elementId (canonical) for a board. */
export function useAttachedElement(boardId: string) {
  const [attachedEl, setAttachedEl] = useState<string | null>(null);
  const boardIdRef = useRef(boardId);
  boardIdRef.current = boardId;

  // Subscribe once; guard with ref so hook order is stable.
  useEffect(() => {
    return onSelection(({ boardId, elementId }) => {
      if (boardId === boardIdRef.current) setAttachedEl(elementId ?? null);
    });
  }, []);

  return [attachedEl, setAttachedEl] as const;
}


