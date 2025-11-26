/**
 * Accessibility Utilities Tests
 * 
 * Tests for color contrast checking and accessibility utilities.
 */

import {
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  getAccessibleTextColor,
  auditColorContrast,
  generateBoardCardAriaLabel,
} from "@/lib/a11y";

describe("a11y utilities", () => {
  describe("getContrastRatio", () => {
    it("calculates contrast ratio correctly", () => {
      // White on black should have high contrast
      const ratio = getContrastRatio("#FFFFFF", "#000000");
      expect(ratio).toBeGreaterThan(20);
    });

    it("calculates low contrast correctly", () => {
      // Similar colors should have low contrast
      const ratio = getContrastRatio("#FFFFFF", "#FEFEFE");
      expect(ratio).toBeLessThan(2);
    });
  });

  describe("meetsWCAGAA", () => {
    it("returns true for high contrast combinations", () => {
      expect(meetsWCAGAA("#000000", "#FFFFFF")).toBe(true);
      expect(meetsWCAGAA("#FFFFFF", "#000000")).toBe(true);
    });

    it("returns false for low contrast combinations", () => {
      expect(meetsWCAGAA("#CCCCCC", "#FFFFFF")).toBe(false);
    });

    it("uses lower threshold for large text", () => {
      // Large text needs 3:1 instead of 4.5:1
      expect(meetsWCAGAA("#666666", "#FFFFFF", true)).toBe(true);
      expect(meetsWCAGAA("#666666", "#FFFFFF", false)).toBe(false);
    });
  });

  describe("meetsWCAGAAA", () => {
    it("returns true for very high contrast", () => {
      expect(meetsWCAGAAA("#000000", "#FFFFFF")).toBe(true);
    });

    it("returns false for moderate contrast", () => {
      // 4.5:1 meets AA but not AAA (7:1)
      expect(meetsWCAGAAA("#666666", "#FFFFFF")).toBe(false);
    });
  });

  describe("getAccessibleTextColor", () => {
    it("returns white for dark backgrounds", () => {
      expect(getAccessibleTextColor("#000000")).toBe("#FFFFFF");
      expect(getAccessibleTextColor("#333333")).toBe("#FFFFFF");
    });

    it("returns black for light backgrounds", () => {
      expect(getAccessibleTextColor("#FFFFFF")).toBe("#000000");
      expect(getAccessibleTextColor("#CCCCCC")).toBe("#000000");
    });
  });

  describe("auditColorContrast", () => {
    it("returns audit results for color combinations", () => {
      const audits = auditColorContrast();
      expect(audits.length).toBeGreaterThan(0);
      expect(audits[0]).toHaveProperty("color1");
      expect(audits[0]).toHaveProperty("color2");
      expect(audits[0]).toHaveProperty("ratio");
      expect(audits[0]).toHaveProperty("meetsAA");
      expect(audits[0]).toHaveProperty("meetsAAA");
      expect(audits[0]).toHaveProperty("recommendation");
    });

    it("includes recommendations for improvements", () => {
      const audits = auditColorContrast();
      const audit = audits.find((a) => !a.meetsAA);
      if (audit) {
        expect(audit.recommendation).toContain("WCAG");
      }
    });
  });

  describe("generateBoardCardAriaLabel", () => {
    it("generates label with all information", () => {
      const label = generateBoardCardAriaLabel(
        "Test Board",
        "John Doe",
        "MIT",
        "2h ago"
      );
      expect(label).toContain("Test Board");
      expect(label).toContain("John Doe");
      expect(label).toContain("MIT");
      expect(label).toContain("2h ago");
    });

    it("generates label with partial information", () => {
      const label = generateBoardCardAriaLabel("Test Board");
      expect(label).toContain("Test Board");
      expect(label).toContain("Click to view");
    });

    it("handles missing optional fields", () => {
      const label = generateBoardCardAriaLabel(
        "Test Board",
        undefined,
        undefined,
        "2h ago"
      );
      expect(label).toContain("Test Board");
      expect(label).toContain("2h ago");
    });
  });
});






