/**
 * Testing utilities and helpers
 * 
 * Common utilities for writing tests more easily and consistently.
 */

import React from "react";
import { render, RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";

/**
 * Custom render function that includes any providers
 * 
 * Use this instead of the default render from @testing-library/react
 * if you need to wrap components with providers (e.g., ThemeProvider, Router).
 * 
 * @example
 * ```tsx
 * const { getByText } = renderWithProviders(<MyComponent />);
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  // Add any providers here if needed (e.g., ThemeProvider, Router)
  // For now, we just use the default render
  return render(ui, options);
}

/**
 * Wait for a condition to be true
 * 
 * Useful for waiting for async operations or state updates.
 * 
 * @example
 * ```tsx
 * await waitForCondition(() => {
 *   expect(queryByText("Loading")).not.toBeInTheDocument();
 * });
 * ```
 */
export async function waitForCondition(
  condition: () => boolean | void,
  timeout: number = 5000
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      if (condition()) {
        return;
      }
    } catch (error) {
      // Condition not met yet, continue waiting
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Mock localStorage helper
 */
export function mockLocalStorage() {
  const store: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
  };
}

/**
 * Create a mock board for testing
 */
export function createMockBoard(overrides?: Partial<import("@/types/boards").BoardCardData>): import("@/types/boards").BoardCardData {
  return {
    id: "test-board-1",
    title: "Test Board",
    authorName: "Test Author",
    institution: "Test Institution",
    timeAgo: "1h ago",
    previewImage: "https://example.com/image.jpg",
    coverColor: "#DBEAFE",
    ...overrides,
  };
}

// Re-export everything from @testing-library/react for convenience
export * from "@testing-library/react";








