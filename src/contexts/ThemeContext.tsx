/**
 * Theme Context
 * 
 * Manages color schemes and accessibility settings:
 * - Light mode
 * - Dark mode
 * - High contrast mode (for accessibility)
 * 
 * Features:
 * - System preference detection
 * - Manual theme switching
 * - High contrast mode for WCAG AAA compliance
 * - Persistent theme preference
 * 
 * Future: Enhanced accessibility
 * - Custom color schemes
 * - Font size adjustments
 * - Motion reduction preferences
 * - Focus indicator customization
 */

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type ThemeMode = "light" | "dark" | "high-contrast";

export interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  isHighContrast: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * ThemeProvider - Provides theme context to the app
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Load theme from localStorage and system preference on mount
   */
  useEffect(() => {
    if (typeof window === "undefined") {
      setIsInitialized(true);
      return;
    }

    try {
      const stored = localStorage.getItem("pinspace_theme");
      if (stored && ["light", "dark", "high-contrast"].includes(stored)) {
        setThemeState(stored as ThemeMode);
      } else {
        // Check system preference
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setThemeState(prefersDark ? "dark" : "light");
      }
    } catch (err) {
      console.error("Error loading theme:", err);
      setThemeState("light");
    } finally {
      setIsInitialized(true);
    }
  }, []);

  /**
   * Apply theme to document
   */
  useEffect(() => {
    if (typeof document === "undefined" || !isInitialized) return;

    const root = document.documentElement;
    root.classList.remove("light", "dark", "high-contrast");
    root.classList.add(theme);
    
    // Set data attribute for CSS
    root.setAttribute("data-theme", theme);
  }, [theme, isInitialized]);

  /**
   * Set theme and persist to localStorage
   */
  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("pinspace_theme", newTheme);
      } catch (err) {
        console.error("Error saving theme:", err);
      }
    }
  }, []);

  /**
   * Toggle between light and dark (high contrast requires explicit selection)
   */
  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  const isHighContrast = theme === "high-contrast";

  const value: ThemeContextType = {
    theme,
    setTheme,
    toggleTheme,
    isHighContrast,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * useTheme - Hook to access theme context
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}







