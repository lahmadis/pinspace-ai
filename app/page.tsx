"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">Welcome to PinSpace</h1>
        <p className="text-gray-600">Collaborative pin-up board for architecture students</p>
        <div className="flex gap-4 justify-center mt-6">
          <a
            href="/boards"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Go to Boards
          </a>
          <button
            onClick={() => router.push("/demo")}
            className="inline-block px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
          >
            Try live demo
          </button>
        </div>
      </div>
    </div>
  );
}
