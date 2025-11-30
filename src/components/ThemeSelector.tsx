/**
 * Theme Selector Component
 * 
 * Allows users to switch between light, dark, and high contrast themes.
 * Provides accessibility improvements for users with visual impairments.
 * 
 * Features:
 * - Light mode
 * - Dark mode
 * - High contrast mode (WCAG AAA compliance)
 * - Persistent theme preference
 * - Keyboard accessible
 * 
 * Future: Enhanced accessibility
 * - Font size adjustments
 * - Motion reduction preferences
 * - Custom color schemes
 */

"use client";

import React from "react";
import { useTheme } from "@/contexts/ThemeContext";

export default function ThemeSelector(): JSX.Element {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Theme selection">
      <label htmlFor="theme-select" className="sr-only">
        Select color theme
      </label>
      <select
        id="theme-select"
        value={theme}
        onChange={(e) => setTheme(e.target.value as "light" | "dark" | "high-contrast")}
        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm focus-visible:outline-2 focus-visible:outline-blue-500"
        aria-label="Select color theme"
        title="Select color theme (Light, Dark, or High Contrast)"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="high-contrast">High Contrast</option>
      </select>
      <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
        {theme === "high-contrast" && "♿"}
      </span>
    </div>
  );
}










