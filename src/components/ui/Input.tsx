"use client";

import React from "react";

/**
 * Input component props
 * 
 * @interface InputProps
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Input label */
  label?: string;
  /** Helper text shown below input */
  helperText?: string;
  /** Error message to display */
  error?: string;
  /** Icon to display on the left */
  leftIcon?: React.ReactNode;
  /** Icon to display on the right */
  rightIcon?: React.ReactNode;
  /** Loading state (shows spinner on right) */
  loading?: boolean;
  /** Full width input */
  fullWidth?: boolean;
}

/**
 * Reusable Input component
 * 
 * A consistent input component that matches PinSpace design system.
 * Supports labels, helper text, error states, icons, and loading indicators.
 * 
 * Design tokens:
 * - Border: gray-300 (light) / gray-600 (dark)
 * - Focus ring: blue-500/blue-600
 * - Text: gray-900 (light) / white (dark)
 * 
 * @component
 * @example
 * ```tsx
 * <Input
 *   label="Search"
 *   placeholder="Search boards..."
 *   value={search}
 *   onChange={(e) => setSearch(e.target.value)}
 * />
 * ```
 * 
 * @example
 * ```tsx
 * <Input
 *   label="Email"
 *   type="email"
 *   error="Invalid email address"
 *   leftIcon={<MailIcon />}
 * />
 * ```
 */
export default function Input({
  label,
  helperText,
  error,
  leftIcon,
  rightIcon,
  loading = false,
  fullWidth = true,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = !!error;
  
  // Base input classes
  const baseClasses = "rounded-lg border transition focus:outline-none focus:ring-2";
  
  // State classes
  const stateClasses = hasError
    ? "border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500"
    : "border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500";
  
  // Background and text classes
  const bgClasses = "bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400";
  
  // Padding classes (adjust for icons)
  const paddingClasses = leftIcon
    ? "pl-10 pr-4 py-2"
    : rightIcon || loading
    ? "pl-4 pr-10 py-2"
    : "px-4 py-2";
  
  const inputClasses = `
    ${baseClasses}
    ${stateClasses}
    ${bgClasses}
    ${paddingClasses}
    ${fullWidth ? "w-full" : ""}
    ${className}
  `.trim().replace(/\s+/g, " ");
  
  return (
    <div className={fullWidth ? "w-full" : ""}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
            {leftIcon}
          </div>
        )}
        
        <input
          id={inputId}
          className={inputClasses}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          {...props}
        />
        
        {(rightIcon || loading) && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            {loading ? (
              <svg
                className="animate-spin h-4 w-4 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              rightIcon
            )}
          </div>
        )}
      </div>
      
      {error && (
        <p
          id={`${inputId}-error`}
          className="mt-1 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p
          id={`${inputId}-helper`}
          className="mt-1 text-xs text-gray-500 dark:text-gray-400"
        >
          {helperText}
        </p>
      )}
    </div>
  );
}







