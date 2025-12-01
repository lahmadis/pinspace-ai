"use client";

import React from "react";

/**
 * Card component props
 * 
 * @interface CardProps
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card padding variant */
  padding?: "none" | "sm" | "md" | "lg";
  /** Whether card is hoverable */
  hoverable?: boolean;
  /** Whether card is clickable */
  clickable?: boolean;
  /** Card variant/style */
  variant?: "default" | "outlined" | "elevated";
  /** Children content */
  children: React.ReactNode;
}

/**
 * Reusable Card component
 * 
 * A consistent card component that matches PinSpace design system.
 * Used as a base for board cards, modals, and other card-based UI elements.
 * 
 * Design tokens:
 * - Background: white (light) / gray-800 (dark)
 * - Border: gray-200 (light) / gray-700 (dark)
 * - Shadow: subtle elevation on hover
 * 
 * @component
 * @example
 * ```tsx
 * <Card padding="md" hoverable>
 *   <h3>Card Title</h3>
 *   <p>Card content</p>
 * </Card>
 * ```
 */
export default function Card({
  padding = "md",
  hoverable = false,
  clickable = false,
  variant = "default",
  className = "",
  children,
  ...props
}: CardProps) {
  // Base classes
  const baseClasses = "rounded-lg transition-all";
  
  // Variant classes
  const variantClasses = {
    default: "bg-white dark:bg-gray-800",
    outlined: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
    elevated: "bg-white dark:bg-gray-800 shadow-md",
  };
  
  // Padding classes
  const paddingClasses = {
    none: "",
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };
  
  // Interactive classes
  const interactiveClasses = clickable
    ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
    : "";
  
  const hoverClasses = hoverable || clickable
    ? "hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600"
    : "";
  
  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${paddingClasses[padding]}
    ${interactiveClasses}
    ${hoverClasses}
    ${className}
  `.trim().replace(/\s+/g, " ");
  
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}











