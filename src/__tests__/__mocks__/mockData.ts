/**
 * Mock data for testing board components and hooks
 * 
 * This file provides sample board data that matches the BoardCardData interface.
 * Use this in tests to avoid relying on external API calls or complex data setup.
 */

import type { BoardCardData } from "@/types/boards";

/**
 * Sample board data for testing
 */
export const mockBoards: BoardCardData[] = [
  {
    id: "board-1",
    title: "Runway / Movement Study",
    authorName: "Leila Anderson",
    institution: "Wentworth Institute of Technology",
    timeAgo: "2h ago",
    previewImage: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=400&h=300&fit=crop",
    coverColor: "#DBEAFE",
  },
  {
    id: "board-2",
    title: "Urban Housing Complex",
    authorName: "Marcus Chen",
    institution: "MIT",
    timeAgo: "5h ago",
    previewImage: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop",
    coverColor: "#FEF3C7",
  },
  {
    id: "board-3",
    title: "Sustainable Campus Design",
    authorName: "Sarah Johnson",
    institution: "Harvard",
    timeAgo: "1d ago",
    previewImage: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&h=300&fit=crop",
    coverColor: "#E9D5FF",
  },
  {
    id: "board-4",
    title: "Museum of Contemporary Art",
    authorName: "David Park",
    institution: "RISD",
    timeAgo: "2d ago",
    previewImage: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=400&h=300&fit=crop",
    coverColor: "#DCFCE7",
  },
  {
    id: "board-5",
    title: "Mixed-Use Development",
    authorName: "Emily Rodriguez",
    institution: "Yale",
    timeAgo: "3h ago",
    previewImage: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop",
    coverColor: "#FDE68A",
  },
];

/**
 * Empty board array for testing empty states
 */
export const emptyBoards: BoardCardData[] = [];

/**
 * Single board for focused component tests
 */
export const singleBoard: BoardCardData = mockBoards[0];

/**
 * Board without preview image (tests fallback behavior)
 */
export const boardWithoutImage: BoardCardData = {
  id: "board-no-image",
  title: "Board Without Image",
  authorName: "Test Author",
  institution: "Test Institution",
  timeAgo: "Just now",
  coverColor: "#DBEAFE",
};











