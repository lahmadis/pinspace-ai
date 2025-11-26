// Shared canvas helper functions
// These utilities are used by both student canvas and Live Crit canvas

/**
 * Convert client coordinates to board coordinates
 * @param clientX - Mouse/client X coordinate
 * @param clientY - Mouse/client Y coordinate
 * @param rect - Canvas element's bounding rect
 * @param pan - Current pan offset {x, y}
 * @param zoom - Current zoom level
 * @returns Board coordinates {x, y}
 */
export function toBoardPoint(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  pan: { x: number; y: number },
  zoom: number
): { x: number; y: number } {
  return {
    x: (clientX - rect.left - pan.x) / zoom,
    y: (clientY - rect.top - pan.y) / zoom,
  };
}

/**
 * Normalize a rectangle from two points (ensures top-left origin)
 * @param x0 - First point X
 * @param y0 - First point Y
 * @param x1 - Second point X
 * @param y1 - Second point Y
 * @param minW - Minimum width (default 80)
 * @param minH - Minimum height (default 60)
 * @returns Normalized rectangle {left, top, width, height}
 */
export function makeRect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  minW: number = 80,
  minH: number = 60
): { left: number; top: number; width: number; height: number } {
  const left = Math.min(x0, x1);
  const top = Math.min(y0, y1);
  const width = Math.max(Math.abs(x1 - x0), minW);
  const height = Math.max(Math.abs(y1 - y0), minH);
  return { left, top, width, height };
}

/**
 * Normalize a drag box for marquee/creation (returns bounds with w/h)
 * @param a - Start point {x, y}
 * @param b - End point {x, y}
 * @returns Normalized rect {x, y, w, h, x2, y2}
 */
export function normalizeRect(a: { x: number; y: number }, b: { x: number; y: number }) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const w = Math.abs(a.x - b.x);
  const h = Math.abs(a.y - b.y);
  return { x, y, w, h, x2: x + w, y2: y + h };
}

/**
 * Get element's axis-aligned bounding box
 * @param el - Element with x, y, width, height
 * @returns Bounding box {x, y, x2, y2}
 */
export function getElementAABB(el: { x: number; y: number; width?: number; height?: number }) {
  const x = el.x;
  const y = el.y;
  const w = el.width ?? 0;
  const h = el.height ?? 0;
  return { x, y, x2: x + w, y2: y + h };
}

/**
 * Check if two rectangles intersect
 * @param R - First rectangle {x, y, x2, y2}
 * @param E - Second rectangle {x, y, x2, y2}
 * @returns True if rectangles intersect
 */
export function rectsIntersect(
  R: { x: number; y: number; x2: number; y2: number },
  E: { x: number; y: number; x2: number; y2: number }
): boolean {
  return !(R.x2 < E.x || R.x > E.x2 || R.y2 < E.y || R.y > E.y2);
}



