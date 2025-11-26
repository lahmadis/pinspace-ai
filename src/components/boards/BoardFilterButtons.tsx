"use client";

import React from "react";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n";

/**
 * BoardFilterButtons component props
 * 
 * @interface BoardFilterButtonsProps
 */
export interface BoardFilterButtonsProps {
  /** Available filter options */
  options: string[];
  /** Currently selected filter value */
  selectedValue: string;
  /** Callback when filter changes */
  onChange: (value: string) => void;
  /** Label for the filter group */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * BoardFilterButtons Component
 * 
 * A reusable component for displaying filter buttons (e.g., institution filters).
 * Displays options as toggleable buttons with active/inactive states.
 * 
 * @component
 * @example
 * ```tsx
 * <BoardFilterButtons
 *   options={["All", "MIT", "Harvard"]}
 *   selectedValue={selectedInstitution}
 *   onChange={setSelectedInstitution}
 *   label="Filter by institution"
 * />
 * ```
 */
export default function BoardFilterButtons({
  options,
  selectedValue,
  onChange,
  label,
  className = "",
}: BoardFilterButtonsProps) {
  const t = useTranslation();
  const filterLabel = label || t("explore.filterLabel");
  const filterDescription = t("explore.filterDescription");

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    value: string
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(value);
    }
    // Arrow key navigation for filter buttons
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const currentIndex = options.indexOf(value);
      if (currentIndex === -1) return;
      
      const nextIndex = e.key === "ArrowRight" 
        ? (currentIndex + 1) % options.length
        : (currentIndex - 1 + options.length) % options.length;
      const nextValue = options[nextIndex];
      const nextButton = document.querySelector<HTMLButtonElement>(
        `[data-filter-option="${nextValue}"]`
      );
      nextButton?.focus();
    }
  };

  return (
    <div
      className={`flex flex-wrap gap-2 ${className}`}
      role="group"
      aria-label={filterLabel}
      aria-describedby="filter-description"
    >
      <p id="filter-description" className="sr-only">
        {filterDescription}
      </p>
      {options.map((option) => {
        const isSelected = selectedValue === option;
        // Translate "All" for display, but keep "All" as the value for filtering logic
        const optionLabel = option === "All" ? t("explore.filterAll") : option;
        
        return (
          <button
            key={option}
            data-filter-option={option}
            onClick={() => onChange(option)}
            onKeyDown={(e) => handleKeyDown(e, option)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
              isSelected
                ? "bg-blue-600 dark:bg-blue-500 text-white shadow-md"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
            }`}
            aria-pressed={isSelected}
            aria-label={`${filterLabel}: ${optionLabel}${isSelected ? `, ${t("common.selected")}` : ""}`}
            type="button"
          >
            {optionLabel}
          </button>
        );
      })}
    </div>
  );
}

