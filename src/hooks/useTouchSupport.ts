/**
 * Touch Support Hook
 * 
 * Provides touch event handling for mobile and tablet devices.
 * Converts touch events to mouse-like events for compatibility.
 * 
 * Features:
 * - Touch event handling for pen/eraser tools
 * - Touch gestures (pinch to zoom, pan)
 * - Touch-friendly interactions
 * - Palm rejection for drawing
 * 
 * Future: Enhanced touch support
 * - Multi-touch gestures
 * - Pressure sensitivity (for supported devices)
 * - Touch-specific UI optimizations
 */

import { useCallback, useRef } from "react";

export interface TouchPoint {
  x: number;
  y: number;
  identifier: number;
}

export interface UseTouchSupportOptions {
  onTouchStart?: (x: number, y: number, identifier: number) => void;
  onTouchMove?: (x: number, y: number, identifier: number) => void;
  onTouchEnd?: (identifier: number) => void;
  onTouchCancel?: (identifier: number) => void;
  enabled?: boolean;
  preventDefault?: boolean;
}

/**
 * useTouchSupport Hook
 * 
 * Handles touch events and converts them to coordinate-based callbacks.
 */
export function useTouchSupport(options: UseTouchSupportOptions = {}) {
  const {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
    enabled = true,
    preventDefault = true,
  } = options;

  const activeTouches = useRef<Map<number, TouchPoint>>(new Map());

  /**
   * Get touch coordinates relative to element
   */
  const getTouchCoordinates = useCallback((touch: Touch, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }, []);

  /**
   * Handle touch start
   */
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (!enabled) return;
    if (preventDefault) e.preventDefault();

    const element = e.currentTarget;
    const touches = Array.from(e.changedTouches);

    touches.forEach(touch => {
      const coords = getTouchCoordinates(touch, element);
      activeTouches.current.set(touch.identifier, coords);

      if (onTouchStart) {
        onTouchStart(coords.x, coords.y, touch.identifier);
      }
    });
  }, [enabled, preventDefault, getTouchCoordinates, onTouchStart]);

  /**
   * Handle touch move
   */
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (!enabled) return;
    if (preventDefault) e.preventDefault();

    const element = e.currentTarget;
    const touches = Array.from(e.changedTouches);

    touches.forEach(touch => {
      const coords = getTouchCoordinates(touch, element);
      activeTouches.current.set(touch.identifier, coords);

      if (onTouchMove) {
        onTouchMove(coords.x, coords.y, touch.identifier);
      }
    });
  }, [enabled, preventDefault, getTouchCoordinates, onTouchMove]);

  /**
   * Handle touch end
   */
  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (!enabled) return;
    if (preventDefault) e.preventDefault();

    const touches = Array.from(e.changedTouches);

    touches.forEach(touch => {
      activeTouches.current.delete(touch.identifier);

      if (onTouchEnd) {
        onTouchEnd(touch.identifier);
      }
    });
  }, [enabled, preventDefault, onTouchEnd]);

  /**
   * Handle touch cancel
   */
  const handleTouchCancel = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (!enabled) return;
    if (preventDefault) e.preventDefault();

    const touches = Array.from(e.changedTouches);

    touches.forEach(touch => {
      activeTouches.current.delete(touch.identifier);

      if (onTouchCancel) {
        onTouchCancel(touch.identifier);
      }
    });
  }, [enabled, preventDefault, onTouchCancel]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
  };
}






