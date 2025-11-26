// Mock user data store
// This file contains users and the current logged-in user

import type { User } from "@/types";

// Mock users
export const users: User[] = [
  {
    id: "u1",
    name: "Linna Lahmadi",
    username: "@linna",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=linna",
    bio: "Architecture student working on circulation-as-runway studio",
    isPrivate: false,
  },
  {
    id: "u2",
    name: "Alex Chen",
    username: "@alex",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
    bio: "Graduate student exploring urban fabric integration",
    isPrivate: false,
  },
  {
    id: "u3",
    name: "Leila Haddad",
    username: "@leila",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=leila",
    bio: "Studio instructor and architectural researcher",
    isPrivate: false,
  },
];

// Current logged-in user
export const currentUser: User = users[0]; // Linna Lahmadi

// Get user by ID
export function getUserById(userId: string): User | null {
  return users.find((u) => u.id === userId) || null;
}

// Get user by username (without @)
export function getUserByUsername(username: string): User | null {
  const cleanUsername = username.replace("@", "");
  return users.find((u) => u.username.replace("@", "") === cleanUsername) || null;
}

// Get all users
export function getAllUsers(): User[] {
  return users;
}

