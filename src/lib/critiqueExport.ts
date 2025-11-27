/**
 * Critique Export Utilities
 * 
 * Generates critique summaries and exports for boards.
 * Supports PDF, HTML, and JSON formats.
 * 
 * Features:
 * - Generate critique summary
 * - Export to PDF
 * - Export to HTML
 * - Export to JSON
 * - Filter by status, priority, category
 * 
 * Future: LMS Integration
 * - Grade export
 * - Rubric integration
 * - Peer review reports
 * - Automated feedback generation
 */

import type { CritiquePoint, CommentThread, AnnotationShape, CritiqueSummary } from "@/types/annotation";

/**
 * Generate critique summary
 */
export function generateCritiqueSummary(
  boardId: string,
  boardTitle: string,
  critiquePoints: CritiquePoint[],
  commentThreads: CommentThread[],
  annotations: AnnotationShape[]
): CritiqueSummary {
  const openPoints = critiquePoints.filter(p => p.status === "open");
  const resolvedPoints = critiquePoints.filter(p => p.status === "resolved");
  const addressedPoints = critiquePoints.filter(p => p.status === "addressed");

  // Statistics by category
  const byCategory: Record<string, number> = {};
  critiquePoints.forEach(point => {
    if (point.category) {
      byCategory[point.category] = (byCategory[point.category] || 0) + 1;
    }
  });

  // Statistics by priority
  const byPriority: Record<string, number> = {};
  critiquePoints.forEach(point => {
    const priority = point.priority || "medium";
    byPriority[priority] = (byPriority[priority] || 0) + 1;
  });

  // Statistics by status
  const byStatus: Record<string, number> = {};
  critiquePoints.forEach(point => {
    byStatus[point.status] = (byStatus[point.status] || 0) + 1;
  });

  return {
    boardId,
    boardTitle,
    generatedAt: Date.now(),
    totalPoints: critiquePoints.length,
    openPoints: openPoints.length,
    resolvedPoints: resolvedPoints.length,
    addressedPoints: addressedPoints.length,
    critiquePoints,
    commentThreads,
    annotations,
    byCategory,
    byPriority,
    byStatus,
  };
}

/**
 * Export summary to JSON
 */
export function exportSummaryToJSON(summary: CritiqueSummary): string {
  return JSON.stringify(summary, null, 2);
}

/**
 * Export summary to HTML
 */
export function exportSummaryToHTML(summary: CritiqueSummary): string {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Critique Summary - ${summary.boardTitle}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 30px; }
    .stats { display: flex; gap: 20px; margin: 20px 0; }
    .stat { padding: 10px; background: #f0f0f0; border-radius: 5px; }
    .point { margin: 20px 0; padding: 15px; border-left: 4px solid #3b82f6; background: #f9f9f9; }
    .point.resolved { border-left-color: #10b981; }
    .point.addressed { border-left-color: #3b82f6; }
    .point.open { border-left-color: #ef4444; }
    .metadata { font-size: 0.9em; color: #666; margin-top: 10px; }
    .comments { margin-top: 10px; padding-left: 20px; }
    .comment { margin: 5px 0; padding: 5px; background: #fff; }
  </style>
</head>
<body>
  <h1>Critique Summary: ${summary.boardTitle}</h1>
  <p>Generated: ${new Date(summary.generatedAt).toLocaleString()}</p>
  
  <div class="stats">
    <div class="stat">
      <strong>Total Points:</strong> ${summary.totalPoints}
    </div>
    <div class="stat">
      <strong>Open:</strong> ${summary.openPoints}
    </div>
    <div class="stat">
      <strong>Resolved:</strong> ${summary.resolvedPoints}
    </div>
    <div class="stat">
      <strong>Addressed:</strong> ${summary.addressedPoints}
    </div>
  </div>

  <h2>Critique Points</h2>
  ${summary.critiquePoints.map(point => `
    <div class="point ${point.status}">
      <h3>Point #${point.number}${point.title ? `: ${point.title}` : ""}</h3>
      <p>${point.description}</p>
      <div class="metadata">
        Status: ${point.status} | Priority: ${point.priority || "medium"} | Category: ${point.category || "none"}
        <br>
        Created: ${new Date(point.createdAt).toLocaleString()} by ${point.createdBy}
        ${point.resolvedAt ? `<br>Resolved: ${new Date(point.resolvedAt).toLocaleString()} by ${point.resolvedBy}` : ""}
      </div>
      ${summary.commentThreads.filter(t => t.critiquePointId === point.id).map(thread => `
        <div class="comments">
          <strong>Comments:</strong>
          ${thread.comments.map(comment => `
            <div class="comment">
              <strong>${comment.createdBy}</strong> (${new Date(comment.createdAt).toLocaleString()}):
              <p>${comment.content}</p>
            </div>
          `).join("")}
        </div>
      `).join("")}
    </div>
  `).join("")}
</body>
</html>
  `;

  return html.trim();
}

/**
 * Download file
 */
export function downloadFile(content: string, filename: string, mimeType: string = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}








