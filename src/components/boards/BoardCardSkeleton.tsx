"use client";

import Card from "@/components/ui/Card";

/**
 * BoardCardSkeleton component props
 * 
 * @interface BoardCardSkeletonProps
 */
export interface BoardCardSkeletonProps {
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

/**
 * BoardCardSkeleton Component
 * 
 * Loading skeleton placeholder for board cards. Displays animated shimmer
 * effect while board data is loading.
 * 
 * Matches the structure and size of BoardCard component for smooth loading transitions.
 * 
 * @component
 * @example
 * ```tsx
 * {loading && (
 *   <BoardCardSkeleton size="md" />
 * )}
 * ```
 */
export default function BoardCardSkeleton({ size = "md" }: BoardCardSkeletonProps) {
  const previewHeightClasses = {
    sm: "h-32",
    md: "h-48",
    lg: "h-64",
  };

  return (
    <Card variant="outlined" padding="none" className="overflow-hidden animate-pulse">
      {/* Shimmer effect on image */}
      <div
        className={`w-full ${previewHeightClasses[size]} bg-gradient-to-r from-gray-200 dark:from-gray-700 via-gray-100 dark:via-gray-600 to-gray-200 dark:to-gray-700 bg-[length:200%_100%] animate-[shimmer_2s_infinite]`}
      />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
      </div>
    </Card>
  );
}








