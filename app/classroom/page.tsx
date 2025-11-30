import Link from "next/link";

/**
 * Classroom Page - Professor Studio Dashboard
 * 
 * Server component that displays a studio dashboard with crit groups and class roster.
 */
export default function ClassroomPage() {
  // TODO: Replace with your actual board UUID from the Supabase boards table
  // To find your board ID:
  // 1. Go to Supabase Dashboard → Table Editor → boards
  // 2. Find your studio project board
  // 3. Copy the id (UUID) column value
  // 4. Paste it below, replacing "PASTE-REAL-BOARD-UUID-HERE"
  const myBoardId = "PASTE-REAL-BOARD-UUID-HERE";
  
  // For other students, use the same board ID (or set to null to disable)
  const otherStudentBoardId = myBoardId; // Change to null to disable other student links

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Urban Systems Studio
          </h1>
          <p className="text-lg text-gray-600">
            Instructor: <span className="font-semibold">Pasnik</span>
          </p>
        </div>

        {/* Next Review Info */}
        <div className="mb-8 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Next: Final Review — Dec 9, 2025 · Full narrative board + material story + circulation diagram.
              </p>
            </div>
          </div>
        </div>

        {/* Crit Groups Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Crit Groups</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Group A */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Group A</h3>
                <p className="text-sm text-gray-600 italic">Guest Critic: Anna (SOM)</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-900">You</span>
                  <Link
                    href={`/board/${myBoardId}`}
                    className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition"
                  >
                    Open board
                  </Link>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-900">Leila A.</span>
                  {otherStudentBoardId ? (
                    <Link
                      href={`/board/${otherStudentBoardId}`}
                      className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition"
                    >
                      Open board
                    </Link>
                  ) : (
                    <span className="px-3 py-1 text-xs font-medium text-gray-400 bg-gray-50 rounded-md cursor-not-allowed">
                      Open board
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-900">Alex Chen</span>
                  {otherStudentBoardId ? (
                    <Link
                      href={`/board/${otherStudentBoardId}`}
                      className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition"
                    >
                      Open board
                    </Link>
                  ) : (
                    <span className="px-3 py-1 text-xs font-medium text-gray-400 bg-gray-50 rounded-md cursor-not-allowed">
                      Open board
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Group B */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Group B</h3>
                <p className="text-sm text-gray-600 italic">Internal Jury: Faculty</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-900">Maya H.</span>
                  {otherStudentBoardId ? (
                    <Link
                      href={`/board/${otherStudentBoardId}`}
                      className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition"
                    >
                      Open board
                    </Link>
                  ) : (
                    <span className="px-3 py-1 text-xs font-medium text-gray-400 bg-gray-50 rounded-md cursor-not-allowed">
                      Open board
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-900">Samir K.</span>
                  {otherStudentBoardId ? (
                    <Link
                      href={`/board/${otherStudentBoardId}`}
                      className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition"
                    >
                      Open board
                    </Link>
                  ) : (
                    <span className="px-3 py-1 text-xs font-medium text-gray-400 bg-gray-50 rounded-md cursor-not-allowed">
                      Open board
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Class Roster Table */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Class Roster</h2>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Crit group
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Last edited
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
                  <tr className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">You</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">Group A</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">30 min ago</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700 max-w-md">
                        Clarify section cut at atrium
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/board/${myBoardId}`}
                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition"
                      >
                        View board
                      </Link>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">Leila A.</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">Group A</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">5h ago</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700 max-w-md">
                        Material language: perforated metal vs glass
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {otherStudentBoardId ? (
                        <Link
                          href={`/board/${otherStudentBoardId}`}
                          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition"
                        >
                          View board
                        </Link>
                      ) : (
                        <span className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-50 rounded-md cursor-not-allowed inline-block">
                          View board
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">Alex Chen</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">Group A</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">26h ago</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700 max-w-md">
                        Circulation spine is working, structure not resolved
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {otherStudentBoardId ? (
                        <Link
                          href={`/board/${otherStudentBoardId}`}
                          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition"
                        >
                          View board
                        </Link>
                      ) : (
                        <span className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-50 rounded-md cursor-not-allowed inline-block">
                          View board
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">Maya H.</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">Group B</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">2 days ago</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700 max-w-md">
                        Still no clear public/private diagram
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {otherStudentBoardId ? (
                        <Link
                          href={`/board/${otherStudentBoardId}`}
                          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition"
                        >
                          View board
                        </Link>
                      ) : (
                        <span className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-50 rounded-md cursor-not-allowed inline-block">
                          View board
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">Samir K.</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">Group B</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">10 min ago</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700 max-w-md">
                        Facade depth / double skin looking good
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {otherStudentBoardId ? (
                        <Link
                          href={`/board/${otherStudentBoardId}`}
                          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition"
                        >
                          View board
                        </Link>
                      ) : (
                        <span className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-50 rounded-md cursor-not-allowed inline-block">
                          View board
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
