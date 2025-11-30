"use client";

import React from "react";

interface PresenterInfo {
  name: string;
  role: string;
  avatar?: string;
}

interface Participant {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
}

interface CritSidebarProps {
  presenterInfo: PresenterInfo;
  participants: Participant[];
  sessionId: string;
}

/**
 * CritSidebar - Left sidebar for presenter info, participant list, and controls
 * 
 * TODO: Future enhancements
 * - Real-time participant list updates (join/leave)
 * - Participant permissions management (viewer, contributor, presenter)
 * - Presenter control transfer
 * - Participant avatars/profile pictures
 * - Participant status indicators (speaking, muted, etc.)
 * - Screen sharing controls
 * - Session settings (privacy, permissions, etc.)
 * - Export/save session functionality
 */
export default function CritSidebar({
  presenterInfo,
  participants,
  sessionId,
}: CritSidebarProps) {
  // TODO: Real-time participant updates
  // - Subscribe to participant join/leave events
  // - Update participant list when changes occur
  // - Track active/inactive status
  
  // TODO: Permission management
  // - Check current user's role/permissions
  // - Show/hide controls based on permissions
  // - Handle presenter handoff
  
  return (
    <aside className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      {/* Presenter Info Section */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Presenter
        </h2>
        <div className="flex items-center gap-3">
          {/* Avatar placeholder */}
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-blue-600 font-semibold text-lg">
              {presenterInfo.name.charAt(0)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 truncate">
              {presenterInfo.name}
            </div>
            <div className="text-sm text-gray-500 truncate">
              {presenterInfo.role}
            </div>
          </div>
        </div>
        
        {/* TODO: Add presenter controls */}
        {/* - Handoff presenter role */}
        {/* - End session (if presenter) */}
        {/* - Session settings */}
      </div>

      {/* Participants List Section */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">
            Participants
          </h2>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {participants.length}
          </span>
        </div>
        
        <div className="space-y-2">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* Status indicator */}
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  participant.isActive
                    ? "bg-green-500"
                    : "bg-gray-300"
                }`}
                title={participant.isActive ? "Active" : "Inactive"}
              />
              
              {/* Avatar placeholder */}
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <span className="text-gray-600 font-medium text-sm">
                  {participant.name.charAt(0)}
                </span>
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-gray-900 truncate">
                  {participant.name}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {participant.role}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* TODO: Add participant management */}
        {/* - Invite participants */}
        {/* - Remove participants (if moderator) */}
        {/* - Change participant roles */}
      </div>

      {/* Controls Section */}
      <div className="p-6 border-t border-gray-200 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Session Controls
        </h2>
        
        {/* Placeholder controls - will be replaced with real functionality */}
        <div className="space-y-2">
          <button
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled
            title="Feature coming soon"
          >
            Share Screen
          </button>
          <button
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled
            title="Feature coming soon"
          >
            Record Session
          </button>
          <button
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled
            title="Feature coming soon"
          >
            Export Board
          </button>
        </div>
        
        {/* TODO: Add real control handlers */}
        {/* - Screen sharing integration */}
        {/* - Session recording (with permissions) */}
        {/* - Board export functionality */}
        {/* - Session end confirmation */}
      </div>
    </aside>
  );
}









