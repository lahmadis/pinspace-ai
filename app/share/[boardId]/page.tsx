"use client";

import { use } from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getCards, getBoards, getComments, getProfiles, getProfile } from "@/lib/storage";
import { timeAgo } from "@/lib/time";
import ShareRightPanel from "@/components/ShareRightPanel";
import type { Card, Comment } from "@/types";

interface SharePageProps {
  params: Promise<{ boardId: string }>;
}

export default function SharePage({ params }: SharePageProps) {
  const { boardId } = use(params);
  const [cards, setCards] = useState<Card[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [boardTitle, setBoardTitle] = useState("Untitled Board");
  const [authorDisplayName, setAuthorDisplayName] = useState("");
  const [authorUsername, setAuthorUsername] = useState("");
  const [authorSchool, setAuthorSchool] = useState("");
  const [lastEdited, setLastEdited] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  // Load board data from localStorage and API (read-only)
  useEffect(() => {
    async function loadBoardData() {
      try {
        // Load cards from storage
        const storedCards = getCards(boardId);
        const cardsFromStorage: Card[] = storedCards.map((stored) => ({
          id: stored.id,
          title: stored.title || stored.caption || "Untitled",
          body: stored.caption || stored.body || "",
          x: stored.x,
          y: stored.y,
          imageUrl: stored.imageUrl,
        }));
        if (cardsFromStorage.length > 0) {
          setCards(cardsFromStorage);
        }

        // Load comments from storage
        const storedComments = getComments(boardId);
        // REFACTORED: Default category to "general" when stored comment has no category
        // Comment type requires category to be a specific string literal, not undefined
        const commentsFromStorage: Comment[] = storedComments.map((stored) => ({
          id: stored.id,
          author: stored.authorName,
          text: stored.text,
          timestamp: stored.createdAt,
          boardId: stored.boardId,
          pinId: stored.pinId || null,
          type: stored.type,
          category: stored.category || "general", // Default to "general" if category is missing
        }));
        if (commentsFromStorage.length > 0) {
          setComments(commentsFromStorage);
        }

        // Load board title, lastEdited, and visibility from localStorage
        const storedBoards = getBoards();
        const storedBoard = storedBoards.find((b) => b.id === boardId);

        // Try to load from API as well (for boards that might not be in localStorage)
        try {
          const [cardsRes, boardRes] = await Promise.all([
            fetch(`/api/boards/${boardId}/cards`).catch(() => null),
            fetch(`/api/boards?boardId=${boardId}`).catch(() => null),
          ]);

          // Load cards from API if available
          if (cardsRes?.ok) {
            const cardsData = await cardsRes.json();
            const apiCards = cardsData.cards || [];
            if (apiCards.length > 0) {
              setCards(apiCards);
            }
          }

          // Load board data from API
          if (boardRes?.ok) {
            const boardData = await boardRes.json();
            const board = boardData.boards?.find((b: any) => b.id === boardId) || boardData.board;
            if (board) {
              // Check visibility from API
              if (board.visibility === "private" || board.isPublic === false) {
                setIsPrivate(true);
                setLoading(false);
                return;
              }
              
              setBoardTitle(board.title || "Untitled Board");
              if (board.lastEdited) {
                setLastEdited(board.lastEdited);
              }

              // Try to find author from profiles or board data
              const allProfiles = getProfiles();
              const profileWithBoard = allProfiles.find((p: any) => p.boards.includes(boardId));
              if (profileWithBoard) {
                setAuthorDisplayName(profileWithBoard.displayName);
                setAuthorUsername(profileWithBoard.username);
                setAuthorSchool(profileWithBoard.school);
              } else if (board.owner) {
                // Try to find profile by owner
                const ownerUsername = board.owner.replace("@", "");
                const ownerProfile = getProfile(ownerUsername);
                if (ownerProfile) {
                  setAuthorDisplayName(ownerProfile.displayName);
                  setAuthorUsername(ownerProfile.username);
                  setAuthorSchool(ownerProfile.school);
                } else {
                  setAuthorDisplayName(board.owner);
                  setAuthorUsername(ownerUsername);
                  setAuthorSchool("Wentworth Institute of Technology");
                }
              } else {
                setAuthorDisplayName("Studio Member");
                setAuthorUsername("studio-member");
                setAuthorSchool("Wentworth Institute of Technology");
              }
              
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error("Failed to load board data from API", err);
        }

        // If we have data from localStorage, use it
        if (storedBoard) {
          // Check visibility - if private, don't show board
          const visibility = storedBoard.visibility?.toLowerCase();
          if (visibility === "private") {
            setIsPrivate(true);
            setLoading(false);
            return;
          }

          if (storedBoard.title) {
            setBoardTitle(storedBoard.title);
          }
          if (storedBoard.lastEdited) {
            setLastEdited(storedBoard.lastEdited);
          }

          // Try to find author from profiles
          const allProfiles = getProfiles();
          const profileWithBoard = allProfiles.find((p: any) => p.boards.includes(boardId));
          if (profileWithBoard) {
            setAuthorDisplayName(profileWithBoard.displayName);
            setAuthorUsername(profileWithBoard.username);
            setAuthorSchool(profileWithBoard.school);
          } else {
            // Fallback to default
            setAuthorDisplayName("Studio Member");
            setAuthorUsername("studio-member");
            setAuthorSchool("Wentworth Institute of Technology");
          }
        } else {
          // No board found in localStorage or API
          setNotFound(true);
        }
      } catch (err) {
        console.error("Failed to load board data", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    loadBoardData();
  }, [boardId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (notFound || isPrivate) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-md mx-auto px-8 py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {isPrivate ? "This board is not available" : "Board not found"}
          </h1>
          <p className="text-gray-600">
            {isPrivate
              ? "It may be private or has not been shared."
              : "The board you're looking for doesn't exist."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{boardTitle}</h1>
            <p className="text-sm text-gray-600 mb-1">
              by{" "}
              {authorUsername ? (
                <Link
                  href={`/profile/${authorUsername}`}
                  className="font-medium hover:text-blue-600 transition"
                >
                  {authorDisplayName || `@${authorUsername}`}
                </Link>
              ) : (
                <span>{authorDisplayName || "Studio Member"}</span>
              )}{" "}
              · {authorSchool}
            </p>
            {lastEdited && (
              <p className="text-sm text-gray-500">Last edited {timeAgo(lastEdited)}</p>
            )}
          </div>
        </header>

        {/* Cards Grid */}
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="max-w-screen-lg mx-auto px-8 py-8">
            {cards.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No cards on this board yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
                  >
                    {card.imageUrl && (
                      <div className="w-full h-48 bg-gray-100 overflow-hidden">
                        <img
                          src={card.imageUrl}
                          alt={card.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">{card.title}</h3>
                      {card.body && (
                        <p className="text-xs text-gray-600 line-clamp-2">{card.body}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Read-only Comments and Crit Notes */}
      <ShareRightPanel comments={comments} />
    </div>
  );
}
