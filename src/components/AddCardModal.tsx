"use client";

import { useState } from "react";

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCard: (imageUrl: string | undefined, caption: string) => Promise<void>;
}

export default function AddCardModal({
  isOpen,
  onClose,
  onAddCard,
}: AddCardModalProps) {
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddCard = async () => {
    // At least one field must be filled
    if (!imageUrl.trim() && !caption.trim()) {
      return;
    }

    setLoading(true);
    try {
      await onAddCard(
        imageUrl.trim() || undefined,
        caption.trim() || ""
      );
      // Clear form and close
      setImageUrl("");
      setCaption("");
      onClose();
    } catch (err) {
      console.error("Error adding card", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setImageUrl("");
    setCaption("");
    onClose();
  };

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  const canSubmit = imageUrl.trim() || caption.trim();

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Add to board</h2>

        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image URL (optional)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading && canSubmit) {
                  handleAddCard();
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/image.jpg"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Caption / note (optional)
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Add a note or caption..."
              rows={3}
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAddCard}
            disabled={!canSubmit || loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Adding..." : "Add Card"}
          </button>
        </div>
      </div>
    </div>
  );
}

