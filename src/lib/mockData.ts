/**
 * Mock Data for Explore Page
 * 
 * This file contains test/mock board data for the Explore page.
 * All features (search, filter, sort, navigation) work with this data.
 * 
 * TODO: API Integration
 * When ready to switch to a backend API:
 * 1. Remove or comment out this mock data
 * 2. Update src/app/explore/page.tsx to fetch from API
 * 3. Transform API response to match BoardCardData format
 * 4. See comments in explore/page.tsx marked with "API_INTEGRATION"
 * 
 * Data Structure:
 * Each board has:
 * - id: Unique identifier (used for navigation to /board/[id])
 * - title: Board/project title
 * - authorName: Name of the board creator
 * - institution: School or institution name
 * - timeAgo: Relative time string (e.g., "2h ago", "3d ago", "Just now")
 * - previewImage: Optional image URL for the board thumbnail
 * - coverColor: Optional fallback color if no image
 */

import type { BoardCardData } from "@/types/boards";

/**
 * Mock board data array
 * 
 * Expand this array as needed for testing different scenarios:
 * - Add more boards for testing pagination/infinite scroll
 * - Add boards with missing fields to test edge cases
 * - Add boards from different institutions to test filters
 * - Adjust timeAgo values to test sorting
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
  {
    id: "board-6",
    title: "Residential Tower Design",
    authorName: "James Wilson",
    institution: "Columbia",
    timeAgo: "6h ago",
    previewImage: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=400&h=300&fit=crop",
    coverColor: "#DBEAFE",
  },
  {
    id: "board-7",
    title: "Community Center Proposal",
    authorName: "Alexandra Kim",
    institution: "MIT",
    timeAgo: "1d ago",
    previewImage: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&h=300&fit=crop",
    coverColor: "#FEF3C7",
  },
  {
    id: "board-8",
    title: "Campus Master Plan",
    authorName: "Michael Brown",
    institution: "Wentworth Institute of Technology",
    timeAgo: "4h ago",
    previewImage: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop",
    coverColor: "#E9D5FF",
  },
  {
    id: "board-9",
    title: "Library Renovation",
    authorName: "Olivia Martinez",
    institution: "Harvard",
    timeAgo: "8h ago",
    previewImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop",
    coverColor: "#DCFCE7",
  },
  {
    id: "board-10",
    title: "Transit Hub Design",
    authorName: "Ryan Thompson",
    institution: "RISD",
    timeAgo: "12h ago",
    previewImage: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=400&h=300&fit=crop",
    coverColor: "#FDE68A",
  },
  {
    id: "board-11",
    title: "Coastal Housing Development",
    authorName: "Sophie Lee",
    institution: "Yale",
    timeAgo: "1d ago",
    previewImage: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=400&h=300&fit=crop",
    coverColor: "#DBEAFE",
  },
  {
    id: "board-12",
    title: "Innovation Center",
    authorName: "Daniel Garcia",
    institution: "Columbia",
    timeAgo: "5h ago",
    previewImage: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&h=300&fit=crop",
    coverColor: "#FEF3C7",
  },
  {
    id: "board-13",
    title: "Public Park Design",
    authorName: "Emma Davis",
    institution: "MIT",
    timeAgo: "7h ago",
    previewImage: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=400&h=300&fit=crop",
    coverColor: "#E9D5FF",
  },
  {
    id: "board-14",
    title: "Student Housing Complex",
    authorName: "Noah White",
    institution: "Wentworth Institute of Technology",
    timeAgo: "3d ago",
    previewImage: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop",
    coverColor: "#DCFCE7",
  },
  {
    id: "board-15",
    title: "Cultural Center",
    authorName: "Isabella Taylor",
    institution: "Harvard",
    timeAgo: "9h ago",
    previewImage: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&h=300&fit=crop",
    coverColor: "#FDE68A",
  },
  {
    id: "board-16",
    title: "Office Building Design",
    authorName: "Lucas Anderson",
    institution: "RISD",
    timeAgo: "1d ago",
    previewImage: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop",
    coverColor: "#DBEAFE",
  },
  // Add more mock boards here as needed for testing
  // Example: Test edge cases
  // {
  //   id: "board-17",
  //   title: "Board Without Image",
  //   authorName: "Test Author",
  //   institution: "MIT",
  //   timeAgo: "Just now",
  //   // No previewImage - will use coverColor fallback
  //   coverColor: "#FEF3C7",
  // },
];
