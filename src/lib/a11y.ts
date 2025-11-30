/**
 * Accessibility Utilities
 * 
 * Helper functions for accessibility features:
 * - Color contrast checking
 * - ARIA label generation
 * - Keyboard navigation helpers
 * - Focus management
 */

/**
 * Calculate relative luminance for a color (WCAG formula)
 * Used for contrast ratio calculations
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate contrast ratio between two colors (WCAG)
 * Returns a value between 1 and 21
 * WCAG AA requires 4.5:1 for normal text, 3:1 for large text
 * WCAG AAA requires 7:1 for normal text, 4.5:1 for large text
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standards
 * @param color1 - Foreground color (hex)
 * @param color2 - Background color (hex)
 * @param isLargeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns true if meets AA standards
 */
export function meetsWCAGAA(
  color1: string,
  color2: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(color1, color2);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG AAA standards
 */
export function meetsWCAGAAA(
  color1: string,
  color2: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(color1, color2);
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Get accessible text color for a background
 * Returns white or black based on contrast
 */
export function getAccessibleTextColor(backgroundColor: string): string {
  const whiteContrast = getContrastRatio("#FFFFFF", backgroundColor);
  const blackContrast = getContrastRatio("#000000", backgroundColor);
  
  return whiteContrast > blackContrast ? "#FFFFFF" : "#000000";
}

/**
 * Color contrast audit results
 */
export interface ContrastAudit {
  color1: string;
  color2: string;
  ratio: number;
  meetsAA: boolean;
  meetsAAA: boolean;
  recommendation?: string;
}

/**
 * Audit color combinations used in the app
 * Returns recommendations for improvements
 */
export function auditColorContrast(): ContrastAudit[] {
  const audits: ContrastAudit[] = [];
  
  // Primary colors
  const primaryBlue = "#2563EB"; // blue-600
  const primaryBlueHover = "#1D4ED8"; // blue-700
  const white = "#FFFFFF";
  const gray900 = "#111827"; // gray-900
  const gray800 = "#1F2937"; // gray-800
  const gray700 = "#374151"; // gray-700
  const gray600 = "#4B5563"; // gray-600
  const gray500 = "#6B7280"; // gray-500
  const gray400 = "#9CA3AF"; // gray-400
  const gray300 = "#D1D5DB"; // gray-300
  const gray200 = "#E5E7EB"; // gray-200
  const gray100 = "#F3F4F6"; // gray-100
  const gray50 = "#F9FAFB"; // gray-50
  const yellow400 = "#FACC15"; // yellow-400
  const yellow500 = "#EAB308"; // yellow-500
  const yellow900 = "#713F12"; // yellow-900
  
  // Test combinations
  const combinations: Array<[string, string, string]> = [
    // Primary button text
    [white, primaryBlue, "Primary button text on blue background"],
    [white, primaryBlueHover, "Primary button text on blue hover"],
    
    // Body text
    [gray900, white, "Body text on white background"],
    [gray700, white, "Secondary text on white background"],
    [gray600, white, "Tertiary text on white background"],
    [gray500, white, "Placeholder text on white background"],
    
    // Dark mode text
    [white, gray800, "Text on dark background"],
    [gray300, gray800, "Secondary text on dark background"],
    [gray400, gray800, "Tertiary text on dark background"],
    
    // Favorite button
    [yellow900, yellow400, "Favorite button text on yellow background"],
    [yellow900, yellow500, "Favorite button text on yellow background (dark)"],
    
    // Borders and backgrounds
    [gray900, gray200, "Text on light gray background"],
    [gray700, gray100, "Text on very light gray background"],
  ];
  
  for (const [fg, bg, description] of combinations) {
    const ratio = getContrastRatio(fg, bg);
    const meetsAA = meetsWCAGAA(fg, bg);
    const meetsAAA = meetsWCAGAAA(fg, bg);
    
    let recommendation: string | undefined;
    if (!meetsAA) {
      recommendation = `⚠️ Does not meet WCAG AA. Consider using a darker/lighter color or increasing font size.`;
    } else if (!meetsAAA) {
      recommendation = `✓ Meets WCAG AA but not AAA. Consider improving for better accessibility.`;
    } else {
      recommendation = `✓✓ Meets WCAG AAA standards.`;
    }
    
    audits.push({
      color1: fg,
      color2: bg,
      ratio: Math.round(ratio * 100) / 100,
      meetsAA,
      meetsAAA,
      recommendation: `${description}: ${recommendation} (Ratio: ${Math.round(ratio * 100) / 100}:1)`,
    });
  }
  
  return audits;
}

/**
 * Generate ARIA label for board card
 */
export function generateBoardCardAriaLabel(
  title: string,
  author?: string,
  institution?: string,
  timeAgo?: string
): string {
  const parts: string[] = [title];
  
  if (author) parts.push(`by ${author}`);
  if (institution) parts.push(`from ${institution}`);
  if (timeAgo) parts.push(`last edited ${timeAgo}`);
  
  parts.push("Click to view board details");
  
  return parts.join(", ");
}

/**
 * Focus management utilities
 */
export class FocusManager {
  /**
   * Trap focus within an element (for modals)
   */
  static trapFocus(element: HTMLElement): () => void {
    const focusableElements = element.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
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
    
    element.addEventListener("keydown", handleTab);
    firstElement?.focus();
    
    return () => {
      element.removeEventListener("keydown", handleTab);
    };
  }
  
  /**
   * Return focus to previous element (for modals)
   */
  static returnFocus(previousElement: HTMLElement | null): void {
    previousElement?.focus();
  }
}










