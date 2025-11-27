/**
 * Annotation Types
 * 
 * Defines types for annotation and critique tools:
 * - Shapes (rectangle, ellipse, arrow, text box)
 * - Critique points with threading
 * - Comment threads
 * - Highlights and links
 * 
 * Future: LMS Integration
 * - Grade associations
 * - Rubric connections
 * - Peer review assignments
 */

export type AnnotationType = "rectangle" | "ellipse" | "arrow" | "textbox" | "highlight";

export interface AnnotationShape {
  id: string;
  type: AnnotationType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  fill?: string;
  opacity?: number;
  // For arrows
  endX?: number;
  endY?: number;
  // For text boxes
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  // For highlights
  targetElementId?: string; // Link to board element
  // Metadata
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface CritiquePoint {
  id: string;
  boardId: string;
  x: number;
  y: number;
  number: number; // Sequential number for this board
  title?: string;
  description: string;
  status: "open" | "resolved" | "addressed";
  priority?: "low" | "medium" | "high";
  category?: string; // e.g., "design", "technical", "content"
  // Threading
  parentId?: string; // For replies
  threadId?: string; // Group related points
  // Links
  linkedElementIds: string[]; // Elements this critique references
  linkedAnnotationIds: string[]; // Annotations this critique references
  // Metadata
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  resolvedBy?: string;
  resolvedAt?: number;
}

export interface CommentThread {
  id: string;
  critiquePointId?: string; // If part of a critique point
  elementId?: string; // If attached to a board element
  annotationId?: string; // If attached to an annotation
  title?: string;
  comments: ThreadComment[];
  status: "active" | "resolved" | "archived";
  // Metadata
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface ThreadComment {
  id: string;
  threadId: string;
  parentId?: string; // For nested replies
  content: string;
  // Metadata
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  editedAt?: number;
  isEdited?: boolean;
}

export interface CritiqueSummary {
  boardId: string;
  boardTitle: string;
  generatedAt: number;
  totalPoints: number;
  openPoints: number;
  resolvedPoints: number;
  addressedPoints: number;
  critiquePoints: CritiquePoint[];
  commentThreads: CommentThread[];
  annotations: AnnotationShape[];
  // Statistics
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
}








