// Time utility for relative time formatting
export function timeAgo(timestamp: string | number | Date): string {
  try {
    let date: Date;
    
    if (typeof timestamp === "string") {
      // If it's already a relative string like "2h ago", return it
      if (timestamp.includes("ago") || timestamp.includes("Recently") || timestamp.includes("just now")) {
        return timestamp;
      }
      date = new Date(timestamp);
    } else if (typeof timestamp === "number") {
      date = new Date(timestamp);
    } else {
      date = timestamp;
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "recently";
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    // Less than 1 minute
    if (diffSecs < 60) {
      return "Just now";
    }

    // Less than 1 hour
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }

    // Less than 24 hours
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    ) {
      return "Yesterday";
    }

    // Less than 7 days
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }

    // Fallback to MM/DD/YYYY
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month.toString().padStart(2, "0")}/${day.toString().padStart(2, "0")}/${year}`;
  } catch (err) {
    return "recently";
  }
}

