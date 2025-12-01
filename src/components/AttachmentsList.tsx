"use client";

/**
 * AttachmentsList Component
 * 
 * Displays a list of attachments with previews and download links.
 * 
 * Features:
 * - Image previews for image files
 * - Download links for all file types
 * - File type icons
 * - File size display
 * - Grouped by comment ID if provided
 * 
 * Usage:
 *   <AttachmentsList
 *     attachments={attachments}
 *     onDelete={handleDeleteAttachment}
 *   />
 */

import React from "react";
import type { Attachment } from "@/hooks/attachments";

interface AttachmentsListProps {
  attachments: Attachment[];
  onDelete?: (attachmentId: string) => void; // Optional delete handler
  deletable?: boolean; // Whether to show delete button (default: false)
  showTitle?: boolean; // Whether to show "Attachments" title (default: true)
  compact?: boolean; // Compact mode for smaller display (default: false)
}

/**
 * Get file type icon based on mime type or file extension
 */
function getFileIcon(attachment: Attachment): string {
  const mimeType = attachment.mimeType?.toLowerCase() || '';
  const fileName = attachment.fileName?.toLowerCase() || '';
  
  // Image files
  if (mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName)) {
    return '🖼️';
  }
  
  // PDF files
  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return '📄';
  }
  
  // Document files
  if (mimeType.includes('document') || /\.(doc|docx|txt)$/i.test(fileName)) {
    return '📝';
  }
  
  // Spreadsheet files
  if (mimeType.includes('spreadsheet') || /\.(xls|xlsx|csv)$/i.test(fileName)) {
    return '📊';
  }
  
  // Video files
  if (mimeType.startsWith('video/') || /\.(mp4|avi|mov|webm)$/i.test(fileName)) {
    return '🎥';
  }
  
  // Audio files
  if (mimeType.startsWith('audio/') || /\.(mp3|wav|ogg)$/i.test(fileName)) {
    return '🎵';
  }
  
  // Archive files
  if (mimeType.includes('zip') || mimeType.includes('archive') || /\.(zip|rar|7z|tar|gz)$/i.test(fileName)) {
    return '📦';
  }
  
  // Default file icon
  return '📎';
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes === 0) return 'Unknown size';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Check if file is an image based on mime type or file extension
 */
function isImage(attachment: Attachment): boolean {
  const mimeType = attachment.mimeType?.toLowerCase() || '';
  const fileName = attachment.fileName?.toLowerCase() || '';
  
  return (
    mimeType.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(fileName)
  );
}

export default function AttachmentsList({
  attachments,
  onDelete,
  deletable = false,
  showTitle = true,
  compact = false,
}: AttachmentsListProps) {
  // Don't render if no attachments
  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className={`${compact ? 'space-y-1' : 'space-y-2'}`}>
      {showTitle && (
        <div className={`flex items-center justify-between ${compact ? 'mb-1' : 'mb-2'}`}>
          <h4 className={`font-medium text-gray-900 ${compact ? 'text-xs' : 'text-sm'}`}>
            📎 Attachments ({attachments.length})
          </h4>
        </div>
      )}
      
      <div className={`space-y-2 ${compact ? 'space-y-1' : ''}`}>
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className={`border rounded-lg p-2 bg-gray-50 hover:bg-gray-100 transition-colors ${compact ? 'p-1.5' : 'p-2'}`}
          >
            <div className="flex items-start gap-2">
              {/* Image Preview */}
              {isImage(attachment) && !compact ? (
                <div className="flex-shrink-0">
                  <img
                    src={attachment.fileUrl}
                    alt={attachment.fileName}
                    className="w-16 h-16 object-cover rounded border border-gray-200"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback if image fails to load
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                /* File Icon */
                <div className={`flex-shrink-0 text-2xl ${compact ? 'text-lg' : 'text-2xl'}`}>
                  {getFileIcon(attachment)}
                </div>
              )}
              
              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={attachment.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`font-medium text-blue-600 hover:text-blue-800 hover:underline truncate ${compact ? 'text-xs' : 'text-sm'}`}
                    title={attachment.fileName}
                  >
                    {attachment.fileName}
                  </a>
                  
                  {deletable && onDelete && (
                    <button
                      onClick={() => onDelete(attachment.id)}
                      className="flex-shrink-0 p-1 rounded hover:bg-red-50 text-red-600"
                      title="Delete attachment"
                      aria-label="Delete attachment"
                    >
                      🗑️
                    </button>
                  )}
                </div>
                
                {/* File Metadata */}
                <div className={`flex items-center gap-2 mt-1 text-gray-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>
                  {attachment.fileSize && (
                    <span>{formatFileSize(attachment.fileSize)}</span>
                  )}
                  {attachment.fileType && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{attachment.fileType}</span>
                    </>
                  )}
                  {attachment.uploadedBy && (
                    <>
                      <span>•</span>
                      <span>by {attachment.uploadedBy}</span>
                    </>
                  )}
                </div>
                
                {/* Download Link */}
                <a
                  href={attachment.fileUrl}
                  download={attachment.fileName}
                  className={`inline-block mt-1 text-blue-600 hover:text-blue-800 ${compact ? 'text-[10px]' : 'text-xs'}`}
                  title={`Download ${attachment.fileName}`}
                >
                  ⬇️ Download
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}








