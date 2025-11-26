"use client";

import { use } from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { currentUser } from "@/lib/currentUser";
import { getProfiles, getProfile, ensureDefaultProfiles, getBoards, getCards } from "@/lib/storage";
import type { StoredProfile, StoredBoard } from "@/lib/storage";
import { isFollowing, toggleFollow } from "@/lib/follow";
import { timeAgo } from "@/lib/time";
import type { Profile } from "@/types";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

// Helper to get cover image from board's cards
function getBoardCoverImage(boardId: string): string | undefined {
  const cards = getCards(boardId);
  const cardWithImage = cards.find((card) => card.imageUrl);
  return cardWithImage?.imageUrl;
}

// Helper to transform board IDs to board objects
function getBoardObjects(boardIds: string[]): Array<{
  boardId: string;
  title: string;
  coverImage?: string;
  lastEdited?: string;
  isPublic?: boolean;
}> {
  const allBoards = getBoards();
  return boardIds
    .map((boardId) => {
      const board = allBoards.find((b) => b.id === boardId);
      if (!board) return null;
      return {
        boardId: board.id,
        title: board.title,
        coverImage: getBoardCoverImage(board.id),
        lastEdited: board.lastEdited,
        isPublic: board.isPublic || board.visibility === "public",
      };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const { username } = use(params);
  const routeUsername = username.replace("@", "");

  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [boardObjects, setBoardObjects] = useState<Array<{
    boardId: string;
    title: string;
    coverImage?: string;
    lastEdited?: string;
    isPublic?: boolean;
  }>>([]);

  useEffect(() => {
    // Ensure default profiles exist
    ensureDefaultProfiles();

    // Load profile - try getProfile first, fallback to searching getProfiles
    let loadedProfile: StoredProfile | null = getProfile(routeUsername);
    if (!loadedProfile) {
      const profiles = getProfiles();
      loadedProfile = profiles.find((p) => p.username === routeUsername) || null;
    }

    setProfile(loadedProfile);

    if (loadedProfile) {
      // Transform board IDs to board objects
      const boardIds = loadedProfile.boards || [];
      const boards = getBoardObjects(boardIds);
      setBoardObjects(boards);

      // Check if following (only for non-self profiles)
      const currentUsername = currentUser?.username?.replace("@", "") || currentUser?.name || "";
      const isMe = loadedProfile.username === currentUsername || 
                   loadedProfile.username === currentUser?.username?.replace("@", "");
      
      if (!isMe) {
        setFollowing(isFollowing(loadedProfile.username));
      }
    }

    setLoading(false);
  }, [routeUsername]);

  // Loading state
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-gray-700 text-sm">Loading...</div>
    );
  }

  // Not found state
  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-gray-900">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">User not found</h1>
        <p className="text-sm text-gray-600">
          The profile you're looking for doesn't exist.
        </p>
      </div>
    );
  }

  // Determine if viewing own profile
  const currentUsername = currentUser?.username?.replace("@", "") || currentUser?.name || "";
  const isMe = profile.username === currentUsername || 
               profile.username === currentUser?.username?.replace("@", "") ||
               profile.username === currentUser?.name;

  // Check if account is private and not viewing own profile
  const isLocked = profile.isPrivate && !isMe;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 text-gray-900">
      {/* Header Section */}
      <div className="flex items-start gap-6">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full border border-gray-300 bg-gray-100 flex items-center justify-center text-gray-600 text-xl font-semibold overflow-hidden shrink-0">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName || profile.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{(profile.displayName || profile.username || "?").charAt(0).toUpperCase()}</span>
          )}
        </div>

        {/* Text Block */}
        <div className="flex-1 min-w-0">
          <div className="text-xl font-semibold text-gray-900 leading-tight">
            {profile.displayName || profile.username}
          </div>
          <div className="text-sm text-gray-600 leading-tight">
            @{profile.username}
          </div>
          {profile.school && (
            <div className="text-sm text-gray-600 leading-tight mt-1">
              {profile.school}
            </div>
          )}
          {profile.bio && (
            <div className="text-sm text-gray-800 leading-snug mt-3">
              {profile.bio}
            </div>
          )}

          {/* Stats Row */}
          <div className="text-sm text-gray-600 flex flex-wrap gap-4 mt-4">
            <div>
              <span className="font-medium text-gray-900">{profile.boards?.length || 0}</span> Boards
            </div>
            <div>
              <span className="font-medium text-gray-900">{0}</span> Followers
            </div>
            <div>
              <span className="font-medium text-gray-900">{0}</span> Following
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0">
          {isMe ? (
            <button
              className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            >
              Edit profile
            </button>
          ) : (
            <button
              onClick={() => {
                toggleFollow(profile.username);
                setFollowing(isFollowing(profile.username));
              }}
              className={
                following
                  ? "px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                  : "px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              }
            >
              {following ? "Following" : "Follow"}
            </button>
          )}
        </div>
      </div>

      {/* Private Account Message or Boards Section */}
      {isLocked ? (
        <div className="mt-8 border border-gray-200 rounded-lg bg-gray-50 p-6 text-gray-700">
          <div className="text-sm font-medium text-gray-900 mb-1">This account is private.</div>
          <div className="text-sm text-gray-600">Follow to request access.</div>
        </div>
      ) : (
        <div className="mt-10">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Boards</h2>

          {(!boardObjects || boardObjects.length === 0) ? (
            <div className="text-sm text-gray-600 border border-dashed border-gray-300 rounded-md p-6 text-center">
              {isMe
                ? "You haven't published any boards yet."
                : "No public boards yet."}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {boardObjects.map((board) => {
                const href = isMe
                  ? `/board/${board.boardId}`
                  : `/share/${board.boardId}`;

                return (
                  <Link
                    key={board.boardId}
                    href={href}
                    className="block border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition bg-white"
                  >
                    <div className="h-28 bg-gray-100 flex items-center justify-center overflow-hidden">
                      {board.coverImage ? (
                        <img
                          src={board.coverImage}
                          alt={board.title || "Board preview"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-xs text-gray-500">No preview</div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {board.title || "Untitled board"}
                      </div>
                      <div className="mt-1 flex items-center flex-wrap gap-2 text-xs text-gray-600">
                        {board.lastEdited && (
                          <span>{timeAgo(board.lastEdited)}</span>
                        )}
                        {board.isPublic && (
                          <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-[11px] font-medium">
                            Public
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
