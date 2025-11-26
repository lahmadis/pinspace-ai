"use client";

import React from "react";
import Input from "@/components/ui/Input";
import { useTranslation } from "@/lib/i18n";

/**
 * BoardSearchBar component props
 * 
 * @interface BoardSearchBarProps
 */
export interface BoardSearchBarProps {
  /** Current search value */
  value: string;
  /** Callback when search value changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show loading indicator */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * BoardSearchBar Component
 * 
 * A reusable search input component for filtering boards by title, author, or institution.
 * Includes loading indicator and proper accessibility attributes.
 * 
 * @component
 * @example
 * ```tsx
 * <BoardSearchBar
 *   value={search}
 *   onChange={setSearch}
 *   placeholder="Search boards..."
 *   loading={isFiltering}
 * />
 * ```
 */
export default function BoardSearchBar({
  value,
  onChange,
  placeholder,
  loading = false,
  className = "",
}: BoardSearchBarProps) {
  const t = useTranslation();
  const searchPlaceholder = placeholder || t("explore.searchPlaceholder");
  const searchLabel = t("explore.searchLabel");
  const searchDescription = t("explore.searchDescription");

  return (
    <div className={className} role="search" aria-label={searchLabel}>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={searchPlaceholder}
        loading={loading}
        aria-label={searchLabel}
        aria-describedby="search-description"
        autoComplete="off"
      />
      <p id="search-description" className="sr-only">
        {searchDescription}
      </p>
    </div>
  );
}

