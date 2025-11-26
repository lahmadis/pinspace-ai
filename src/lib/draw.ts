// src/lib/draw.ts
export type DrawTool = "none" | "pen" | "eraser";
export type PenColor = string;
export type PenSize = 2 | 4 | 8;

export const PEN_COLORS: PenColor[] = ["#111111", "#ef4444", "#eab308"];
export const PEN_SIZES = [2, 4, 8] as const;
