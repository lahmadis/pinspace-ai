"use client";

import { use } from "react";
import { useState } from "react";
import BoardCanvas from "@/components/live-crit/BoardCanvas";
import CritSidebar from "@/components/live-crit/CritSidebar";
import CritChat from "@/components/live-crit/CritChat";

interface LiveCritPageProps {
  params: Promise<{ id: string }>;
}

export default function LiveCritPage({ params }: LiveCritPageProps) {
  const { id: sessionId } = use(params);
  
  // TODO: Add real-time session state management
  // - Load session data from backend/API
  // - Track session status (active, ended, paused)
  // - Handle reconnection logic
  
  // Mock state for presenter info - will be replaced with real data
  const [presenterInfo] = useState({
    name: "Alex Johnson",
    role: "Crit Leader",
    avatar: undefined, // TODO: Add avatar URL when available
  });
  
  // Mock state for participants - will be replaced with real-time participant list
  const [participants] = useState([
    { id: "1", name: "Alex Johnson", role: "Presenter", isActive: true },
    { id: "2", name: "Sam Chen", role: "Participant", isActive: true },
    { id: "3", name: "Jordan Lee", role: "Participant", isActive: false },
  ]);
  
  // TODO: Add real-time updates for participant list
  // - Listen to participant join/leave events
  // - Track active/inactive status
  // - Handle permissions (viewer, contributor, presenter)
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">Live Crit</h1>
          <div className="text-sm text-gray-500">
            Session: <span className="font-mono text-gray-700">{sessionId}</span>
          </div>
        </div>
        
        {/* TODO: Add header controls */}
        {/* - Session status indicator (live, paused, ended) */}
        {/* - Settings/options menu */}
        {/* - Exit/end session button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>Live</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Left */}
        <CritSidebar 
          presenterInfo={presenterInfo}
          participants={participants}
          sessionId={sessionId}
        />
        
        {/* Central Board/Canvas Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <BoardCanvas sessionId={sessionId} />
        </div>
        
        {/* Chat/Comments Panel - Right */}
        <CritChat sessionId={sessionId} />
      </div>
    </div>
  );
}



