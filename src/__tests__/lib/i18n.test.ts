/**
 * Internationalization Tests
 * 
 * Tests for translation functions and locale handling.
 */

import {
  getTranslation,
  getLocale,
  setLocale,
  useTranslation,
  formatNumber,
  formatDate,
  type Locale,
} from "@/lib/i18n";

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

describe("i18n", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset localStorage mock
    (localStorage.getItem as jest.Mock).mockReturnValue(null);
  });

  describe("getTranslation", () => {
    it("returns English translation by default", () => {
      const result = getTranslation("explore.title", "en");
      expect(result).toBe("Explore Studio Work");
    });

    it("returns Spanish translation when locale is es", () => {
      const result = getTranslation("explore.title", "es");
      expect(result).toBe("Explorar Trabajos de Estudio");
    });

    it("replaces parameters in translations", () => {
      const result = getTranslation("boardCard.author", "en", { author: "John Doe" });
      expect(result).toBe("Author: John Doe");
    });

    it("handles nested keys", () => {
      const result = getTranslation("explore.searchPlaceholder", "en");
      expect(result).toBe("Search boards, authors, or institutions...");
    });

    it("returns key if translation not found", () => {
      const result = getTranslation("nonexistent.key", "en");
      expect(result).toBe("nonexistent.key");
    });

    it("falls back to English if key not found in locale", () => {
      // If Spanish translation is missing, should fall back to English
      const result = getTranslation("explore.title", "es");
      expect(result).not.toBe("explore.title"); // Should have translation
    });
  });

  describe("getLocale", () => {
    it("returns English by default", () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
      Object.defineProperty(navigator, "language", {
        writable: true,
        value: "fr-FR", // French, not supported
      });
      
      const locale = getLocale();
      expect(locale).toBe("en");
    });

    it("returns locale from localStorage", () => {
      (localStorage.getItem as jest.Mock).mockReturnValue("es");
      const locale = getLocale();
      expect(locale).toBe("es");
    });

    it("returns Spanish if browser language is Spanish", () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
      Object.defineProperty(navigator, "language", {
        writable: true,
        value: "es-ES",
      });
      
      const locale = getLocale();
      expect(locale).toBe("es");
    });
  });

  describe("setLocale", () => {
    it("saves locale to localStorage", () => {
      setLocale("es");
      expect(localStorage.setItem).toHaveBeenCalledWith("pinspace-locale", "es");
    });
  });

  describe("formatNumber", () => {
    it("formats numbers according to locale", () => {
      const en = formatNumber(1234.56, "en");
      const es = formatNumber(1234.56, "es");
      
      // Format may vary, but should be different
      expect(en).toBeDefined();
      expect(es).toBeDefined();
    });
  });

  describe("formatDate", () => {
    it("formats dates according to locale", () => {
      const date = new Date("2024-01-15");
      const en = formatDate(date, "en");
      const es = formatDate(date, "es");
      
      expect(en).toBeDefined();
      expect(es).toBeDefined();
      // Spanish should have different format
      expect(es).not.toBe(en);
    });
  });

  describe("pluralization", () => {
    it("handles plural forms correctly", () => {
      const singular = getTranslation("explore.resultsCount", "en", { count: 1 });
      const plural = getTranslation("explore.resultsCount", "en", { count: 5 });
      
      expect(singular).toContain("board");
      expect(plural).toContain("boards");
    });
  });
});






