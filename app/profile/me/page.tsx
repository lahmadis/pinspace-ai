"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { currentUser } from "@/lib/currentUser";
import { getProfile, getBoards } from "@/lib/storage";
import { timeAgo } from "@/lib/time";

interface Board {
  id: string;
  title: string;
  lastEdited: number | string;
  coverImage?: string;
}

interface ProfileData {
  username: string;
  displayName: string;
  school: string;
  bio: string;
  avatarUrl: string;
  followers: number;
  following: number;
  boards: Board[];
}

export default function ProfileMePage() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  useEffect(() => {
    // Try to load from profile storage first
    let loadedProfile = null;
    if (currentUser?.username) {
      const username = currentUser.username.replace("@", "");
      loadedProfile = getProfile(username);
    }

    // If profile exists in storage, use it
    if (loadedProfile) {
      // Load boards from localStorage
      const allBoards = getBoards();
      const userBoardIds = loadedProfile.boards || [];
      const userBoards = allBoards
        .filter((b) => userBoardIds.includes(b.id))
        .map((board) => ({
          id: board.id,
          title: board.title,
          lastEdited: board.lastEdited || new Date().toISOString(),
          coverImage: undefined, // We could load from cards if needed
        }));

      setProfileData({
        username: loadedProfile.username,
        displayName: loadedProfile.displayName,
        school: loadedProfile.school,
        bio: loadedProfile.bio,
        avatarUrl: loadedProfile.avatarUrl || "",
        followers: 12, // Mock for now
        following: 28, // Mock for now
        boards: userBoards,
      });
    } else {
      // Use mock data as fallback
      setProfileData({
        username: "sarah.lahmadi",
        displayName: "Sarah Lahmadi",
        school: "Wentworth Institute of Technology",
        bio: "Studio 5 · housing/urban circulation. Interested in reflective skins + public/private edges.",
        avatarUrl: "",
        followers: 12,
        following: 28,
        boards: [
          {
            id: "1",
            title: "Runway / Movement Study",
            lastEdited: Date.now() - 1000 * 60 * 15, // 15 minutes ago
            coverImage: "",
          },
        ],
      });
    }
  }, []);

  if (!profileData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-8 py-10">
        {/* Top Section */}
        <div className="flex items-start gap-6 mb-6">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
            {profileData.avatarUrl ? (
              <img
                src={profileData.avatarUrl}
                alt={profileData.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold text-gray-600">
                {profileData.displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Name and Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  {profileData.displayName}
                </h1>
                <p className="text-sm text-gray-600 mb-1">
                  @{profileData.username}
                </p>
                <p className="text-sm text-gray-700 mb-2">{profileData.school}</p>
                {profileData.bio && (
                  <p className="text-sm text-gray-700 leading-relaxed max-w-2xl">
                    {profileData.bio}
                  </p>
                )}
              </div>

              {/* Edit Profile Button */}
              <button className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition shrink-0">
                Edit profile
              </button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-10 pb-6 border-b border-gray-200">
          <div>
            <span className="font-medium text-gray-900">{profileData.followers}</span> Followers
          </div>
          <span>•</span>
          <div>
            <span className="font-medium text-gray-900">{profileData.following}</span> Following
          </div>
          <span>•</span>
          <div>
            <span className="font-medium text-gray-900">{profileData.boards.length}</span> Board
            {profileData.boards.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Your Boards Section */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Boards</h2>

          {profileData.boards.length === 0 ? (
            <div className="text-sm text-gray-600 border border-dashed border-gray-300 rounded-md p-6 text-center">
              You haven't created any boards yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profileData.boards.map((board) => (
                <Link
                  key={board.id}
                  href={`/board/${board.id}`}
                  className="block border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition bg-white"
                >
                  {/* Cover Image Placeholder */}
                  <div className="aspect-[16/9] bg-gray-100 rounded-t-lg flex items-center justify-center">
                    {board.coverImage ? (
                      <img
                        src={board.coverImage}
                        alt={board.title}
                        className="w-full h-full object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="text-xs text-gray-400">No preview</div>
                    )}
                  </div>

                  {/* Board Info */}
                  <div className="p-4">
                    <h3 className="text-base font-medium text-gray-900 mb-2">
                      {board.title}
                    </h3>
                    {board.lastEdited && (
                      <p className="text-xs text-gray-500">
                        Last edited {timeAgo(board.lastEdited)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

