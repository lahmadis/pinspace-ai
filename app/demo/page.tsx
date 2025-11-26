"use client";

import { useState } from "react";
import SidebarNav from "@/components/SidebarNav";
import BoardCanvas from "@/components/BoardCanvas";
import RightPanel from "@/components/RightPanel";
import CanvasToolbar, { type ToolType } from "@/components/CanvasToolbar";
import type { Comment, Task, CanvasElement } from "@/types";
import DemoCallouts from "@/components/DemoCallouts";

// Demo data - hard-coded, never saved to localStorage
const DEMO_BOARD_ID = "demo_board";
const DEMO_BOARD_TITLE = "Runway / Movement Study (Demo)";

// Demo canvas elements
const demoElements: CanvasElement[] = [
  {
    id: "demo_sticky_1",
    type: "sticky",
    x: 150,
    y: 150,
    width: 200,
    height: 150,
    z: 1,
    text: "Circulation acts like a runway spine",
    fillColor: "#fffbe6",
  },
  {
    id: "demo_image_1",
    type: "image",
    x: 400,
    y: 150,
    width: 300,
    height: 200,
    z: 2,
    src: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop",
    title: "Facade reference / perforated metal",
  },
  {
    id: "demo_text_1",
    type: "text",
    x: 150,
    y: 350,
    width: 400,
    height: 120,
    z: 3,
    text: "Mid-review iteration — focus: entry threshold + section clarity.",
    fontSize: 14,
  },
  {
    id: "demo_shape_1",
    type: "shape",
    shapeType: "rect",
    x: 600,
    y: 400,
    width: 250,
    height: 150,
    z: 4,
    fillColor: "#e0f2fe",
    strokeColor: "#0369a1",
    strokeWidth: 2,
    text: "Section study",
    fontSize: 14,
  },
];

// Demo comments
const demoComments: Comment[] = [
  {
    id: "demo_comment_1",
    author: "Pasnik",
    text: "Clarify section at stair core.",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    boardId: DEMO_BOARD_ID,
    category: "section",
    source: "liveCrit",
  },
  {
    id: "demo_comment_2",
    author: "Linna",
    text: "Stronger contrast at entry.",
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3h ago
    boardId: DEMO_BOARD_ID,
    category: "concept",
  },
];

// Demo tasks
const demoTasks: Task[] = [
  {
    id: "demo_task_1",
    boardId: DEMO_BOARD_ID,
    text: "Clarify section at stair core",
    status: "open",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    sourceCommentId: "demo_comment_1",
  },
];

export default function DemoPage() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [snap, setSnap] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);

  // Elements are read-only - use demo data directly
  const elements = demoElements;
  const comments = demoComments;
  const tasks = demoTasks;

  // Helper to get element summary
  const getElementSummary = (elementId: string): string => {
    const element = elements.find((e) => e.id === elementId);
    if (!element) return "Unknown element";
    
    switch (element.type) {
      case "text":
        return "Text box";
      case "sticky":
        return "Sticky note";
      case "shape":
        if (element.shapeType) {
          const shapeNames: Record<string, string> = {
            rect: "Rectangle",
            circle: "Circle",
            triangle: "Triangle",
            diamond: "Diamond",
            arrow: "Arrow",
            bubble: "Bubble",
            star: "Star",
          };
          return `Shape: ${shapeNames[element.shapeType] || element.shapeType}`;
        }
        return "Shape";
      case "image":
        return "Image";
      case "card":
        return "Card";
      default:
        return "Element";
    }
  };

  // No-op handlers for demo (read-only)
  const handlePostComment = () => {
    // No-op in demo
  };

  const handleAddTask = () => {
    // No-op in demo
  };

  const handleToggleTask = () => {
    // No-op in demo
  };

  const handleJumpToElement = (elementId: string) => {
    // Could scroll to element, but for demo just log
    setSelectedElementId(elementId);
    setActiveElementId(elementId);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNav />
      <div className="flex-1 flex flex-col">
        {/* Demo Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">
                {DEMO_BOARD_TITLE}
              </h2>
              <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700 border border-blue-200">
                Demo · Read-only
              </span>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden relative">
          {/* Toolbar - disabled for demo */}
          <CanvasToolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            zoom={zoom}
            onZoomIn={() => setZoom(Math.min(2, zoom * 1.1))}
            onZoomOut={() => setZoom(Math.max(0.5, zoom * 0.9))}
            onZoomReset={() => setZoom(1)}
            snap={snap}
            onSnapToggle={() => setSnap(prev => !prev)}
            isDemo={true}
          />

          {/* Canvas */}
          <BoardCanvas
            elements={elements}
            setElements={() => {}} // No-op
            selectedIds={selectedIds}
            setSelectedIds={() => {}} // No-op
            activeTool={activeTool}
            onSetActiveTool={setActiveTool}
            selectedElementId={selectedElementId}
            onSelectElement={(id) => {
              setSelectedElementId(id);
              setActiveElementId(id || null);
            }}
            zoom={zoom}
            setZoom={setZoom}
            pan={pan}
            setPan={setPan}
            snap={snap}
            onSaveElements={() => {}} // No-op
            isReadOnly={true}
            pinnedComments={comments}
            onSelectComment={setSelectedCommentId}
            onCreateComment={() => {}} // No-op
            boardId={DEMO_BOARD_ID}
            currentUserName="Demo User"
            allowPinComments={false}
          />

          {/* Callouts */}
          <DemoCallouts />

          {/* Right Panel */}
          <RightPanel
            comments={comments}
            viewingSnapshot={null}
            selectedCard={null}
            author="Demo User"
            boardId={DEMO_BOARD_ID}
            boardSnapshots={[]}
            timelineSnapshots={[]}
            tasks={tasks}
            onPostComment={handlePostComment}
            onLoadSnapshot={() => {}} // No-op
            onToggleTask={handleToggleTask}
            onAddTask={handleAddTask}
            onTimelineSnapshotAdded={() => {}} // No-op
            selectedCommentId={selectedCommentId}
            onSelectComment={setSelectedCommentId}
            isCritActive={false}
            activeElementId={activeElementId}
            getElementSummary={getElementSummary}
            onJumpToElement={handleJumpToElement}
            getCritSessionSummary={() => null} // No-op
            isDemo={true}
          />
        </div>
      </div>
    </div>
  );
}

