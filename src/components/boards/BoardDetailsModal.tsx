"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { BoardCardData } from "@/types/boards";
import { useTranslation } from "@/lib/i18n";
import { FocusManager } from "@/lib/a11y";

/**
 * BoardDetailsModal component props
 * 
 * @interface BoardDetailsModalProps
 */
export interface BoardDetailsModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Board data to display */
  board: BoardCardData | null;
}

/**
 * BoardDetailsModal Component
 * 
 * Displays detailed information about a board in a modal overlay.
 * 
 * Features:
 * - Larger preview image
 * - Full board metadata (title, author, institution, time)
 * - Author contact information (placeholder for future API integration)
 * - Actions: View Board, Close
 * - Keyboard accessible (Escape to close, Tab navigation)
 * - Click outside to close
 * - Smooth animations (fade in/out)
 * - Dark mode support
 * - Responsive design
 * 
 * @component
 * @example
 * ```tsx
 * <BoardDetailsModal
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   board={selectedBoard}
 * />
 * ```
 */
export default function BoardDetailsModal({
  isOpen,
  onClose,
  board,
}: BoardDetailsModalProps) {
  const t = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Handle Escape key to close modal and focus management
  useEffect(() => {
    if (!isOpen) return;

    // Store previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    // Trap focus within modal
    let cleanupFocusTrap: (() => void) | undefined;
    if (modalRef.current) {
      cleanupFocusTrap = FocusManager.trapFocus(modalRef.current);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
      cleanupFocusTrap?.();
      // Return focus to previous element
      FocusManager.returnFocus(previousFocusRef.current);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !board) return null;

  // Fallback colors for preview
  const fallbackColors = [
    "#DBEAFE", // light blue
    "#FEF3C7", // light yellow
    "#FDE68A", // light amber
    "#E9D5FF", // light purple
    "#DCFCE7", // light green
  ];
  const coverColor =
    board.coverColor ||
    fallbackColors[(board.id.charCodeAt(0) || 0) % fallbackColors.length];

  // Handle backdrop click (close modal)
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="board-details-title"
      aria-describedby="board-details-description"
    >
      {/* Backdrop with fade animation */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 transition-opacity duration-300"
        aria-hidden="true"
        onClick={handleBackdropClick}
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden transform transition-all duration-300 scale-100 z-10"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          aria-label={t("boardDetails.close")}
          type="button"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[90vh]">
          {/* Large Preview Image */}
          <div
            className="w-full h-64 sm:h-80 bg-gray-100 dark:bg-gray-700 overflow-hidden relative"
            style={{ backgroundColor: coverColor }}
            aria-hidden="true"
          >
            {board.previewImage ? (
              <img
                src={board.previewImage}
                alt={`Preview of ${board.title}`}
                className="w-full h-full object-cover"
                loading="eager"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-sm text-gray-400 dark:text-gray-500" aria-label={t("boardDetails.noPreview")}>
                  {t("boardDetails.noPreview")}
                </div>
              </div>
            )}
          </div>

          {/* Board Details */}
          <div className="p-6 sm:p-8">
            {/* Title */}
            <h2
              id="board-details-title"
              className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4"
            >
              {board.title}
            </h2>

            {/* Metadata Grid */}
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Author */}
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  {t("boardDetails.author")}
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {board.authorName}
                </dd>
              </div>

              {/* Institution */}
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  {t("boardDetails.institution")}
                </dt>
                <dd className="text-lg text-gray-700 dark:text-gray-300">
                  {board.institution}
                </dd>
              </div>

              {/* Last Edited */}
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  {t("boardDetails.lastEdited")}
                </dt>
                <dd className="text-lg text-gray-700 dark:text-gray-300">
                  <time dateTime={board.timeAgo} aria-label={t("boardCard.lastEdited", { time: board.timeAgo })}>
                    {board.timeAgo}
                  </time>
                </dd>
              </div>

              {/* Author Contact (Placeholder for future API integration) */}
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  {t("boardDetails.contact")}
                </dt>
                <dd className="text-lg text-gray-700 dark:text-gray-300">
                  {/* TODO: API Integration - Replace with actual author contact from API */}
                  <span className="text-gray-400 dark:text-gray-500 italic" aria-label={t("boardDetails.contactUnavailable")}>
                    {t("boardDetails.contactUnavailable")}
                  </span>
                </dd>
              </div>
            </dl>

            {/* Description (Placeholder for future API integration) */}
            <section className="mb-6" aria-labelledby="description-heading">
              <h3 id="description-heading" className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                {t("boardDetails.description")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {/* TODO: API Integration - Replace with actual board description from API */}
                {board.description || (
                  <span className="italic" aria-label={t("boardDetails.noDescription")}>
                    {t("boardDetails.noDescription")}
                  </span>
                )}
              </p>
            </section>

            {/* Actions */}
            <nav className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-gray-700" aria-label={t("boardDetails.viewBoard")}>
              <Link
                href={`/board/${board.id}`}
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                aria-label={t("boardDetails.viewBoard")}
              >
                {t("boardDetails.viewBoard")}
              </Link>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                aria-label={t("boardDetails.closeButton")}
                type="button"
              >
                {t("boardDetails.closeButton")}
              </button>
            </nav>
          </div>
        </div>

        {/* Hidden description for screen readers */}
        <div id="board-details-description" className="sr-only">
          {t("boardDetails.modalDescription", {
            title: board.title,
            author: board.authorName,
            institution: board.institution,
            time: board.timeAgo,
          })}
        </div>
      </div>
    </div>
  );
}

