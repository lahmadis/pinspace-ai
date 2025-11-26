import { headers } from "next/headers";
import type { Card, Comment } from "@/types";

interface ExportPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}

// Server-side fetch helper to get board data
// REFACTORED: Fixed TypeScript error - headers() returns a Promise in Next.js 15+ and must be awaited
async function getBoardData(boardId: string, snapshotId?: string | null) {
  try {
    // REFACTORED: Await headers() call - in Next.js 15+, headers() returns Promise<ReadonlyHeaders>
    const headersList = await headers();
    const host = headersList.get("host");
    const protocol = headersList.get("x-forwarded-proto") || "http";
    const baseUrl = host ? `${protocol}://${host}` : "http://localhost:3000";

    // Get cards
    const cardsRes = await fetch(`${baseUrl}/api/boards/${boardId}/cards`, {
      cache: "no-store",
    });
    let cards: Card[] = [];
    if (cardsRes.ok) {
      const cardsData = await cardsRes.json();
      cards = cardsData.cards || [];
    }

    // Get comments
    const commentsRes = await fetch(
      `${baseUrl}/api/comments?boardId=${boardId}`,
      { cache: "no-store" }
    );
    let comments: Comment[] = [];
    if (commentsRes.ok) {
      const commentsData = await commentsRes.json();
      comments = commentsData.comments || [];
    }

    // Get board metadata
    const boardRes = await fetch(`${baseUrl}/api/boards?boardId=${boardId}`, {
      cache: "no-store",
    });
    let boardTitle = "Untitled Board";
    let collaborators = "0 collaborators";
    if (boardRes.ok) {
      const boardData = await boardRes.json();
      if (boardData.board) {
        boardTitle = boardData.board.title;
        collaborators = boardData.board.collaborators || "0 collaborators";
      }
    }

    // Get snapshot if provided
    let versionLabel = "Live board";
    if (snapshotId) {
      const snapshotsRes = await fetch(`${baseUrl}/api/snapshots`, {
        cache: "no-store",
      });
      if (snapshotsRes.ok) {
        const snapshotsData = await snapshotsRes.json();
        const snapshot = snapshotsData.snapshots?.find(
          (s: any) => s.id === snapshotId && s.boardId === boardId
        );
        if (snapshot) {
          versionLabel = snapshot.label;
          cards = snapshot.data.cards;
          comments = snapshot.data.comments;
        }
      }
    }

    return {
      cards,
      comments,
      versionLabel,
      boardTitle,
      collaborators,
    };
  } catch (err) {
    console.error("Failed to load board data", err);
    return {
      cards: [],
      comments: [],
      versionLabel: "Live board",
      boardTitle: "Untitled Board",
      collaborators: "0 collaborators",
    };
  }
}

export default async function ExportPage({
  params,
  searchParams,
}: ExportPageProps) {
  const { id: boardId } = await params;
  const searchParamsResolved = await searchParams;
  const snapshotId = searchParamsResolved.version || null;

  const { cards, comments, versionLabel, boardTitle, collaborators } =
    await getBoardData(boardId, snapshotId);

  // Get recent comments for Key Feedback section (last 5)
  const recentComments = comments
    .sort((a, b) => {
      // REFACTORED: Use numeric comparison instead of localeCompare
      // timestamp can be string | number, so convert both to numbers for comparison
      // This works whether timestamps are stored as strings (ISO) or numbers (Date.now())
      return Number(a.timestamp) - Number(b.timestamp);
    })
    .slice(0, 5)
    .reverse(); // Show oldest first for context

  return (
    <div className="min-h-screen bg-white print:bg-white">
      <div className="max-w-[1200px] mx-auto p-8 print:p-6">
        {/* Header */}
        <div className="mb-8 border-b border-gray-200 pb-6 print:pb-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 print:text-2xl">
            {boardTitle}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600 print:text-xs">
            <span>{versionLabel}</span>
            <span>•</span>
            <span>{collaborators}</span>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="mb-12 print:mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 print:mb-4 print:text-lg">
            Board Content
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:gap-4">
            {cards.map((card) => (
              <div
                key={card.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm print:shadow-none print:border-gray-300"
              >
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 print:bg-white">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {card.title}
                  </h3>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {card.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Feedback Section */}
        {recentComments.length > 0 && (
          <div className="border-t border-gray-200 pt-8 print:pt-6 print:break-inside-avoid">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 print:mb-4 print:text-lg">
              Key Feedback
            </h2>
            <ul className="space-y-4 print:space-y-3">
              {recentComments.map((comment) => (
                <li
                  key={comment.id}
                  className="flex gap-3 print:gap-2"
                >
                  <span className="text-gray-400 print:text-gray-500">
                    •
                  </span>
                  <div className="flex-1">
                    <span className="font-medium text-gray-900 text-sm print:text-xs">
                      {comment.author}
                    </span>
                    <span className="text-gray-500 text-xs ml-2 print:text-xs">
                      {comment.timestamp}
                    </span>
                    <p className="text-sm text-gray-700 mt-1 print:text-xs print:mt-0.5">
                      {comment.text}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
