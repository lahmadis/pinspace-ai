// src/lib/eventBus.ts
export type SelectionPayload = { boardId: string; elementId: string | null };

export function emitSelection(p: SelectionPayload) {
  window.dispatchEvent(new CustomEvent("pinspace:selection", { detail: p }));
}

export function onSelection(handler: (p: SelectionPayload) => void) {
  const fn = (e: Event) => handler((e as CustomEvent).detail as SelectionPayload);
  window.addEventListener("pinspace:selection", fn);
  return () => window.removeEventListener("pinspace:selection", fn);
}


