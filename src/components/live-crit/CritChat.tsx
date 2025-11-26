"use client";

import React, { useState } from "react";

interface ChatMessage {
  id: string;
  author: string;
  text: string;
  timestamp: Date;
  type: "message" | "comment" | "system";
}

interface CritChatProps {
  sessionId: string;
}

/**
 * CritChat - Chat/Comments panel for Live Crit session
 * 
 * TODO: Future enhancements
 * - Real-time message synchronization
 * - Threaded comments linked to board elements
 * - Rich text formatting (bold, italic, links)
 * - File attachments (images, PDFs)
 * - Emoji reactions
 * - Message search/filter
 * - Mark messages as read/unread
 * - @mentions for participants
 * - System notifications (participant joined, presenter changed, etc.)
 * - Comment categories/tags
 */
export default function CritChat({ sessionId }: CritChatProps) {
  // Mock messages - will be replaced with real-time data
  const [messages] = useState<ChatMessage[]>([
    {
      id: "1",
      author: "Alex Johnson",
      text: "Welcome to the Live Crit session!",
      timestamp: new Date(Date.now() - 300000), // 5 minutes ago
      type: "system",
    },
    {
      id: "2",
      author: "Sam Chen",
      text: "Thanks for the invite. Looking forward to the discussion.",
      timestamp: new Date(Date.now() - 240000), // 4 minutes ago
      type: "message",
    },
    {
      id: "3",
      author: "Jordan Lee",
      text: "I have a question about the facade treatment...",
      timestamp: new Date(Date.now() - 180000), // 3 minutes ago
      type: "comment",
    },
  ]);
  
  const [newMessage, setNewMessage] = useState("");
  
  // TODO: Real-time message handling
  // - Subscribe to new messages via WebSocket/real-time connection
  // - Handle message updates, edits, deletions
  // - Optimistic UI updates for sent messages
  
  // TODO: Message sending
  // - Validate message before sending
  // - Handle send errors and retries
  // - Show loading state while sending
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    // TODO: Send message via real-time connection
    console.log("Send message:", newMessage);
    
    // Clear input after sending
    setNewMessage("");
  };
  
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    return date.toLocaleDateString();
  };
  
  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Chat & Comments
          </h2>
          {/* TODO: Add chat controls */}
          {/* - Filter by type (all, messages, comments) */}
          {/* - Search messages */}
          {/* - Clear chat */}
        </div>
      </div>
      
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-sm text-gray-500 mt-8">
            <p>No messages yet.</p>
            <p className="text-xs mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`space-y-1 ${
                message.type === "system"
                  ? "text-center"
                  : "text-left"
              }`}
            >
              {/* System messages */}
              {message.type === "system" ? (
                <div className="text-xs text-gray-500 italic">
                  {message.text}
                </div>
              ) : (
                <>
                  {/* Regular messages and comments */}
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-600 font-medium text-xs">
                        {message.author.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium text-gray-900">
                          {message.author}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTimestamp(message.timestamp)}
                        </span>
                        {message.type === "comment" && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            Comment
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5 break-words">
                        {message.text}
                      </p>
                    </div>
                  </div>
                  
                  {/* TODO: Add message actions */}
                  {/* - Edit message (if own message) */}
                  {/* - Delete message (if own message or moderator) */}
                  {/* - Reply to message */}
                  {/* - React with emoji */}
                </>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Message Input */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="space-y-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message or comment..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            disabled
            title="Message sending will be enabled with real-time integration"
          />
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {/* TODO: Add input hints/formatting help */}
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Message sending will be enabled with real-time integration"
            >
              Send
            </button>
          </div>
        </form>
        
        {/* TODO: Add input features */}
        {/* - @mention autocomplete */}
        {/* - File attachment button */}
        {/* - Emoji picker */}
        {/* - Keyboard shortcuts (Cmd/Ctrl+Enter to send) */}
      </div>
    </div>
  );
}





