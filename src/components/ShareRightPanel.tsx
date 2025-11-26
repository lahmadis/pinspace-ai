"use client";

import { useState } from "react";
import type { Comment } from "@/types";
import { timeAgo } from "@/lib/time";

interface ShareRightPanelProps {
  comments: Comment[];
}

type TabType = "comments" | "critNotes";

export default function ShareRightPanel({ comments }: ShareRightPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("comments");

  // Filter comments by type
  const filteredComments = comments.filter((comment) => {
    if (activeTab === "comments") {
      return comment.type !== "crit";
    } else {
      // critNotes tab
      return comment.type === "crit";
    }
  });

  return (
    <aside className="w-80 bg-white border-l border-gray-200 flex flex-col h-screen">
      {/* Tabs */}
      <div className="border-b border-gray-200 flex">
        <button
          onClick={() => setActiveTab("comments")}
          className={`flex-1 px-4 py-2 text-sm font-medium transition ${
            activeTab === "comments"
              ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Comments
        </button>
        <button
          onClick={() => setActiveTab("critNotes")}
          className={`flex-1 px-4 py-2 text-sm font-medium transition ${
            activeTab === "critNotes"
              ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Crit Notes
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {activeTab === "critNotes" ? "Crit Notes" : "Comments"}
        </h3>
        {filteredComments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            {activeTab === "critNotes"
              ? "No crit notes yet."
              : "No comments yet."}
          </p>
        ) : (
          filteredComments.map((comment) => (
            <div
              key={comment.id}
              className="bg-gray-50 border border-gray-200 rounded-lg p-3"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-xs font-semibold text-gray-900">
                    {comment.author}
                  </div>
                  <div className="text-xs text-gray-500">
                    {timeAgo(comment.timestamp)}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-700 break-words">
                {comment.text}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

