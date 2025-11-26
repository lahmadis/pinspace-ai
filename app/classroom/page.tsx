"use client";

import { useState } from "react";
import Link from "next/link";
import SidebarNav from "@/components/SidebarNav";
import { timeAgo } from "@/lib/time";

interface Milestone {
  title: string;
  date: string;
  description: string;
}

interface CritGroupMember {
  username: string;
  displayName: string;
  boardId: string;
}

interface CritGroup {
  name: string;
  reviewer: string;
  members: CritGroupMember[];
}

interface Student {
  username: string;
  displayName: string;
  boardId: string;
  lastEdited: number;
  status: string;
  critGroup: string;
}

export default function ClassroomPage() {
  // Mock data (hardcoded for now, could come from localStorage later)
  const className = "Urban Systems Studio";
  const instructorName = "Pasnik";
  
  const milestones: Milestone[] = [
    {
      title: "Midreview 1",
      date: "2025-11-14T14:00:00Z",
      description: "Bring: site section, circulation, and material strategy for public/private threshold.",
    },
    {
      title: "Final Review",
      date: "2025-12-09T16:00:00Z",
      description: "Full narrative board + material story + circulation diagram.",
    },
  ];

  const critGroups: CritGroup[] = [
    {
      name: "Group A",
      reviewer: "Guest Critic: Anna (SOM)",
      members: [
        { username: "me", displayName: "You", boardId: "1" },
        { username: "leila.a", displayName: "Leila A.", boardId: "2" },
        { username: "alex.chen", displayName: "Alex Chen", boardId: "3" },
      ],
    },
    {
      name: "Group B",
      reviewer: "Internal Jury: Faculty",
      members: [
        { username: "maya.h", displayName: "Maya H.", boardId: "4" },
        { username: "samir.k", displayName: "Samir K.", boardId: "5" },
      ],
    },
  ];

  const students: Student[] = [
    {
      username: "me",
      displayName: "You",
      boardId: "1",
      lastEdited: Date.now() - 1000 * 60 * 30, // 30 min ago
      status: "Clarify section cut at atrium",
      critGroup: "Group A",
    },
    {
      username: "leila.a",
      displayName: "Leila A.",
      boardId: "2",
      lastEdited: Date.now() - 1000 * 60 * 60 * 5, // 5h ago
      status: "Material language: perforated metal vs glass",
      critGroup: "Group A",
    },
    {
      username: "alex.chen",
      displayName: "Alex Chen",
      boardId: "3",
      lastEdited: Date.now() - 1000 * 60 * 60 * 26, // 26h ago
      status: "Circulation spine is working, structure not resolved",
      critGroup: "Group A",
    },
    {
      username: "maya.h",
      displayName: "Maya H.",
      boardId: "4",
      lastEdited: Date.now() - 1000 * 60 * 60 * 48, // 2 days ago
      status: "Still no clear public/private diagram",
      critGroup: "Group B",
    },
    {
      username: "samir.k",
      displayName: "Samir K.",
      boardId: "5",
      lastEdited: Date.now() - 1000 * 60 * 10, // 10 min ago
      status: "Facade depth / double skin looking good",
      critGroup: "Group B",
    },
  ];

  // Find next upcoming milestone (soonest date in the future)
  const now = new Date();
  const upcomingMilestones = milestones
    .filter((m) => new Date(m.date) > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const nextMilestone = upcomingMilestones[0] || null;

  // Format milestone date for display
  const formatMilestoneDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } else if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Tomorrow";
    } else if (diffDays <= 7) {
      return `In ${diffDays} days`;
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNav />
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Classroom Dashboard</h1>
          <p className="text-gray-600">Studio overview and crit group management</p>
        </div>

        {/* SECTION 1: Studio Info */}
        <section className="mb-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{className}</h2>
              <p className="text-gray-600">Instructor: <span className="font-medium">{instructorName}</span></p>
            </div>
            
            {nextMilestone ? (
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      Next: {nextMilestone.title} – {formatMilestoneDate(nextMilestone.date)}
                    </p>
                    <p className="text-sm text-gray-600">{nextMilestone.description}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-500">No upcoming milestones</p>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 2: Crit Groups */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Crit Groups</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {critGroups.map((group) => (
              <div
                key={group.name}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{group.name}</h3>
                  <p className="text-sm text-gray-600 italic">{group.reviewer}</p>
                </div>
                
                <div className="space-y-2">
                  {group.members.map((member) => (
                    <div
                      key={member.username}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <span className="text-sm text-gray-900">{member.displayName}</span>
                      <Link
                        href={`/board/${member.boardId}`}
                        className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition"
                      >
                        Open board
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 3: Class Roster */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Class Roster</h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Crit Group
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Last Edited
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Focus
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student.username} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {student.displayName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{student.critGroup}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {timeAgo(new Date(student.lastEdited).toISOString())}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 max-w-md">
                          {student.status}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/board/${student.boardId}`}
                          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition"
                        >
                          View board
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

