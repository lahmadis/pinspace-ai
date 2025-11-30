"use client";

import SidebarNav from "./SidebarNav";

interface SidebarNavWrapperProps {
  currentProfile?: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  } | null;
}

/**
 * Client component wrapper for SidebarNav
 * 
 * Receives currentProfile as a prop from a server component.
 * Does not import any server-only modules.
 */
export default function SidebarNavWrapper({ currentProfile }: SidebarNavWrapperProps) {
  return <SidebarNav currentProfile={currentProfile} />;
}

