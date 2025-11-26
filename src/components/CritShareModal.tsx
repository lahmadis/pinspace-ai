"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

interface CritShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardTitle: string;
  sessionId?: string | null;
}

export default function CritShareModal({
  isOpen,
  onClose,
  boardId,
  boardTitle,
  sessionId,
}: CritShareModalProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== "undefined" && sessionId
    ? `${window.location.origin}/live/${encodeURIComponent(sessionId)}`
    : typeof window !== "undefined"
    ? `${window.location.origin}/crit/${boardId}`
    : "";

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-md border border-gray-200 shadow-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Live Crit Mode
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Anyone in the room can scan and leave feedback on this board.
        </p>

        {/* Board Title */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-1">Board</div>
          <div className="text-lg font-semibold text-gray-900">{boardTitle}</div>
        </div>

        {/* QR Code */}
        {shareUrl && (
          <div className="mb-6 flex justify-center">
            <div className="p-4 bg-white border border-gray-300 rounded">
              <QRCodeSVG
                value={shareUrl}
                size={192}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>
        )}

        {/* Share URL */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Share Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 text-xs font-mono bg-gray-100 border border-gray-300 rounded px-3 py-2"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition whitespace-nowrap"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </div>

        {/* Explain text */}
        <p className="text-xs text-gray-500 mb-6">
          Anyone in the room can scan and leave pinned notes on your board.
        </p>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-900 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}

