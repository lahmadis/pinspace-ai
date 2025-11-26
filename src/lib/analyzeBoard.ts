// Board analysis utility for generating crit summaries
// This uses mock/simplified logic - not connected to external AI APIs

import type { Comment, BoardSnapshot, BoardData } from "@/types";

export interface CritSummary {
  topIssues: string[];
  evolutionNote: string;
}

// Generate a crit summary from board comments and snapshots
export function generateCritSummary(board: {
  comments?: Comment[];
  snapshots?: BoardSnapshot[];
}): CritSummary {
  const comments = board.comments || [];
  const snapshots = board.snapshots || [];

  // Default fallback if no data
  if (comments.length === 0 && snapshots.length === 0) {
    return {
      topIssues: ["Not enough feedback yet."],
      evolutionNote: "Add comments to generate a crit summary.",
    };
  }

  // Extract top issues from comments
  const topIssues: string[] = [];
  
  if (comments.length > 0) {
    // Simple keyword extraction from comments
    const commentTexts = comments.map((c) => c.text.toLowerCase());
    
    // Look for common crit themes
    const issues: string[] = [];
    
    // Circulation issues
    if (commentTexts.some((t) => t.includes("circulation") || t.includes("flow"))) {
      issues.push("Circulation isn't clearly resolved at the connection points.");
    }
    
    // Structure issues
    if (commentTexts.some((t) => t.includes("structure") || t.includes("holding") || t.includes("support"))) {
      issues.push("Structural approach isn't clearly defined.");
    }
    
    // Facade/surface issues
    if (commentTexts.some((t) => t.includes("facade") || t.includes("surface") || t.includes("skin"))) {
      issues.push("Facade intent isn't tied to structure.");
    }
    
    // Section/plan issues
    if (commentTexts.some((t) => t.includes("section") || t.includes("plan") || t.includes("threshold"))) {
      issues.push("Section doesn't explain public vs private threshold.");
    }
    
    // Material issues
    if (commentTexts.some((t) => t.includes("material") || t.includes("materiality"))) {
      issues.push("Material selection needs further justification.");
    }
    
    // Generic issues from comment count
    if (issues.length === 0 && comments.length > 0) {
      // Extract general concerns from comments
      const latestComments = comments.slice(0, 3);
      latestComments.forEach((comment) => {
        if (comment.text.length > 20) {
          // Create issue from comment text (simplified)
          const issueText = comment.text
            .split(".")
            .filter((s) => s.trim().length > 20)
            .slice(0, 1)
            .map((s) => s.trim() + ".")
            .join(" ");
          
          if (issueText) {
            issues.push(issueText);
          }
        }
      });
    }
    
    // Default issues if none found
    if (issues.length === 0) {
      issues.push("Review the comments for specific feedback.");
    }
    
    // Limit to top 3 issues
    topIssues.push(...issues.slice(0, 3));
  } else {
    topIssues.push("No comments yet to analyze.");
  }

  // Generate evolution note from snapshots
  let evolutionNote = "";
  
  if (snapshots.length > 0) {
    // Get 2 most recent snapshots
    const recentSnapshots = snapshots
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 2);
    
    const snapshotCount = snapshots.length;
    
    if (recentSnapshots.length >= 2) {
      const oldSnapshot = recentSnapshots[1];
      const newSnapshot = recentSnapshots[0];
      
      const oldCardCount = oldSnapshot.cards.length;
      const newCardCount = newSnapshot.cards.length;
      
      // Simple evolution detection
      if (newCardCount > oldCardCount) {
        evolutionNote = `You've added ${newCardCount - oldCardCount} new element${
          newCardCount - oldCardCount > 1 ? "s" : ""
        } since the last snapshot. The design is evolving with ${newCardCount} total elements.`;
      } else if (newCardCount < oldCardCount) {
        evolutionNote = `You've refined the design by removing ${oldCardCount - newCardCount} element${
          oldCardCount - newCardCount > 1 ? "s" : ""
        }. The current snapshot has ${newCardCount} elements.`;
      } else {
        evolutionNote = `You have ${snapshotCount} snapshot${snapshotCount > 1 ? "s" : ""} showing your design evolution. The design remains consistent with ${newCardCount} elements.`;
      }
    } else if (snapshots.length === 1) {
      const cardCount = snapshots[0].cards.length;
      evolutionNote = `You have 1 snapshot with ${cardCount} element${cardCount > 1 ? "s" : ""}.`;
    } else {
      evolutionNote = `You have ${snapshotCount} snapshot${snapshotCount > 1 ? "s" : ""} of your work.`;
    }
  } else {
    evolutionNote = "No snapshots yet.";
  }

  // Ensure we have at least one issue
  if (topIssues.length === 0) {
    topIssues.push("Review feedback and iterate on your design.");
  }

  return {
    topIssues,
    evolutionNote,
  };
}

