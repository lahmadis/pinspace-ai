/**
 * Keyboard Navigation Hook
 * 
 * Provides keyboard navigation and shortcuts for board interactions.
 * Implements WCAG 2.1 keyboard accessibility requirements.
 * 
 * Features:
 * - Tab navigation between interactive elements
 * - Arrow key navigation for canvas elements
 * - Keyboard shortcuts for tools and actions
 * - Focus management
 * - Escape key handling
 * 
 * Future: Enhanced keyboard support
 * - Custom keyboard shortcuts
 * - Keyboard shortcut help dialog
 * - Focus trap for modals
 * - Skip links for main content
 */

import { useEffect, useCallback, useRef } from "react";

export interface KeyboardShortcuts {
  [key: string]: () => void;
}

export interface UseKeyboardNavigationOptions {
  shortcuts?: KeyboardShortcuts;
  onEscape?: () => void;
  onEnter?: () => void;
  enabled?: boolean;
  excludeInputs?: boolean; // Don't trigger when typing in inputs
}

/**
 * useKeyboardNavigation Hook
 * 
 * Handles keyboard navigation and shortcuts.
 */
export function useKeyboardNavigation(options: UseKeyboardNavigationOptions = {}) {
  const {
    shortcuts = {},
    onEscape,
    onEnter,
    enabled = true,
    excludeInputs = true,
  } = options;

  const shortcutsRef = useRef(shortcuts);
  const onEscapeRef = useRef(onEscape);
  const onEnterRef = useRef(onEnter);

  // Keep refs in sync
  useEffect(() => {
    shortcutsRef.current = shortcuts;
    onEscapeRef.current = onEscape;
    onEnterRef.current = onEnter;
  }, [shortcuts, onEscape, onEnter]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input
      if (excludeInputs) {
        const activeElement = document.activeElement;
        const isTyping =
          activeElement?.tagName === "INPUT" ||
          activeElement?.tagName === "TEXTAREA" ||
          activeElement?.getAttribute("contenteditable") === "true";
        
        if (isTyping) {
          // Allow some shortcuts even when typing (e.g., Escape)
          if (e.key === "Escape" && onEscapeRef.current) {
            e.preventDefault();
            onEscapeRef.current();
          }
          return;
        }
      }

      // Handle Escape
      if (e.key === "Escape" && onEscapeRef.current) {
        e.preventDefault();
        onEscapeRef.current();
        return;
      }

      // Handle Enter
      if (e.key === "Enter" && onEnterRef.current && !e.shiftKey) {
        // Don't prevent default if it's a form submission
        if (document.activeElement?.tagName !== "BUTTON") {
          e.preventDefault();
          onEnterRef.current();
        }
        return;
      }

      // Handle shortcuts
      const key = getShortcutKey(e);
      const handler = shortcutsRef.current[key];
      if (handler) {
        e.preventDefault();
        handler();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, excludeInputs]);

  /**
   * Get shortcut key string from keyboard event
   */
  const getShortcutKey = useCallback((e: KeyboardEvent): string => {
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push("mod");
    if (e.shiftKey) parts.push("shift");
    if (e.altKey) parts.push("alt");
    parts.push(e.key.toLowerCase());
    return parts.join("+");
  }, []);

  return { getShortcutKey };
}

/**
 * Focus management utilities
 */
export function useFocusManagement() {
  /**
   * Trap focus within an element
   */
  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener("keydown", handleTab);
    firstElement?.focus();

    return () => {
      container.removeEventListener("keydown", handleTab);
    };
  }, []);

  /**
   * Announce to screen readers
   */
  const announce = useCallback((message: string, priority: "polite" | "assertive" = "polite") => {
    if (typeof window === "undefined") return;

    const announcement = document.createElement("div");
    announcement.setAttribute("role", "status");
    announcement.setAttribute("aria-live", priority);
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "sr-only"; // Screen reader only
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  return { trapFocus, announce };
}











